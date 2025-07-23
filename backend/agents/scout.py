from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from tools.web_search import web_search_tool
from tools.x_search import x_search_tool
from tools.browse_page import browse_page_tool
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from config import GROQ_API_KEY, PINECONE_API_KEY
from pinecone import Pinecone
import asyncio
import logging
from langchain_core.messages import HumanMessage

# Set up logging
logger = logging.getLogger(__name__)

# Initialize LLM
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

# Initialize dummy embeddings (not used for actual embedding since Pinecone handles it)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Initialize Pinecone
logger.info(f"PINECONE_API_KEY: {PINECONE_API_KEY}")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Use existing index
index_name = "researchanalyst"
index = pc.Index(index_name)
vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings, text_key="text")

async def scout_agent(state):
    try:
        logger.info(f"Scout agent called with state type: {type(state)}")
        logger.info(f"Received state: {state}")
        
        query = state.query
        if not query:
            raise ValueError("No query provided in state")

        # Convert Pydantic model to dict for modification
        if hasattr(state, 'model_dump'):
            state_dict = state.model_dump()
            logger.info("Converted Pydantic model to dict")
        else:
            state_dict = dict(state)
            logger.info("Converted state to dict")
        
        # Use chat_history with default to empty list if None
        chat_history = state_dict.get("chat_history", []) or []
        
        # Optionally use chat_history to refine query
        if chat_history:
            history_context = "\n".join(chat_history)
            query = f"{history_context}\nQuery: {query}"
            logger.info(f"Query with history: {query}")

        # Decompose query - make it more focused
        prompt = PromptTemplate(
            input_variables=["query"],
            template="Generate 3-5 specific search queries for market research on '{query}'. Return only the queries, one per line, without numbering or explanations."
        )
        response = await llm.ainvoke(prompt.format(query=query))
        sub_queries = [q.strip() for q in response.content.split("\n") if q.strip() and not q.startswith(('1.', '2.', '3.', '4.', '5.', '*', '-'))]
        logger.info(f"Generated sub-queries: {sub_queries}")

        # Limit to 3 queries to avoid overwhelming the system
        sub_queries = sub_queries[:3]
        logger.info(f"Limited to 3 sub-queries: {sub_queries}")

        # Parallel tool calls
        gathered_data = []
        tasks = []
        for sub_query in sub_queries:
            logger.info(f"Creating task for sub-query: {sub_query}")
            tasks.append(asyncio.create_task(web_search_tool.ainvoke(sub_query)))
            tasks.append(asyncio.create_task(x_search_tool.ainvoke(sub_query)))

        logger.info(f"Executing {len(tasks)} tool tasks...")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        logger.info(f"Tool results: {results}")

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Tool error for task {i}: {result}")
                continue
            if isinstance(result, list):
                logger.info(f"Processing {len(result)} items from tool result {i}")
                for item in result:
                    if "url" in item:
                        try:
                            logger.info(f"Browsing page: {item['url']}")
                            page_content = await browse_page_tool.ainvoke(item["url"])
                            gathered_data.append({**item, **page_content})
                        except Exception as e:
                            logger.error(f"Browse page error for {item['url']}: {e}")
                    else:
                        if item.get("sentiment") == "unknown":
                            sentiment_prompt = PromptTemplate(
                                input_variables=["content"],
                                template="Analyze the sentiment of this text: '{content}'. Return 'positive', 'negative', or 'neutral'."
                            )
                            sentiment_response = await llm.ainvoke(sentiment_prompt.format(content=item.get("content", "")))
                            item["sentiment"] = sentiment_response.content
                        gathered_data.append(item)

        logger.info(f"Total gathered data items: {len(gathered_data)}")

        # Store in Pinecone with sentiment metadata
        for item in gathered_data:
            text = item.get("snippet") or item.get("content") or item.get("text", "")
            metadata = {
                "url": item.get("url", ""),
                "sentiment": item.get("sentiment", "neutral"),
                "source": item.get("network", "web")
            }
            try:
                await vectorstore.aadd_texts([text], metadatas=[metadata])
            except Exception as e:
                logger.error(f"Pinecone add_texts error: {e}")

        # Update state dict
        state_dict["gathered_data"] = gathered_data
        logger.info(f"Updated state with {len(gathered_data)} gathered data items")
        logger.info(f"Final state dict: {state_dict}")
        
        # Return updated state as dict
        return state_dict
    except Exception as e:
        logger.error(f"Scout error: {e}", exc_info=True)
        # Return original state as dict if error occurs
        if hasattr(state, 'model_dump'):
            return state.model_dump()
        return dict(state)
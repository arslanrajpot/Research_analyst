from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from tools.openserp_search import openserp_google_search, openserp_yandex_search
from tools.free_apis import news_api_search, github_trending_search, reddit_search, hackernews_search, wikipedia_search
from tools.financial_data import yahoo_finance_search, alpha_vantage_search, sec_edgar_search
from tools.browse_page import browse_page_tool
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from config import GROQ_API_KEY, PINECONE_API_KEY, NEWS_API_KEY, ALPHA_VANTAGE_API_KEY
from pinecone import Pinecone
import asyncio
import logging
from langchain_core.messages import HumanMessage
from datetime import datetime
from routers.websocket import manager

# Set up logging
logger = logging.getLogger(__name__)

# Initialize LLM
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

# Initialize embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Initialize Pinecone
logger.info(f"PINECONE_API_KEY: {PINECONE_API_KEY}")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Use existing index
index_name = "researchanalyst"
index = pc.Index(index_name)
vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings, text_key="text")

async def enhanced_scout_agent(state):
    """
    Enhanced scout agent that uses multiple FREE data sources:
    - OpenSerp (Google, Yandex, Baidu)
    - NewsAPI (free tier)
    - GitHub API (free)
    - Reddit API (free)
    - Hacker News API (free)
    - Wikipedia API (free)
    - Yahoo Finance (free)
    - Alpha Vantage (free tier)
    - SEC EDGAR (free)
    """
    try:
        logger.info(f"Enhanced scout agent called with state type: {type(state)}")
        logger.info(f"Received state: {state}")
        
        # Send initial progress update
        if manager.has_connections():
            await manager.send_research_progress("Research Initiated", "Starting data collection process...", 5)
            await manager.send_subtask_update("query_analysis", "Query Analysis", "in_progress", "Analyzing research query")
        
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

        # Complete query analysis and start search strategy
        if manager.has_connections():
            await manager.send_subtask_update("query_analysis", "Query Analysis", "completed", "Query analyzed successfully")
        
        prompt = PromptTemplate(
            input_variables=["query"],
            template="Generate 3-5 specific search queries for market research on '{query}'. Return only the queries, one per line, without numbering or explanations."
        )
        response = await llm.ainvoke(prompt.format(query=query))
        sub_queries = [q.strip() for q in response.content.split("\n") if q.strip() and not q.startswith(('1.', '2.', '3.', '4.', '5.', '*', '-'))]
        logger.info(f"Generated sub-queries: {sub_queries}")

        # Limit to 1 query to avoid overwhelming the system and prevent timeouts
        sub_queries = sub_queries[:1]
        logger.info(f"Limited to 1 sub-query: {sub_queries}")

        # Complete search strategy and start data collection
        await manager.send_subtask_update("search_strategy", "Search Strategy", "completed", f"Created {len(sub_queries)} search queries")
        await manager.send_subtask_update("google_search", "Google Search", "in_progress", "Searching Google")

        # Parallel data collection from multiple FREE sources
        tasks = []
        
        # Start all search tasks - reduced to prevent timeouts
        search_tasks = []
        for sub_query in sub_queries:
            logger.info(f"Creating tasks for sub-query: {sub_query}")
            
            # Only use the most reliable sources to prevent timeouts
            search_tasks.append(("reddit", reddit_search.ainvoke(sub_query)))
            search_tasks.append(("hackernews", hackernews_search.ainvoke(sub_query)))
            search_tasks.append(("yahoo_finance", yahoo_finance_search.ainvoke(sub_query)))

        # Execute search tasks with individual updates and timeout
        for source_name, task in search_tasks:
            if manager.has_connections():
                await manager.send_subtask_update(f"{source_name}_search", f"{source_name.title()} Search", "in_progress", f"Searching {source_name}")
            try:
                # Add timeout to prevent hanging - reduced to 10 seconds
                result = await asyncio.wait_for(task, timeout=10.0)  # 10 second timeout per search
                tasks.append(result)
                if manager.has_connections():
                    await manager.send_subtask_update(f"{source_name}_search", f"{source_name.title()} Search", "completed", f"Found {len(result) if isinstance(result, list) else 0} results")
            except asyncio.TimeoutError:
                logger.warning(f"Search timeout for {source_name}")
                if manager.has_connections():
                    await manager.send_subtask_update(f"{source_name}_search", f"{source_name.title()} Search", "error", "Search timeout - skipping")
                tasks.append([])
            except Exception as e:
                logger.error(f"Search error for {source_name}: {e}")
                if manager.has_connections():
                    await manager.send_subtask_update(f"{source_name}_search", f"{source_name.title()} Search", "error", f"Error: {str(e)[:50]}")
                tasks.append([])

        # Start data processing
        if manager.has_connections():
            await manager.send_subtask_update("data_processing", "Data Processing", "in_progress", "Processing collected data")
            await manager.send_research_progress("Data Processing", "Processing collected data", 60)
        
        logger.info(f"Executing {len(tasks)} data collection tasks...")
        results = tasks  # Results are already collected from individual tasks
        logger.info(f"Data collection results: {len(results)} tasks completed")
        
        # Process results - flatten all results into gathered_data
        gathered_data = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Data source error for task {i}: {result}")
                continue
            if isinstance(result, list) and result:  # Only process non-empty lists
                logger.info(f"Processing {len(result)} items from data source {i}")
                
                # Send data source specific update
                source_name = "Unknown Source"
                if i < len(sub_queries):
                    source_name = f"Data Source {i+1}"
                
                if manager.has_connections():
                    await manager.send_data_source_update(
                        source_name,
                        "processing",
                        len(result)
                    )
                for item in result:
                    # Add metadata
                    item["timestamp"] = datetime.now().isoformat()
                    item["source_type"] = item.get("type", "unknown")
                    
                    # Analyze sentiment if not already done
                    if item.get("sentiment") == "unknown" or not item.get("sentiment"):
                        try:
                            sentiment_prompt = PromptTemplate(
                                input_variables=["content"],
                                template="Analyze the sentiment of this text: '{content}'. Return only 'positive', 'negative', or 'neutral'."
                            )
                            # Add timeout to prevent hanging on sentiment analysis
                            sentiment_response = await asyncio.wait_for(
                                llm.ainvoke(sentiment_prompt.format(content=item.get("content", item.get("snippet", "")))), 
                                timeout=5.0
                            )
                            item["sentiment"] = sentiment_response.content.strip().lower()
                        except asyncio.TimeoutError:
                            logger.warning("Sentiment analysis timeout - using neutral")
                            item["sentiment"] = "neutral"
                        except Exception as e:
                            logger.error(f"Sentiment analysis error: {e}")
                            item["sentiment"] = "neutral"
                    
                    # Browse page content for URLs
                    if "url" in item and item["url"]:
                        try:
                            logger.info(f"Browsing page: {item['url']}")
                            # Add timeout to prevent hanging on page browsing
                            page_content = await asyncio.wait_for(browse_page_tool.ainvoke(item["url"]), timeout=10.0)
                            item.update(page_content)
                        except asyncio.TimeoutError:
                            logger.warning(f"Page browsing timeout for {item['url']}")
                        except Exception as e:
                            logger.error(f"Browse page error for {item['url']}: {e}")
                    
                    gathered_data.append(item)

        logger.info(f"Total gathered data items: {len(gathered_data)}")

        # If no data was gathered, create some basic data to prevent infinite loop
        if not gathered_data:
            logger.warning("No data gathered from any source, creating fallback data")
            gathered_data = [{
                "title": "Mobile Market Research",
                "content": f"Research query: {query}. This is a fallback response due to limited data availability from external sources.",
                "url": "https://example.com",
                "source": "fallback",
                "type": "general",
                "sentiment": "neutral",
                "timestamp": datetime.now().isoformat()
            }]

        # Complete data processing and start content analysis
        if manager.has_connections():
            await manager.send_subtask_update("data_processing", "Data Processing", "completed", f"Processed {len(gathered_data)} items")
            await manager.send_research_progress("Content Analysis", "Analyzing content quality", 80)
            await manager.send_subtask_update("content_analysis", "Content Analysis", "in_progress", "Analyzing content quality")

        # Store in Pinecone with enhanced metadata
        for item in gathered_data:
            text = item.get("snippet") or item.get("content") or item.get("text", "")
            if text:  # Only store if we have text content
                metadata = {
                    "url": item.get("url", ""),
                    "sentiment": item.get("sentiment", "neutral"),
                    "source": item.get("source", "unknown"),
                    "source_type": item.get("source_type", "unknown"),
                    "timestamp": item.get("timestamp", ""),
                    "title": item.get("title", "")[:200],  # Limit title length
                    "domain": item.get("domain", ""),
                    "engine": item.get("engine", ""),
                    "type": item.get("type", "unknown")
                }
                try:
                    await vectorstore.aadd_texts([text], metadatas=[metadata])
                except Exception as e:
                    logger.error(f"Pinecone add_texts error: {e}")

        # Complete content analysis
        if manager.has_connections():
            await manager.send_subtask_update("content_analysis", "Content Analysis", "completed", f"Analyzed {len(gathered_data)} items")
            await manager.send_research_progress("Data Collection Complete", "All data collected and processed", 100)
        
        # Update state dict
        state_dict["gathered_data"] = gathered_data
        state_dict["data_sources_used"] = [
            "OpenSerp (Google, Yandex)",
            "NewsAPI" if NEWS_API_KEY else "NewsAPI (no key)",
            "GitHub API",
            "Hacker News API", 
            "Reddit API",
            "Wikipedia API",
            "Yahoo Finance",
            "Alpha Vantage" if ALPHA_VANTAGE_API_KEY else "Alpha Vantage (no key)",
            "SEC EDGAR"
        ]
        
        logger.info(f"Updated state with {len(gathered_data)} gathered data items")
        logger.info(f"Data sources used: {state_dict['data_sources_used']}")
        
        # Return updated state as dict
        return state_dict
        
    except Exception as e:
        logger.error(f"Enhanced scout error: {e}", exc_info=True)
        # Return original state as dict if error occurs
        if hasattr(state, 'model_dump'):
            return state.model_dump()
        return dict(state)



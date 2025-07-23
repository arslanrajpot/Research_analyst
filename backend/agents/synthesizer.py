from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from config import GROQ_API_KEY
from langchain_core.messages import HumanMessage
import logging
from routers.websocket import manager

# Set up logging
logger = logging.getLogger(__name__)

# Use a supported model - llama-3.3-70b-versatile is more reliable
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

async def synthesizer_agent(state):
    try:
        logger.info(f"Synthesizer agent called with state type: {type(state)}")
        logger.info(f"Received state: {state}")
        
        # Send initial status update and subtask updates
        if manager.has_connections():
            await manager.send_research_progress("Data Analysis", "Starting analysis of collected data...", 85)
            await manager.send_subtask_update("data_analysis", "Data Analysis", "in_progress", "Analyzing collected data and identifying patterns")
        
        # Convert Pydantic model to dict for modification
        if hasattr(state, 'model_dump'):
            state_dict = state.model_dump()
            logger.info("Converted Pydantic model to dict")
        else:
            state_dict = dict(state)
            logger.info("Converted state to dict")
        
        query = state_dict.get("query", "")
        chat_history = state_dict.get("chat_history", [])
        gathered_data = state_dict.get("gathered_data", [])
        template_data = state_dict.get("template_data", {})
        
        logger.info(f"Query: {query}")
        logger.info(f"Chat history length: {len(chat_history)}")
        logger.info(f"Gathered data items: {len(gathered_data)}")
        logger.info(f"Template data: {template_data}")
        
        # For now, let's create insights without vector store to avoid complexity
        # In a real implementation, you'd use the vector store here
        
        # Use template-specific prompt if available
        if template_data and template_data.get("prompts") and len(template_data["prompts"]) > 1:
            # Use the second prompt (if available) for synthesis, or adapt the first one
            synthesis_prompt = template_data["prompts"][1] if len(template_data["prompts"]) > 1 else template_data["prompts"][0]
            # Replace variables in the template
            synthesis_prompt = synthesis_prompt.replace("[industry]", query)
            synthesis_prompt = synthesis_prompt.replace("[product]", query)
            synthesis_prompt = synthesis_prompt.replace("[market]", query)
            synthesis_prompt = synthesis_prompt.replace("[company]", query)
            
            prompt_template = f"""
            {synthesis_prompt}
            
            Based on the gathered data: {{gathered_data}}
            Generate 5 specific insights. Return each insight on a new line.
            """
        else:
            # Default prompt with more specific instructions
            prompt_template = """Based on the query '{query}', analyze the gathered data and generate 5 specific market research insights.

Focus on:
- Key competitors and their market positions
- Market share and competitive dynamics  
- Strengths and weaknesses of major players
- Market trends and opportunities
- Strategic implications

Gathered data: {gathered_data}

Return each insight on a new line, focusing on actionable intelligence about the mobile market competitors."""
        
        prompt = PromptTemplate(
            input_variables=["query", "chat_history", "gathered_data"],
            template=prompt_template
        )
        
        # Create a more comprehensive summary of gathered data
        if gathered_data:
            # Group data by source type for better analysis
            data_by_source = {}
            for item in gathered_data:
                source_type = item.get('source_type', 'unknown')
                if source_type not in data_by_source:
                    data_by_source[source_type] = []
                data_by_source[source_type].append(item)
            
            # Create a structured summary
            summary_parts = []
            for source_type, items in data_by_source.items():
                summary_parts.append(f"{source_type.upper()} ({len(items)} items):")
                # Show top 3 most relevant items from each source
                for item in items[:3]:
                    title = item.get('title', 'No title')[:100]
                    content = item.get('content', item.get('snippet', ''))[:200]
                    summary_parts.append(f"  - {title}: {content}")
            
            gathered_data_summary = "\n".join(summary_parts)
        else:
            gathered_data_summary = "No data gathered"
        
        if manager.has_connections():
            await manager.send_subtask_update("data_analysis", "Data Analysis", "completed", "Data analysis completed successfully")
            await manager.send_research_progress(
                "Insight Generation",
                "Identifying key trends and patterns in collected data...",
                90
            )
            await manager.send_subtask_update("insight_generation", "Insight Generation", "in_progress", "Generating professional market insights")
        
        response = await llm.ainvoke(prompt.format(
            query=query, 
            chat_history=str(chat_history),
            gathered_data=gathered_data_summary
        ))
        
        if manager.has_connections():
            await manager.send_research_progress(
                "Insight Generation",
                "Creating professional market research insights...",
                95
            )
        
        insights = [insight.strip() for insight in response.content.split("\n") if insight.strip()]
        logger.info(f"Generated insights: {insights}")
        
        # Send individual insight updates
        if manager.has_connections():
            for i, insight in enumerate(insights[:5]):
                await manager.send_insight_update(
                    insight[:100] + "..." if len(insight) > 100 else insight,
                    i + 1,
                    5
                )
        
        if manager.has_connections():
            await manager.send_subtask_update("insight_generation", "Insight Generation", "completed", f"Generated {len(insights)} professional insights")
            await manager.send_research_progress(
                "Analysis Complete",
                f"Successfully generated {len(insights)} professional insights",
                100
            )
        
        state_dict["synthesized_insights"] = insights
        logger.info(f"Updated state with {len(insights)} insights")
        logger.info(f"Final state dict: {state_dict}")
        
        return state_dict
    except Exception as e:
        logger.error(f"Synthesizer error: {e}", exc_info=True)
        # Return original state as dict if error occurs
        if hasattr(state, 'model_dump'):
            return state.model_dump()
        return dict(state)
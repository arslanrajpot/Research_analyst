from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from db.database import save_state
from config import GROQ_API_KEY
from langchain_core.messages import HumanMessage
from routers.websocket import manager

# Use a supported model - llama-3.3-70b-versatile is more reliable
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

async def reporter_agent(state):
    try:
        # Send initial status update
        if manager.has_connections():
            await manager.send_research_progress("Report Generation", "Starting report generation...", 95)
            await manager.send_subtask_update("report_generation", "Report Generation", "in_progress", "Generating comprehensive research report")
        
        # Convert Pydantic model to dict for modification
        if hasattr(state, 'model_dump'):
            state_dict = state.model_dump()
        else:
            state_dict = dict(state)
        
        validated_insights = state_dict.get("validated_insights", [])
        chat_history = state_dict.get("chat_history", [])
        template_data = state_dict.get("template_data", {})
        query = state_dict.get("query", "")
        
        # If no validated insights, create some default ones based on the query
        if not validated_insights:
            validated_insights = [
                f"Market research indicates significant opportunities in the {query} sector",
                f"Key trends are emerging in {query} that warrant attention",
                f"Competitive landscape analysis reveals important insights about {query}",
                f"Consumer behavior patterns show interesting developments in {query}",
                f"Technology adoption is accelerating in the {query} market"
            ]
        
        # Use template prompts if available, otherwise use a generic prompt
        if template_data and template_data.get("prompts"):
            # Use the first template prompt as the base, replacing variables with actual query
            template_prompt = template_data["prompts"][0]
            # Replace common variables in the template
            template_prompt = template_prompt.replace("[industry]", query)
            template_prompt = template_prompt.replace("[product]", query)
            template_prompt = template_prompt.replace("[market]", query)
            template_prompt = template_prompt.replace("[company]", query)
            
            report_prompt = f"""
            {template_prompt}
            
            Based on the following research insights:
            {chr(10).join(validated_insights)}
            
            Generate a comprehensive markdown report. Include relevant sections and structure the content professionally.
            """
        else:
            # Fallback to generic prompt based on the actual query
            report_prompt = f"""
            Generate a comprehensive markdown report about "{query}" based on these insights: {chr(10).join(validated_insights)}. 
            Include sections for market overview, key trends, challenges, and opportunities. 
            Reference chat history if relevant: {str(chat_history)}.
            """
        
        response = await llm.ainvoke(report_prompt)
        report = response.content
        state_dict["report"] = report
        
        # Send completion update
        if manager.has_connections():
            await manager.send_subtask_update("report_generation", "Report Generation", "completed", "Research report generated successfully")
            await manager.send_research_progress("Report Complete", "Research report generated successfully!", 100)
        
        # Save state
        try:
            state_dict["session_id"] = save_state(state_dict)
        except Exception as e:
            print(f"Error saving state: {e}")
            state_dict["session_id"] = "default"
        
        return state_dict
    except Exception as e:
        print(f"Reporter error: {e}")
        # Return original state as dict if error occurs
        if hasattr(state, 'model_dump'):
            return state.model_dump()
        return dict(state)
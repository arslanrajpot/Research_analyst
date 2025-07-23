from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from tools.web_search import web_search_tool
from config import GROQ_API_KEY
import logging
import re

# Set up logging
logger = logging.getLogger(__name__)

# Use a supported model - llama-3.3-70b-versatile is more reliable
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

async def critic_agent(state):
    try:
        logger.info(f"Critic agent called with state type: {type(state)}")
        
        # Convert Pydantic model to dict for modification
        if hasattr(state, 'model_dump'):
            state_dict = state.model_dump()
            logger.info("Converted Pydantic model to dict")
        else:
            state_dict = dict(state)
            logger.info("Converted state to dict")
        
        insights = state_dict.get("synthesized_insights", [])
        validated_insights = []
        
        logger.info(f"Validating {len(insights)} insights")
        
        for i, insight in enumerate(insights):
            logger.info(f"Validating insight {i+1}: {insight[:100]}...")
            
            # Use a simpler prompt that's more likely to return a number
            prompt = PromptTemplate(
                input_variables=["insight"],
                template="Rate the credibility of this insight from 1-10 (where 10 is most credible). Return ONLY the number: '{insight}'"
            )
            
            try:
                response = await llm.ainvoke(prompt.format(insight=insight))
                response_text = response.content.strip()
                
                # Try to extract a number from the response
                score_match = re.search(r'\b(\d+)\b', response_text)
                if score_match:
                    score = int(score_match.group(1))
                    logger.info(f"Extracted score: {score}")
                else:
                    # If no number found, use a default score based on response length
                    score = 7 if len(response_text) > 20 else 5
                    logger.info(f"No score found, using default: {score}")
                
                # Accept insights with score >= 5
                if score >= 5:
                    validated_insights.append(insight)
                    logger.info(f"Insight {i+1} validated with score {score}")
                else:
                    logger.info(f"Insight {i+1} rejected with score {score}")
                    
            except Exception as e:
                logger.error(f"Error validating insight {i+1}: {e}")
                # If validation fails, accept the insight anyway
                validated_insights.append(insight)
                logger.info(f"Insight {i+1} accepted due to validation error")
        
        # If no insights were validated, accept all insights to prevent infinite loop
        if not validated_insights and insights:
            logger.warning("No insights validated, accepting all insights to prevent infinite loop")
            validated_insights = insights
        
        state_dict["validated_insights"] = validated_insights
        logger.info(f"Final validated insights: {len(validated_insights)}")
        
        return state_dict
    except Exception as e:
        logger.error(f"Critic error: {e}", exc_info=True)
        # Return original state as dict if error occurs, but accept all insights
        if hasattr(state, 'model_dump'):
            state_dict = state.model_dump()
        else:
            state_dict = dict(state)
        
        # Accept all insights to prevent infinite loop
        insights = state_dict.get("synthesized_insights", [])
        state_dict["validated_insights"] = insights
        logger.info("Critic failed, accepting all insights")
        
        return state_dict
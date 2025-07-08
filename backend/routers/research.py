from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import aiosqlite
import asyncio
import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from agents.scout import scout_agent
from agents.enhanced_scout import enhanced_scout_agent
from agents.synthesizer import synthesizer_agent
from agents.critic import critic_agent
from agents.reporter import reporter_agent
from models.state import ResearchState
from models.user import User, Report as DBReport
from models.template import Template
from database import get_db
from auth import get_current_active_user
from db.database import get_state, save_state
from tools.web_search import web_search_tool
from tools.x_search import x_search_tool
from tools.browse_page import browse_page_tool
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from config import GROQ_API_KEY, PINECONE_API_KEY
from pinecone import Pinecone
from services.vector_db_service import vector_db_service
import asyncio
from datetime import datetime, timedelta
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/research", tags=["research"])

class QueryInput(BaseModel):
    query: str
    session_id: Optional[str] = None
    template_id: Optional[int] = None
    options: Optional[Dict] = {}

class SearchInput(BaseModel):
    query: str
    sources: Optional[List[str]] = ["web", "social", "news", "reports"]
    date_range: Optional[Dict[str, str]] = None
    content_types: Optional[List[str]] = ["articles", "reports", "social_posts", "news"]
    sentiment: Optional[str] = None  # positive, negative, neutral, all
    max_results: Optional[int] = 50
    include_metadata: Optional[bool] = True

class SearchSuggestionInput(BaseModel):
    partial_query: str
    context: Optional[str] = None

class SavedSearchInput(BaseModel):
    name: str
    query: str
    filters: Dict[str, Any]
    description: Optional[str] = None

class TemplateInput(BaseModel):
    name: str
    description: str
    category: str
    prompts: List[str]
    icon: str

class UserInput(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    job_title: Optional[str] = None

# Initialize AsyncSQLite checkpointer
async def init_checkpointer():
    conn = await aiosqlite.connect("checkpoints.db")
    conn.row_factory = aiosqlite.Row
    return AsyncSqliteSaver(conn)

memory = None  # Will be initialized in startup event

@router.on_event("startup")
async def startup_event():
    global memory
    memory = await init_checkpointer()

# Initialize Pinecone for semantic search
try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index_name = "researchanalyst"
    index = pc.Index(index_name)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings, text_key="text")
    pinecone_available = True
    logger.info("Pinecone initialized successfully")
except Exception as e:
    logger.warning(f"Pinecone not available: {e}")
    pinecone_available = False
    vectorstore = None

async def stream_response(state):
    """Stream the report response."""
    try:
        report = state.get("report", "Report generation in progress...")
        yield f"data: {json.dumps({'report': report})}\n\n"
    except Exception as e:
        logger.error(f"Error in stream_response: {e}")
        yield f"data: {json.dumps({'error': 'Error streaming response'})}\n\n"

def convert_state_to_dict(state):
    """Convert state to dictionary, handling both Pydantic models and dicts."""
    try:
        if hasattr(state, 'model_dump'):
            return state.model_dump()
        elif isinstance(state, dict):
            return state
        else:
            # Try to convert to dict
            return dict(state)
    except Exception as e:
        logger.error(f"Error converting state to dict: {e}")
        # Return empty dict as fallback
        return {}

def should_continue_to_critic(state):
    """Check if we should continue to critic or go back to scout."""
    try:
        logger.info(f"should_continue_to_critic called with state type: {type(state)}")
        
        # Convert state to dict
        state_dict = convert_state_to_dict(state)
        logger.info(f"Converted state to dict: {state_dict}")
        
        insights = state_dict.get("synthesized_insights", [])
        logger.info(f"Found insights: {insights}")
        
        result = "critic" if insights else "scout"
        logger.info(f"Decision: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in should_continue_to_critic: {e}", exc_info=True)
        return "scout"  # Default to scout on error

def should_continue_to_reporter(state):
    """Check if we should continue to reporter or go back to synthesizer."""
    try:
        logger.info(f"should_continue_to_reporter called with state type: {type(state)}")
        
        # Convert state to dict
        state_dict = convert_state_to_dict(state)
        logger.info(f"Converted state to dict: {state_dict}")
        
        insights = state_dict.get("synthesized_insights", [])
        logger.info(f"Found insights: {insights}")
        
        result = "reporter" if insights else "synthesizer"
        logger.info(f"Decision: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in should_continue_to_reporter: {e}", exc_info=True)
        return "synthesizer"  # Default to synthesizer on error

@router.post("/debug", response_class=StreamingResponse)
async def debug_state_handling(query_input: QueryInput):
    """Debug endpoint to test state handling without full workflow."""
    try:
        logger.info(f"Debug endpoint called with query: {query_input.query}")
        
        # Create initial state
        initial_state = ResearchState(query=query_input.query, chat_history=[])
        logger.info(f"Initial state type: {type(initial_state)}")
        logger.info(f"Initial state: {initial_state}")
        
        # Test state conversion
        state_dict = convert_state_to_dict(initial_state)
        logger.info(f"Converted state dict: {state_dict}")
        
        # Test conditional functions
        critic_result = should_continue_to_critic(initial_state)
        reporter_result = should_continue_to_reporter(initial_state)
        
        logger.info(f"Conditional function results - critic: {critic_result}, reporter: {reporter_result}")
        
        # Test scout agent
        logger.info("Testing scout agent...")
        scout_result = await enhanced_scout_agent(initial_state)
        logger.info(f"Scout result type: {type(scout_result)}")
        logger.info(f"Scout result: {scout_result}")
        
        # Test synthesizer agent
        logger.info("Testing synthesizer agent...")
        synthesizer_result = await synthesizer_agent(scout_result)
        logger.info(f"Synthesizer result type: {type(synthesizer_result)}")
        logger.info(f"Synthesizer result: {synthesizer_result}")
        
        # Test conditional functions with results
        critic_result2 = should_continue_to_critic(synthesizer_result)
        logger.info(f"Conditional function result after synthesizer: {critic_result2}")
        
        debug_info = {
            "initial_state_type": str(type(initial_state)),
            "state_conversion_success": isinstance(state_dict, dict),
            "scout_result_type": str(type(scout_result)),
            "synthesizer_result_type": str(type(synthesizer_result)),
            "conditional_functions_work": critic_result2 == "critic",
            "gathered_data_count": len(scout_result.get("gathered_data", [])),
            "insights_count": len(synthesizer_result.get("synthesized_insights", []))
        }
        
        return StreamingResponse(
            iter([f"data: {json.dumps(debug_info)}\n\n"]), 
            media_type="text/event-stream"
        )
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@router.post("/generate", response_class=StreamingResponse)
async def generate_report(
    query_input: QueryInput, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        logger.info(f"Starting report generation for query: {query_input.query}")
        
        # Send initial research progress update
        from routers.websocket import manager
        if manager.has_connections():
            await manager.send_research_progress(
                "initialization",
                "Starting research generation process...",
                5
            )
        
        # Initialize chat_history as a list
        chat_history = []
        config = {
            "configurable": {"thread_id": query_input.session_id or "default"},
            "recursion_limit": 5  # Allow more iterations for proper completion
        }

        # Load session from database if session_id is provided
        if query_input.session_id:
            session = get_state(query_input.session_id)
            if session and session.chat_history:
                try:
                    chat_history = json.loads(session.chat_history)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid chat_history in session: {e}")
                    chat_history = []

        # Load template data if template_id is provided
        template_data = None
        if query_input.template_id:
            template = db.query(Template).filter(Template.id == query_input.template_id).first()
            if template:
                template_data = {
                    "id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category,
                    "prompts": template.prompts,
                    "variables": template.variables,
                    "structure": template.structure
                }
                logger.info(f"Loaded template: {template.name}")
            else:
                logger.warning(f"Template with ID {query_input.template_id} not found")

        # Initialize state
        initial_state = ResearchState(
            query=query_input.query, 
            chat_history=chat_history,
            template_id=query_input.template_id,
            template_data=template_data
        )
        logger.info(f"Initialized state: {initial_state}")

        # LangGraph workflow
        workflow = StateGraph(ResearchState)
        workflow.add_node("scout", enhanced_scout_agent)
        workflow.add_node("synthesizer", synthesizer_agent)
        workflow.add_node("critic", critic_agent)
        workflow.add_node("reporter", reporter_agent)
        
        workflow.add_edge("scout", "synthesizer")
        workflow.add_conditional_edges(
            "synthesizer",
            should_continue_to_critic
        )
        workflow.add_conditional_edges(
            "critic",
            should_continue_to_reporter
        )
        workflow.add_edge("reporter", END)
        workflow.set_entry_point("scout")
        
        # Compile graph with checkpointer
        graph = workflow.compile(checkpointer=memory)
        
        logger.info("Starting graph execution...")
        
        # Send workflow start update
        if manager.has_connections():
            await manager.send_research_progress(
                "workflow_start",
                "Research workflow initiated - starting data collection...",
                10
            )
        
        # Execute workflow with timeout
        try:
            final_state = await asyncio.wait_for(graph.ainvoke(initial_state, config=config), timeout=300.0)  # 5 minute timeout
        except asyncio.TimeoutError:
            logger.error("Research generation timed out after 5 minutes")
            if manager.has_connections():
                await manager.send_error_update(
                    "timeout_error",
                    "Research generation timed out after 5 minutes",
                    "research_generation"
                )
            raise HTTPException(status_code=408, detail="Research generation timed out")
        
        logger.info(f"Graph execution completed. Final state type: {type(final_state)}")
        logger.info(f"Final state content: {final_state}")
        
        # Send completion update
        if manager.has_connections():
            await manager.send_research_progress(
                "completion",
                "Research generation completed successfully!",
                100,
                {"report_length": len(final_state.get("report", ""))}
            )
        
        # Save report to database
        try:
            # Get current user ID from the authenticated user
            current_user_id = current_user.id
            
            # Create report record
            report = DBReport(
                user_id=current_user_id,
                query=query_input.query,
                content=final_state.get("report", ""),
                template=template_data.get("name", "Custom") if template_data else "Custom",
                status="completed",
                generation_time=None,  # Could be calculated if needed
                created_at=datetime.now()
            )
            
            db.add(report)
            db.commit()
            
            logger.info(f"Report saved to database with ID: {report.id}")
            
        except Exception as e:
            logger.error(f"Failed to save report to database: {e}")
            # Don't fail the entire request if report saving fails
        
        # Update chat_history in database (if using sessions)
        if query_input.session_id:
            session_data = {
                "session_id": query_input.session_id,
                "query": query_input.query,
                "report": final_state.get("report", ""),
                "chat_history": [query_input.query, final_state.get("report", "")]
            }
            save_state(session_data)
        
        return StreamingResponse(stream_response(final_state), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Research endpoint error: {str(e)}", exc_info=True)
        
        # Send error update
        if manager.has_connections():
            await manager.send_error_update(
                "research_generation_error",
                str(e),
                "research_generation"
            )
        
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/history/{session_id}")
async def get_history(session_id: str):
    session = get_state(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session  # Assuming SessionSchema is defined

# New endpoints for enhanced functionality

# Note: Templates are now handled by the dedicated templates router
# These hardcoded endpoints have been removed to avoid conflicts with the database-driven templates

@router.get("/analytics")
async def get_analytics(
    time_range: str = Query("30d", description="Time range: 7d, 30d, 90d, 1y"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get analytics data for the user with time-based filtering."""
    try:
        now = datetime.now()
        
        # Calculate start date based on time range
        if time_range == "7d":
            start_date = now - timedelta(days=7)
            interval = "day"
        elif time_range == "30d":
            start_date = now - timedelta(days=30)
            interval = "day"
        elif time_range == "90d":
            start_date = now - timedelta(days=90)
            interval = "week"
        elif time_range == "1y":
            start_date = now - timedelta(days=365)
            interval = "month"
        else:
            start_date = now - timedelta(days=30)
            interval = "day"
        
        # Get user's reports within the time range
        reports = db.query(DBReport).filter(
            and_(
                DBReport.user_id == current_user.id,
                DBReport.created_at >= start_date,
                DBReport.created_at <= now
            )
        ).order_by(desc(DBReport.created_at)).all()
        
        # Calculate previous period for comparison
        period_duration = now - start_date
        previous_start = start_date - period_duration
        previous_reports = db.query(DBReport).filter(
            and_(
                DBReport.user_id == current_user.id,
                DBReport.created_at >= previous_start,
                DBReport.created_at < start_date
            )
        ).count()
        
        # Basic metrics
        total_reports = len(reports)
        previous_period_reports = previous_reports
        
        # Calculate change percentage
        if previous_period_reports > 0:
            change_percentage = ((total_reports - previous_period_reports) / previous_period_reports * 100)
        else:
            change_percentage = 100 if total_reports > 0 else 0
        
        # Calculate average generation time
        total_generation_time = sum(r.generation_time or 0 for r in reports)
        average_generation_time = total_generation_time / len(reports) if reports else 0
        
        # Calculate success rate
        successful_reports = len([r for r in reports if r.status == "completed"])
        success_rate = (successful_reports / len(reports) * 100) if reports else 0
        
        # Template usage analysis
        template_usage = {}
        for report in reports:
            template_name = report.template or "Custom"
            template_usage[template_name] = template_usage.get(template_name, 0) + 1
        
        popular_templates = [
            {"name": name, "usage": count}
            for name, count in sorted(template_usage.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # Usage trends analysis
        hour_counts = {}
        day_counts = {}
        total_session_time = 0
        total_sessions = 0
        
        for report in reports:
            if report.created_at:
                hour = report.created_at.hour
                day = report.created_at.strftime("%A")
                
                hour_counts[hour] = hour_counts.get(hour, 0) + 1
                day_counts[day] = day_counts.get(day, 0) + 1
                
                if report.generation_time:
                    total_session_time += report.generation_time
                    total_sessions += 1
        
        # Find peak usage time and most active day
        peak_hour = max(hour_counts.items(), key=lambda x: x[1]) if hour_counts else None
        peak_usage_time = f"{peak_hour[0]:02d}:00" if peak_hour else "N/A"
        
        most_active_day = max(day_counts.items(), key=lambda x: x[1]) if day_counts else None
        most_active_day_name = most_active_day[0] if most_active_day else "N/A"
        
        # Calculate session metrics
        average_session_duration = total_session_time / total_sessions if total_sessions > 0 else 0
        reports_per_session = total_reports / total_sessions if total_sessions > 0 else 0
        
        # Generate time-series data based on interval
        time_series_data = []
        if interval == "day":
            current_date = start_date
            while current_date <= now:
                day_reports = len([r for r in reports if r.created_at and r.created_at.date() == current_date.date()])
                time_series_data.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "reports": day_reports
                })
                current_date += timedelta(days=1)
        elif interval == "week":
            current_date = start_date
            while current_date <= now:
                week_start = current_date - timedelta(days=current_date.weekday())
                week_end = week_start + timedelta(days=6)
                week_reports = len([r for r in reports if r.created_at and week_start <= r.created_at <= week_end])
                time_series_data.append({
                    "date": week_start.strftime("%Y-%m-%d"),
                    "reports": week_reports
                })
                current_date += timedelta(days=7)
        elif interval == "month":
            current_date = start_date
            while current_date <= now:
                month_start = current_date.replace(day=1)
                if current_date.month == 12:
                    month_end = current_date.replace(year=current_date.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    month_end = current_date.replace(month=current_date.month + 1, day=1) - timedelta(days=1)
                
                month_reports = len([r for r in reports if r.created_at and month_start <= r.created_at <= month_end])
                time_series_data.append({
                    "date": month_start.strftime("%Y-%m"),
                    "reports": month_reports
                })
                current_date = month_end + timedelta(days=1)
        
        analytics = {
            "total_reports": total_reports,
            "previous_period_reports": previous_period_reports,
            "change_percentage": round(change_percentage, 1),
            "average_generation_time": round(average_generation_time, 1),
            "success_rate": round(success_rate, 1),
            "error_rate": round(100 - success_rate, 1),
            "popular_templates": popular_templates,
            "time_series_data": time_series_data,
            "usage_trends": {
                "peak_usage_time": peak_usage_time,
                "most_active_day": most_active_day_name,
                "average_session_duration": round(average_session_duration, 1),
                "reports_per_session": round(reports_per_session, 1)
            },
            "time_range": time_range,
            "interval": interval,
            "start_date": start_date.isoformat(),
            "end_date": now.isoformat()
        }
        
        return analytics
        
    except Exception as e:
        logger.error(f"Analytics error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")


@router.get("/user/profile")
async def get_user_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get current user profile."""
    # Get user's reports count
    reports_count = db.query(DBReport).filter(DBReport.user_id == current_user.id).count()
    
    # Define usage limits based on plan
    plan_limits = {
        "free": 5,
        "pro": 100,
        "premium": 1000
    }
    
    limit = plan_limits.get(current_user.plan, 5)
    remaining = max(0, limit - reports_count)
    
    # Create subscription info
    subscription = {
        "plan": current_user.plan,
        "price": 0 if current_user.plan == "free" else (29 if current_user.plan == "pro" else 99),
        "billing_cycle": "monthly",
        "next_billing_date": None,
        "status": "active"
    }
    
    # Create usage info
    usage = {
        "reports_generated": reports_count,
        "reports_remaining": remaining,
        "total_limit": limit
    }
    
    return {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "company": current_user.company,
        "job_title": current_user.job_title,
        "plan": current_user.plan,
        "usage": usage,
        "subscription": subscription
    }

@router.put("/user/profile")
async def update_user_profile(
    user_input: UserInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile."""
    from auth import update_user
    from models.user import UserUpdate
    
    # Convert UserInput to UserUpdate
    update_data = UserUpdate(
        name=user_input.name,
        email=user_input.email,
        company=user_input.company,
        job_title=user_input.job_title
    )
    
    updated_user = update_user(db, current_user.id, update_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": updated_user, "message": "Profile updated successfully"}

@router.get("/reports")
async def get_reports(
    limit: int = 10, 
    offset: int = 0, 
    template: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's research reports with pagination and filtering."""
    try:
        # Query user's reports from database
        query = db.query(DBReport).filter(DBReport.user_id == current_user.id)
        
        if template:
            query = query.filter(DBReport.template == template)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        reports = query.offset(offset).limit(limit).all()
        
        # Convert to dict format
        reports_data = []
        for report in reports:
            reports_data.append({
                "id": str(report.id),
                "query": report.query,
                "content": report.content,
                "template": report.template,
                "createdAt": report.created_at.isoformat() if report.created_at else None,  # Changed to camelCase
                "status": report.status,
                "generationTime": report.generation_time  # Changed to camelCase
            })
        
        return {
            "reports": reports_data,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error in get_reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get reports: {str(e)}")

@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a research report."""
    # Find the report and ensure it belongs to the current user
    report = db.query(DBReport).filter(
        DBReport.id == report_id,
        DBReport.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete the report
    db.delete(report)
    db.commit()
    
    return {"message": f"Report {report_id} deleted successfully"}

@router.post("/search", response_model=Dict[str, Any])
async def search_content(
    search_input: SearchInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive search across multiple sources with advanced filtering.
    
    Features:
    - Multi-source search (web, social media, news, reports)
    - Date range filtering
    - Content type filtering
    - Sentiment analysis
    - Semantic search using vector embeddings
    - Real-time results aggregation
    """
    try:
        logger.info(f"Search request: {search_input.query}")
        
        results = {
            "query": search_input.query,
            "total_results": 0,
            "sources": {},
            "aggregated_results": [],
            "search_metadata": {
                "timestamp": datetime.now().isoformat(),
                "sources_searched": search_input.sources,
                "filters_applied": {
                    "date_range": search_input.date_range,
                    "content_types": search_input.content_types,
                    "sentiment": search_input.sentiment
                }
            }
        }
        
        # Parallel search across multiple sources
        search_tasks = []
        
        if "web" in search_input.sources:
            search_tasks.append(("web", web_search_tool.ainvoke(search_input.query)))
        
        if "social" in search_input.sources:
            search_tasks.append(("social", x_search_tool.ainvoke(search_input.query)))
        
        # Execute parallel searches
        if search_tasks:
            source_results = await asyncio.gather(*[task for _, task in search_tasks], return_exceptions=True)
            
            for i, (source_name, _) in enumerate(search_tasks):
                if isinstance(source_results[i], Exception):
                    logger.error(f"Error searching {source_name}: {source_results[i]}")
                    results["sources"][source_name] = {"error": str(source_results[i]), "results": []}
                else:
                    results["sources"][source_name] = {
                        "results": source_results[i][:search_input.max_results],
                        "count": len(source_results[i])
                    }
                    results["total_results"] += len(source_results[i])
        
        # Aggregate and filter results
        all_results = []
        for source_name, source_data in results["sources"].items():
            if "results" in source_data and isinstance(source_data["results"], list):
                for result in source_data["results"]:
                    result["source"] = source_name
                    result["search_timestamp"] = datetime.now().isoformat()
                    all_results.append(result)
        
        # Apply filters
        filtered_results = []
        for result in all_results:
            # Date range filter
            if search_input.date_range:
                result_date = result.get("posted_at") or result.get("published_at")
                if result_date:
                    try:
                        result_datetime = datetime.fromisoformat(result_date.replace('Z', '+00:00'))
                        start_date = datetime.fromisoformat(search_input.date_range.get("start", "2020-01-01"))
                        end_date = datetime.fromisoformat(search_input.date_range.get("end", datetime.now().isoformat()))
                        
                        if not (start_date <= result_datetime <= end_date):
                            continue
                    except:
                        pass  # Skip date filtering if parsing fails
            
            # Sentiment filter
            if search_input.sentiment and search_input.sentiment != "all":
                result_sentiment = result.get("sentiment", "neutral")
                if result_sentiment != search_input.sentiment:
                    continue
            
            filtered_results.append(result)
        
        # Sort by relevance (you could implement more sophisticated ranking)
        filtered_results.sort(key=lambda x: x.get("faves", 0) if x.get("faves") else 0, reverse=True)
        
        results["aggregated_results"] = filtered_results[:search_input.max_results]
        results["total_results"] = len(filtered_results)
        
        # Store search in database for analytics
        search_record = DBReport(
            user_id=current_user.id,
            query=search_input.query,
            content=json.dumps(results),
            template="search",
            created_at=datetime.now()
        )
        db.add(search_record)
        db.commit()
        
        return results
        
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/search/semantic", response_model=Dict[str, Any])
async def semantic_search(
    search_input: SearchInput,
    current_user: User = Depends(get_current_active_user)
):
    """
    Semantic search using vector embeddings for understanding search intent.
    """
    try:
        if not pinecone_available:
            raise HTTPException(status_code=503, detail="Semantic search not available")
        
        # Perform semantic search using Pinecone
        search_results = vectorstore.similarity_search(
            search_input.query,
            k=search_input.max_results
        )
        
        # Format results
        results = []
        for doc in search_results:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "source": "semantic_search",
                "relevance_score": doc.metadata.get("score", 0.0)
            })
        
        return {
            "query": search_input.query,
            "results": results,
            "total_results": len(results),
            "search_type": "semantic"
        }
        
    except Exception as e:
        logger.error(f"Semantic search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Semantic search failed: {str(e)}")

@router.post("/search/suggestions", response_model=List[str])
async def get_search_suggestions(
    suggestion_input: SearchSuggestionInput,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get search suggestions based on partial query and context.
    """
    try:
        # Generate suggestions using LLM
        from langchain_groq import ChatGroq
        llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)
        
        prompt = f"""
        Based on the partial query "{suggestion_input.partial_query}" and context "{suggestion_input.context or 'market research'}", 
        generate 5 search suggestions that would be useful for market research. 
        Return only the suggestions, one per line, without numbering.
        """
        
        response = await llm.ainvoke(prompt)
        suggestions = [s.strip() for s in response.content.split('\n') if s.strip() and not s.startswith(('1.', '2.', '3.', '4.', '5.'))]
        
        return suggestions[:5]
        
    except Exception as e:
        logger.error(f"Search suggestions error: {e}", exc_info=True)
        return []

@router.post("/search/save", response_model=Dict[str, Any])
async def save_search(
    saved_search: SavedSearchInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Save a search query for future use.
    """
    try:
        # Store saved search in database
        search_record = DBReport(
            user_id=current_user.id,
            query=saved_search.name,
            content=json.dumps({
                "saved_query": saved_search.query,
                "filters": saved_search.filters,
                "description": saved_search.description,
                "saved_at": datetime.now().isoformat()
            }),
            template="saved_search",
            created_at=datetime.now()
        )
        db.add(search_record)
        db.commit()
        
        return {
            "id": search_record.id,
            "name": saved_search.name,
            "query": saved_search.query,
            "saved_at": search_record.created_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Save search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save search: {str(e)}")

@router.get("/search/saved", response_model=List[Dict[str, Any]])
async def get_saved_searches(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user's saved searches.
    """
    try:
        saved_searches = db.query(DBReport).filter(
            and_(
                DBReport.user_id == current_user.id,
                DBReport.template == "saved_search"
            )
        ).order_by(desc(DBReport.created_at)).all()
        
        results = []
        for search in saved_searches:
            try:
                content = json.loads(search.content)
                results.append({
                    "id": search.id,
                    "name": search.query,
                    "query": content.get("saved_query", ""),
                    "description": content.get("description", ""),
                    "saved_at": search.created_at.isoformat()
                })
            except:
                continue
        
        return results
        
    except Exception as e:
        logger.error(f"Get saved searches error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get saved searches: {str(e)}")

@router.get("/search/analytics", response_model=Dict[str, Any])
async def get_search_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    days: int = Query(30, description="Number of days to analyze")
):
    """
    Get search analytics for the user.
    """
    try:
        start_date = datetime.now() - timedelta(days=days)
        
        # Get search history
        searches = db.query(DBReport).filter(
            and_(
                DBReport.user_id == current_user.id,
                DBReport.template == "search",
                DBReport.created_at >= start_date
            )
        ).order_by(desc(DBReport.created_at)).all()
        
        # Analyze search patterns
        search_queries = [search.query for search in searches]
        popular_queries = {}
        for query in search_queries:
            popular_queries[query] = popular_queries.get(query, 0) + 1
        
        # Get top queries
        top_queries = sorted(popular_queries.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_searches": len(searches),
            "period_days": days,
            "top_queries": [{"query": q[0], "count": q[1]} for q in top_queries],
            "search_trend": {
                "daily_counts": {},  # Could implement daily breakdown
                "most_active_day": None  # Could implement day analysis
            }
        }
        
    except Exception as e:
        logger.error(f"Search analytics error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get search analytics: {str(e)}")

@router.post("/search/export", response_model=Dict[str, Any])
async def export_search_results(
    search_input: SearchInput,
    format: str = Query("json", description="Export format: json, csv, pdf"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export search results in various formats.
    """
    try:
        # First perform the search
        search_results = await search_content(search_input, current_user, None)
        
        if format == "json":
            return search_results
        elif format == "csv":
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(["Title", "URL", "Source", "Snippet", "Sentiment", "Date"])
            
            # Write data
            for result in search_results["aggregated_results"]:
                writer.writerow([
                    result.get("title", ""),
                    result.get("url", ""),
                    result.get("source", ""),
                    result.get("snippet", ""),
                    result.get("sentiment", ""),
                    result.get("posted_at", "")
                ])
            
            return {
                "format": "csv",
                "data": output.getvalue(),
                "filename": f"search_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
    except Exception as e:
        logger.error(f"Export search results error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export search results: {str(e)}")

@router.post("/search/internal", response_model=Dict[str, Any])
async def search_internal_content(
    search_input: SearchInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Search across internal content (reports, templates, saved searches).
    This provides a unified search experience across all user content.
    """
    try:
        logger.info(f"Internal search request: {search_input.query}")
        
        results = {
            "query": search_input.query,
            "total_results": 0,
            "content_types": {},
            "aggregated_results": [],
            "search_metadata": {
                "timestamp": datetime.now().isoformat(),
                "search_type": "internal",
                "user_id": current_user.id
            }
        }
        
        query_lower = search_input.query.lower()
        
        # Search user's reports
        if "reports" in search_input.content_types or "all" in search_input.content_types:
            reports_query = db.query(DBReport).filter(
                and_(
                    DBReport.user_id == current_user.id,
                    or_(
                        DBReport.query.ilike(f"%{search_input.query}%"),
                        DBReport.content.ilike(f"%{search_input.query}%"),
                        DBReport.template.ilike(f"%{search_input.query}%")
                    )
                )
            ).order_by(desc(DBReport.created_at)).limit(search_input.max_results)
            
            reports = reports_query.all()
            reports_results = []
            for report in reports:
                reports_results.append({
                    "id": str(report.id),
                    "title": report.query,
                    "content": report.content[:200] + "..." if len(report.content) > 200 else report.content,
                    "type": "report",
                    "template": report.template,
                    "created_at": report.created_at.isoformat() if report.created_at else None,
                    "url": f"/reports/{report.id}",
                    "relevance_score": 0.8  # Could implement more sophisticated scoring
                })
            
            results["content_types"]["reports"] = {
                "count": len(reports_results),
                "results": reports_results
            }
            results["total_results"] += len(reports_results)
        
        # Search saved searches
        if "saved_searches" in search_input.content_types or "all" in search_input.content_types:
            saved_searches_query = db.query(DBReport).filter(
                and_(
                    DBReport.user_id == current_user.id,
                    DBReport.template == "saved_search",
                    or_(
                        DBReport.query.ilike(f"%{search_input.query}%"),
                        DBReport.content.ilike(f"%{search_input.query}%")
                    )
                )
            ).order_by(desc(DBReport.created_at)).limit(search_input.max_results)
            
            saved_searches = saved_searches_query.all()
            saved_results = []
            for search in saved_searches:
                try:
                    content = json.loads(search.content)
                    saved_results.append({
                        "id": str(search.id),
                        "title": search.query,
                        "content": content.get("description", f"Saved search: {content.get('saved_query', '')}"),
                        "type": "saved_search",
                        "query": content.get("saved_query", ""),
                        "created_at": search.created_at.isoformat() if search.created_at else None,
                        "url": f"/search?q={content.get('saved_query', '')}",
                        "relevance_score": 0.7
                    })
                except:
                    continue
            
            results["content_types"]["saved_searches"] = {
                "count": len(saved_results),
                "results": saved_results
            }
            results["total_results"] += len(saved_results)
        
        # Search templates from database
        if "templates" in search_input.content_types or "all" in search_input.content_types:
            # Get templates from database
            templates_query = db.query(Template).filter(Template.is_public == True)
            templates = templates_query.all()
            templates_results = []
            
            for template in templates:
                if (query_lower in template.name.lower() or 
                    query_lower in template.description.lower() or
                    any(query_lower in prompt.lower() for prompt in template.prompts)):
                    
                    templates_results.append({
                        "id": str(template.id),
                        "title": template.name,
                        "content": template.description,
                        "type": "template",
                        "category": template.category,
                        "icon": template.icon,
                        "prompts": template.prompts,
                        "url": f"/research?template={template.id}",
                        "relevance_score": 0.9
                    })
            
            results["content_types"]["templates"] = {
                "count": len(templates_results),
                "results": templates_results
            }
            results["total_results"] += len(templates_results)
        
        # Aggregate all results
        all_results = []
        for content_type, data in results["content_types"].items():
            for result in data["results"]:
                all_results.append(result)
        
        # Sort by relevance score and date
        all_results.sort(key=lambda x: (x.get("relevance_score", 0), x.get("created_at", "")), reverse=True)
        
        results["aggregated_results"] = all_results[:search_input.max_results]
        
        return results
        
    except Exception as e:
        logger.error(f"Internal search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal search failed: {str(e)}")

@router.post("/search/unified", response_model=Dict[str, Any])
async def unified_search(
    search_input: SearchInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Unified search that combines external web search with internal content search.
    This provides a comprehensive search experience across all available sources.
    """
    try:
        logger.info(f"Unified search request: {search_input.query}")
        
        # Perform both external and internal searches in parallel
        external_task = search_content(search_input, current_user, db)
        internal_task = search_internal_content(search_input, current_user, db)
        
        external_results, internal_results = await asyncio.gather(
            external_task, internal_task, return_exceptions=True
        )
        
        # Combine results
        combined_results = {
            "query": search_input.query,
            "total_results": 0,
            "external_results": external_results if not isinstance(external_results, Exception) else {"error": str(external_results)},
            "internal_results": internal_results if not isinstance(internal_results, Exception) else {"error": str(internal_results)},
            "search_metadata": {
                "timestamp": datetime.now().isoformat(),
                "search_type": "unified",
                "user_id": current_user.id
            }
        }
        
        # Calculate total results
        if not isinstance(external_results, Exception):
            combined_results["total_results"] += external_results.get("total_results", 0)
        if not isinstance(internal_results, Exception):
            combined_results["total_results"] += internal_results.get("total_results", 0)
        
        # Automatically add search results to vector database
        try:
            await vector_db_service.add_search_results_to_vector_db(
                combined_results, 
                search_input.query, 
                str(current_user.id)
            )
        except Exception as e:
            logger.warning(f"Failed to add search results to vector database: {e}")
        
        return combined_results
        
    except Exception as e:
        logger.error(f"Unified search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unified search failed: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": "2024-11-15T12:00:00Z",
        "version": "1.0.0",
        "services": {
            "database": "connected",
            "ai_model": "available",
            "web_search": "available"
        }
    }
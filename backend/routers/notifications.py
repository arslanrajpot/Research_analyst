from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.notification import NotificationResponse, MessageResponse, NotificationCreate, MessageCreate
from models.user import User
from auth import get_current_active_user
from services.notification_service import NotificationService
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's notifications"""
    notification_service = NotificationService(db)
    notifications = notification_service.get_user_notifications(
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only
    )
    return notifications

@router.get("/messages", response_model=List[MessageResponse])
async def get_messages(
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's messages"""
    notification_service = NotificationService(db)
    messages = notification_service.get_user_messages(
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only
    )
    return messages

@router.get("/unread-counts")
async def get_unread_counts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get unread counts for notifications and messages"""
    notification_service = NotificationService(db)
    counts = notification_service.get_unread_counts(current_user.id)
    return counts

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification_service = NotificationService(db)
    success = notification_service.mark_notification_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@router.put("/messages/{message_id}/read")
async def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    notification_service = NotificationService(db)
    success = notification_service.mark_message_read(message_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message marked as read"}

@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    notification_service = NotificationService(db)
    count = notification_service.mark_all_notifications_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}

@router.put("/messages/mark-all-read")
async def mark_all_messages_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all messages as read"""
    notification_service = NotificationService(db)
    count = notification_service.mark_all_messages_read(current_user.id)
    return {"message": f"Marked {count} messages as read"}

# Dynamic notification generation endpoints
@router.post("/generate/report-completion")
async def generate_report_completion_notification(
    report_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate notification when a report is completed"""
    notification_service = NotificationService(db)
    notification = notification_service.generate_report_completion_notification(
        current_user.id, report_data
    )
    return {"message": "Report completion notification generated", "notification_id": notification.id}

@router.post("/generate/api-warning")
async def generate_api_warning_notification(
    usage_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate API usage warning notification"""
    notification_service = NotificationService(db)
    notification = notification_service.generate_api_limit_warning(
        current_user.id, usage_data
    )
    if notification:
        return {"message": "API warning notification generated", "notification_id": notification.id}
    return {"message": "No warning needed"}

@router.post("/generate/feature-update")
async def generate_feature_update_notification(
    feature_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate feature update notification"""
    notification_service = NotificationService(db)
    notification = notification_service.generate_feature_update_notification(
        current_user.id, feature_data
    )
    return {"message": "Feature update notification generated", "notification_id": notification.id}

@router.post("/generate/usage-insight")
async def generate_usage_insight_notification(
    insight_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate usage insight notification"""
    notification_service = NotificationService(db)
    notification = notification_service.generate_usage_insight_notification(
        current_user.id, insight_data
    )
    return {"message": "Usage insight notification generated", "notification_id": notification.id}

# Message generation endpoints
@router.post("/messages/generate/welcome")
async def generate_welcome_message(
    user_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate welcome message for new users"""
    notification_service = NotificationService(db)
    message = notification_service.generate_welcome_message(current_user.id, user_data)
    return {"message": "Welcome message generated", "message_id": message.id}

@router.post("/messages/generate/weekly-summary")
async def generate_weekly_summary_message(
    summary_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate weekly summary message"""
    notification_service = NotificationService(db)
    message = notification_service.generate_weekly_summary_message(current_user.id, summary_data)
    return {"message": "Weekly summary message generated", "message_id": message.id}

@router.post("/messages/generate/support-response")
async def generate_support_response_message(
    support_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate support response message"""
    notification_service = NotificationService(db)
    message = notification_service.generate_support_response_message(current_user.id, support_data)
    return {"message": "Support response message generated", "message_id": message.id}

@router.post("/messages/generate/maintenance")
async def generate_maintenance_notification(
    maintenance_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate maintenance notification"""
    notification_service = NotificationService(db)
    message = notification_service.generate_maintenance_notification(current_user.id, maintenance_data)
    return {"message": "Maintenance notification generated", "message_id": message.id}

@router.post("/generate/billing")
async def generate_billing_notification(
    billing_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate billing notification"""
    notification_service = NotificationService(db)
    notification = notification_service.generate_billing_notification(current_user.id, billing_data)
    if notification:
        return {"message": "Billing notification generated", "notification_id": notification.id}
    return {"message": "Invalid billing data"}

@router.post("/messages/generate/security-alert")
async def generate_security_alert(
    security_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate security alert"""
    notification_service = NotificationService(db)
    message = notification_service.generate_security_alert(current_user.id, security_data)
    return {"message": "Security alert generated", "message_id": message.id}

# Sample data generation for testing
@router.post("/generate-sample-data")
async def generate_sample_data(
    notifications_count: int = Query(5, ge=1, le=20),
    messages_count: int = Query(3, ge=1, le=10),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate sample notifications and messages for testing"""
    notification_service = NotificationService(db)
    
    # Generate sample notifications
    notifications = notification_service.generate_sample_notifications(
        current_user.id, notifications_count
    )
    
    # Generate sample messages
    messages = notification_service.generate_sample_messages(
        current_user.id, messages_count
    )
    
    return {
        "message": "Sample data generated successfully",
        "notifications_generated": len(notifications),
        "messages_generated": len(messages)
    }

# Real-time notification triggers (for integration with other services)
@router.post("/trigger/report-completed")
async def trigger_report_completed_notification(
    report_id: int,
    template_name: str = "Market Analysis",
    generation_time: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger notification when a report is completed (called by report generation service)"""
    notification_service = NotificationService(db)
    
    report_data = {
        "id": report_id,
        "title": f"Report #{report_id}",
        "template_name": template_name,
        "generation_time": generation_time or random.randint(30, 120)
    }
    
    notification = notification_service.generate_report_completion_notification(
        current_user.id, report_data
    )
    
    return {
        "message": "Report completion notification triggered",
        "notification_id": notification.id
    }

@router.post("/trigger/api-usage-check")
async def trigger_api_usage_check(
    current_usage: int,
    limit: int = 1000,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger API usage check and generate warning if needed"""
    notification_service = NotificationService(db)
    
    percentage = (current_usage / limit) * 100
    usage_data = {
        "percentage": percentage,
        "current": current_usage,
        "limit": limit,
        "reset_time": (datetime.now() + timedelta(days=1)).isoformat()
    }
    
    notification = notification_service.generate_api_limit_warning(
        current_user.id, usage_data
    )
    
    if notification:
        return {
            "message": "API usage warning generated",
            "notification_id": notification.id,
            "usage_percentage": percentage
        }
    
    return {
        "message": "API usage is within limits",
        "usage_percentage": percentage
    }

@router.post("/trigger/feature-release")
async def trigger_feature_release_notification(
    feature_name: str,
    feature_description: str,
    feature_url: str = "/features",
    plan_required: str = "pro",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger notification for new feature release"""
    notification_service = NotificationService(db)
    
    feature_data = {
        "name": feature_name,
        "description": feature_description,
        "url": feature_url,
        "plan_required": plan_required,
        "category": "feature"
    }
    
    notification = notification_service.generate_feature_update_notification(
        current_user.id, feature_data
    )
    
    return {
        "message": "Feature release notification generated",
        "notification_id": notification.id
    }

@router.post("/trigger/weekly-insights")
async def trigger_weekly_insights(
    reports_generated: int = 0,
    searches_performed: int = 0,
    templates_used: int = 0,
    time_saved: str = "0 hours",
    top_searches: Optional[List[str]] = None,
    trends: Optional[List[str]] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger weekly insights message"""
    notification_service = NotificationService(db)
    
    summary_data = {
        "reports_generated": reports_generated,
        "searches_performed": searches_performed,
        "templates_used": templates_used,
        "time_saved": time_saved,
        "top_searches": top_searches or ["No searches yet"],
        "trends": trends or ["No trends detected"]
    }
    
    message = notification_service.generate_weekly_summary_message(
        current_user.id, summary_data
    )
    
    return {
        "message": "Weekly insights message generated",
        "message_id": message.id
    }

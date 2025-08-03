from sqlalchemy.orm import Session
from models.notification import Notification, Message, NotificationType, MessageType, Priority
from models.user import User
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(self, user_id: int, notification_data: Dict[str, Any]) -> Notification:
        """Create a new notification for a user"""
        notification = Notification(
            user_id=user_id,
            type=notification_data["type"],
            title=notification_data["title"],
            message=notification_data["message"],
            action_url=notification_data.get("action_url"),
            action_label=notification_data.get("action_label"),
            extra_data=notification_data.get("extra_data")
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def create_message(self, user_id: int, message_data: Dict[str, Any]) -> Message:
        """Create a new message for a user"""
        message = Message(
            user_id=user_id,
            type=message_data["type"],
            title=message_data["title"],
            content=message_data["content"],
            sender=message_data["sender"],
            sender_avatar=message_data.get("sender_avatar"),
            priority=message_data.get("priority", Priority.MEDIUM),
            category=message_data.get("category"),
            action_url=message_data.get("action_url"),
            action_label=message_data.get("action_label"),
            extra_data=message_data.get("extra_data")
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_user_notifications(self, user_id: int, limit: int = 50, unread_only: bool = False) -> List[Notification]:
        """Get notifications for a user"""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.read == False)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    def get_user_messages(self, user_id: int, limit: int = 50, unread_only: bool = False) -> List[Message]:
        """Get messages for a user"""
        query = self.db.query(Message).filter(Message.user_id == user_id)
        if unread_only:
            query = query.filter(Message.read == False)
        return query.order_by(Message.created_at.desc()).limit(limit).all()

    def mark_notification_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notification:
            notification.read = True
            self.db.commit()
            return True
        return False

    def mark_message_read(self, message_id: int, user_id: int) -> bool:
        """Mark a message as read"""
        message = self.db.query(Message).filter(
            Message.id == message_id,
            Message.user_id == user_id
        ).first()
        if message:
            message.read = True
            self.db.commit()
            return True
        return False

    def mark_all_notifications_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read == False
        ).update({"read": True})
        self.db.commit()
        return result

    def mark_all_messages_read(self, user_id: int) -> int:
        """Mark all messages as read for a user"""
        result = self.db.query(Message).filter(
            Message.user_id == user_id,
            Message.read == False
        ).update({"read": True})
        self.db.commit()
        return result

    def get_unread_counts(self, user_id: int) -> Dict[str, int]:
        """Get unread counts for notifications and messages"""
        notification_count = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read == False
        ).count()
        
        message_count = self.db.query(Message).filter(
            Message.user_id == user_id,
            Message.read == False
        ).count()
        
        return {
            "notifications": notification_count,
            "messages": message_count
        }

    # Dynamic notification generators based on user activity
    def generate_report_completion_notification(self, user_id: int, report_data: Dict[str, Any]) -> Notification:
        """Generate notification when a report is completed"""
        return self.create_notification(user_id, {
            "type": NotificationType.SUCCESS,
            "title": "Report Generated Successfully",
            "message": f"Your {report_data.get('template_name', 'market analysis')} report '{report_data.get('title', 'Report')}' has been completed and is ready for review.",
            "action_url": f"/reports/{report_data.get('id')}",
            "action_label": "View Report",
            "extra_data": {
                "report_id": report_data.get("id"),
                "template_id": report_data.get("template_id"),
                "generation_time": report_data.get("generation_time")
            }
        })

    def generate_api_limit_warning(self, user_id: int, usage_data: Dict[str, Any]) -> Notification:
        """Generate warning when API usage is high"""
        percentage = usage_data.get("percentage", 0)
        if percentage >= 90:
            priority = "critical"
            message = f"Critical: You've used {percentage}% of your daily API calls. Consider upgrading your plan immediately."
        elif percentage >= 80:
            priority = "warning"
            message = f"Warning: You've used {percentage}% of your daily API calls. Consider upgrading your plan."
        else:
            return None
        
        return self.create_notification(user_id, {
            "type": NotificationType.WARNING,
            "title": "API Usage Warning",
            "message": message,
            "action_url": "/settings/billing",
            "action_label": "Upgrade Plan",
            "extra_data": {
                "usage_percentage": percentage,
                "current_usage": usage_data.get("current"),
                "limit": usage_data.get("limit"),
                "reset_time": usage_data.get("reset_time")
            }
        })

    def generate_feature_update_notification(self, user_id: int, feature_data: Dict[str, Any]) -> Notification:
        """Generate notification for new features"""
        return self.create_notification(user_id, {
            "type": NotificationType.INFO,
            "title": "New Feature Available",
            "message": f"{feature_data.get('name', 'New feature')} is now available in your plan. {feature_data.get('description', '')}",
            "action_url": feature_data.get("url", "/features"),
            "action_label": "Learn More",
            "extra_data": {
                "feature_name": feature_data.get("name"),
                "feature_category": feature_data.get("category"),
                "plan_required": feature_data.get("plan_required")
            }
        })

    def generate_usage_insight_notification(self, user_id: int, insight_data: Dict[str, Any]) -> Notification:
        """Generate insights about user's usage patterns"""
        return self.create_notification(user_id, {
            "type": NotificationType.INFO,
            "title": "Usage Insight",
            "message": f"📊 {insight_data.get('message', 'Interesting usage pattern detected')}",
            "action_url": "/analytics",
            "action_label": "View Analytics",
            "extra_data": {
                "insight_type": insight_data.get("type"),
                "data_points": insight_data.get("data_points"),
                "trend": insight_data.get("trend")
            }
        })

    def generate_welcome_message(self, user_id: int, user_data: Dict[str, Any]) -> Message:
        """Generate welcome message for new users"""
        return self.create_message(user_id, {
            "type": MessageType.ONBOARDING,
            "title": "Welcome to Market Research Pro! 🎉",
            "content": f"""Hi {user_data.get('name', 'there')}!

Welcome to your new Market Research Pro account! We're excited to help you with your market research needs.

🚀 **Quick Start Guide:**
• Explore our templates for common research scenarios
• Use the advanced search to find specific insights  
• Check out our analytics dashboard for trends
• Try generating your first report

💡 **Pro Tips:**
• Save your favorite templates for quick access
• Use semantic search for better results
• Export reports in multiple formats
• Set up alerts for market changes

If you have any questions, our support team is here to help!

Best regards,
The Market Research Pro Team""",
            "sender": "Market Research Pro Team",
            "sender_avatar": "MR",
            "priority": Priority.HIGH,
            "category": "onboarding",
            "action_url": "/templates",
            "action_label": "Browse Templates"
        })

    def generate_weekly_summary_message(self, user_id: int, summary_data: Dict[str, Any]) -> Message:
        """Generate weekly summary message"""
        return self.create_message(user_id, {
            "type": MessageType.INSIGHT,
            "title": "Your Weekly Research Summary 📈",
            "content": f"""Here's your weekly market research activity summary:

📊 **Activity Overview:**
• Reports Generated: {summary_data.get('reports_generated', 0)}
• Searches Performed: {summary_data.get('searches_performed', 0)}
• Templates Used: {summary_data.get('templates_used', 0)}
• Time Saved: {summary_data.get('time_saved', '0 hours')}

🎯 **Top Searches This Week:**
{summary_data.get('top_searches', ['No searches yet'])[:3]}

📈 **Market Trends Detected:**
{summary_data.get('trends', ['No trends detected'])[:3]}

💡 **Recommendations:**
• Try our new competitor analysis templates
• Explore industry-specific insights
• Set up automated market monitoring

Keep up the great work! 🚀""",
            "sender": "AI Research Assistant",
            "sender_avatar": "AI",
            "priority": Priority.MEDIUM,
            "category": "insights",
            "action_url": "/analytics",
            "action_label": "View Full Analytics"
        })

    def generate_support_response_message(self, user_id: int, support_data: Dict[str, Any]) -> Message:
        """Generate support response message"""
        return self.create_message(user_id, {
            "type": MessageType.SUPPORT,
            "title": f"Re: {support_data.get('ticket_subject', 'Support Request')}",
            "content": f"""Hi there!

Thank you for reaching out to our support team. {support_data.get('response', 'We have reviewed your request and here is what we found:')}

{support_data.get('detailed_response', 'Your issue has been resolved.')}

**Ticket Details:**
• Ticket ID: #{support_data.get('ticket_id', 'N/A')}
• Status: {support_data.get('status', 'Resolved')}
• Resolution Time: {support_data.get('resolution_time', 'N/A')}

If you have any further questions, please do not hesitate to reach out.

Best regards,
{support_data.get('agent_name', 'Support Team')}""",
            "sender": support_data.get("agent_name", "Support Team"),
            "sender_avatar": "ST",
            "priority": Priority.MEDIUM,
            "category": "support",
            "action_url": f"/support/ticket/{support_data.get('ticket_id')}",
            "action_label": "View Ticket",
            "extra_data": {
                "ticket_id": support_data.get("ticket_id"),
                "status": support_data.get("status"),
                "resolution_time": support_data.get("resolution_time")
            }
        })

    def generate_maintenance_notification(self, user_id: int, maintenance_data: Dict[str, Any]) -> Message:
        """Generate maintenance notification"""
        return self.create_message(user_id, {
            "type": MessageType.MAINTENANCE,
            "title": "Scheduled Maintenance Notification",
            "content": f"""We'll be performing scheduled maintenance on {maintenance_data.get('date', 'Sunday')} from {maintenance_data.get('start_time', '2:00 AM')} to {maintenance_data.get('end_time', '4:00 AM')} EST.

**What to expect:**
• Brief service interruptions
• Improved performance after maintenance
• New features and bug fixes

**Services affected:**
{maintenance_data.get('affected_services', ['All services'])[:3]}

We apologize for any inconvenience and appreciate your patience.

For real-time updates, check our status page.

Best regards,
The Technical Team""",
            "sender": "Technical Team",
            "sender_avatar": "TT",
            "priority": Priority.LOW,
            "category": "maintenance",
            "action_url": maintenance_data.get("status_url", "/status"),
            "action_label": "Check Status",
            "extra_data": {
                "maintenance_date": maintenance_data.get("date"),
                "start_time": maintenance_data.get("start_time"),
                "end_time": maintenance_data.get("end_time"),
                "affected_services": maintenance_data.get("affected_services")
            }
        })

    def generate_billing_notification(self, user_id: int, billing_data: Dict[str, Any]) -> Notification:
        """Generate billing-related notifications"""
        if billing_data.get("type") == "payment_success":
            return self.create_notification(user_id, {
                "type": NotificationType.SUCCESS,
                "title": "Payment Successful",
                "message": f"Your payment of ${billing_data.get('amount', '0')} has been processed successfully. Thank you!",
                "action_url": "/settings/billing",
                "action_label": "View Invoice",
                "extra_data": {
                    "invoice_id": billing_data.get("invoice_id"),
                    "amount": billing_data.get("amount"),
                    "plan": billing_data.get("plan")
                }
            })
        elif billing_data.get("type") == "payment_failed":
            return self.create_notification(user_id, {
                "type": NotificationType.ERROR,
                "title": "Payment Failed",
                "message": f"Your payment of ${billing_data.get('amount', '0')} could not be processed. Please update your payment method.",
                "action_url": "/settings/billing",
                "action_label": "Update Payment",
                "extra_data": {
                    "invoice_id": billing_data.get("invoice_id"),
                    "amount": billing_data.get("amount"),
                    "error": billing_data.get("error")
                }
            })
        return None

    def generate_security_alert(self, user_id: int, security_data: Dict[str, Any]) -> Message:
        """Generate security-related alerts"""
        return self.create_message(user_id, {
            "type": MessageType.SECURITY,
            "title": "Security Alert",
            "content": f"""We detected {security_data.get('event_type', 'unusual activity')} on your account.

**Event Details:**
• Time: {security_data.get('timestamp', 'N/A')}
• Location: {security_data.get('location', 'Unknown')}
• Device: {security_data.get('device', 'Unknown')}

**Action Required:**
{security_data.get('action_required', 'Please review this activity and contact support if you do not recognize it.')}

If this was you, no action is needed. If not, please contact our security team immediately.

Stay safe! 🔒""",
            "sender": "Security Team",
            "sender_avatar": "SEC",
            "priority": Priority.HIGH,
            "category": "security",
            "action_url": "/settings/security",
            "action_label": "Review Security",
            "extra_data": {
                "event_type": security_data.get("event_type"),
                "location": security_data.get("location"),
                "device": security_data.get("device")
            }
        })

    # Helper method to generate sample data for testing
    def generate_sample_notifications(self, user_id: int, count: int = 5) -> List[Notification]:
        """Generate sample notifications for testing"""
        notifications = []
        
        # Sample notification templates
        sample_notifications = [
            {
                "type": NotificationType.SUCCESS,
                "title": "Report Generated Successfully",
                "message": "Your market analysis report 'Q4 2024 Tech Trends' has been completed.",
                "action_url": "/reports/123",
                "action_label": "View Report"
            },
            {
                "type": NotificationType.INFO,
                "title": "New Feature Available",
                "message": "Advanced competitor analysis tools are now available in your Pro plan.",
                "action_url": "/features",
                "action_label": "Learn More"
            },
            {
                "type": NotificationType.WARNING,
                "title": "API Rate Limit Warning",
                "message": "You've used 80% of your daily API calls. Consider upgrading your plan.",
                "action_url": "/settings/billing",
                "action_label": "Upgrade Plan"
            },
            {
                "type": NotificationType.INFO,
                "title": "Usage Insight",
                "message": "📊 You've generated 15 reports this week - 25% more than last week!",
                "action_url": "/analytics",
                "action_label": "View Analytics"
            },
            {
                "type": NotificationType.SUCCESS,
                "title": "Template Saved",
                "message": "Your custom research template 'Startup Analysis' has been saved.",
                "action_url": "/templates",
                "action_label": "View Templates"
            }
        ]
        
        for i in range(min(count, len(sample_notifications))):
            notification_data = sample_notifications[i].copy()
            notification_data["created_at"] = datetime.now() - timedelta(hours=i*2)
            notifications.append(self.create_notification(user_id, notification_data))
        
        return notifications

    def generate_sample_messages(self, user_id: int, count: int = 3) -> List[Message]:
        """Generate sample messages for testing"""
        messages = []
        
        # Sample message templates
        sample_messages = [
            {
                "type": MessageType.ONBOARDING,
                "title": "Welcome to Market Research Pro! 🎉",
                "content": "Hi there! Welcome to your new Market Research Pro account. We're excited to help you with your market research needs.",
                "sender": "Market Research Pro Team",
                "sender_avatar": "MR",
                "priority": Priority.HIGH,
                "category": "onboarding"
            },
            {
                "type": MessageType.SUPPORT,
                "title": "Your support ticket #1234 has been resolved",
                "content": "Hi there! We've resolved your support ticket regarding the API rate limits. Your API calls should now work as expected.",
                "sender": "Support Team",
                "sender_avatar": "ST",
                "priority": Priority.MEDIUM,
                "category": "support"
            },
            {
                "type": MessageType.UPDATE,
                "title": "New features available in your Pro plan",
                "content": "We're excited to announce several new features now available in your Pro plan: Advanced competitor analysis tools, custom report templates, and more!",
                "sender": "Product Team",
                "sender_avatar": "PT",
                "priority": Priority.MEDIUM,
                "category": "product"
            }
        ]
        
        for i in range(min(count, len(sample_messages))):
            message_data = sample_messages[i].copy()
            message_data["created_at"] = datetime.now() - timedelta(hours=i*4)
            messages.append(self.create_message(user_id, message_data))
        
        return messages

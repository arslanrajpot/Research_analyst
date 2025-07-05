from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class NotificationType(str, enum.Enum):
    SUCCESS = "success"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

class MessageType(str, enum.Enum):
    SYSTEM = "system"
    SUPPORT = "support"
    UPDATE = "update"
    ALERT = "alert"
    INSIGHT = "insight"
    FEATURE = "feature"
    MAINTENANCE = "maintenance"
    SECURITY = "security"
    BILLING = "billing"
    ONBOARDING = "onboarding"

class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional metadata
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)
    extra_data = Column(JSON, nullable=True)  # For additional data like report_id, template_id, etc.
    
    # Relationship - commented out to avoid circular imports
    # user = relationship("User", back_populates="notifications", lazy="joined")

class Message(Base):
    __tablename__ = "messages"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(MessageType), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(String(255), nullable=False)
    sender_avatar = Column(String(100), nullable=True)
    read = Column(Boolean, default=False)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional metadata
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)
    extra_data = Column(JSON, nullable=True)  # For additional data
    
    # Relationship - commented out to avoid circular imports
    # user = relationship("User", back_populates="messages", lazy="joined")

# Pydantic models for API
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    message: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    read: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    type: MessageType
    title: str
    content: str
    sender: str
    sender_avatar: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    category: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    user_id: int
    read: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

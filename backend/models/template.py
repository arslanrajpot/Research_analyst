from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from database import Base

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    icon = Column(String(10), nullable=True)
    
    # Template content
    prompts = Column(JSON, nullable=False)  # List of research prompts
    variables = Column(JSON, nullable=True)  # Template variables like [industry], [product]
    structure = Column(JSON, nullable=True)  # Report structure and sections
    
    # Template metadata
    is_public = Column(Boolean, default=False)  # System templates vs user templates
    is_featured = Column(Boolean, default=False)  # Featured templates
    estimated_time = Column(String(50), nullable=True)
    difficulty_level = Column(String(20), default="intermediate")  # beginner, intermediate, advanced
    
    # Versioning
    version = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("templates.id"), nullable=True)  # For versioning
    
    # Ownership and permissions
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Creator
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Analytics
    usage_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="templates")
    parent_template = relationship("Template", remote_side=[id])
    child_templates = relationship("Template")
    shares = relationship("TemplateShare", back_populates="template")
    usage_records = relationship("TemplateUsage", back_populates="template")

class TemplateShare(Base):
    __tablename__ = "template_shares"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    shared_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_with = Column(Integer, ForeignKey("users.id"), nullable=False)
    permission = Column(String(20), default="view")  # view, edit, admin
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    template = relationship("Template", back_populates="shares")

class TemplateUsage(Base):
    __tablename__ = "template_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    used_at = Column(DateTime, default=func.now())
    success = Column(Boolean, default=True)
    generation_time = Column(Float, nullable=True)  # Time taken to generate report
    
    # Relationships
    template = relationship("Template", back_populates="usage_records")

class TemplateRating(Base):
    __tablename__ = "template_ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Ensure one rating per user per template
    __table_args__ = (Index('unique_user_template_rating', 'user_id', 'template_id', unique=True),)

# Pydantic Models for API
class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    icon: Optional[str] = None
    prompts: List[str]
    variables: Optional[List[str]] = None
    structure: Optional[Dict[str, Any]] = None
    is_public: bool = False
    is_featured: bool = False
    estimated_time: Optional[str] = None
    difficulty_level: str = "intermediate"

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    prompts: Optional[List[str]] = None
    variables: Optional[List[str]] = None
    structure: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    is_featured: Optional[bool] = None
    estimated_time: Optional[str] = None
    difficulty_level: Optional[str] = None

class TemplateResponse(TemplateBase):
    id: int
    version: int
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    usage_count: int
    rating: float
    rating_count: int
    creator_name: Optional[str] = None
    user_rating: Optional[int] = None  # Current user's rating for this template
    
    class Config:
        from_attributes = True

class TemplateShareCreate(BaseModel):
    template_id: int
    shared_with_email: str
    permission: str = "view"

class TemplateShareResponse(BaseModel):
    id: int
    template_id: int
    shared_by: int
    shared_with: int
    permission: str
    created_at: datetime
    template_name: str
    shared_by_name: str
    shared_with_name: str
    
    class Config:
        from_attributes = True

class TemplateUsageResponse(BaseModel):
    id: int
    template_id: int
    user_id: int
    report_id: Optional[int] = None
    used_at: datetime
    success: bool
    generation_time: Optional[float] = None
    template_name: str
    user_name: str
    
    class Config:
        from_attributes = True

class TemplateRatingCreate(BaseModel):
    rating: int  # 1-5
    review: Optional[str] = None

class TemplateRatingResponse(BaseModel):
    id: int
    template_id: int
    user_id: int
    rating: int
    review: Optional[str] = None
    created_at: datetime
    user_name: str
    
    class Config:
        from_attributes = True

class TemplateAnalytics(BaseModel):
    total_templates: int
    public_templates: int
    user_templates: int
    total_usage: int
    popular_templates: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    category_distribution: Dict[str, int]

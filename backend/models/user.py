from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from database import Base

# No direct imports to avoid circular dependencies

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    full_name = Column(String, nullable=False)  # Changed from name to full_name
    company = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    plan = Column(String, default="free")  # free, pro, premium
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    # OAuth fields
    oauth_provider = Column(String, nullable=True)  # google, github, etc.
    oauth_id = Column(String, nullable=True)  # OAuth provider's user ID
    avatar_url = Column(String, nullable=True)  # Profile picture URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships - commented out to avoid circular imports
    # notifications = relationship("Notification", back_populates="user")
    # messages = relationship("Message", back_populates="user")
    templates = relationship("Template", back_populates="user")

class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    session_id = Column(String, unique=True, index=True, nullable=False)
    chat_history = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Report(Base):
    __tablename__ = "reports"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    query = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    template = Column(String, nullable=True)
    status = Column(String, default="completed")  # pending, completed, failed
    generation_time = Column(Integer, nullable=True)  # in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)  # Extracted text content
    file_metadata = Column(Text, nullable=True)  # JSON string of metadata
    status = Column(String, default="uploaded")  # uploaded, processing, processed, error
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

# Pydantic Models for API
class UserBase(BaseModel):
    email: EmailStr
    full_name: str  # Changed from name to full_name
    company: Optional[str] = None
    job_title: Optional[str] = None

class UserCreate(UserBase):
    password: str

class OAuthUserCreate(UserBase):
    password: Optional[str] = None  # OAuth users don't have passwords
    oauth_provider: str  # google, github, etc.
    oauth_id: str  # OAuth provider's user ID

class UserUpdate(BaseModel):
    full_name: Optional[str] = None  # Changed from name to full_name
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    job_title: Optional[str] = None

class UserResponse(UserBase):
    id: int
    plan: str
    is_active: bool
    is_verified: bool
    oauth_provider: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False  # Added remember_me field

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None  # Added refresh_token field
    token_type: str
    expires_in: int
    refresh_expires_in: Optional[int] = None  # Added refresh_expires_in field

class TokenData(BaseModel):
    email: Optional[str] = None

class UserProfile(BaseModel):
    id: int
    full_name: str  # Changed from name to full_name
    email: EmailStr
    company: Optional[str] = None
    job_title: Optional[str] = None
    plan: str
    oauth_provider: Optional[str] = None
    avatar_url: Optional[str] = None
    usage: dict
    subscription: dict
    
    class Config:
        from_attributes = True

# OAuth Models
class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class OAuthUserCreate(BaseModel):
    email: EmailStr
    full_name: str  # Changed from name to full_name
    oauth_provider: str
    oauth_id: str
    avatar_url: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from database import get_db
from models.user import UserCreate, UserResponse, UserLogin, Token, UserUpdate, UserProfile, GoogleAuthRequest, RefreshTokenRequest
from auth import (
    authenticate_user, 
    create_user, 
    create_access_token, 
    create_refresh_token,
    verify_token,
    get_current_active_user,
    update_user,
    get_user_by_email,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS
)
from models.user import User
from google_oauth import google_oauth

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please try logging in instead."
        )
    
    # Create new user
    user = create_user(db, user_data)
    return user

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token with optional refresh token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account has been deactivated. Please contact support for assistance."
        )
    
    # Create access token (short-lived)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Create refresh token if "Remember Me" is enabled
    refresh_token = None
    if user_credentials.remember_me:
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token = create_refresh_token(
            data={"sub": user.email}, expires_delta=refresh_token_expires
        )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60 if refresh_token else None
    }

@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    refresh_token = request.refresh_token
    
    # Verify refresh token
    token_data = verify_token(refresh_token, "refresh")
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    user = get_user_by_email(db, token_data.email)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Create new refresh token (token rotation for security)
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    new_refresh_token = create_refresh_token(
        data={"sub": user.email}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    }

@router.get("/google/url")
def get_google_auth_url():
    """Get Google OAuth authorization URL."""
    if not google_oauth.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please contact the administrator."
        )
    
    try:
        auth_url = google_oauth.get_authorization_url()
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Google auth URL: {str(e)}"
        )

@router.post("/google/callback", response_model=Token)
async def google_auth_callback(auth_request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Handle Google OAuth callback and authenticate user."""
    
    if not google_oauth.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please contact the administrator."
        )
    
    try:
        # Authenticate with Google
        google_user_data = await google_oauth.authenticate_user(auth_request.code)
        
        # Check if user exists by email
        existing_user = get_user_by_email(db, google_user_data["email"])
        
        if existing_user:
            # User exists, log them in
            user = existing_user
        else:
            # Create new user for OAuth
            from models.user import OAuthUserCreate
            oauth_user_data = OAuthUserCreate(
                email=google_user_data["email"],
                full_name=google_user_data["name"],
                password=None,  # OAuth users don't have passwords
                oauth_provider="google",
                oauth_id=google_user_data["oauth_id"]  # Google's unique user ID
            )
            user = create_user(db, oauth_user_data)
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account has been deactivated. Please contact support for assistance."
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Create refresh token for OAuth users (they typically want to stay logged in)
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token = create_refresh_token(
            data={"sub": user.email}, expires_delta=refresh_token_expires
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_expires_in": REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        }
        
    except ValueError as e:
        # Handle specific Google OAuth errors
        print(f"Google OAuth ValueError: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid authentication code. Please try again."
        )
    except Exception as e:
        # Handle other errors
        print(f"Google OAuth Exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication failed. Please try again later."
        )

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    updated_user = update_user(db, current_user.id, user_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user

@router.post("/logout")
def logout():
    """Logout user (client should discard tokens)."""
    return {"message": "Successfully logged out"}

@router.get("/profile", response_model=UserProfile)
def get_user_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get user profile with usage statistics."""
    # Get user's reports count
    from models.user import Report
    reports_count = db.query(Report).filter(Report.user_id == current_user.id).count()
    
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
    
    return UserProfile(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        company=current_user.company,
        job_title=current_user.job_title,
        plan=current_user.plan,
        usage=usage,
        subscription=subscription
    )

# Demo login endpoint for testing
@router.post("/demo-login", response_model=Token)
def demo_login(db: Session = Depends(get_db)):
    """Demo login for testing purposes."""
    # Check if demo user exists, create if not
    demo_user = db.query(User).filter(User.email == "demo@example.com").first()
    if not demo_user:
        from auth import get_password_hash
        demo_user = User(
            email="demo@example.com",
            hashed_password=get_password_hash("password"),
            full_name="John Doe",
            plan="pro",
            is_active=True,
            is_verified=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": demo_user.email}, expires_delta=access_token_expires
    )
    
    # Create refresh token for demo user
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(
        data={"sub": demo_user.email}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    }

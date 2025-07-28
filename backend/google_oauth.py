import os
import requests
from typing import Optional, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
from google.auth.exceptions import GoogleAuthError
import json
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

# Google OAuth endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

class GoogleOAuth:
    def __init__(self):
        self.client_id = GOOGLE_CLIENT_ID
        self.client_secret = GOOGLE_CLIENT_SECRET
        self.redirect_uri = GOOGLE_REDIRECT_URI
        
        # Only raise error if credentials are required for specific operations
        self._credentials_configured = bool(self.client_id and self.client_secret)

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """Generate Google OAuth authorization URL."""
        if not self._credentials_configured:
            raise ValueError("Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")
            
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent"
        }
        
        if state:
            params["state"] = state
            
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{GOOGLE_AUTH_URL}?{query_string}"

    async def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and ID tokens."""
        if not self._credentials_configured:
            raise ValueError("Google OAuth credentials not configured")
            
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        try:
            response = requests.post(GOOGLE_TOKEN_URL, data=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                raise ValueError("Invalid authorization code")
            else:
                raise e

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Google using access token."""
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(GOOGLE_USERINFO_URL, headers=headers)
        response.raise_for_status()
        
        return response.json()

    async def verify_id_token(self, id_token_str: str) -> Dict[str, Any]:
        """Verify Google ID token and extract user information."""
        if not self._credentials_configured:
            raise ValueError("Google OAuth credentials not configured")
            
        try:
            idinfo = id_token.verify_oauth2_token(
                id_token_str, 
                google_requests.Request(), 
                self.client_id
            )
            
            # Verify the token was issued by Google
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise GoogleAuthError('Wrong issuer.')
                
            return idinfo
        except GoogleAuthError as e:
            raise ValueError(f"Invalid ID token: {e}")

    async def authenticate_user(self, code: str) -> Dict[str, Any]:
        """Complete OAuth flow and return user information."""
        if not self._credentials_configured:
            raise ValueError("Google OAuth credentials not configured")
            
        # Exchange code for tokens
        tokens = await self.exchange_code_for_tokens(code)
        
        # Get user info using access token
        user_info = await self.get_user_info(tokens["access_token"])
        
        return {
            "email": user_info["email"],
            "name": user_info["name"],
            "oauth_id": user_info["id"],
            "avatar_url": user_info.get("picture"),
            "oauth_provider": "google",
            "is_verified": user_info.get("verified_email", False)
        }

    def is_configured(self) -> bool:
        """Check if Google OAuth is properly configured."""
        return self._credentials_configured

# Create global instance
google_oauth = GoogleOAuth()

#!/usr/bin/env python3
"""
Google OAuth Setup Script
This script helps you set up Google OAuth credentials for the Market Research Generator.
"""

import os
import webbrowser
from pathlib import Path

def main():
    print("🔧 Google OAuth Setup for Market Research Generator")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ No .env file found. Creating one...")
        create_env_file()
    else:
        print("✅ .env file found")
    
    print("\n📋 Next Steps:")
    print("1. Go to Google Cloud Console: https://console.cloud.google.com/")
    print("2. Create a new project or select an existing one")
    print("3. Enable the Google+ API and Google OAuth2 API")
    print("4. Configure OAuth consent screen")
    print("5. Create OAuth 2.0 credentials")
    print("6. Add the credentials to your .env file")
    
    print("\n🔗 Opening Google Cloud Console...")
    webbrowser.open("https://console.cloud.google.com/")
    
    print("\n📝 Required Environment Variables:")
    print("GOOGLE_CLIENT_ID=your_client_id_here")
    print("GOOGLE_CLIENT_SECRET=your_client_secret_here")
    print("GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback")
    
    print("\n🎯 OAuth Configuration Details:")
    print("- Application type: Web application")
    print("- Authorized JavaScript origins: http://localhost:3000")
    print("- Authorized redirect URIs: http://localhost:3000/auth/google/callback")
    print("- Scopes: openid, email, profile")
    
    print("\n✅ After setting up credentials, restart your backend server!")

def create_env_file():
    """Create a basic .env file with placeholders."""
    env_content = """# API Keys
GROQ_API_KEY=your_groq_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENV=your_pinecone_environment_here
LANGSMITH_API_KEY=your_langsmith_api_key_here

# Database
DATABASE_URL=sqlite:///./market_research.db
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your_secret_key_here_change_in_production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
"""
    
    with open(".env", "w") as f:
        f.write(env_content)
    
    print("✅ Created .env file with placeholders")

if __name__ == "__main__":
    main()

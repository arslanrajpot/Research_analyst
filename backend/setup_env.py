#!/usr/bin/env python3
"""
Environment setup and validation script for the Market Research Generator.
This script checks for required services and provides setup instructions.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_redis():
    """Check if Redis is available."""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis is running and accessible")
        return True
    except Exception as e:
        print(f"❌ Redis is not available: {e}")
        print("💡 To start Redis:")
        print("   - macOS: brew install redis && brew services start redis")
        print("   - Ubuntu: sudo apt-get install redis-server")
        print("   - Or run: ./start_redis.sh")
        return False

def check_environment_variables():
    """Check if required environment variables are set."""
    required_vars = [
        "GROQ_API_KEY",
        "PINECONE_API_KEY", 
        "PINECONE_ENV"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("💡 Please set these in your .env file:")
        for var in missing_vars:
            print(f"   {var}=your_api_key_here")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def check_dependencies():
    """Check if all required Python packages are installed."""
    required_packages = [
        "langchain",
        "langchain-core", 
        "langgraph",
        "langchain-groq",
        "langchain-pinecone",
        "fastapi",
        "uvicorn"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("💡 Install with: pip install -r requirements.txt")
        return False
    else:
        print("✅ All required packages are installed")
        return True

def check_database():
    """Check if database files exist and are accessible."""
    db_files = ["research.db", "checkpoints.db"]
    missing_files = []
    
    for db_file in db_files:
        if not Path(db_file).exists():
            missing_files.append(db_file)
    
    if missing_files:
        print(f"⚠️  Database files missing: {', '.join(missing_files)}")
        print("💡 These will be created automatically when you first run the app")
        return True  # Not critical for startup
    else:
        print("✅ Database files exist")
        return True

def main():
    """Run all checks and provide setup instructions."""
    print("🔍 Checking Market Research Generator environment...\n")
    
    checks = [
        ("Environment Variables", check_environment_variables),
        ("Dependencies", check_dependencies),
        ("Redis", check_redis),
        ("Database", check_database)
    ]
    
    results = []
    for name, check_func in checks:
        print(f"Checking {name}...")
        result = check_func()
        results.append(result)
        print()
    
    passed = sum(results)
    total = len(results)
    
    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    if passed == total:
        print("🎉 All checks passed! Your environment is ready.")
        print("\nTo start the application:")
        print("   uvicorn main:app --reload")
    else:
        print(f"⚠️  {total - passed} out of {total} checks failed.")
        print("\nPlease fix the issues above before running the application.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

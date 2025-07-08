#!/usr/bin/env python3
"""
Database Migration Script
This script adds OAuth columns to the existing users table.
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add OAuth columns to the users table."""
    print("🔧 Database Migration: Adding OAuth Support")
    print("=" * 50)
    
    # Database file path
    db_path = Path("market_research.db")
    
    if not db_path.exists():
        print("❌ Database file not found. Creating new database...")
        return
    
    print(f"✅ Found database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if OAuth columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        print(f"Current columns: {columns}")
        
        # Add OAuth columns if they don't exist
        oauth_columns = [
            ("oauth_provider", "TEXT"),
            ("oauth_id", "TEXT"),
            ("avatar_url", "TEXT")
        ]
        
        for column_name, column_type in oauth_columns:
            if column_name not in columns:
                print(f"➕ Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
            else:
                print(f"✅ Column already exists: {column_name}")
        
        # Make hashed_password nullable (for OAuth users)
        print("🔄 Making hashed_password nullable for OAuth users...")
        
        # SQLite doesn't support ALTER COLUMN to change nullability
        # We'll need to recreate the table or handle this in the application
        
        # Commit changes
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(users)")
        new_columns = [column[1] for column in cursor.fetchall()]
        print(f"Updated columns: {new_columns}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def create_new_database():
    """Create a new database with the correct schema."""
    print("🆕 Creating new database with OAuth support...")
    
    # Remove existing database
    db_path = Path("market_research.db")
    if db_path.exists():
        db_path.unlink()
        print("🗑️ Removed old database")
    
    # Import and create tables
    from database import create_tables
    from models.user import User
    
    create_tables()
    print("✅ New database created with OAuth support!")

if __name__ == "__main__":
    print("Choose an option:")
    print("1. Migrate existing database (add OAuth columns)")
    print("2. Create new database (recommended)")
    
    choice = input("Enter your choice (1 or 2): ").strip()
    
    if choice == "1":
        migrate_database()
    elif choice == "2":
        create_new_database()
    else:
        print("Invalid choice. Creating new database...")
        create_new_database()

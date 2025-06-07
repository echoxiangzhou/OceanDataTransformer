#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app.core.config import Settings
from app.db.session import engine
from sqlalchemy import text

def test_database_connection():
    settings = Settings()
    print(f"Testing connection to: {settings.DATABASE_URL}")
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            
            # Test data_sources table
            result = connection.execute(text("SELECT COUNT(*) FROM data_sources"))
            count = result.scalar()
            print(f"✅ Data sources table accessible, contains {count} records")
            
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    test_database_connection()
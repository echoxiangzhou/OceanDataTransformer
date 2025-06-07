#!/usr/bin/env python3
"""
Development server startup script for Ocean Data Platform backend.
"""
import subprocess
import sys
import os
from pathlib import Path

def check_database_connection():
    """Check if MySQL database is accessible."""
    try:
        import pymysql
        from app.core.config import settings
        
        connection = pymysql.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD,
            database=settings.DATABASE_NAME
        )
        connection.close()
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def create_directories():
    """Create necessary directories for file storage."""
    from app.core.config import settings
    
    directories = [
        settings.UPLOAD_DIR,
        settings.NETCDF_DIR,
        settings.DOWNLOAD_DIR
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"📁 Created directory: {directory}")

def run_migrations():
    """Run database migrations."""
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            text=True
        )
        print("✅ Database migrations completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e.stderr}")
        return False

def start_server():
    """Start the FastAPI development server."""
    print("🚀 Starting Ocean Data Platform API server...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔍 Alternative docs: http://localhost:8000/redoc")
    
    subprocess.run([
        "uvicorn", 
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
        "--reload-dir", "app"
    ])

def main():
    """Main startup function."""
    print("🌊 Ocean Data Platform Backend Startup")
    print("=" * 50)
    
    # Check database connection
    if not check_database_connection():
        print("Please ensure MySQL database is running and accessible.")
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Run migrations
    if not run_migrations():
        print("Database migration failed. Please check your database configuration.")
        sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Ocean Data Platform"
    
    # Database
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 3306
    DATABASE_USER: str = "root"
    DATABASE_PASSWORD: str = "iocas6760root"
    DATABASE_NAME: str = "ocean_platform"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    NETCDF_DIR: str = "./data/netcdf"
    DOWNLOAD_DIR: str = "./data/downloads"
    ALGORITHM_DIR: str = "./data/algorithms"
    CONTAINER_WORK_DIR: str = "./data/container_work"
    
    # Docker
    DOCKER_SOCKET: str = "unix:///var/run/docker.sock"
    ALGORITHM_IMAGE_PREFIX: str = "ocean-platform"
    
    # Algorithm execution
    MAX_CONCURRENT_TASKS: int = 10
    TASK_TIMEOUT: int = 3600  # 1 hour
    
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    def create_directories(self):
        """Create necessary directories for file storage"""
        directories = [
            Path(self.UPLOAD_DIR),
            Path(self.NETCDF_DIR),
            Path(self.DOWNLOAD_DIR),
            Path(self.ALGORITHM_DIR),
            Path(self.CONTAINER_WORK_DIR)
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    class Config:
        env_file = ".env"

settings = Settings()
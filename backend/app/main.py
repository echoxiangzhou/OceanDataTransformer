from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.core.config import settings

app = FastAPI(
    title="Ocean Data Platform API",
    description="海洋环境数据标准转换和可视化算法集成软件 API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """Create necessary directories on startup"""
    settings.create_directories()

@app.get("/")
async def root():
    return {"message": "Ocean Data Platform API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
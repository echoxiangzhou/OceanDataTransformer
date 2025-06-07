from fastapi import APIRouter
from app.api.v1.endpoints import data_download, data_conversion, algorithm_management

api_router = APIRouter()

api_router.include_router(
    data_download.router,
    prefix="/data-download",
    tags=["data-download"]
)

api_router.include_router(
    data_conversion.router,
    prefix="/data-conversion", 
    tags=["data-conversion"]
)

api_router.include_router(
    algorithm_management.router,
    prefix="/algorithms",
    tags=["algorithms"]
)
from fastapi import APIRouter
from app.api.v1.endpoints import data_download, data_conversion, algorithms, websocket, cf_compliance, import_wizard, algorithm_management

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
    import_wizard.router,
    prefix="/import-wizard",
    tags=["import-wizard"]
)

api_router.include_router(
    cf_compliance.router,
    prefix="/cf-compliance",
    tags=["cf-compliance"]
)

api_router.include_router(
    algorithm_management.router,
    prefix="/algorithms",
    tags=["algorithm-management"]
)

api_router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["websocket"]
)
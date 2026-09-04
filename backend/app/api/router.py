from fastapi import APIRouter

from app.api import cameras, potholes, routes, traffic

api_router = APIRouter(prefix="/api")
api_router.include_router(cameras.router)
api_router.include_router(traffic.router)
api_router.include_router(routes.router)
api_router.include_router(potholes.router)

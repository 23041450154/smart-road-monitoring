from fastapi import APIRouter

from app.api import admin, auth, cameras, notifications, potholes, routes, traffic

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(notifications.router)
api_router.include_router(cameras.router)
api_router.include_router(traffic.router)
api_router.include_router(routes.router)
api_router.include_router(potholes.router)

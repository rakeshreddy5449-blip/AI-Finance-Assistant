from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routers.auth import router as auth_router
from backend.app.routers.transactions import router as transactions_router
from backend.app.routers.analytics import router as analytics_router
from backend.app.routers.insights import router as insights_router
from backend.app.routers.budgets import router as budgets_router
from backend.app.routers.ml import router as ml_router
from backend.app.routers.forecast import router as forecast_router


app = FastAPI(
    title="AI Finance Assistant API",
    description="Backend API for the AI Finance Assistant.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://ai-finance-assistant-1-qkac.onrender.com",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(analytics_router)
app.include_router(insights_router)
app.include_router(budgets_router)
app.include_router(ml_router)
app.include_router(forecast_router)


@app.get("/")
def root():
    return {
        "message": "AI Finance Assistant API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

from fastapi import FastAPI
from backend.app.routers.auth import router as auth_router
from backend.app.routers.transactions import router as transactions_router
from backend.app.routers.analytics import router as analytics_router
from backend.app.routers.insights import router as insights_router
from backend.app.routers.budgets import router as budgets_router
app = FastAPI(
    title="AI Finance Assistant API",
    description="Backend API for the AI Finance Assistant.",
    version="1.0.0",
)



app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(analytics_router)
app.include_router(insights_router)
app.include_router(budgets_router)
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
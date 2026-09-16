from fastapi import FastAPI
from backend.app.routers.auth import router as auth_router
from backend.app.routers.transactions import router as transactions_router
app = FastAPI(
    title="AI Finance Assistant API",
    description="Backend API for the AI Finance Assistant.",
    version="1.0.0",
)



app.include_router(auth_router)
app.include_router(transactions_router)


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
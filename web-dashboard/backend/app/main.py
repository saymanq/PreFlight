"""Main FastAPI application -- AI proxy only; data lives in Convex."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import chat

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    return {
        "message": "Preflight Architecture Planning API",
        "version": settings.api_version,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gemini": "mock" if not settings.gemini_api_key else "configured",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Early intervention student risk prediction system",
        version="1.0.0",
        docs_url="/docs",       # Swagger UI
        redoc_url="/redoc"      # ReDoc UI
    )

    # ── CORS ─────────────────────────────────────────────────────
    # Allows React frontend (port 3000) to talk to FastAPI (port 8000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    # ── Routers ───────────────────────────────────────────────────

    from app.routers import auth, students, predict, explain
    app.include_router(auth.router, prefix="/auth", tags=["Auth"])
    app.include_router(students.router, prefix="/students", tags=["Students"])
    app.include_router(predict.router,  prefix="/predict",  tags=["Predict"])
    app.include_router(explain.router,  prefix="/explain",  tags=["Explain"])

    @app.get("/", tags=["Health"])
    def root():
        return {
            "app"    : settings.APP_NAME,
            "status" : "running",
            "version": "1.0.0"
        }

    @app.get("/health", tags=["Health"])
    def health_check():
        return {"status": "ok"}

    return app


app = create_app()
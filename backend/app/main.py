from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .clients.sheets import get_sheets_client
from .config import get_settings
from .routers import log, products, profile, read, report, workout


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Auto-sync sheet tabs on startup so missing/renamed tabs self-heal.
    try:
        actions = get_sheets_client().ensure_tabs()
        new_or_fixed = {k: v for k, v in actions.items() if v not in ("ok",)}
        if new_or_fixed:
            print(f"[startup] Sheet synced: {new_or_fixed}")
        else:
            print(f"[startup] Sheet OK: {len(actions)} tabs verified")
    except Exception as e:
        print(f"[startup] Warning: could not sync tabs: {e}")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Body Recomp Tracker API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(log.router, prefix="/api/log", tags=["log"])
    app.include_router(read.router, prefix="/api/read", tags=["read"])
    app.include_router(workout.router, prefix="/api/workout", tags=["workout"])
    app.include_router(report.router, prefix="/api/report", tags=["report"])
    app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
    app.include_router(products.router, prefix="/api/products", tags=["products"])
    return app


app = create_app()

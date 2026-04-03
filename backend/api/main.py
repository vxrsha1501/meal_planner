from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.ai_features import router as ai_router
from .routes.auth import router as auth_router
from .routes.challenges import router as challenges_router
from .routes.planner import router as planner_router
from .routes.system import router as system_router
from .settings import settings

app = FastAPI(title="AI Budget-Aware Lifestyle Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system_router)
app.include_router(auth_router)
app.include_router(planner_router)
app.include_router(ai_router)
app.include_router(challenges_router)

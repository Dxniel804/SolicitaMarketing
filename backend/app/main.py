from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth_me,
    calendar,
    dashboard,
    holidays,
    queue,
    reports,
    request_comments,
    request_files,
    request_types,
    requests as requests_router,
    weekly_capacities,
)

app = FastAPI(title="Central de Solicitações ao Marketing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth_me.router, prefix=API_PREFIX)
app.include_router(request_types.router, prefix=API_PREFIX)
app.include_router(weekly_capacities.router, prefix=API_PREFIX)
app.include_router(holidays.router, prefix=API_PREFIX)
app.include_router(requests_router.router, prefix=API_PREFIX)
app.include_router(request_files.router, prefix=API_PREFIX)
app.include_router(request_comments.router, prefix=API_PREFIX)
app.include_router(queue.router, prefix=API_PREFIX)
app.include_router(calendar.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}

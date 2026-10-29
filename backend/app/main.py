import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base
from app.api import groups, members, expenses, bills, weeks, settlements, settings as settings_api
import app.services.group_service as group_service
from app.core.database import SessionLocal

app = FastAPI(
    title="ShareSplit API",
    description="Backend API for ShareSplit Shared Expense Management Application",
    version="1.0.0"
)

origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the upload directory exists and serve it statically
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(groups.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(bills.router, prefix="/api")
app.include_router(weeks.router, prefix="/api")
app.include_router(settlements.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        group = group_service.get_or_create_default_group(db)
        import app.repositories.member_repository as member_repo
        from app.schemas.member import MemberCreate
        members = member_repo.get_members(db, group.id, include_inactive=True)
        if len(members) == 0:
            member_repo.create_member(db, group.id, "mem-you", MemberCreate(name="You", nickname="Me", color="bg-slate-700"))
            member_repo.create_member(db, group.id, "mem-b", MemberCreate(name="Person B", nickname="Ben", color="bg-slate-600"))
            member_repo.create_member(db, group.id, "mem-c", MemberCreate(name="Person C", nickname="Caty", color="bg-slate-500"))
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to ShareSplit API. Go to /docs for API documentation."}

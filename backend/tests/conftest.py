import os
import sys
import pytest
import shutil
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

TEST_DB_FILE = "./test_sharesplit.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE}"
os.environ["UPLOAD_DIR"] = "tests/test_uploads"

from app.core.database import Base, get_db, engine as app_engine, SessionLocal as app_SessionLocal
from app.core.config import settings
from app.main import app

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@pytest.fixture(scope="function")
def db():
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
            
    Base.metadata.create_all(bind=app_engine)
    session = app_SessionLocal()
    try:
        yield session
    finally:
        session.close()
        app_engine.dispose()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass
        if os.path.exists(settings.UPLOAD_DIR):
            shutil.rmtree(settings.UPLOAD_DIR)
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

from sqlalchemy.orm import Session
import app.repositories.group_repository as group_repo
from app.schemas.group import GroupCreate
from app.models.group import Group

DEFAULT_GROUP_ID = "default-group"

def get_or_create_default_group(db: Session) -> Group:
    group = group_repo.get_first_group(db)
    if not group:
        group_in = GroupCreate(name="Home", currency="INR", week_start_day="Monday")
        group = group_repo.create_group(db, DEFAULT_GROUP_ID, group_in)
    return group

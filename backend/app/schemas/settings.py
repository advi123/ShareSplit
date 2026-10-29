from pydantic import BaseModel

class SettingsSchema(BaseModel):
    group_name: str
    currency: str
    week_starts_on: str
    default_category: str

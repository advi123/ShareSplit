from pydantic import BaseModel

class SettingsSchema(BaseModel):
    group_name: str
    currency: str
    week_starts_on: str
    default_category: str
    group_type: str = "home"
    gemini_api_key: str | None = None
    invite_code: str | None = None

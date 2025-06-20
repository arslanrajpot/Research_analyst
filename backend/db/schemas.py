from pydantic import BaseModel, ConfigDict

class SessionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    query: str
    report: str
    chat_history: str
from pydantic import BaseModel
from typing import List, Dict, Optional

class ResearchState(BaseModel):
    query: str
    gathered_data: List[Dict] = []
    synthesized_insights: List[str] = []
    validated_insights: List[str] = []
    report: Optional[str] = None
    chat_history: List[Dict] = []
    template_id: Optional[int] = None
    template_data: Optional[Dict] = None
from pydantic import BaseModel
from typing import Optional

class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str]
    created_at: str
    updated_at: str

from typing import Optional

from pydantic import BaseModel


class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    image_url: Optional[str] = None


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str]
    image_url: Optional[str] = None
    created_at: str
    updated_at: str

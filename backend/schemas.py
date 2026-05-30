from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, field_validator, model_validator, Field
class PostStatus(str, Enum):
    published = 'published'
    draft = 'draft'
    archived = 'archived'

class PostCreate(BaseModel):
    title: str = Field(..., max_length=200)
    content: str = Field(..., max_length=50000)
    category: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = Field(None, max_length=1000)
    status: PostStatus = PostStatus.published
class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, max_length=50000)
    category: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = Field(None, max_length=1000)
    status: Optional[PostStatus] = None
    @field_validator('title', 'content')
    @classmethod
    def non_empty_string(cls, v):
        if v is not None and v.strip() == '':
            return None
        return v

    @model_validator(mode='after')
    def at_least_one_field(self):
        if all(
            getattr(self, f) is None
            for f in ('title', 'content', 'category', 'image_url', 'status')
        ):
            raise ValueError('At least one field must be provided')
        return self


class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str]
    image_url: Optional[str] = None
    status: str
    created_at: str
    updated_at: str


class ArchivePost(BaseModel):
    id: int
    title: str
    created_at: str
    summary: Optional[str] = None


class ArchiveMonth(BaseModel):
    month: str
    posts: list[ArchivePost]


class ArchiveResponse(BaseModel):
    data: dict[str, list[ArchiveMonth]]


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    avatar_url: Optional[str]
    content: str
    parent_id: Optional[int] = None
    replies: List['CommentResponse'] = []
    created_at: str

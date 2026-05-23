from typing import Optional

from pydantic import BaseModel, field_validator, model_validator


class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = 'published'


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None

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

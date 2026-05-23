from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from services.categories_service import get_category, list_categories

router = APIRouter()


@router.get("")
def list_categories_route(conn=Depends(get_db)):
    return list_categories(conn)


@router.get("/{slug}")
def get_category_route(slug: str, conn=Depends(get_db)):
    category = get_category(conn, slug)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return category

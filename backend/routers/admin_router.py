from fastapi import APIRouter, Depends, HTTPException, Request

from database import get_db
from dependencies.auth import require_admin
from services.admin_service import get_users_list, get_user_detail, delete_user

router = APIRouter()


@router.get("/users")
def list_users_route(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    provider: str = None,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    return get_users_list(conn, skip=skip, limit=limit, search=search, provider=provider)


@router.get("/users/{user_id}")
def get_user_route(
    user_id: int,
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    try:
        return get_user_detail(conn, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/users/{user_id}")
def delete_user_route(
    user_id: int,
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    try:
        return delete_user(conn, user_id)
    except ValueError as e:
        if "不存在" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))

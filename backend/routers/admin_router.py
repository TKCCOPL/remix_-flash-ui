from fastapi import APIRouter, Depends, HTTPException, Query, Request

from database import get_db
from dependencies.auth import require_admin, ASSIGNABLE_ROLES
from services.admin_service import get_users_list, get_user_detail, change_user_role, delete_user

router = APIRouter()


@router.get("/users")
def list_users_route(
    request: Request,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
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


@router.patch("/users/{user_id}/role")
def update_user_role_route(
    user_id: int,
    role: str,
    request: Request,
    admin=Depends(require_admin),
    conn=Depends(get_db),
):
    if role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid assignable role: {role}")
    # Prevent admin from changing their own role via OAuth user_id lookup
    # Admin session users have user_id=None, so we resolve it
    from dependencies.auth import resolve_user_id
    admin_id = resolve_user_id(admin, conn)
    if admin_id == user_id:
        raise HTTPException(status_code=400, detail="不能修改自己的角色")
    try:
        return change_user_role(conn, user_id, role)
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

from fastapi import APIRouter, Depends, HTTPException, Request
import sqlite3
import json

from database import get_db
from dependencies.auth import require_login
from repositories.comments_admin_repository import (
    get_comments_with_filter,
    count_comments,
    update_comment_status,
    delete_comment_by_id,
    batch_delete_comments,
    get_filters,
    add_filter,
    delete_filter,
)

router = APIRouter()


@router.get("")
def list_comments_route(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    status: str = None,
    search: str = None,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    comments = get_comments_with_filter(conn, status=status, search=search, skip=skip, limit=limit)
    total = count_comments(conn, status=status)
    return {"comments": comments, "total": total, "skip": skip, "limit": limit}


@router.put("/{comment_id}/status")
def update_status_route(
    comment_id: int,
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    body = json.loads(request._body)
    status = body.get("status")
    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")
    if not update_comment_status(conn, comment_id, status):
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "状态已更新"}


@router.delete("/{comment_id}")
def delete_comment_route(
    comment_id: int,
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    if not delete_comment_by_id(conn, comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "评论已删除"}


@router.post("/batch-delete")
def batch_delete_route(
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    body = json.loads(request._body)
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    count = batch_delete_comments(conn, ids)
    return {"message": f"已删除 {count} 条评论"}


@router.get("/filters")
def list_filters_route(
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    return get_filters(conn)


@router.post("/filters")
def add_filter_route(
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    body = json.loads(request._body)
    filter_type = body.get("filter_type")
    pattern = body.get("pattern")
    action = body.get("action", "pending")
    if not filter_type or not pattern:
        raise HTTPException(status_code=400, detail="filter_type and pattern required")
    return add_filter(conn, filter_type, pattern, action)


@router.delete("/filters/{filter_id}")
def delete_filter_route(
    filter_id: int,
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_login),
):
    if not delete_filter(conn, filter_id):
        raise HTTPException(status_code=404, detail="Filter not found")
    return {"message": "过滤规则已删除"}

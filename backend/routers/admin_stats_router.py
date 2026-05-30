from fastapi import APIRouter, Depends, Request
import sqlite3

from database import get_db
from dependencies.auth import require_login
from services.stats_service import (
    get_overview,
    get_comments_trend,
    get_popular_posts,
    get_category_distribution,
)

router = APIRouter()


@router.get("/overview")
def get_overview_route(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    return get_overview(conn)


@router.get("/comments-trend")
def get_comments_trend_route(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    return {"trend": get_comments_trend(conn)}


@router.get("/popular-posts")
def get_popular_posts_route(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    return {"posts": get_popular_posts(conn)}


@router.get("/category-distribution")
def get_category_distribution_route(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    return {"categories": get_category_distribution(conn)}

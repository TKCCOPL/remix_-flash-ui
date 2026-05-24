from slowapi import Limiter
from starlette.requests import Request


def get_remote_address(request: Request) -> str:
    """Get client IP, respecting X-Forwarded-For for reverse proxy setups."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


limiter = Limiter(key_func=get_remote_address)

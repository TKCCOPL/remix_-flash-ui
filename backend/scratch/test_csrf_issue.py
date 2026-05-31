import sys
import os
sys.path.append("/home/freudom/文档/project-local/ljr/blog/remix_-flash-ui/backend")

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.testclient import TestClient
from middleware import CSRFMiddleware

app = FastAPI()
app.add_middleware(CSRFMiddleware)

@app.delete("/test/{id}")
def delete_test(id: int, request: Request):
    # Mimic _require_login
    raise HTTPException(status_code=401, detail="unauthorized")

client = TestClient(app)
response = client.delete("/test/1")
print("Status code:", response.status_code)
print("Response body:", response.json())

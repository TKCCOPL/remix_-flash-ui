import sqlite3
import unittest

from fastapi.testclient import TestClient

from main import app


class AdminApiWorkflowTest(unittest.TestCase):
    def setUp(self):
        conn = sqlite3.connect("data/blog.sqlite3")
        conn.execute("DELETE FROM posts")
        conn.commit()
        conn.close()
        self.client = TestClient(app)

    def test_me_requires_login(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_no_template_routes(self):
        response = self.client.get("/")
        self.assertIn(response.status_code, (404, 405))

    def test_login_and_crud(self):
        login = self.client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "123456"},
        )
        self.assertEqual(login.status_code, 200)

        create = self.client.post(
            "/api/posts",
            json={"title": "t1", "content": "c1", "category": "cat", "image_url": "https://example.com/cover.png"},
        )
        self.assertEqual(create.status_code, 200)
        post_id = create.json()["id"]
        self.assertEqual(create.json()["image_url"], "https://example.com/cover.png")

        list_response = self.client.get("/api/posts")
        self.assertEqual(list_response.status_code, 200)
        self.assertTrue(any(post["id"] == post_id for post in list_response.json()))

        update = self.client.put(
            f"/api/posts/{post_id}",
            json={"title": "t2", "image_url": ""},
        )
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.json()["title"], "t2")
        self.assertEqual(update.json()["image_url"], "")

        delete = self.client.delete(f"/api/posts/{post_id}")
        self.assertEqual(delete.status_code, 200)

    def test_public_can_read_posts(self):
        login = self.client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "123456"},
        )
        self.assertEqual(login.status_code, 200)

        create = self.client.post(
            "/api/posts",
            json={
                "title": "public-title",
                "content": "public-content",
                "category": "public-cat",
                "image_url": "https://example.com/public.png",
            },
        )
        self.assertEqual(create.status_code, 200)
        post_id = create.json()["id"]

        anonymous_client = TestClient(app)

        list_response = anonymous_client.get("/api/posts")
        self.assertEqual(list_response.status_code, 200)
        self.assertTrue(any(post["id"] == post_id for post in list_response.json()))

        detail_response = anonymous_client.get(f"/api/posts/{post_id}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["title"], "public-title")
        self.assertEqual(detail_response.json()["image_url"], "https://example.com/public.png")

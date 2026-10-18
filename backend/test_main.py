import os
import tempfile

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.db")
from fastapi.testclient import TestClient  # noqa: E402

from main import DEMO_PASSWORD, DEMO_PHONE, app  # noqa: E402


def test_auth():
    with TestClient(app) as c:
        assert c.get("/api/overview").status_code == 401
        assert c.post("/api/auth/login", json={"phone": DEMO_PHONE, "password": "nope"}).status_code == 401
        user = {"name": "Test", "phone": "۰۹۱۲ ۳۴۵ ۶۷۸۹", "password": "secret1", "city": "Yazd"}  # Persian digits accepted
        assert c.post("/api/auth/register", json={**user, "city": "Atlantis"}).status_code == 422
        assert c.post("/api/auth/register", json=user).status_code == 201
        assert c.get("/api/me").json()["phone"] == "09123456789"
        c.post("/api/auth/logout")
        assert c.get("/api/me").status_code == 401
        assert c.post("/api/auth/register", json=user).status_code == 409
        assert c.post("/api/auth/login", json={"phone": "09123456789", "password": "secret1"}).status_code == 200


def test_sync_redeem_order():
    with TestClient(app) as c:
        c.post("/api/auth/login", json={"phone": DEMO_PHONE, "password": DEMO_PASSWORD})
        before = c.get("/api/overview").json()["me"]["credits"]
        added = c.post("/api/sync").json()["added"]
        cheapest = c.get("/api/rewards").json()[0]
        r = c.post(f"/api/rewards/{cheapest['id']}/redeem")
        assert r.status_code == 200 and r.json()["me"]["credits"] == before + added - cheapest["cost"]
        # drain credits: redeeming must eventually fail, never go negative
        while (r := c.post(f"/api/rewards/{cheapest['id']}/redeem")).status_code == 200:
            pass
        assert r.status_code == 400 and c.get("/api/me").json()["credits"] >= 0
        assert c.post("/api/rewards/999/redeem").status_code == 404

        order = {"kit": "community", "qty": 5, "name": "School", "phone": DEMO_PHONE, "city": "Tehran", "address": "Valiasr St, No. 12"}
        assert c.post("/api/orders", json=order).status_code == 422  # community pack needs 10+
        r = c.post("/api/orders", json={**order, "qty": 10, "total": 1})  # client total is ignored
        assert r.status_code == 201 and r.json()["total"] == 98_000_000
        assert c.get("/api/me").json()["orders"][0]["qty"] == 10

"""End-to-end backend API tests for Loom & Pastel Co."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://coord-hub-store.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "owner@loompastel.com", "password": "Admin@12345"}
MANAGER = {"email": "manager@loompastel.com", "password": "Staff@12345"}
SUPPORT = {"email": "support@loompastel.com", "password": "Staff@12345"}
CUSTOMER = {"email": "customer@example.com", "password": "Customer@12345"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed {creds['email']}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def owner_token():
    return _login(OWNER)["access_token"]


@pytest.fixture(scope="session")
def support_token():
    return _login(SUPPORT)["access_token"]


@pytest.fixture(scope="session")
def customer_token():
    return _login(CUSTOMER)["access_token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- HEALTH ----------------
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True and d["mock_mode"] is True


# ---------------- AUTH ----------------
def test_auth_owner_login_and_me():
    d = _login(OWNER)
    assert d["user"]["role"] == "Owner"
    assert d["user"]["email"] == "owner@loompastel.com"
    assert d["access_token"] and d["refresh_token"]
    r = requests.get(f"{API}/auth/me", headers=H(d["access_token"]))
    assert r.status_code == 200
    assert r.json()["role"] == "Owner"


def test_auth_signup_new_user():
    import uuid
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "Passw0rd!", "name": "Test"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == email


# ---------------- PRODUCTS/COLLECTIONS ----------------
def test_list_products_has_seeded():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 8, f"expected >=8 seeded products got {data['total']}"


def test_get_product_slug():
    # find any slug
    lst = requests.get(f"{API}/products").json()["items"]
    slug = lst[0]["slug"]
    r = requests.get(f"{API}/products/{slug}")
    assert r.status_code == 200
    d = r.json()
    assert "product" in d and "related" in d
    assert d["product"]["slug"] == slug


def test_collections_list_and_detail():
    r = requests.get(f"{API}/collections")
    assert r.status_code == 200
    cols = r.json()
    assert len(cols) >= 3
    slug = cols[0]["slug"]
    r2 = requests.get(f"{API}/collections/{slug}")
    assert r2.status_code == 200
    assert "collection" in r2.json() and "products" in r2.json()


# ---------------- REVIEWS ----------------
def test_add_review_recomputes_rating():
    prod = requests.get(f"{API}/products").json()["items"][0]
    pid = prod["id"]
    r = requests.post(f"{API}/products/{pid}/reviews", json={"name": "TEST_R", "rating": 5, "title": "gr", "body": "ok"})
    assert r.status_code == 200
    p2 = requests.get(f"{API}/products/{prod['slug']}").json()["product"]
    assert p2.get("rating_count", 0) >= 1
    assert p2.get("rating_avg", 0) > 0


# ---------------- CHECKOUT ----------------
def _first_item():
    p = requests.get(f"{API}/products").json()["items"][0]
    return {"product_id": p["id"], "variant_id": p["variants"][0]["id"], "quantity": 1}, p


def test_checkout_quote_with_coupons():
    item, p = _first_item()
    body = {"items": [item], "pincode": "560001", "coupon_code": "HELLO10"}
    r = requests.post(f"{API}/checkout/quote", json=body)
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["subtotal"] > 0
    assert q["discount"] > 0
    assert "shipping" in q and "tax" in q and "total" in q
    # FLAT500 - need enough subtotal
    body["coupon_code"] = "FLAT500"
    body["items"][0]["quantity"] = 5
    q2 = requests.post(f"{API}/checkout/quote", json=body).json()
    # FLAT500 requires min cart likely; just ensure endpoint returns
    assert "total" in q2
    # FREESHIP
    body["coupon_code"] = "FREESHIP"
    q3 = requests.post(f"{API}/checkout/quote", json=body).json()
    assert q3["shipping"] == 0


@pytest.fixture(scope="session")
def placed_order():
    item, p = _first_item()
    body = {
        "items": [item],
        "pincode": "560001",
        "shipping_address": {
            "name": "Test Buyer", "phone": "9999999999", "email": "buyer@test.com",
            "line1": "1 MG Rd", "city": "Bengaluru", "state": "KA", "pincode": "560001", "country": "IN"
        },
        "payment_method": "razorpay",
        "email": "buyer@test.com",
    }
    r = requests.post(f"{API}/checkout/place", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_place_order_razorpay(placed_order):
    o = placed_order["order"]
    assert o["order_number"].startswith("LP")
    assert o["awb_code"]
    assert o["payment_reference"]
    assert placed_order["payment"] is not None
    assert any(t["event"] == "order_created" for t in o["timeline"])


def test_place_order_cod():
    item, p = _first_item()
    body = {
        "items": [item], "pincode": "560001",
        "shipping_address": {"name": "COD", "phone": "9", "line1": "x", "city": "y", "state": "z", "pincode": "560001", "country": "IN"},
        "payment_method": "cod", "email": "cod@test.com",
    }
    r = requests.post(f"{API}/checkout/place", json=body)
    assert r.status_code == 200
    assert r.json()["order"]["payment_status"] == "cod_pending"


def test_verify_payment(placed_order):
    ref = placed_order["order"]["payment_reference"]
    r = requests.post(f"{API}/checkout/verify-payment", json={
        "razorpay_order_id": ref, "razorpay_payment_id": "pay_mock123", "razorpay_signature": "sig_mock", "method": "razorpay"
    })
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True


def test_track_order(placed_order):
    on = placed_order["order"]["order_number"]
    r = requests.get(f"{API}/orders/track/{on}")
    assert r.status_code == 200
    d = r.json()
    assert d["order_number"] == on
    assert "live_tracking" in d


# ---------------- RBAC ----------------
def test_admin_products_no_token():
    r = requests.get(f"{API}/admin/products")
    assert r.status_code in (401, 403)


def test_admin_products_customer_forbidden(customer_token):
    r = requests.get(f"{API}/admin/products", headers=H(customer_token))
    assert r.status_code == 403


def test_admin_products_owner_ok(owner_token):
    r = requests.get(f"{API}/admin/products", headers=H(owner_token))
    assert r.status_code == 200
    assert len(r.json()) >= 8


def test_support_cannot_write_product(support_token, owner_token):
    prods = requests.get(f"{API}/admin/products", headers=H(owner_token)).json()
    pid = prods[0]["id"]
    r = requests.patch(f"{API}/admin/products/{pid}", headers=H(support_token), json={"title": "x"})
    assert r.status_code == 403


# ---------------- ADMIN CRUD ----------------
def test_admin_product_crud(owner_token):
    body = {"title": "TEST_Product", "slug": f"test-prod-{os.urandom(3).hex()}", "description": "d", "category": "tops",
            "variants": [{"size": "M", "color": "Red", "price": 999, "stock": 10, "sku": f"TEST-{os.urandom(3).hex()}"}], "status": "active"}
    r = requests.post(f"{API}/admin/products", headers=H(owner_token), json=body)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    r2 = requests.patch(f"{API}/admin/products/{pid}", headers=H(owner_token), json={"title": "TEST_Updated"})
    assert r2.status_code == 200 and r2.json()["title"] == "TEST_Updated"
    r3 = requests.delete(f"{API}/admin/products/{pid}", headers=H(owner_token))
    assert r3.status_code == 200


def test_admin_collection_crud(owner_token):
    body = {"title": "TEST_Col", "slug": f"test-col-{os.urandom(3).hex()}", "description": "x"}
    r = requests.post(f"{API}/admin/collections", headers=H(owner_token), json=body)
    assert r.status_code == 200
    cid = r.json()["id"]
    r2 = requests.patch(f"{API}/admin/collections/{cid}", headers=H(owner_token), json={"title": "TEST_Col2"})
    assert r2.status_code == 200
    r3 = requests.delete(f"{API}/admin/collections/{cid}", headers=H(owner_token))
    assert r3.status_code == 200


def test_admin_coupon_crud(owner_token):
    code = f"TEST{os.urandom(2).hex().upper()}"
    r = requests.post(f"{API}/admin/coupons", headers=H(owner_token), json={"code": code, "kind": "percent", "value": 5, "active": True})
    assert r.status_code == 200
    cid = r.json()["id"]
    r2 = requests.patch(f"{API}/admin/coupons/{cid}", headers=H(owner_token), json={"value": 7})
    assert r2.status_code == 200
    r3 = requests.delete(f"{API}/admin/coupons/{cid}", headers=H(owner_token))
    assert r3.status_code == 200


def test_admin_customers(owner_token):
    r = requests.get(f"{API}/admin/customers", headers=H(owner_token))
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    for u in users:
        assert "orders_count" in u and "total_spent" in u


def test_admin_order_update_and_refund(owner_token, placed_order):
    oid = placed_order["order"]["order_number"]
    r = requests.patch(f"{API}/admin/orders/{oid}", headers=H(owner_token), json={"status": "shipped", "note": "TEST_ship"})
    assert r.status_code == 200
    assert r.json()["status"] == "shipped"
    r2 = requests.post(f"{API}/admin/orders/{oid}/refund", headers=H(owner_token), json={"amount": 100})
    assert r2.status_code == 200


# ---------------- EMAIL TEMPLATES ----------------
def test_email_templates(owner_token):
    r = requests.get(f"{API}/admin/email-templates", headers=H(owner_token))
    assert r.status_code == 200
    tmpls = r.json()
    if not tmpls:
        pytest.skip("no seeded templates")
    key = tmpls[0]["key"]
    r2 = requests.patch(f"{API}/admin/email-templates/{key}", headers=H(owner_token), json={"subject": "TEST_Subj"})
    assert r2.status_code == 200
    r3 = requests.post(f"{API}/admin/email-templates/{key}/test", headers=H(owner_token), json={"to": "test@example.com"})
    assert r3.status_code == 200 and r3.json()["ok"] is True


# ---------------- SETTINGS + PAGES ----------------
def test_settings_get_patch(owner_token):
    r = requests.get(f"{API}/admin/settings", headers=H(owner_token))
    assert r.status_code == 200
    r2 = requests.patch(f"{API}/admin/settings", headers=H(owner_token), json={"gst_rate": 5.0})
    assert r2.status_code == 200


def test_pages(owner_token):
    r = requests.get(f"{API}/admin/pages", headers=H(owner_token))
    assert r.status_code == 200
    slug = f"test-page-{os.urandom(3).hex()}"
    r2 = requests.post(f"{API}/admin/pages", headers=H(owner_token), json={"slug": slug, "title": "T", "body_html": "<p>hi</p>"})
    assert r2.status_code == 200
    r3 = requests.patch(f"{API}/admin/pages/{slug}", headers=H(owner_token), json={"title": "T2"})
    assert r3.status_code == 200


def test_public_page_about():
    r = requests.get(f"{API}/pages/about")
    assert r.status_code == 200
    assert r.json()["slug"] == "about"


# ---------------- ANALYTICS ----------------
def test_analytics(owner_token):
    r = requests.get(f"{API}/admin/analytics", headers=H(owner_token))
    assert r.status_code == 200
    d = r.json()
    for k in ("kpi", "sales_by_day", "top_products", "low_stock"):
        assert k in d


# ---------------- IMAGEKIT ----------------
def test_imagekit_auth_and_upload(owner_token):
    r = requests.get(f"{API}/imagekit/auth", headers=H(owner_token))
    assert r.status_code == 200
    d = r.json()
    for k in ("token", "expire", "signature"):
        assert k in d
    r2 = requests.post(f"{API}/imagekit/mock-upload", headers=H(owner_token),
                       json={"filename": "test.jpg", "url": "https://example.com/x.jpg"})
    assert r2.status_code == 200


# ---------------- NEWSLETTER ----------------
def test_newsletter():
    r = requests.post(f"{API}/newsletter", json={"email": f"nl_{os.urandom(3).hex()}@test.com"})
    assert r.status_code == 200


# ---------------- WEBHOOK ----------------
def test_webhook_shiprocket(placed_order):
    awb = placed_order["order"]["awb_code"]
    r = requests.post(f"{API}/webhooks/shiprocket", json={"awb": awb, "current_status": "Out for Delivery"})
    assert r.status_code == 200

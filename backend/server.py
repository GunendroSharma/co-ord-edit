from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request, UploadFile, File
from fastapi.responses import Response, PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional, List
import logging
import os
import io
import csv
import uuid
import asyncio
import httpx
from datetime import datetime, timezone, timedelta

from config import settings
from db import db, ensure_indexes
from models import (
    User, SignupIn, LoginIn, Product, Collection, Variant, MediaAsset,
    Order, OrderItem, ShippingAddress, Coupon, Review, EmailTemplate,
    StoreSettings, ContentPage, Newsletter, AbandonedCart,
)
from auth import (
    hash_pw, verify_pw, make_tokens, decode_token,
    get_current_user, optional_user, require_staff, require_admin_write,
)
from providers import imagekit, get_payment_provider, shiprocket, get_email_provider

app = FastAPI(title="Loom & Pastel Co. API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("api")


@app.on_event("startup")
async def _startup():
    await ensure_indexes()


def _now():
    return datetime.now(timezone.utc).isoformat()


def _gen_order_no():
    return "LP" + datetime.now(timezone.utc).strftime("%y%m%d") + uuid.uuid4().hex[:5].upper()


def _proj(**extra):
    d = {"_id": 0}
    d.update(extra)
    return d


def _clean(doc):
    """Defensively strip MongoDB _id from a doc, list of docs, or nested list."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [_clean(d) for d in doc]
    if isinstance(doc, dict):
        doc.pop("_id", None)
    return doc


# ================================ HEALTH ================================
@api.get("/")
async def root():
    return {"ok": True, "service": "loom-pastel-api", "mock_mode": settings.MOCK_MODE}


# ================================ AUTH ================================
@api.post("/auth/signup")
async def signup(payload: SignupIn):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    u = User(email=payload.email.lower(), password_hash=hash_pw(payload.password), name=payload.name)
    await db.users.insert_one(u.model_dump())
    tokens = make_tokens(u.id, u.role)
    return {**tokens, "user": {"id": u.id, "email": u.email, "name": u.name, "role": u.role}}


@api.post("/auth/login")
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    tokens = make_tokens(user["id"], user["role"])
    return {**tokens, "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""), "role": user["role"]}}


@api.post("/auth/refresh")
async def refresh(body: dict):
    token = body.get("refresh_token", "")
    payload = decode_token(token, refresh=True)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return make_tokens(user["id"], user["role"])


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.patch("/auth/me")
async def update_me(body: dict, user=Depends(get_current_user)):
    allowed = {k: v for k, v in body.items() if k in {"name", "phone", "addresses", "wishlist"}}
    await db.users.update_one({"id": user["id"]}, {"$set": allowed})
    return _clean(await db.users.find_one({"id": user["id"]}, _proj(password_hash=0)))


# ================================ PRODUCTS (Storefront) ================================
@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    collection: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "new",
    limit: int = 24,
    skip: int = 0,
):
    query: dict = {"status": "active"}
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"tags": {"$regex": q, "$options": "i"}}]
    if collection:
        col = await db.collections.find_one({"slug": collection})
        if col:
            query["collection_ids"] = col["id"]
    if category:
        query["category"] = category
    sort_map = {"new": [("created_at", -1)], "price_asc": [("variants.0.price", 1)], "price_desc": [("variants.0.price", -1)], "top": [("rating_avg", -1)]}
    cursor = db.products.find(query, _proj()).sort(sort_map.get(sort, sort_map["new"])).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    # Optional price filter (post-fetch since variant price nested)
    if min_price is not None or max_price is not None:
        def _p(p):
            prices = [v.get("price", 0) for v in p.get("variants", [])] or [0]
            lo = min(prices)
            return (min_price is None or lo >= min_price) and (max_price is None or lo <= max_price)
        items = [p for p in items if _p(p)]
    total = await db.products.count_documents(query)
    return {"items": _clean(items), "total": total}


@api.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug}, _proj())
    if not p:
        raise HTTPException(404, "Product not found")
    related = await db.products.find({"category": p.get("category"), "id": {"$ne": p["id"]}, "status": "active"}, _proj()).limit(4).to_list(4)
    return {"product": _clean(p), "related": _clean(related)}


@api.get("/collections")
async def list_collections():
    return _clean(await db.collections.find({}, _proj()).to_list(100))


@api.get("/collections/{slug}")
async def get_collection(slug: str):
    c = await db.collections.find_one({"slug": slug}, _proj())
    if not c:
        raise HTTPException(404, "Collection not found")
    products = await db.products.find({"collection_ids": c["id"], "status": "active"}, _proj()).to_list(100)
    return {"collection": _clean(c), "products": _clean(products)}


# ================================ REVIEWS ================================
@api.get("/products/{product_id}/reviews")
async def get_reviews(product_id: str):
    return _clean(await db.reviews.find({"product_id": product_id}, _proj()).sort([("created_at", -1)]).to_list(200))


@api.post("/products/{product_id}/reviews")
async def add_review(product_id: str, body: dict, user=Depends(optional_user)):
    r = Review(
        product_id=product_id,
        user_id=user["id"] if user else None,
        name=body.get("name") or (user["name"] if user else "Anonymous"),
        rating=int(body.get("rating", 5)),
        title=body.get("title", ""),
        body=body.get("body", ""),
    )
    await db.reviews.insert_one(r.model_dump())
    # Recompute product rating
    revs = await db.reviews.find({"product_id": product_id}, {"rating": 1, "_id": 0}).to_list(1000)
    if revs:
        avg = sum(x["rating"] for x in revs) / len(revs)
        await db.products.update_one({"id": product_id}, {"$set": {"rating_avg": round(avg, 2), "rating_count": len(revs)}})
    return r.model_dump()


# ================================ CART / CHECKOUT ================================
@api.post("/checkout/quote")
async def checkout_quote(body: dict):
    """Calculates totals from item list + coupon + shipping."""
    items = body.get("items", [])
    pincode = body.get("pincode", "")
    coupon_code = body.get("coupon_code")
    subtotal = 0.0
    detailed_items = []
    for it in items:
        p = await db.products.find_one({"id": it["product_id"]}, _proj())
        if not p:
            continue
        variant = next((v for v in p["variants"] if v["id"] == it["variant_id"]), None)
        if not variant:
            continue
        qty = int(it.get("quantity", 1))
        price = variant["price"]
        subtotal += price * qty
        detailed_items.append({
            "product_id": p["id"], "variant_id": variant["id"], "title": p["title"],
            "variant_label": f"{variant.get('size','')} / {variant.get('color','')}".strip(" /"),
            "price": price, "quantity": qty,
            "image": (p["media"][0]["url"] if p.get("media") else ""),
        })
    settings_doc = await db.settings.find_one({"id": "singleton"}, _proj()) or {}
    free_over = settings_doc.get("free_shipping_over", 1499)
    flat = settings_doc.get("shipping_flat_rate", 99)
    gst_rate = settings_doc.get("gst_rate", 5.0)

    # Shipping (Shiprocket rate calc)
    shipping = 0.0
    courier_info = None
    if pincode:
        courier_info = shiprocket.calc_rate(pincode)
        shipping = courier_info["rate"]
    else:
        shipping = flat

    discount = 0.0
    coupon_valid = None
    if coupon_code:
        c = await db.coupons.find_one({"code": coupon_code.upper(), "active": True}, _proj())
        if c and subtotal >= c.get("min_cart", 0) and (c.get("max_uses", 0) == 0 or c.get("used", 0) < c.get("max_uses", 0)):
            coupon_valid = c
            if c["kind"] == "percent":
                discount = subtotal * (c["value"] / 100.0)
            elif c["kind"] == "flat":
                discount = c["value"]
            elif c["kind"] == "free_shipping":
                shipping = 0
    if subtotal >= free_over:
        shipping = 0

    tax = round(max(0, (subtotal - discount)) * (gst_rate / 100.0), 2)
    total = round(max(0, subtotal - discount) + shipping + tax, 2)
    return {
        "items": detailed_items,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "shipping": round(shipping, 2),
        "tax": tax,
        "total": total,
        "courier": courier_info,
        "coupon": {"code": coupon_valid["code"], "kind": coupon_valid["kind"], "value": coupon_valid["value"]} if coupon_valid else None,
    }


@api.post("/checkout/place")
async def place_order(body: dict, user=Depends(optional_user)):
    quote = await checkout_quote(body)
    address = ShippingAddress(**body["shipping_address"])
    payment_method = body.get("payment_method", "cod")

    order = Order(
        order_number=_gen_order_no(),
        customer_id=user["id"] if user else None,
        customer_email=body.get("email") or (user["email"] if user else address.email or ""),
        items=[OrderItem(**i) for i in quote["items"]],
        subtotal=quote["subtotal"],
        discount=quote["discount"],
        shipping=quote["shipping"],
        tax=quote["tax"],
        total=quote["total"],
        coupon_code=(quote["coupon"]["code"] if quote.get("coupon") else None),
        payment_method=payment_method,
        payment_status="pending" if payment_method != "cod" else "cod_pending",
        shipping_address=address,
        timeline=[{"at": _now(), "event": "order_created", "note": "Order placed"}],
    )

    # Payment: create gateway order if online
    pay_order = None
    if payment_method in ("razorpay", "payu"):
        prov = get_payment_provider(payment_method)
        pay_order = prov.create_order(order.total, order.order_number)
        order.payment_reference = pay_order["id"]

    # Auto-generate AWB (Shiprocket) in mock mode after order create
    awb = shiprocket.create_awb({"order_number": order.order_number, "address": address.model_dump()})
    order.awb_code = awb["awb_code"]
    order.tracking_url = awb["tracking_url"]
    order.courier = awb.get("courier", "Shiprocket")
    order.timeline.append({"at": _now(), "event": "awb_generated", "note": f"AWB {order.awb_code}"})

    doc = order.model_dump()
    # nested pydantic
    if doc.get("shipping_address") and hasattr(doc["shipping_address"], "model_dump"):
        doc["shipping_address"] = doc["shipping_address"].model_dump()
    await db.orders.insert_one(doc)
    doc.pop("_id", None)

    # Decrement stock
    for it in order.items:
        await db.products.update_one(
            {"id": it.product_id, "variants.id": it.variant_id},
            {"$inc": {"variants.$.stock": -it.quantity}},
        )

    # Fire order confirmation email (mock)
    try:
        tmpl = await db.email_templates.find_one({"key": "order_confirmation"}, _proj())
        if tmpl:
            html = tmpl["body_html"].replace("{customerName}", address.name).replace("{orderId}", order.order_number).replace("{total}", str(order.total))
            get_email_provider().send(order.customer_email, tmpl["subject"].replace("{orderId}", order.order_number), html)
    except Exception as e:
        log.warning(f"email send failed: {e}")

    return {"order": doc, "payment": pay_order}


@api.post("/checkout/verify-payment")
async def verify_payment(body: dict):
    """Called by frontend after Razorpay/PayU handler."""
    order_ref = body.get("razorpay_order_id") or body.get("order_id")
    payment_id = body.get("razorpay_payment_id") or body.get("payment_id")
    signature = body.get("razorpay_signature") or body.get("signature") or ""
    method = body.get("method", "razorpay")
    prov = get_payment_provider(method)
    ok = prov.verify_signature(order_ref, payment_id, signature)
    if not ok:
        raise HTTPException(400, "Invalid payment signature")
    await db.orders.update_one(
        {"payment_reference": order_ref},
        {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": _now()},
         "$push": {"timeline": {"at": _now(), "event": "payment_captured", "note": payment_id}}},
    )
    return {"ok": True}


# ================================ ORDERS (Customer) ================================
@api.get("/orders/track/{order_number}")
async def track_order(order_number: str, email: Optional[str] = None):
    q = {"order_number": order_number}
    if email:
        q["customer_email"] = email.lower()
    o = await db.orders.find_one(q, _proj())
    if not o:
        raise HTTPException(404, "Order not found")
    # Refresh tracking from shiprocket in mock
    if o.get("awb_code"):
        tr = shiprocket.track(o["awb_code"])
        o["live_tracking"] = tr
    return _clean(o)


@api.get("/orders/mine")
async def my_orders(user=Depends(get_current_user)):
    return _clean(await db.orders.find({"customer_id": user["id"]}, _proj()).sort([("created_at", -1)]).to_list(200))


# ================================ NEWSLETTER ================================
@api.post("/newsletter")
async def newsletter(body: dict):
    email = body.get("email", "").lower().strip()
    if "@" not in email:
        raise HTTPException(400, "Invalid email")
    await db.newsletter.update_one({"email": email}, {"$setOnInsert": {"email": email, "created_at": _now()}}, upsert=True)
    return {"ok": True}


# ================================ CONTENT PAGES ================================
@api.get("/pages/{slug}")
async def content_page(slug: str):
    p = await db.pages.find_one({"slug": slug}, _proj())
    if not p:
        raise HTTPException(404, "Not found")
    return _clean(p)


# ================================ IMAGEKIT AUTH ================================
@api.get("/imagekit/auth")
async def imagekit_auth(user=Depends(require_staff)):
    return imagekit.auth_params()


@api.post("/imagekit/mock-upload")
async def imagekit_mock_upload(body: dict, user=Depends(require_staff)):
    """In MOCK_MODE the admin uploads by pasting a remote URL; we store it as a media record."""
    filename = body.get("filename", f"upload-{uuid.uuid4().hex[:6]}.jpg")
    remote_url = body.get("url")
    res = imagekit.mock_upload(filename, remote_url)
    await db.media.insert_one({**res, "created_at": _now()})
    return res


# ================================ ADMIN: CATALOG ================================
@api.get("/admin/products")
async def admin_products(q: Optional[str] = None, status_: Optional[str] = Query(None, alias="status"), user=Depends(require_staff)):
    query: dict = {}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    if status_:
        query["status"] = status_
    return _clean(await db.products.find(query, _proj()).sort([("created_at", -1)]).to_list(500))


@api.post("/admin/products")
async def admin_create_product(body: dict, user=Depends(require_admin_write)):
    body.setdefault("variants", [])
    # ensure variant ids
    for v in body["variants"]:
        v.setdefault("id", str(uuid.uuid4()))
    p = Product(**body)
    d = p.model_dump()
    await db.products.insert_one(d)
    d.pop("_id", None)
    return d


@api.patch("/admin/products/{pid}")
async def admin_update_product(pid: str, body: dict, user=Depends(require_admin_write)):
    body["updated_at"] = _now()
    if "variants" in body:
        for v in body["variants"]:
            v.setdefault("id", str(uuid.uuid4()))
    await db.products.update_one({"id": pid}, {"$set": body})
    return _clean(await db.products.find_one({"id": pid}, _proj()))


@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, user=Depends(require_admin_write)):
    p = await db.products.find_one({"id": pid}, _proj())
    if p:
        for m in p.get("media", []):
            try:
                imagekit.delete_file(m.get("file_id", ""))
            except Exception:
                pass
    await db.products.delete_one({"id": pid})
    return {"ok": True}


@api.get("/admin/collections")
async def admin_collections(user=Depends(require_staff)):
    return _clean(await db.collections.find({}, _proj()).to_list(200))


@api.post("/admin/collections")
async def admin_create_collection(body: dict, user=Depends(require_admin_write)):
    c = Collection(**body)
    d = c.model_dump()
    await db.collections.insert_one(d)
    d.pop("_id", None)
    return d


@api.patch("/admin/collections/{cid}")
async def admin_update_collection(cid: str, body: dict, user=Depends(require_admin_write)):
    await db.collections.update_one({"id": cid}, {"$set": body})
    return _clean(await db.collections.find_one({"id": cid}, _proj()))


@api.delete("/admin/collections/{cid}")
async def admin_delete_collection(cid: str, user=Depends(require_admin_write)):
    await db.collections.delete_one({"id": cid})
    return {"ok": True}


# ================================ ADMIN: ORDERS ================================
@api.get("/admin/orders")
async def admin_orders(
    status_: Optional[str] = Query(None, alias="status"),
    payment_status: Optional[str] = None,
    q: Optional[str] = None,
    user=Depends(require_staff),
):
    query: dict = {}
    if status_:
        query["status"] = status_
    if payment_status:
        query["payment_status"] = payment_status
    if q:
        query["$or"] = [{"order_number": {"$regex": q, "$options": "i"}}, {"customer_email": {"$regex": q, "$options": "i"}}]
    return _clean(await db.orders.find(query, _proj()).sort([("created_at", -1)]).to_list(500))


@api.get("/admin/orders/{oid}")
async def admin_order(oid: str, user=Depends(require_staff)):
    o = await db.orders.find_one({"$or": [{"id": oid}, {"order_number": oid}]}, _proj())
    if not o:
        raise HTTPException(404, "Not found")
    return _clean(o)


@api.patch("/admin/orders/{oid}")
async def admin_update_order(oid: str, body: dict, user=Depends(require_staff)):
    updates = {k: v for k, v in body.items() if k in {"status", "payment_status", "notes", "courier", "awb_code", "tracking_url"}}
    updates["updated_at"] = _now()
    event = body.get("event") or f"status:{updates.get('status', '')}"
    await db.orders.update_one(
        {"$or": [{"id": oid}, {"order_number": oid}]},
        {"$set": updates, "$push": {"timeline": {"at": _now(), "event": event, "note": body.get("note", "")}}},
    )
    return _clean(await db.orders.find_one({"$or": [{"id": oid}, {"order_number": oid}]}, _proj()))


@api.post("/admin/orders/{oid}/refund")
async def admin_refund(oid: str, body: dict, user=Depends(require_admin_write)):
    o = await db.orders.find_one({"$or": [{"id": oid}, {"order_number": oid}]}, _proj())
    if not o:
        raise HTTPException(404, "Not found")
    amount = float(body.get("amount", o["total"]))
    prov = get_payment_provider(o.get("payment_method", "razorpay"))
    result = prov.refund(o.get("payment_reference", ""), amount)
    await db.orders.update_one(
        {"id": o["id"]},
        {"$set": {"payment_status": "refunded", "status": "cancelled", "updated_at": _now()},
         "$push": {"timeline": {"at": _now(), "event": "refunded", "note": f"₹{amount} via {prov.name}"}}},
    )
    return result


# ================================ ADMIN: CUSTOMERS ================================
@api.get("/admin/customers")
async def admin_customers(q: Optional[str] = None, user=Depends(require_staff)):
    query: dict = {"role": "customer"}
    if q:
        query["$or"] = [{"email": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]
    users = await db.users.find(query, _proj(password_hash=0)).sort([("created_at", -1)]).to_list(500)
    # Attach order stats
    for u in users:
        stats = await db.orders.aggregate([
            {"$match": {"customer_id": u["id"]}},
            {"$group": {"_id": None, "count": {"$sum": 1}, "spent": {"$sum": "$total"}}},
        ]).to_list(1)
        u["orders_count"] = stats[0]["count"] if stats else 0
        u["total_spent"] = round(stats[0]["spent"], 2) if stats else 0
    return _clean(users)


@api.patch("/admin/customers/{uid}")
async def admin_update_customer(uid: str, body: dict, user=Depends(require_staff)):
    allowed = {k: v for k, v in body.items() if k in {"name", "phone", "tags", "role"}}
    await db.users.update_one({"id": uid}, {"$set": allowed})
    return _clean(await db.users.find_one({"id": uid}, _proj(password_hash=0)))


# ================================ ADMIN: COUPONS ================================
@api.get("/admin/coupons")
async def admin_coupons(user=Depends(require_staff)):
    return _clean(await db.coupons.find({}, _proj()).to_list(500))


@api.post("/admin/coupons")
async def admin_create_coupon(body: dict, user=Depends(require_admin_write)):
    body["code"] = body.get("code", "").upper()
    c = Coupon(**body)
    d = c.model_dump()
    await db.coupons.insert_one(d)
    d.pop("_id", None)
    return d


@api.patch("/admin/coupons/{cid}")
async def admin_update_coupon(cid: str, body: dict, user=Depends(require_admin_write)):
    if "code" in body:
        body["code"] = body["code"].upper()
    await db.coupons.update_one({"id": cid}, {"$set": body})
    return _clean(await db.coupons.find_one({"id": cid}, _proj()))


@api.delete("/admin/coupons/{cid}")
async def admin_delete_coupon(cid: str, user=Depends(require_admin_write)):
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}


# ================================ ADMIN: EMAIL TEMPLATES ================================
@api.get("/admin/email-templates")
async def admin_email_templates(user=Depends(require_staff)):
    return _clean(await db.email_templates.find({}, _proj()).to_list(200))


@api.patch("/admin/email-templates/{key}")
async def admin_update_email_template(key: str, body: dict, user=Depends(require_admin_write)):
    body["updated_at"] = _now()
    await db.email_templates.update_one({"key": key}, {"$set": body}, upsert=True)
    return _clean(await db.email_templates.find_one({"key": key}, _proj()))


@api.post("/admin/email-templates/{key}/test")
async def admin_test_email(key: str, body: dict, user=Depends(require_staff)):
    tmpl = await db.email_templates.find_one({"key": key}, _proj())
    if not tmpl:
        raise HTTPException(404, "Template not found")
    to = body.get("to", user["email"])
    prov = get_email_provider()
    prov.send(to, tmpl["subject"], tmpl["body_html"])
    return {"ok": True, "provider": prov.__class__.__name__}


# ================================ ADMIN: SETTINGS ================================
@api.get("/admin/settings")
async def admin_settings(user=Depends(require_staff)):
    s = await db.settings.find_one({"id": "singleton"}, _proj())
    if not s:
        s = StoreSettings().model_dump()
        await db.settings.insert_one(s)
    return _clean(s)


@api.patch("/admin/settings")
async def admin_update_settings(body: dict, user=Depends(require_admin_write)):
    body["updated_at"] = _now()
    await db.settings.update_one({"id": "singleton"}, {"$set": body}, upsert=True)
    return _clean(await db.settings.find_one({"id": "singleton"}, _proj()))


# ================================ ADMIN: PAGES (CMS) ================================
@api.get("/admin/pages")
async def admin_pages(user=Depends(require_staff)):
    return _clean(await db.pages.find({}, _proj()).to_list(100))


@api.post("/admin/pages")
async def admin_create_page(body: dict, user=Depends(require_admin_write)):
    p = ContentPage(**body)
    d = p.model_dump()
    await db.pages.insert_one(d)
    d.pop("_id", None)
    return d


@api.patch("/admin/pages/{slug}")
async def admin_update_page(slug: str, body: dict, user=Depends(require_admin_write)):
    body["updated_at"] = _now()
    await db.pages.update_one({"slug": slug}, {"$set": body})
    return _clean(await db.pages.find_one({"slug": slug}, _proj()))


# ================================ ADMIN: STAFF ================================
@api.get("/admin/staff")
async def admin_staff(user=Depends(require_staff)):
    return _clean(await db.users.find({"role": {"$in": ["Owner", "Manager", "Support", "Fulfillment"]}}, _proj(password_hash=0)).to_list(100))


@api.post("/admin/staff/invite")
async def admin_invite_staff(body: dict, user=Depends(get_current_user)):
    if user["role"] != "Owner":
        raise HTTPException(403, "Owner only")
    email = body["email"].lower()
    role = body.get("role", "Support")
    if role not in {"Owner", "Manager", "Support", "Fulfillment"}:
        raise HTTPException(400, "Invalid role")
    existing = await db.users.find_one({"email": email})
    default_pw = body.get("password", "Staff@12345")
    if existing:
        await db.users.update_one({"email": email}, {"$set": {"role": role}})
    else:
        u = User(email=email, password_hash=hash_pw(default_pw), name=body.get("name", ""), role=role)
        await db.users.insert_one(u.model_dump())
    return {"ok": True, "email": email, "role": role}


# ================================ ADMIN: ANALYTICS ================================
@api.get("/admin/analytics")
async def admin_analytics(user=Depends(require_staff)):
    # Sales aggregation by day (last 30 days)
    pipeline = [
        {"$match": {"payment_status": {"$in": ["paid", "cod_pending"]}}},
        {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "revenue": {"$sum": "$total"}, "orders": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    sales = await db.orders.aggregate(pipeline).to_list(60)
    total_orders = await db.orders.count_documents({})
    total_revenue_cur = await db.orders.aggregate([{"$group": {"_id": None, "s": {"$sum": "$total"}}}]).to_list(1)
    total_revenue = total_revenue_cur[0]["s"] if total_revenue_cur else 0
    total_customers = await db.users.count_documents({"role": "customer"})
    # Top products
    top_products = await db.orders.aggregate([
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "title": {"$first": "$items.title"}, "qty": {"$sum": "$items.quantity"}, "rev": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}}},
        {"$sort": {"rev": -1}},
        {"$limit": 5},
    ]).to_list(5)
    low_stock = []
    async for p in db.products.find({}, _proj()):
        for v in p.get("variants", []):
            if v.get("stock", 0) < 5:
                low_stock.append({"product": p["title"], "variant": f"{v.get('size','')}/{v.get('color','')}", "stock": v.get("stock", 0)})
    return {
        "kpi": {
            "orders": total_orders,
            "revenue": round(total_revenue, 2),
            "customers": total_customers,
            "avg_order_value": round(total_revenue / total_orders, 2) if total_orders else 0,
        },
        "sales_by_day": sales,
        "top_products": top_products,
        "low_stock": low_stock[:10],
    }


# ================================ WEBHOOKS ================================
@api.post("/webhooks/razorpay")
async def webhook_razorpay(request: Request):
    body = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    prov = get_payment_provider("razorpay")
    if not settings.MOCK_MODE and not prov.verify_signature("", "", sig):
        raise HTTPException(400, "invalid signature")
    payload = await request.json()
    log.info(f"razorpay webhook: {payload.get('event')}")
    return {"ok": True}


@api.post("/webhooks/shiprocket")
async def webhook_shiprocket(request: Request):
    payload = await request.json()
    awb = payload.get("awb")
    status_ = payload.get("current_status", "In Transit")
    if awb:
        await db.orders.update_one(
            {"awb_code": awb},
            {"$push": {"timeline": {"at": _now(), "event": "tracking_update", "note": status_}}},
        )
    return {"ok": True}


# ================================ CSV IMPORT / EXPORT ================================
@api.post("/admin/products/bulk-import")
async def bulk_import_products(file: UploadFile = File(...), user=Depends(require_admin_write)):
    content = (await file.read()).decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    created, updated, errors = 0, 0, []
    for row in reader:
        try:
            slug = (row.get("slug") or row.get("title", "")).strip().lower().replace(" ", "-")
            if not slug:
                continue
            sizes = [s.strip() for s in (row.get("sizes") or "XS,S,M,L").split(",") if s.strip()]
            price = float(row.get("price") or 0)
            compare = float(row.get("compare_at_price") or 0) or None
            stock_per = int(row.get("stock") or 10)
            image_urls = [u.strip() for u in (row.get("image_urls") or "").split("|") if u.strip()]
            sku_root = slug.upper()[:8]
            variants = [{"id": str(uuid.uuid4()), "sku": f"{sku_root}-{s}", "size": s, "color": row.get("color") or "Natural",
                         "price": price, "compare_at_price": compare, "stock": stock_per, "backorder": False, "image_ids": []} for s in sizes]
            media = [{"file_id": f"csv_{uuid.uuid4().hex[:8]}", "url": u, "thumbnail_url": u, "kind": "image",
                      "tag": "product", "is_primary": i == 0} for i, u in enumerate(image_urls)]
            doc = {
                "title": row.get("title", "").strip(), "slug": slug,
                "description": row.get("description", ""), "category": row.get("category", ""),
                "tags": [t.strip() for t in (row.get("tags") or "").split(",") if t.strip()],
                "status": row.get("status") or "active",
                "seo_title": row.get("seo_title", ""), "seo_description": row.get("seo_description", ""),
                "variants": variants, "media": media, "updated_at": _now(),
            }
            existing = await db.products.find_one({"slug": slug})
            if existing:
                await db.products.update_one({"slug": slug}, {"$set": doc})
                updated += 1
            else:
                p = Product(**doc)
                d = p.model_dump()
                await db.products.insert_one(d)
                created += 1
        except Exception as e:
            errors.append({"row": row.get("slug") or row.get("title"), "error": str(e)})
    return {"created": created, "updated": updated, "errors": errors}


@api.get("/admin/products/export.csv")
async def export_products(user=Depends(require_staff)):
    rows = await db.products.find({}, _proj()).to_list(1000)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["slug", "title", "description", "category", "tags", "status", "sizes", "price", "compare_at_price", "stock", "image_urls", "seo_title", "seo_description"])
    for p in rows:
        variants = p.get("variants") or [{}]
        first = variants[0] if variants else {}
        sizes = ",".join([v.get("size", "") for v in variants])
        images = "|".join([m.get("url", "") for m in (p.get("media") or [])])
        writer.writerow([
            p.get("slug", ""), p.get("title", ""), p.get("description", ""), p.get("category", ""),
            ",".join(p.get("tags") or []), p.get("status", ""), sizes,
            first.get("price", 0), first.get("compare_at_price") or "", first.get("stock", 0),
            images, p.get("seo_title", ""), p.get("seo_description", ""),
        ])
    return Response(content=out.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=products.csv"})


@api.get("/admin/products/import-template.csv")
async def import_template(user=Depends(require_staff)):
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["slug", "title", "description", "category", "tags", "status", "sizes", "price", "compare_at_price", "stock", "image_urls", "seo_title", "seo_description", "color"])
    writer.writerow(["saffron-kaftan", "Saffron Kaftan", "Breezy linen kaftan.", "kaftans", "kaftan,linen", "active", "XS,S,M,L", "3490", "4200", "12", "https://images.unsplash.com/photo-1625136217041-171e27168e97", "Saffron Kaftan — Loom & Pastel Co.", "Breezy linen kaftan in saffron.", "Saffron"])
    return Response(content=out.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=products-template.csv"})


# ================================ ABANDONED CART ================================
@api.post("/cart/save")
async def cart_save(body: dict):
    """Called by frontend when a user with an email has items in cart."""
    email = (body.get("email") or "").lower().strip()
    if not email or "@" not in email:
        return {"ok": False}
    items = body.get("items") or []
    if not items:
        # cart cleared → mark recovered
        await db.abandoned_carts.update_many({"email": email, "recovered": False}, {"$set": {"recovered": True}})
        return {"ok": True, "cleared": True}
    subtotal = sum(float(i.get("price", 0)) * int(i.get("quantity", 1)) for i in items)
    await db.abandoned_carts.update_one(
        {"email": email, "recovered": False},
        {"$set": {"items": items, "subtotal": round(subtotal, 2), "updated_at": _now(), "customer_id": body.get("customer_id")},
         "$setOnInsert": {"id": str(uuid.uuid4()), "reminded_at": None, "recovered": False}},
        upsert=True,
    )
    return {"ok": True}


@api.get("/admin/abandoned-carts")
async def admin_abandoned_carts(user=Depends(require_staff)):
    return _clean(await db.abandoned_carts.find({"recovered": False}, _proj()).sort([("updated_at", -1)]).to_list(200))


@api.post("/admin/abandoned-carts/{cid}/remind")
async def admin_remind_cart(cid: str, user=Depends(require_staff)):
    c = await db.abandoned_carts.find_one({"id": cid}, _proj())
    if not c:
        raise HTTPException(404, "Not found")
    await _send_abandoned_reminder(c)
    return {"ok": True}


async def _send_abandoned_reminder(cart: dict):
    try:
        tmpl = await db.email_templates.find_one({"key": "abandoned_cart"}, _proj())
        if not tmpl:
            return
        item_lines = "".join([f"<li>{i.get('title')} × {i.get('quantity')}</li>" for i in cart.get("items", [])])
        html = tmpl["body_html"].replace("{customerName}", cart.get("email", "there").split("@")[0]).replace("{items}", f"<ul>{item_lines}</ul>")
        get_email_provider().send(cart["email"], tmpl["subject"], html)
        await db.abandoned_carts.update_one({"id": cart["id"]}, {"$set": {"reminded_at": _now()}})
    except Exception as e:
        log.warning(f"abandoned cart reminder failed: {e}")


async def _abandoned_cart_loop():
    """Every 15 min, find carts older than 2 hours without reminder and email them."""
    while True:
        try:
            await asyncio.sleep(15 * 60)
            threshold = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            cursor = db.abandoned_carts.find({"recovered": False, "reminded_at": None, "updated_at": {"$lt": threshold}}, _proj())
            async for c in cursor:
                await _send_abandoned_reminder(c)
        except Exception as e:
            log.warning(f"abandoned loop error: {e}")


# ================================ INSTAGRAM FEED ================================
INSTAGRAM_MOCK = [
    {"id": "ig1", "url": "https://images.unsplash.com/photo-1702468508445-7510f972c37e?w=800&q=85", "caption": "Softly stitched · SS26", "permalink": "https://instagram.com/loompastelco"},
    {"id": "ig2", "url": "https://images.unsplash.com/photo-1625136217041-171e27168e97?w=800&q=85", "caption": "Marigold co-ord in the studio", "permalink": "https://instagram.com/loompastelco"},
    {"id": "ig3", "url": "https://images.unsplash.com/photo-1579207238889-e1122bfc0c89?w=800&q=85", "caption": "Details, always", "permalink": "https://instagram.com/loompastelco"},
    {"id": "ig4", "url": "https://images.unsplash.com/photo-1712852733605-4776c3e61d94?w=800&q=85", "caption": "Handloom mornings", "permalink": "https://instagram.com/loompastelco"},
    {"id": "ig5", "url": "https://images.pexels.com/photos/8053683/pexels-photo-8053683.jpeg?w=800", "caption": "Slow-fashion Sunday", "permalink": "https://instagram.com/loompastelco"},
    {"id": "ig6", "url": "https://images.pexels.com/photos/7498815/pexels-photo-7498815.jpeg?w=800", "caption": "Motifs by hand", "permalink": "https://instagram.com/loompastelco"},
]


@api.get("/instagram/feed")
async def instagram_feed():
    # Real integration would call Instagram Basic Display API:
    #   https://graph.instagram.com/me/media?fields=id,caption,media_url,permalink&access_token={IG_ACCESS_TOKEN}
    # For now return curated MOCK feed. Toggle by setting IG_ACCESS_TOKEN in env.
    token = os.environ.get("IG_ACCESS_TOKEN")
    if token and not settings.MOCK_MODE:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://graph.instagram.com/me/media",
                    params={"fields": "id,caption,media_url,permalink", "access_token": token},
                )
                data = r.json().get("data", [])
                return [{"id": p["id"], "url": p.get("media_url"), "caption": p.get("caption", ""), "permalink": p.get("permalink")} for p in data[:6]]
        except Exception as e:
            log.warning(f"instagram fetch failed: {e}")
    return INSTAGRAM_MOCK


# ================================ SEO: sitemap + prerender ================================
@app.get("/sitemap.xml")
async def sitemap():
    base = os.environ.get("PUBLIC_URL", "").rstrip("/")
    urls = ["/", "/shop", "/pages/about", "/pages/faq", "/pages/shipping-returns", "/pages/privacy"]
    products = await db.products.find({"status": "active"}, {"slug": 1, "_id": 0}).to_list(1000)
    collections = await db.collections.find({}, {"slug": 1, "_id": 0}).to_list(200)
    urls += [f"/product/{p['slug']}" for p in products]
    urls += [f"/collections/{c['slug']}" for c in collections]
    body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        body += f"  <url><loc>{base}{u}</loc></url>\n"
    body += "</urlset>\n"
    return Response(content=body, media_type="application/xml")


@app.get("/robots.txt")
async def robots():
    base = os.environ.get("PUBLIC_URL", "")
    return PlainTextResponse(f"User-agent: *\nAllow: /\nSitemap: {base.rstrip('/')}/sitemap.xml\n")


BOT_UAS = ["googlebot", "bingbot", "yandex", "baiduspider", "twitterbot", "facebookexternalhit", "linkedinbot", "embedly", "pinterest", "slackbot", "whatsapp", "telegrambot", "duckduckbot", "applebot"]


class PrerenderMiddleware(BaseHTTPMiddleware):
    """Fetches prerender.io for crawler user-agents. Requires PRERENDER_TOKEN env."""

    async def dispatch(self, request, call_next):
        token = os.environ.get("PRERENDER_TOKEN")
        ua = (request.headers.get("user-agent") or "").lower()
        path = request.url.path
        skip_paths = ("/api", "/sitemap.xml", "/robots.txt", "/static", "/manifest.json", "/service-worker.js")
        if token and any(b in ua for b in BOT_UAS) and not any(path.startswith(s) for s in skip_paths):
            try:
                target = str(request.url)
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.get(
                        f"https://service.prerender.io/{target}",
                        headers={"X-Prerender-Token": token, "User-Agent": ua},
                    )
                    return Response(content=r.content, status_code=r.status_code, media_type=r.headers.get("content-type", "text/html"))
            except Exception as e:
                log.warning(f"prerender fetch failed: {e}")
        return await call_next(request)


app.add_middleware(PrerenderMiddleware)


@app.on_event("startup")
async def _start_bg():
    asyncio.create_task(_abandoned_cart_loop())


# ============ Mount ============
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

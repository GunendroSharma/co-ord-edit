"""Seed sample data for Loom & Pastel Co."""
import asyncio
from db import db, ensure_indexes
from models import User, Product, Variant, MediaAsset, Collection, EmailTemplate, StoreSettings, ContentPage, Coupon
from auth import hash_pw

PRODUCT_IMAGES = [
    "https://images.unsplash.com/photo-1625136217041-171e27168e97?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
    "https://images.unsplash.com/photo-1579207238889-e1122bfc0c89?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
    "https://images.unsplash.com/photo-1712852733605-4776c3e61d94?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
    "https://images.unsplash.com/photo-1702468508445-7510f972c37e?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
    "https://images.pexels.com/photos/8053683/pexels-photo-8053683.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7498815/pexels-photo-7498815.jpeg?auto=compress&cs=tinysrgb&w=1200",
]

PRODUCTS_SEED = [
    {"title": "Marigold Co-Ord Set", "slug": "marigold-co-ord-set", "category": "co-ord-sets",
     "description": "Hand-embroidered marigold motifs on breathable cotton. A soft, drapey silhouette that moves with you.",
     "tags": ["co-ord", "embroidery", "cotton"], "price": 4890, "compare": 5900},
    {"title": "Rosewater Kaftan", "slug": "rosewater-kaftan", "category": "kaftans",
     "description": "Loose-cut kaftan in rosewater linen with hand-block prints along the neckline.", "tags": ["kaftan", "linen"], "price": 3290, "compare": 3900},
    {"title": "Sage Chikankari Kurta", "slug": "sage-chikankari-kurta", "category": "kurtas",
     "description": "Lucknowi chikankari on sage cotton — everyday elegance.", "tags": ["chikankari", "kurta"], "price": 2790},
    {"title": "Ivory Anarkali", "slug": "ivory-anarkali", "category": "anarkalis",
     "description": "Floor-grazing anarkali in ivory georgette with pearl detailing.", "tags": ["anarkali", "festive"], "price": 6490, "compare": 7900},
    {"title": "Pastel Bloom Sharara", "slug": "pastel-bloom-sharara", "category": "sharara-sets",
     "description": "Pastel bloom sharara set with tonal thread work.", "tags": ["sharara", "festive"], "price": 5490},
    {"title": "Terracotta Wrap Dress", "slug": "terracotta-wrap-dress", "category": "dresses",
     "description": "A modern wrap in warm terracotta cotton-satin.", "tags": ["dress", "wrap"], "price": 3490},
    {"title": "Almond Silk Co-Ord", "slug": "almond-silk-co-ord", "category": "co-ord-sets",
     "description": "Almond-toned silk co-ord for slow evenings and quiet celebrations.", "tags": ["silk", "co-ord"], "price": 7290, "compare": 8500},
    {"title": "Ochre Handloom Saree", "slug": "ochre-handloom-saree", "category": "sarees",
     "description": "Handloom cotton saree in ochre with contrast border.", "tags": ["saree", "handloom"], "price": 4190},
]

COLLECTIONS_SEED = [
    {"title": "Everyday Edit", "slug": "everyday-edit", "description": "Softly-cut, easy-wear pieces for daily luxury.",
     "hero_image": "https://images.pexels.com/photos/8053683/pexels-photo-8053683.jpeg?auto=compress&cs=tinysrgb&w=1600"},
    {"title": "Festive Reverie", "slug": "festive-reverie", "description": "Ceremony-ready pieces with tonal embroidery.",
     "hero_image": "https://images.unsplash.com/photo-1702468508445-7510f972c37e?crop=entropy&cs=srgb&fm=jpg&w=1600&q=85"},
    {"title": "New Arrivals", "slug": "new-arrivals", "description": "Fresh in from our ateliers.",
     "hero_image": "https://images.unsplash.com/photo-1625136217041-171e27168e97?crop=entropy&cs=srgb&fm=jpg&w=1600&q=85"},
]

EMAIL_TEMPLATES_SEED = [
    {"key": "order_confirmation", "name": "Order Confirmation", "subject": "Your Loom & Pastel order {orderId} is confirmed",
     "body_html": "<p>Dear {customerName},</p><p>Thank you for your order <b>{orderId}</b>. Total: ₹{total}</p><p>We'll notify you once it ships.</p><p>— Loom & Pastel Co.</p>",
     "variables": ["customerName", "orderId", "total", "items"]},
    {"key": "order_shipped", "name": "Order Shipped", "subject": "Your order {orderId} has shipped",
     "body_html": "<p>Hi {customerName}, your order is on the way. Track it here: {trackingLink}</p>", "variables": ["customerName", "orderId", "trackingLink"]},
    {"key": "order_delivered", "name": "Order Delivered", "subject": "Your order {orderId} has been delivered",
     "body_html": "<p>Hi {customerName}, your order has been delivered. We'd love a review!</p>", "variables": ["customerName", "orderId"]},
    {"key": "order_cancelled", "name": "Order Cancelled / Refund", "subject": "Refund processed for {orderId}",
     "body_html": "<p>Hi {customerName}, we've processed a refund of ₹{amount} for order {orderId}.</p>", "variables": ["customerName", "orderId", "amount"]},
    {"key": "abandoned_cart", "name": "Abandoned Cart", "subject": "You left something behind",
     "body_html": "<p>Hi {customerName}, still thinking it over? Your cart is saved for you.</p>", "variables": ["customerName", "items"]},
    {"key": "welcome", "name": "Welcome", "subject": "Welcome to Loom & Pastel Co.",
     "body_html": "<p>Hi {customerName}, welcome to our community. Enjoy 10% off your first order with code <b>HELLO10</b>.</p>", "variables": ["customerName"]},
    {"key": "password_reset", "name": "Password Reset", "subject": "Reset your password",
     "body_html": "<p>Click here to reset your password: {resetLink}</p>", "variables": ["resetLink"]},
    {"key": "admin_low_stock", "name": "Low Stock Alert (Admin)", "subject": "Low stock: {productTitle}",
     "body_html": "<p>{productTitle} ({variant}) has {stock} units left.</p>", "variables": ["productTitle", "variant", "stock"]},
    {"key": "admin_new_order", "name": "New Order Alert (Admin)", "subject": "New order: {orderId}",
     "body_html": "<p>New order {orderId} for ₹{total} from {customerName}.</p>", "variables": ["orderId", "total", "customerName"]},
]


async def run():
    await ensure_indexes()

    # Admin owner
    if not await db.users.find_one({"email": "owner@loompastel.com"}):
        owner = User(email="owner@loompastel.com", password_hash=hash_pw("Admin@12345"), name="Store Owner", role="Owner")
        await db.users.insert_one(owner.model_dump())
        print("Seeded owner: owner@loompastel.com / Admin@12345")

    # Sample staff
    staff_seed = [("manager@loompastel.com", "Manager"), ("support@loompastel.com", "Support"), ("fulfillment@loompastel.com", "Fulfillment")]
    for em, role in staff_seed:
        if not await db.users.find_one({"email": em}):
            u = User(email=em, password_hash=hash_pw("Staff@12345"), name=role, role=role)
            await db.users.insert_one(u.model_dump())

    # Sample customer
    if not await db.users.find_one({"email": "customer@example.com"}):
        c = User(email="customer@example.com", password_hash=hash_pw("Customer@12345"), name="Aanya Sharma", role="customer")
        await db.users.insert_one(c.model_dump())

    # Collections
    collection_map = {}
    for c in COLLECTIONS_SEED:
        existing = await db.collections.find_one({"slug": c["slug"]})
        if existing:
            collection_map[c["slug"]] = existing["id"]
        else:
            col = Collection(**c)
            await db.collections.insert_one(col.model_dump())
            collection_map[c["slug"]] = col.id

    # Products
    for i, p in enumerate(PRODUCTS_SEED):
        if await db.products.find_one({"slug": p["slug"]}):
            continue
        variants = [
            Variant(sku=f"{p['slug'].upper()[:6]}-XS", size="XS", color="Natural", price=p["price"], compare_at_price=p.get("compare"), stock=8),
            Variant(sku=f"{p['slug'].upper()[:6]}-S", size="S", color="Natural", price=p["price"], compare_at_price=p.get("compare"), stock=12),
            Variant(sku=f"{p['slug'].upper()[:6]}-M", size="M", color="Natural", price=p["price"], compare_at_price=p.get("compare"), stock=10),
            Variant(sku=f"{p['slug'].upper()[:6]}-L", size="L", color="Natural", price=p["price"], compare_at_price=p.get("compare"), stock=6),
        ]
        media = [
            MediaAsset(file_id=f"seed_{i}_a", url=PRODUCT_IMAGES[i % len(PRODUCT_IMAGES)], thumbnail_url=PRODUCT_IMAGES[i % len(PRODUCT_IMAGES)], is_primary=True, tag="product"),
            MediaAsset(file_id=f"seed_{i}_b", url=PRODUCT_IMAGES[(i + 1) % len(PRODUCT_IMAGES)], thumbnail_url=PRODUCT_IMAGES[(i + 1) % len(PRODUCT_IMAGES)], tag="lifestyle"),
            MediaAsset(file_id=f"seed_{i}_c", url=PRODUCT_IMAGES[(i + 2) % len(PRODUCT_IMAGES)], thumbnail_url=PRODUCT_IMAGES[(i + 2) % len(PRODUCT_IMAGES)], tag="lifestyle"),
        ]
        # assign collection
        cids = []
        if i < 3:
            cids.append(collection_map["new-arrivals"])
        if i % 2 == 0:
            cids.append(collection_map["everyday-edit"])
        else:
            cids.append(collection_map["festive-reverie"])
        prod = Product(
            title=p["title"], slug=p["slug"], description=p["description"], category=p["category"],
            tags=p["tags"], variants=variants, media=media, collection_ids=cids,
            seo_title=f"{p['title']} — Loom & Pastel Co.", seo_description=p["description"][:150],
        )
        await db.products.insert_one(prod.model_dump())

    # Email templates
    for t in EMAIL_TEMPLATES_SEED:
        if not await db.email_templates.find_one({"key": t["key"]}):
            tmpl = EmailTemplate(**t)
            await db.email_templates.insert_one(tmpl.model_dump())

    # Coupons
    for c in [
        {"code": "HELLO10", "kind": "percent", "value": 10, "min_cart": 0, "active": True},
        {"code": "FLAT500", "kind": "flat", "value": 500, "min_cart": 2999, "active": True},
        {"code": "FREESHIP", "kind": "free_shipping", "value": 0, "min_cart": 1499, "active": True},
    ]:
        if not await db.coupons.find_one({"code": c["code"]}):
            await db.coupons.insert_one(Coupon(**c).model_dump())

    # UGC seed
    ugc_seed = [
        {"image_url": "https://images.unsplash.com/photo-1702468508445-7510f972c37e?w=1000&q=85", "caption": "In love with my Ivory Anarkali 💛", "author_handle": "@aanya.wears", "source": "instagram"},
        {"image_url": "https://images.unsplash.com/photo-1625136217041-171e27168e97?w=1000&q=85", "caption": "Marigold co-ord for the mehendi", "author_handle": "@shreya.saha", "source": "instagram"},
        {"image_url": "https://images.unsplash.com/photo-1579207238889-e1122bfc0c89?w=1000&q=85", "caption": "Chikankari season", "author_handle": "@priya.reads", "source": "instagram"},
        {"image_url": "https://images.pexels.com/photos/8053683/pexels-photo-8053683.jpeg?w=1000", "caption": "Slow Sundays in Rosewater", "author_handle": "@meera.mornings", "source": "instagram"},
    ]
    from models import UGCPost as _UGC
    if await db.ugc.count_documents({}) == 0:
        products = await db.products.find({}, {"id": 1, "slug": 1, "_id": 0}).to_list(20)
        for i, u in enumerate(ugc_seed):
            tagged = [products[i % len(products)]["id"]] if products else []
            await db.ugc.insert_one(_UGC(**u, product_ids=tagged).model_dump())

    # Settings
    if not await db.settings.find_one({"id": "singleton"}):
        await db.settings.insert_one(StoreSettings().model_dump())

    # Pages
    for pg in [
        {"slug": "about", "title": "About Us", "body_html": "<p>Loom & Pastel Co. is a slow-fashion atelier based in India, crafting hand-embroidered co-ord sets and heirloom-worthy pieces for the modern woman.</p>"},
        {"slug": "shipping-returns", "title": "Shipping & Returns", "body_html": "<p>Free shipping on orders above ₹1499. 7-day return window on unworn pieces with tags intact.</p>"},
        {"slug": "faq", "title": "FAQ", "body_html": "<p><b>Do you ship internationally?</b> Not yet.</p><p><b>How do I care for embroidery?</b> Dry-clean only.</p>"},
        {"slug": "privacy", "title": "Privacy Policy", "body_html": "<p>Your data stays with us. We never share.</p>"},
    ]:
        if not await db.pages.find_one({"slug": pg["slug"]}):
            await db.pages.insert_one(ContentPage(**pg).model_dump())

    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(run())

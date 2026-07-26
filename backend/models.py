from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Base(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)


# ============ USER / AUTH ============
class User(Base):
    id: str = Field(default_factory=_uid)
    email: EmailStr
    password_hash: str
    name: str = ""
    phone: str = ""
    role: str = "customer"  # customer | Owner | Manager | Support | Fulfillment
    tags: List[str] = []
    addresses: List[Dict[str, Any]] = []
    wishlist: List[str] = []  # product ids
    referral_code: str = ""
    referred_by: Optional[str] = None
    credits_earned: float = 0.0
    invites: int = 0
    created_at: str = Field(default_factory=_now)


class SignupIn(Base):
    email: EmailStr
    password: str
    name: str = ""
    referred_by: Optional[str] = None


class LoginIn(Base):
    email: EmailStr
    password: str


# ============ CATALOG ============
class Variant(Base):
    id: str = Field(default_factory=_uid)
    sku: str
    size: str = ""
    color: str = ""
    price: float
    compare_at_price: Optional[float] = None
    stock: int = 0
    backorder: bool = False
    image_ids: List[str] = []  # references to media by file_id


class MediaAsset(Base):
    file_id: str
    url: str
    thumbnail_url: Optional[str] = None
    kind: str = "image"  # image | video
    tag: str = "product"  # product | lifestyle | size-chart
    is_primary: bool = False


class Product(Base):
    id: str = Field(default_factory=_uid)
    title: str
    slug: str
    description: str = ""
    status: str = "active"  # active | draft | archived
    vendor: str = "Loom & Pastel Co."
    category: str = ""
    collection_ids: List[str] = []
    tags: List[str] = []
    variants: List[Variant] = []
    media: List[MediaAsset] = []
    seo_title: str = ""
    seo_description: str = ""
    rating_avg: float = 0.0
    rating_count: int = 0
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


class Collection(Base):
    id: str = Field(default_factory=_uid)
    title: str
    slug: str
    description: str = ""
    hero_image: str = ""
    product_ids: List[str] = []
    created_at: str = Field(default_factory=_now)


# ============ ORDERS ============
class OrderItem(Base):
    product_id: str
    variant_id: str
    title: str
    variant_label: str
    price: float
    quantity: int
    image: str = ""


class ShippingAddress(Base):
    name: str
    phone: str
    email: str = ""
    line1: str
    line2: str = ""
    city: str
    state: str
    pincode: str
    country: str = "IN"


class Order(Base):
    id: str = Field(default_factory=_uid)
    order_number: str
    customer_id: Optional[str] = None
    customer_email: str
    items: List[OrderItem] = []
    subtotal: float = 0
    discount: float = 0
    shipping: float = 0
    tax: float = 0
    total: float = 0
    coupon_code: Optional[str] = None
    payment_method: str = "cod"  # cod | razorpay | payu
    payment_status: str = "pending"  # pending | paid | failed | refunded
    payment_reference: Optional[str] = None
    status: str = "pending"  # pending | confirmed | packed | shipped | delivered | cancelled | returned
    shipping_address: Optional[ShippingAddress] = None
    awb_code: Optional[str] = None
    tracking_url: Optional[str] = None
    courier: Optional[str] = None
    timeline: List[Dict[str, Any]] = []
    notes: str = ""
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


class Coupon(Base):
    id: str = Field(default_factory=_uid)
    code: str
    kind: str = "percent"  # percent | flat | free_shipping
    value: float = 0
    min_cart: float = 0
    max_uses: int = 0  # 0 = unlimited
    used: int = 0
    expires_at: Optional[str] = None
    active: bool = True


class Review(Base):
    id: str = Field(default_factory=_uid)
    product_id: str
    user_id: Optional[str] = None
    name: str
    rating: int
    title: str = ""
    body: str = ""
    created_at: str = Field(default_factory=_now)


class EmailTemplate(Base):
    id: str = Field(default_factory=_uid)
    key: str  # order_confirmation, order_shipped, etc.
    name: str
    subject: str
    body_html: str
    variables: List[str] = []
    updated_at: str = Field(default_factory=_now)


class StoreSettings(Base):
    id: str = "singleton"
    store_name: str = "Loom & Pastel Co."
    currency: str = "INR"
    logo_url: str = ""
    gst_rate: float = 5.0
    active_payment_gateways: List[str] = ["razorpay", "cod"]
    cod_enabled: bool = True
    active_courier: str = "shiprocket"
    shipping_flat_rate: float = 99.0
    free_shipping_over: float = 1499.0
    email_provider: str = "mock"
    from_name: str = "Loom & Pastel Co."
    from_email: str = "hello@loompastel.co"
    updated_at: str = Field(default_factory=_now)


class ContentPage(Base):
    id: str = Field(default_factory=_uid)
    slug: str
    title: str
    body_html: str
    updated_at: str = Field(default_factory=_now)


class Newsletter(Base):
    id: str = Field(default_factory=_uid)
    email: EmailStr
    created_at: str = Field(default_factory=_now)


class AbandonedCart(Base):
    id: str = Field(default_factory=_uid)
    email: str
    customer_id: Optional[str] = None
    items: List[Dict[str, Any]] = []
    subtotal: float = 0
    updated_at: str = Field(default_factory=_now)
    reminded_at: Optional[str] = None
    recovered: bool = False


class UGCPost(Base):
    id: str = Field(default_factory=_uid)
    image_url: str
    caption: str = ""
    author_handle: str = ""
    source: str = "instagram"  # instagram | manual
    product_ids: List[str] = []
    approved: bool = True
    created_at: str = Field(default_factory=_now)

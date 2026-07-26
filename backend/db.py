from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

_client = AsyncIOMotorClient(settings.MONGO_URL)
db = _client[settings.DB_NAME]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("status")
    await db.collections.create_index("slug", unique=True)
    await db.orders.create_index("order_number", unique=True)
    await db.orders.create_index("customer_id")
    await db.coupons.create_index("code", unique=True)
    await db.media.create_index("file_id")

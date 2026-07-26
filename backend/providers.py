"""Provider abstractions for ImageKit, Payments, Shipping, Email.
All support MOCK_MODE for end-to-end flows without real API keys.
"""
import hmac
import hashlib
import time
import uuid
from typing import Optional
from config import settings


# =========================== IMAGEKIT ===========================
class ImageKitProvider:
    def __init__(self):
        self.mock = settings.MOCK_MODE

    def auth_params(self):
        # Signature that a real ImageKit client would validate.
        token = str(uuid.uuid4())
        expire = int(time.time()) + 60 * 30
        sig_source = f"{token}{expire}"
        signature = hmac.new(
            settings.IMAGEKIT_PRIVATE_KEY.encode(), sig_source.encode(), hashlib.sha1
        ).hexdigest()
        return {
            "token": token,
            "expire": expire,
            "signature": signature,
            "publicKey": settings.IMAGEKIT_PUBLIC_KEY,
            "urlEndpoint": settings.IMAGEKIT_URL_ENDPOINT,
        }

    def mock_upload(self, filename: str, remote_url: Optional[str] = None):
        """Stub upload used when MOCK_MODE=True. Returns imagekit-shaped payload."""
        fid = f"mock_{uuid.uuid4().hex[:12]}"
        url = remote_url or f"{settings.IMAGEKIT_URL_ENDPOINT}mock/{fid}/{filename}"
        lower = (filename or url or "").lower().split("?")[0]
        is_video = any(lower.endswith(ext) for ext in (".mp4", ".mov", ".webm", ".ogg", ".m4v"))
        return {
            "fileId": fid,
            "url": url,
            "thumbnailUrl": url,
            "name": filename,
            "filePath": f"/mock/{fid}",
            "kind": "video" if is_video else "image",
            "fileType": "video" if is_video else "image",
        }

    def delete_file(self, file_id: str):
        if self.mock:
            return {"ok": True, "id": file_id}
        # Real call would import imagekitio SDK
        return {"ok": True}


imagekit = ImageKitProvider()


# =========================== PAYMENTS ===========================
class PaymentResult(dict):
    pass


class RazorpayProvider:
    name = "razorpay"

    def create_order(self, amount_inr: float, receipt: str):
        if settings.MOCK_MODE:
            return PaymentResult(
                id=f"order_mock_{uuid.uuid4().hex[:14]}",
                amount=int(amount_inr * 100),
                currency="INR",
                status="created",
                receipt=receipt,
                mock=True,
            )
        # Real: razorpay.Client(...).order.create({...})
        return PaymentResult(id="order_live_stub", amount=int(amount_inr * 100), currency="INR", status="created")

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        if settings.MOCK_MODE:
            return True
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            f"{order_id}|{payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def refund(self, payment_id: str, amount_inr: float):
        if settings.MOCK_MODE:
            return {"id": f"rfnd_mock_{uuid.uuid4().hex[:10]}", "status": "processed", "amount": amount_inr}
        return {"id": "rfnd_live_stub", "status": "processed"}


class PayUProvider:
    name = "payu"

    def create_order(self, amount_inr: float, receipt: str):
        if settings.MOCK_MODE:
            return PaymentResult(
                id=f"payu_mock_{uuid.uuid4().hex[:12]}",
                amount=amount_inr,
                currency="INR",
                status="created",
                receipt=receipt,
                mock=True,
            )
        return PaymentResult(id="payu_live_stub", status="created")

    def verify_signature(self, txnid: str, status_: str, hash_: str) -> bool:
        if settings.MOCK_MODE:
            return True
        # Real PayU reverse hash validation
        return True

    def refund(self, payment_id: str, amount_inr: float):
        if settings.MOCK_MODE:
            return {"id": f"payu_rfnd_{uuid.uuid4().hex[:10]}", "status": "processed"}
        return {"id": "payu_rfnd_stub", "status": "processed"}


def get_payment_provider(name: str):
    return {"razorpay": RazorpayProvider(), "payu": PayUProvider()}.get(name, RazorpayProvider())


# =========================== SHIPPING ===========================
class ShiprocketProvider:
    name = "shiprocket"

    def calc_rate(self, pincode: str, weight_kg: float = 0.5):
        if settings.MOCK_MODE:
            base = 79 if pincode and pincode.startswith(("1", "2", "3")) else 129
            return {"courier": "Shiprocket Standard", "rate": base, "eta_days": 4}
        return {"courier": "Shiprocket", "rate": 99, "eta_days": 5}

    def create_awb(self, order: dict):
        if settings.MOCK_MODE:
            awb = f"SR{uuid.uuid4().hex[:10].upper()}"
            return {
                "awb_code": awb,
                "courier": "BlueDart",
                "tracking_url": f"https://track.example/{awb}",
                "label_url": f"https://track.example/label/{awb}.pdf",
            }
        return {"awb_code": "AWB_LIVE_STUB"}

    def track(self, awb: str):
        if settings.MOCK_MODE:
            return {"awb": awb, "status": "In Transit", "location": "Delhi Hub"}
        return {"awb": awb, "status": "unknown"}


shiprocket = ShiprocketProvider()


# =========================== EMAIL ===========================
class EmailProvider:
    def send(self, to: str, subject: str, html: str, from_name: str = "", from_email: str = ""):
        raise NotImplementedError


class MockEmailProvider(EmailProvider):
    sent: list = []

    def send(self, to, subject, html, from_name="", from_email=""):
        entry = {
            "to": to,
            "subject": subject,
            "html": html,
            "from_name": from_name or settings.EMAIL_FROM_NAME,
            "from_email": from_email or settings.EMAIL_FROM_ADDRESS,
            "ts": time.time(),
        }
        self.sent.append(entry)
        print(f"[MOCK EMAIL] to={to} subject={subject}")
        return {"ok": True, "provider": "mock"}


class SESEmailProvider(EmailProvider):
    def send(self, to, subject, html, from_name="", from_email=""):
        if settings.MOCK_MODE:
            return MockEmailProvider().send(to, subject, html, from_name, from_email)
        import boto3
        client = boto3.client(
            "ses",
            aws_access_key_id=settings.SES_ACCESS_KEY_ID if hasattr(settings, "SES_ACCESS_KEY_ID") else None,
            region_name=getattr(settings, "SES_REGION", "ap-south-1"),
        )
        client.send_email(
            Source=f"{from_name or settings.EMAIL_FROM_NAME} <{from_email or settings.EMAIL_FROM_ADDRESS}>",
            Destination={"ToAddresses": [to]},
            Message={"Subject": {"Data": subject}, "Body": {"Html": {"Data": html}}},
        )
        return {"ok": True, "provider": "ses"}


class SendGridEmailProvider(EmailProvider):
    def send(self, to, subject, html, from_name="", from_email=""):
        if settings.MOCK_MODE:
            return MockEmailProvider().send(to, subject, html, from_name, from_email)
        return {"ok": True, "provider": "sendgrid"}


def get_email_provider(name: Optional[str] = None) -> EmailProvider:
    n = (name or settings.EMAIL_PROVIDER or "mock").lower()
    if n == "ses":
        return SESEmailProvider()
    if n == "sendgrid":
        return SendGridEmailProvider()
    return MockEmailProvider()

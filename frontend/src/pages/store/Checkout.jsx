import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";
import { toast } from "sonner";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [address, setAddress] = useState({
    name: user?.name || "", phone: "", email: user?.email || "",
    line1: "", line2: "", city: "", state: "", pincode: "", country: "IN",
  });

  // Track shopper email for abandoned cart recovery
  useEffect(() => {
    if (address.email && address.email.includes("@")) localStorage.setItem("lp_shopper_email", address.email);
  }, [address.email]);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [quote, setQuote] = useState(null);
  const [placing, setPlacing] = useState(false);

  const refreshQuote = async () => {
    if (items.length === 0) return;
    const { data } = await api.post("/checkout/quote", {
      items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })),
      pincode: address.pincode,
      coupon_code: couponCode || undefined,
    });
    setQuote(data);
  };

  useEffect(() => { refreshQuote(); /* eslint-disable-next-line */ }, [items, address.pincode, couponCode]);

  const place = async () => {
    if (!address.name || !address.line1 || !address.city || !address.state || !address.pincode || !address.phone) {
      toast.error("Please complete your shipping address"); return;
    }
    setPlacing(true);
    try {
      const { data } = await api.post("/checkout/place", {
        items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })),
        shipping_address: address, email: address.email, payment_method: paymentMethod, coupon_code: couponCode || undefined,
      });
      const order = data.order;
      // Mock payment verification when online
      if (paymentMethod !== "cod" && data.payment?.mock) {
        await api.post("/checkout/verify-payment", {
          order_id: data.payment.id, payment_id: "pay_mock_" + Math.random().toString(36).slice(2, 10),
          signature: "mock_sig", method: paymentMethod,
        });
      }
      clear();
      nav(`/order/success/${order.order_number}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to place order");
    } finally { setPlacing(false); }
  };

  if (items.length === 0) {
    return (
      <div>
        <StoreHeader />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif-display text-4xl mb-4">Your bag is empty</h1>
          <button onClick={() => nav("/shop")} className="btn-pill bg-[color:var(--sf-text)] text-white px-6 py-3 text-sm">Continue shopping</button>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div>
      <StoreHeader />
      <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12" data-testid="checkout-section">
        <div>
          <h1 className="font-serif-display text-4xl font-light mb-8">Checkout</h1>
          <div className="space-y-3">
            {["name","phone","email","line1","line2","city","state","pincode"].map((k) => (
              <input key={k} placeholder={k[0].toUpperCase() + k.slice(1)} value={address[k]} onChange={(e) => setAddress({ ...address, [k]: e.target.value })} className="w-full border border-[color:var(--sf-border)] px-4 py-3 text-sm bg-white" data-testid={`checkout-${k}`} />
            ))}
          </div>

          <div className="mt-8 overline">Payment</div>
          <div className="mt-3 space-y-2" data-testid="checkout-payment">
            {["razorpay","payu","cod"].map((m) => (
              <label key={m} className={`flex gap-3 items-center border p-4 cursor-pointer ${paymentMethod === m ? "border-[color:var(--sf-text)]" : "border-[color:var(--sf-border)]"}`} data-testid={`pay-${m}`}>
                <input type="radio" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                <span className="text-sm">{m === "razorpay" ? "Razorpay (Cards / UPI / Wallets)" : m === "payu" ? "PayU (Cards / NetBanking)" : "Cash on Delivery"}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[color:var(--sf-secondary)] p-8">
          <h2 className="font-serif-display text-2xl mb-6">Order Summary</h2>
          <div className="space-y-4">
            {items.map((i) => (
              <div key={i.product_id + i.variant_id} className="flex gap-3">
                <img src={i.image} alt={i.title} className="w-14 h-16 object-cover" />
                <div className="flex-1 text-sm">
                  <div>{i.title}</div>
                  <div className="text-xs text-[color:var(--sf-text-soft)]">{i.variant_label} × {i.quantity}</div>
                </div>
                <div className="text-sm">₹{(i.price * i.quantity).toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6" data-testid="checkout-coupon-row">
            <input placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="flex-1 border border-[color:var(--sf-border)] px-3 py-2 text-sm bg-white" data-testid="checkout-coupon-input" />
            <button onClick={refreshQuote} className="btn-pill bg-white border px-4 text-sm" data-testid="checkout-apply-coupon">Apply</button>
          </div>
          {quote && (
            <div className="mt-6 text-sm space-y-2 border-t pt-4">
              <Row label="Subtotal" value={`₹${quote.subtotal.toLocaleString("en-IN")}`} testid="q-subtotal" />
              {quote.discount > 0 && <Row label={`Discount${quote.coupon ? " (" + quote.coupon.code + ")" : ""}`} value={`− ₹${quote.discount.toLocaleString("en-IN")}`} testid="q-discount" />}
              <Row label={`Shipping${quote.courier ? " · " + quote.courier.courier : ""}`} value={quote.shipping === 0 ? "Free" : `₹${quote.shipping}`} testid="q-shipping" />
              <Row label="GST" value={`₹${quote.tax}`} testid="q-tax" />
              <div className="flex justify-between font-medium pt-2 border-t"><span>Total</span><span data-testid="q-total">₹{quote.total.toLocaleString("en-IN")}</span></div>
            </div>
          )}
          <button onClick={place} disabled={placing} className="mt-6 w-full btn-pill bg-[color:var(--sf-text)] text-white py-4 text-sm disabled:opacity-50" data-testid="checkout-place-order">{placing ? "Placing..." : "Place Order"}</button>
          <p className="text-xs text-[color:var(--sf-text-soft)] mt-3">Payments are in demo mode — no real charges are made.</p>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
function Row({ label, value, testid }) {
  return <div className="flex justify-between"><span className="text-[color:var(--sf-text-soft)]">{label}</span><span data-testid={testid}>{value}</span></div>;
}

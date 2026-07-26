import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";
import { CheckCircle2 } from "lucide-react";

export function OrderSuccess() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => { api.get(`/orders/track/${orderNumber}`).then((r) => setOrder(r.data)).catch(() => {}); }, [orderNumber]);
  return (
    <div>
      <StoreHeader />
      <div className="max-w-2xl mx-auto px-6 py-24 text-center" data-testid="order-success">
        <CheckCircle2 size={56} className="mx-auto text-[color:var(--sf-primary)] mb-6" strokeWidth={1.2} />
        <h1 className="font-serif-display text-4xl mb-4">Thank you</h1>
        <p className="text-[color:var(--sf-text-soft)]">Your order <b>{orderNumber}</b> has been placed. A confirmation email is on its way.</p>
        {order && (
          <div className="mt-8 text-left border p-6 bg-white">
            <div className="flex justify-between text-sm mb-2"><span>Total</span><span>₹{order.total.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm mb-2"><span>Payment</span><span className="capitalize">{order.payment_method} · {order.payment_status}</span></div>
            {order.awb_code && <div className="flex justify-between text-sm"><span>AWB</span><span>{order.awb_code}</span></div>}
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <Link to={`/track?order=${orderNumber}`} className="btn-pill border px-6 py-3 text-sm">Track order</Link>
          <Link to="/shop" className="btn-pill bg-[color:var(--sf-text)] text-white px-6 py-3 text-sm">Continue shopping</Link>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

export function OrderTrack() {
  const [orderNo, setOrderNo] = useState(new URLSearchParams(window.location.search).get("order") || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const track = async (e) => {
    e?.preventDefault?.();
    setErr("");
    try {
      const { data } = await api.get(`/orders/track/${orderNo}`, { params: email ? { email } : {} });
      setOrder(data);
    } catch (e) { setErr("Order not found"); }
  };
  useEffect(() => { if (orderNo) track(); /* eslint-disable-next-line */ }, []);
  return (
    <div>
      <StoreHeader />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif-display text-4xl mb-8">Track your order</h1>
        <form onSubmit={track} className="flex gap-2 mb-8" data-testid="track-form">
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="Order number (e.g. LP240612ABCDE)" className="flex-1 border px-4 py-3 text-sm" data-testid="track-order-no" />
          <button className="btn-pill bg-[color:var(--sf-text)] text-white px-6 text-sm">Track</button>
        </form>
        {err && <p className="text-red-600">{err}</p>}
        {order && (
          <div className="border p-6 bg-white" data-testid="track-result">
            <div className="flex justify-between mb-4"><h2 className="font-serif-display text-2xl">{order.order_number}</h2><span className="capitalize text-sm">{order.status}</span></div>
            <div className="grid grid-cols-2 gap-4 text-sm text-[color:var(--sf-text-soft)]">
              <div>Courier: {order.courier || "—"}</div>
              <div>AWB: {order.awb_code || "—"}</div>
              <div>Total: ₹{order.total.toLocaleString("en-IN")}</div>
              <div>Payment: {order.payment_status}</div>
            </div>
            <div className="mt-6 border-t pt-4">
              <div className="overline mb-2">Timeline</div>
              <ol className="space-y-2 text-sm">
                {order.timeline?.map((t, i) => (
                  <li key={i} className="flex gap-3"><span className="text-[color:var(--sf-text-soft)]">{new Date(t.at).toLocaleString()}</span><span>{t.event.replace(/_/g, " ")}</span></li>
                ))}
              </ol>
            </div>
            {order.tracking_url && <a className="mt-6 inline-block hover-underline" href={order.tracking_url} target="_blank" rel="noreferrer">Live tracking →</a>}
          </div>
        )}
      </div>
      <StoreFooter />
    </div>
  );
}

import { baseUrl } from "@/constants/testIds";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function Orders() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const load = () =>
    api
      .get(`${baseUrl}/admin/orders`, { params: { status, q } })
      .then((r) => setItems(r.data));
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [status, q]);
  return (
    <div data-testid="admin-orders">
      <h1 className="text-2xl font-admin-head mb-6">Orders</h1>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          placeholder="Search order / email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
          data-testid="orders-search"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {[
            "pending",
            "confirmed",
            "packed",
            "shipped",
            "delivered",
            "cancelled",
            "returned",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-white border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr
                key={o.id}
                className="border-b hover:bg-zinc-50"
                data-testid={`order-row-${o.order_number}`}
              >
                <td className="p-3">
                  <Link
                    to={`/admin/orders/${o.order_number}`}
                    className="underline"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="p-3">{o.customer_email}</td>
                <td className="p-3">₹{o.total.toLocaleString("en-IN")}</td>
                <td className="p-3 capitalize">
                  {o.payment_method} · {o.payment_status}
                </td>
                <td className="p-3 capitalize">{o.status}</td>
                <td className="p-3">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrderDetail() {
  const oid = window.location.pathname.split("/").pop();
  const [o, setO] = useState(null);
  const load = () =>
    api.get(`${baseUrl}/admin/orders/${oid}`).then((r) => setO(r.data));
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [oid]);
  const setStatus = async (s) => {
    await api.patch(`${baseUrl}/admin/orders/${oid}`, {
      status: s,
      event: `status:${s}`,
      note: "Admin update",
    });
    toast.success("Updated");
    load();
  };
  const refund = async () => {
    if (!window.confirm("Refund full amount?")) return;
    await api.post(`${baseUrl}/admin/orders/${oid}/refund`, {
      amount: o.total,
    });
    toast.success("Refunded");
    load();
  };
  if (!o) return <div>Loading…</div>;
  return (
    <div data-testid="admin-order-detail">
      <Link to="/admin/orders" className="text-sm underline">
        ← Back
      </Link>
      <h1 className="text-2xl font-admin-head mt-2 mb-6">{o.order_number}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border rounded-md p-5">
            <b className="text-sm">Items</b>
            <ul className="mt-3 divide-y">
              {o.items.map((it, i) => (
                <li key={i} className="py-2 flex justify-between text-sm">
                  <span>
                    {it.title} · {it.variant_label} × {it.quantity}
                  </span>
                  <span>
                    ₹{(it.price * it.quantity).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{o.subtotal}</span>
              </div>
              {o.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>− ₹{o.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>₹{o.shipping}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{o.tax}</span>
              </div>
              {o.gift_wrap && (
                <div className="flex justify-between">
                  <span>Gift wrapping</span>
                  <span>₹{o.gift_wrap_fee}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Total</span>
                <span>₹{o.total}</span>
              </div>
            </div>
            {o.gift_wrap && (
              <div
                className="mt-4 p-3 bg-[#F5EFE6] border border-[#E4D4C8] rounded"
                data-testid="admin-gift-block"
              >
                <div className="text-xs uppercase tracking-wider text-zinc-600 mb-1">
                  🎁 Gift order · include note card
                </div>
                {o.gift_note ? (
                  <div className="text-sm italic text-zinc-800">
                    "{o.gift_note}"
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">No personal note.</div>
                )}
              </div>
            )}
          </div>
          <div className="bg-white border rounded-md p-5">
            <b className="text-sm">Timeline</b>
            <ol className="mt-3 text-sm space-y-2">
              {o.timeline?.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-zinc-500">
                    {new Date(t.at).toLocaleString()}
                  </span>
                  <span>
                    {t.event.replace(/_/g, " ")} {t.note && `· ${t.note}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white border rounded-md p-5">
            <b className="text-sm">Actions</b>
            <div className="flex flex-col gap-2 mt-3">
              {["confirmed", "packed", "shipped", "delivered", "cancelled"].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`text-xs px-3 py-1.5 rounded-md border ${o.status === s ? "bg-zinc-900 text-white" : ""}`}
                    data-testid={`order-status-${s}`}
                  >
                    Mark {s}
                  </button>
                ),
              )}
              <button
                onClick={refund}
                className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 mt-2"
                data-testid="order-refund"
              >
                Refund order
              </button>
            </div>
          </div>
          {o.shipping_address && (
            <div className="bg-white border rounded-md p-5 text-sm">
              <b>Ship to</b>
              <div className="mt-2 text-zinc-600">
                <div>{o.shipping_address.name}</div>
                <div>
                  {o.shipping_address.line1}, {o.shipping_address.line2}
                </div>
                <div>
                  {o.shipping_address.city}, {o.shipping_address.state} -{" "}
                  {o.shipping_address.pincode}
                </div>
                <div>{o.shipping_address.phone}</div>
              </div>
              <div className="mt-3 text-xs">
                AWB: {o.awb_code || "—"} · Courier: {o.courier || "—"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Customers() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api.get(`${baseUrl}/admin/customers`).then((r) => setUsers(r.data));
  }, []);
  return (
    <div data-testid="admin-customers">
      <h1 className="text-2xl font-admin-head mb-6">Customers</h1>
      <div className="bg-white border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Spent</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.name || "—"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.orders_count}</td>
                <td className="p-3">₹{u.total_spent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Discounts() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    code: "",
    kind: "percent",
    value: 10,
    min_cart: 0,
    active: true,
  });
  const load = () => api.get(`${baseUrl}/admin/coupons`).then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  const create = async (e) => {
    e.preventDefault();
    await api.post(`${baseUrl}/admin/coupons`, form);
    setForm({
      code: "",
      kind: "percent",
      value: 10,
      min_cart: 0,
      active: true,
    });
    load();
    toast.success("Created");
  };
  const del = async (id) => {
    await api.delete(`${baseUrl}/admin/coupons/${id}`);
    load();
  };
  return (
    <div data-testid="admin-discounts">
      <h1 className="text-2xl font-admin-head mb-6">Discounts</h1>
      <form
        onSubmit={create}
        className="bg-white border rounded-md p-4 mb-6 grid grid-cols-2 md:grid-cols-6 gap-2"
        data-testid="new-coupon"
      >
        <input
          required
          placeholder="CODE"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.toUpperCase() })
          }
          className="border rounded-md px-2 py-1 text-sm"
        />
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="border rounded-md px-2 py-1 text-sm"
        >
          <option value="percent">%</option>
          <option value="flat">Flat</option>
          <option value="free_shipping">Free shipping</option>
        </select>
        <input
          type="number"
          placeholder="Value"
          value={form.value}
          onChange={(e) =>
            setForm({ ...form, value: parseFloat(e.target.value) })
          }
          className="border rounded-md px-2 py-1 text-sm"
        />
        <input
          type="number"
          placeholder="Min cart"
          value={form.min_cart}
          onChange={(e) =>
            setForm({ ...form, min_cart: parseFloat(e.target.value) })
          }
          className="border rounded-md px-2 py-1 text-sm"
        />
        <button
          className="bg-zinc-900 text-white rounded-md text-sm px-3"
          data-testid="coupon-create-btn"
        >
          Add
        </button>
      </form>
      <div className="bg-white border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Value</th>
              <th className="p-3">Min Cart</th>
              <th className="p-3">Used</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">{c.kind}</td>
                <td className="p-3">{c.value}</td>
                <td className="p-3">₹{c.min_cart}</td>
                <td className="p-3">{c.used}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => del(c.id)}
                    className="text-red-600 underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

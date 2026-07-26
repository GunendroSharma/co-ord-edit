import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";
import { toast } from "sonner";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      nav(u.role === "customer" ? "/account" : "/admin");
    } catch (e) { toast.error("Invalid credentials"); }
  };
  return (
    <div>
      <StoreHeader />
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-serif-display text-4xl mb-8">Sign in</h1>
        <form onSubmit={submit} className="space-y-3" data-testid="login-form">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-4 py-3 text-sm" data-testid="login-email" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border px-4 py-3 text-sm" data-testid="login-password" />
          <button className="w-full btn-pill bg-[color:var(--sf-text)] text-white py-3 text-sm" data-testid="login-submit">Sign in</button>
        </form>
        <p className="text-sm mt-6 text-[color:var(--sf-text-soft)]">New here? <Link to="/signup" className="hover-underline text-[color:var(--sf-text)]">Create an account</Link></p>
      </div>
      <StoreFooter />
    </div>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const submit = async (e) => {
    e.preventDefault();
    try { await signup(form.email, form.password, form.name); toast.success("Welcome"); nav("/account"); }
    catch (e) { toast.error(e.response?.data?.detail || "Signup failed"); }
  };
  return (
    <div>
      <StoreHeader />
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-serif-display text-4xl mb-8">Create account</h1>
        <form onSubmit={submit} className="space-y-3" data-testid="signup-form">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border px-4 py-3 text-sm" data-testid="signup-name" />
          <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border px-4 py-3 text-sm" data-testid="signup-email" />
          <input type="password" required minLength={6} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border px-4 py-3 text-sm" data-testid="signup-password" />
          <button className="w-full btn-pill bg-[color:var(--sf-text)] text-white py-3 text-sm" data-testid="signup-submit">Create account</button>
        </form>
      </div>
      <StoreFooter />
    </div>
  );
}

export function Account() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  useEffect(() => { if (user) api.get("/orders/mine").then((r) => setOrders(r.data)); }, [user]);
  const nav = useNavigate();
  if (!user) { nav("/login"); return null; }
  return (
    <div>
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-6 py-16" data-testid="account-page">
        <h1 className="font-serif-display text-4xl mb-2">Hello, {user.name || user.email}</h1>
        <button onClick={() => { logout(); nav("/"); }} className="text-sm underline text-[color:var(--sf-text-soft)]" data-testid="account-logout">Sign out</button>
        <h2 className="font-serif-display text-2xl mt-10 mb-4">Your orders</h2>
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-[color:var(--sf-text-soft)]">No orders yet.</p>}
          {orders.map((o) => (
            <Link to={`/track?order=${o.order_number}`} key={o.id} className="block border p-4 bg-white hover:border-[color:var(--sf-text)]" data-testid={`order-row-${o.order_number}`}>
              <div className="flex justify-between text-sm"><span>{o.order_number}</span><span className="capitalize">{o.status}</span></div>
              <div className="flex justify-between text-xs text-[color:var(--sf-text-soft)] mt-1"><span>{new Date(o.created_at).toLocaleDateString()}</span><span>₹{o.total.toLocaleString("en-IN")}</span></div>
            </Link>
          ))}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

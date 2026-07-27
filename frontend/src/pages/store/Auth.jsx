import { StoreFooter, StoreHeader } from "@/components/store/Chrome";
import { baseUrl } from "@/constants/testIds";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Copy, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      nav(u.role === "customer" ? "/account" : "/admin");
    } catch (e) {
      toast.error("Invalid credentials");
    }
  };
  return (
    <div>
      <StoreHeader />
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-serif-display text-4xl mb-8">Sign in</h1>
        <form onSubmit={submit} className="space-y-3" data-testid="login-form">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-4 py-3 text-sm"
            data-testid="login-email"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-4 py-3 text-sm"
            data-testid="login-password"
          />
          <button
            className="w-full btn-pill bg-[color:var(--sf-text)] text-white py-3 text-sm"
            data-testid="login-submit"
          >
            Sign in
          </button>
        </form>
        <p className="text-sm mt-6 text-[color:var(--sf-text-soft)]">
          New here?{" "}
          <Link
            to="/signup"
            className="hover-underline text-[color:var(--sf-text)]"
          >
            Create an account
          </Link>
        </p>
      </div>
      <StoreFooter />
    </div>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const refCode = params.get("ref") || "";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [refInfo, setRefInfo] = useState(null);

  useEffect(() => {
    if (refCode) {
      api.post(`${baseUrl}/referrals/validate`, { code: refCode }).then((r) => {
        if (r.data.valid) setRefInfo(r.data);
      });
    }
  }, [refCode]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`${baseUrl}/auth/signup`, {
        ...form,
        referred_by: refCode || undefined,
      });
      localStorage.setItem("lp_access_token", data.access_token);
      localStorage.setItem("lp_refresh_token", data.refresh_token);
      localStorage.setItem("lp_shopper_email", data.user.email);
      window.location.href = data.user.welcome_coupon
        ? `/account?welcome=${data.user.welcome_coupon}`
        : "/account";
    } catch (e) {
      toast.error(e.response?.data?.detail || "Signup failed");
    }
  };
  return (
    <div>
      <StoreHeader />
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-serif-display text-4xl mb-4">Create account</h1>
        {refInfo && (
          <div
            className="mb-6 p-4 bg-[color:var(--sf-secondary)] border border-[color:var(--sf-primary)] text-sm"
            data-testid="referral-banner"
          >
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} />
              <b>You've been invited by {refInfo.referrer_name}</b>
            </div>
            <p className="text-[color:var(--sf-text-soft)]">
              ₹300 off your first order over ₹999 — applied automatically after
              signup.
            </p>
          </div>
        )}
        <form onSubmit={submit} className="space-y-3" data-testid="signup-form">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border px-4 py-3 text-sm"
            data-testid="signup-name"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border px-4 py-3 text-sm"
            data-testid="signup-email"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border px-4 py-3 text-sm"
            data-testid="signup-password"
          />
          <button
            className="w-full btn-pill bg-[color:var(--sf-text)] text-white py-3 text-sm"
            data-testid="signup-submit"
          >
            Create account
          </button>
        </form>
      </div>
      <StoreFooter />
    </div>
  );
}

export function Account() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [referral, setReferral] = useState(null);
  const [params] = useSearchParams();
  const welcome = params.get("welcome");
  const nav = useNavigate();
  useEffect(() => {
    if (user) {
      api.get(`${baseUrl}/orders/mine`).then((r) => setOrders(r.data));
      api.get(`${baseUrl}/referrals/me`).then((r) => setReferral(r.data));
      if (welcome)
        toast.success(`Welcome! Use ${welcome} at checkout for ₹300 off.`, {
          duration: 8000,
        });
    }
  }, [user, welcome]);
  if (!user) {
    nav("/login");
    return null;
  }
  const shareUrl = `${window.location.origin}/signup?ref=${referral?.code || ""}`;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Referral link copied");
  };

  return (
    <div>
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-6 py-16" data-testid="account-page">
        <h1 className="font-serif-display text-4xl mb-2">
          Hello, {user.name || user.email}
        </h1>
        <button
          onClick={() => {
            logout();
            nav("/");
          }}
          className="text-sm underline text-[color:var(--sf-text-soft)]"
          data-testid="account-logout"
        >
          Sign out
        </button>

        {/* Referral card */}
        {referral && (
          <div
            className="mt-10 border p-8 bg-white relative overflow-hidden"
            data-testid="referral-card"
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[color:var(--sf-primary)] opacity-20"></div>
            <div className="overline text-[color:var(--sf-text-soft)] mb-2">
              Give ₹300, Get ₹300
            </div>
            <h2 className="font-serif-display text-3xl mb-3">
              Your referral link
            </h2>
            <p className="text-sm text-[color:var(--sf-text-soft)] max-w-lg mb-6">
              {referral.message}
            </p>
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[260px] flex border">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-sm bg-transparent"
                  data-testid="referral-link-input"
                />
                <button
                  onClick={copyLink}
                  className="px-4 border-l text-sm flex items-center gap-1"
                  data-testid="referral-copy"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
              <div className="flex gap-6 items-center px-4 border py-2">
                <div>
                  <div className="text-xs text-[color:var(--sf-text-soft)]">
                    Code
                  </div>
                  <div className="font-mono" data-testid="referral-code">
                    {referral.code}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[color:var(--sf-text-soft)]">
                    Invites
                  </div>
                  <div data-testid="referral-invites">{referral.invites}</div>
                </div>
                <div>
                  <div className="text-xs text-[color:var(--sf-text-soft)]">
                    Credits
                  </div>
                  <div data-testid="referral-credits">
                    ₹{referral.credits_earned}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="font-serif-display text-2xl mt-10 mb-4">Your orders</h2>
        <div className="space-y-3">
          {orders.length === 0 && (
            <p className="text-[color:var(--sf-text-soft)]">No orders yet.</p>
          )}
          {orders.map((o) => (
            <Link
              to={`/track?order=${o.order_number}`}
              key={o.id}
              className="block border p-4 bg-white hover:border-[color:var(--sf-text)]"
              data-testid={`order-row-${o.order_number}`}
            >
              <div className="flex justify-between text-sm">
                <span>{o.order_number}</span>
                <span className="capitalize">{o.status}</span>
              </div>
              <div className="flex justify-between text-xs text-[color:var(--sf-text-soft)] mt-1">
                <span>{new Date(o.created_at).toLocaleDateString()}</span>
                <span>₹{o.total.toLocaleString("en-IN")}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

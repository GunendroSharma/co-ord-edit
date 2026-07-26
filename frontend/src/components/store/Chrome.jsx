import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, Heart, User, Search, Menu, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

export function StoreHeader() {
  const { count, setDrawerOpen } = useCart();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const nav = [
    { to: "/shop", label: "Shop All" },
    { to: "/collections/new-arrivals", label: "New" },
    { to: "/collections/everyday-edit", label: "Everyday" },
    { to: "/collections/festive-reverie", label: "Festive" },
    { to: "/pages/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-[color:var(--sf-border)]" data-testid="store-header">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4 md:py-5">
        <button className="md:hidden" onClick={() => setMobileOpen(true)} data-testid="mobile-menu-open" aria-label="Menu">
          <Menu size={22} />
        </button>
        <Link to="/" className="flex-1 md:flex-initial text-center md:text-left" data-testid="brand-logo">
          <span className="font-serif-display text-2xl md:text-[28px] tracking-tight">Loom &amp; Pastel<span className="text-[color:var(--sf-text-soft)]"> Co.</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-[color:var(--sf-text-soft)]">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `hover-underline ${isActive ? "text-[color:var(--sf-text)]" : ""}`} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link to="/shop" aria-label="Search" data-testid="nav-search"><Search size={20} /></Link>
          <Link to={user ? "/account" : "/login"} aria-label="Account" data-testid="nav-account"><User size={20} /></Link>
          <Link to="/wishlist" aria-label="Wishlist" data-testid="nav-wishlist"><Heart size={20} /></Link>
          <button onClick={() => setDrawerOpen(true)} className="relative" data-testid="nav-cart" aria-label="Cart">
            <ShoppingBag size={20} />
            {count > 0 && <span className="absolute -top-2 -right-2 text-[10px] bg-[color:var(--sf-text)] text-white rounded-full w-4 h-4 flex items-center justify-center">{count}</span>}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 bg-white z-50 md:hidden p-6" data-testid="mobile-menu">
          <button onClick={() => setMobileOpen(false)} className="mb-8" aria-label="Close"><X size={22} /></button>
          <nav className="flex flex-col gap-6 text-2xl font-serif-display">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)}>{n.label}</Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function StoreFooter() {
  const [email, setEmail] = React.useState("");
  const [ok, setOk] = React.useState(false);
  const subscribe = async (e) => {
    e.preventDefault();
    try {
      const { api } = await import("@/lib/api");
      await api.post("/newsletter", { email });
      setOk(true);
    } catch {}
  };
  return (
    <footer className="mt-24 border-t border-[color:var(--sf-border)] bg-[color:var(--sf-secondary)] noise-bg" data-testid="store-footer">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <h3 className="font-serif-display text-3xl mb-3">The Loom Letter</h3>
          <p className="text-sm text-[color:var(--sf-text-soft)] max-w-md mb-5">Slow-fashion notes, new collections and quiet sales. No noise.</p>
          <form onSubmit={subscribe} className="flex gap-2 max-w-md" data-testid="newsletter-form">
            <input type="email" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-white/60 border border-[color:var(--sf-border)] px-4 py-3 rounded-full text-sm" data-testid="newsletter-email" />
            <button className="bg-[color:var(--sf-text)] text-white px-6 py-3 rounded-full text-sm hover:opacity-90" data-testid="newsletter-submit">{ok ? "Thanks" : "Subscribe"}</button>
          </form>
        </div>
        <div>
          <div className="overline mb-4">Shop</div>
          <ul className="space-y-2 text-sm text-[color:var(--sf-text-soft)]">
            <li><Link to="/collections/new-arrivals">New Arrivals</Link></li>
            <li><Link to="/collections/everyday-edit">Everyday Edit</Link></li>
            <li><Link to="/collections/festive-reverie">Festive Reverie</Link></li>
            <li><Link to="/shop">All Products</Link></li>
          </ul>
        </div>
        <div>
          <div className="overline mb-4">Care</div>
          <ul className="space-y-2 text-sm text-[color:var(--sf-text-soft)]">
            <li><Link to="/pages/about">About</Link></li>
            <li><Link to="/pages/shipping-returns">Shipping &amp; Returns</Link></li>
            <li><Link to="/pages/faq">FAQ</Link></li>
            <li><Link to="/pages/privacy">Privacy</Link></li>
            <li><Link to="/track">Track Order</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6 border-t border-[color:var(--sf-border)] text-xs text-[color:var(--sf-text-soft)] flex justify-between">
        <span>© {new Date().getFullYear()} Loom &amp; Pastel Co.</span>
        <span>Handcrafted in India</span>
      </div>
    </footer>
  );
}

export function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, updateQty, remove, subtotal } = useCart();
  if (!drawerOpen) return null;
  return (
    <div className="fixed inset-0 z-50" data-testid="cart-drawer">
      <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-serif-display text-2xl">Your Bag</h3>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close" data-testid="cart-close"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {items.length === 0 && <p className="text-sm text-[color:var(--sf-text-soft)]">Your bag is empty.</p>}
          {items.map((i) => (
            <div key={i.product_id + i.variant_id} className="flex gap-4" data-testid={`cart-item-${i.product_id}`}>
              <img src={i.image} alt={i.title} className="w-20 h-24 object-cover" />
              <div className="flex-1">
                <div className="text-sm">{i.title}</div>
                <div className="text-xs text-[color:var(--sf-text-soft)]">{i.variant_label}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQty(i.product_id, i.variant_id, i.quantity - 1)} className="w-7 h-7 border rounded-full text-sm" data-testid="qty-dec">−</button>
                  <span className="text-sm w-6 text-center">{i.quantity}</span>
                  <button onClick={() => updateQty(i.product_id, i.variant_id, i.quantity + 1)} className="w-7 h-7 border rounded-full text-sm" data-testid="qty-inc">+</button>
                  <button onClick={() => remove(i.product_id, i.variant_id)} className="ml-auto text-xs underline text-[color:var(--sf-text-soft)]" data-testid="cart-remove">Remove</button>
                </div>
              </div>
              <div className="text-sm">₹{(i.price * i.quantity).toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t space-y-3">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span data-testid="cart-subtotal">₹{subtotal.toLocaleString("en-IN")}</span></div>
          <Link to="/checkout" onClick={() => setDrawerOpen(false)} className="block text-center bg-[color:var(--sf-text)] text-white py-3 rounded-full" data-testid="cart-checkout">Checkout</Link>
        </div>
      </div>
    </div>
  );
}

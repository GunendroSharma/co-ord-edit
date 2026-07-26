import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LayoutGrid, Package, ShoppingCart, Users, Tag, BarChart3, Mail, Settings as SettingsIcon, FileText, Image, LogOut, Menu, X } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/collections", label: "Collections", icon: Tag },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/discounts", label: "Discounts", icon: Tag },
  { to: "/admin/media", label: "Media", icon: Image },
  { to: "/admin/emails", label: "Emails", icon: Mail },
  { to: "/admin/pages", label: "Pages", icon: FileText },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminLayout() {
  const { user, ready, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  if (!ready) return <div className="p-12">Loading…</div>;
  if (!user) { nav("/admin/login"); return null; }
  if (user.role === "customer") { nav("/"); return null; }

  return (
    <div className="admin-scope min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200 transition-transform ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`} data-testid="admin-sidebar">
        <div className="p-6 border-b">
          <div className="font-admin-head text-lg tracking-tight">Loom &amp; Pastel</div>
          <div className="text-xs text-zinc-500">Admin · {user.role}</div>
        </div>
        <nav className="p-3 space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm ${isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
              data-testid={`admin-nav-${n.label.toLowerCase()}`}>
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 mt-auto border-t absolute bottom-0 w-full">
          <button onClick={() => { logout(); nav("/admin/login"); }} className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900" data-testid="admin-logout"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
          <button onClick={() => setOpen((o) => !o)} data-testid="admin-mobile-toggle">{open ? <X size={18} /> : <Menu size={18} />}</button>
          <span className="font-admin-head">Admin</span>
          <span className="text-xs">{user.email}</span>
        </div>
        <main className="p-6 md:p-10 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

export function AdminLogin() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("owner@loompastel.com");
  const [password, setPassword] = useState("Admin@12345");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(email, password);
      if (u.role === "customer") { toast.error("Not a staff account"); return; }
      nav("/admin");
    } catch { toast.error("Invalid credentials"); }
  };
  useEffect(() => { if (user && user.role !== "customer") nav("/admin"); /* eslint-disable-next-line */ }, [user]);
  return (
    <div className="admin-scope min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-8 border rounded-md" data-testid="admin-login-form">
        <h1 className="font-admin-head text-2xl mb-1">Admin Sign in</h1>
        <p className="text-sm text-zinc-500 mb-6">Loom &amp; Pastel Co.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm mb-3" data-testid="admin-login-email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm mb-4" data-testid="admin-login-password" />
        <button className="w-full bg-zinc-900 text-white rounded-md py-2 text-sm" data-testid="admin-login-submit">Sign in</button>
        <p className="text-xs text-zinc-500 mt-4">Seed: owner@loompastel.com / Admin@12345</p>
      </form>
    </div>
  );
}

export function Dashboard() {
  const [k, setK] = useState(null);
  useEffect(() => { api.get("/admin/analytics").then((r) => setK(r.data)); }, []);
  return (
    <div data-testid="admin-dashboard">
      <h1 className="text-2xl font-admin-head mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Orders" value={k?.kpi?.orders ?? "—"} testid="kpi-orders" />
        <KPI label="Revenue" value={`₹${(k?.kpi?.revenue ?? 0).toLocaleString("en-IN")}`} testid="kpi-revenue" />
        <KPI label="Customers" value={k?.kpi?.customers ?? "—"} testid="kpi-customers" />
        <KPI label="AOV" value={`₹${(k?.kpi?.avg_order_value ?? 0).toLocaleString("en-IN")}`} testid="kpi-aov" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card title="Top products">
          <ul className="text-sm divide-y">{(k?.top_products || []).map((t) => (
            <li key={t._id} className="py-2 flex justify-between"><span>{t.title}</span><span>₹{(t.rev || 0).toLocaleString("en-IN")}</span></li>
          ))}{(k?.top_products || []).length === 0 && <li className="py-2 text-zinc-500">No sales yet.</li>}</ul>
        </Card>
        <Card title="Low stock">
          <ul className="text-sm divide-y">{(k?.low_stock || []).map((l, i) => (
            <li key={i} className="py-2 flex justify-between"><span>{l.product} · {l.variant}</span><span>{l.stock} left</span></li>
          ))}{(k?.low_stock || []).length === 0 && <li className="py-2 text-zinc-500">All well stocked.</li>}</ul>
        </Card>
      </div>
    </div>
  );
}
function KPI({ label, value, testid }) {
  return <div className="bg-white border rounded-md p-4" data-testid={testid}><div className="text-xs text-zinc-500">{label}</div><div className="text-2xl font-admin-head mt-1">{value}</div></div>;
}
function Card({ title, children }) {
  return <div className="bg-white border rounded-md p-5"><div className="font-medium mb-3">{title}</div>{children}</div>;
}

export function Products() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);
  const load = () => api.get("/admin/products", { params: { q } }).then((r) => setItems(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);
  const del = async (id) => { if (window.confirm("Delete this product?")) { await api.delete(`/admin/products/${id}`); load(); toast.success("Deleted"); } };
  const importCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/products/bulk-import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Imported: ${data.created} created · ${data.updated} updated${data.errors.length ? ` · ${data.errors.length} errors` : ""}`);
      load();
    } catch (er) { toast.error("Import failed"); }
    finally { setImporting(false); e.target.value = ""; }
  };
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  return (
    <div data-testid="admin-products">
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <h1 className="text-2xl font-admin-head">Products</h1>
        <div className="flex gap-2 flex-wrap">
          <a href={`${BACKEND_URL}/api/admin/products/import-template.csv`} className="text-sm border rounded-md px-3 py-2 bg-white" data-testid="download-template-btn">Template</a>
          <a href={`${BACKEND_URL}/api/admin/products/export.csv`} className="text-sm border rounded-md px-3 py-2 bg-white" data-testid="export-csv-btn">Export CSV</a>
          <label className="text-sm border rounded-md px-3 py-2 bg-white cursor-pointer" data-testid="import-csv-label">
            {importing ? "Importing…" : "Import CSV"}
            <input type="file" accept=".csv" onChange={importCsv} className="hidden" data-testid="import-csv-input" />
          </label>
          <Link to="/admin/products/new" className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-md" data-testid="new-product-btn">New product</Link>
        </div>
      </div>
      <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="border rounded-md px-3 py-2 text-sm mb-4 w-full max-w-sm" data-testid="products-search" />
      <div className="bg-white border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left"><tr><th className="p-3">Product</th><th className="p-3">Status</th><th className="p-3">Stock</th><th className="p-3">Price</th><th className="p-3"></th></tr></thead>
          <tbody>{items.map((p) => {
            const stock = (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0);
            const price = p.variants?.[0]?.price;
            return (
              <tr key={p.id} className="border-b" data-testid={`prod-row-${p.slug}`}>
                <td className="p-3 flex items-center gap-3"><img src={p.media?.[0]?.url} alt="" className="w-10 h-12 object-cover" /><span>{p.title}</span></td>
                <td className="p-3 capitalize"><span className={`px-2 py-0.5 text-xs rounded-full ${p.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100"}`}>{p.status}</span></td>
                <td className="p-3">{stock}</td>
                <td className="p-3">₹{price?.toLocaleString("en-IN")}</td>
                <td className="p-3 text-right"><Link to={`/admin/products/${p.id}`} className="underline mr-3">Edit</Link><button onClick={() => del(p.id)} className="text-red-600 underline" data-testid={`delete-${p.slug}`}>Delete</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductEdit() {
  const { pathname } = window.location;
  const isNew = pathname.endsWith("/new");
  const id = isNew ? null : pathname.split("/").pop();
  const [p, setP] = useState({ title: "", slug: "", description: "", category: "", status: "active", tags: [], variants: [], media: [], seo_title: "", seo_description: "" });
  const nav = useNavigate();
  useEffect(() => {
    if (!isNew && id) api.get("/admin/products").then((r) => { const found = r.data.find((x) => x.id === id); if (found) setP(found); });
  }, [id, isNew]);
  const addVariant = () => setP({ ...p, variants: [...p.variants, { sku: "", size: "", color: "Natural", price: 0, stock: 0 }] });
  const setVar = (i, patch) => setP({ ...p, variants: p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const rmVar = (i) => setP({ ...p, variants: p.variants.filter((_, j) => j !== i) });
  const addMediaUrl = async () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    const { data } = await api.post("/imagekit/mock-upload", { url, filename: `img-${Date.now()}.jpg` });
    setP({ ...p, media: [...p.media, { file_id: data.fileId, url: data.url, thumbnail_url: data.thumbnailUrl, kind: "image", tag: "product", is_primary: p.media.length === 0 }] });
  };
  const rmMedia = (i) => setP({ ...p, media: p.media.filter((_, j) => j !== i) });
  const save = async () => {
    try {
      if (isNew) { await api.post("/admin/products", p); toast.success("Created"); }
      else { await api.patch(`/admin/products/${id}`, p); toast.success("Saved"); }
      nav("/admin/products");
    } catch (e) { toast.error(e.response?.data?.detail?.toString() || "Save failed"); }
  };
  return (
    <div data-testid="admin-product-edit">
      <h1 className="text-2xl font-admin-head mb-6">{isNew ? "New product" : "Edit product"}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Field label="Title"><input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} data-testid="pe-title" className="w-full border rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Slug"><input value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} data-testid="pe-slug" className="w-full border rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Description"><textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm h-28" /></Field>
          <Field label="Category"><input value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" /></Field>
          <div className="bg-white border rounded-md p-4">
            <div className="flex justify-between mb-3"><b className="text-sm">Variants</b><button onClick={addVariant} className="text-xs underline" data-testid="pe-add-variant">+ Add variant</button></div>
            <div className="space-y-2">
              {p.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-6 gap-2" data-testid={`variant-row-${i}`}>
                  <input placeholder="SKU" value={v.sku} onChange={(e) => setVar(i, { sku: e.target.value })} className="border rounded-md px-2 py-1 text-sm col-span-2" />
                  <input placeholder="Size" value={v.size} onChange={(e) => setVar(i, { size: e.target.value })} className="border rounded-md px-2 py-1 text-sm" />
                  <input type="number" placeholder="Price" value={v.price} onChange={(e) => setVar(i, { price: parseFloat(e.target.value) || 0 })} className="border rounded-md px-2 py-1 text-sm" />
                  <input type="number" placeholder="Stock" value={v.stock} onChange={(e) => setVar(i, { stock: parseInt(e.target.value) || 0 })} className="border rounded-md px-2 py-1 text-sm" />
                  <button onClick={() => rmVar(i)} className="text-xs text-red-600">Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-md p-4">
            <div className="flex justify-between mb-3"><b className="text-sm">Media</b><button onClick={addMediaUrl} className="text-xs underline" data-testid="pe-add-media">+ Add image URL (ImageKit mock upload)</button></div>
            <div className="grid grid-cols-4 gap-3">
              {p.media.map((m, i) => (
                <div key={i} className="relative">
                  <img src={m.url} alt="" className="w-full aspect-square object-cover" />
                  <button onClick={() => rmMedia(i)} className="absolute top-1 right-1 bg-white/90 text-xs px-1">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Status"><select value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm"><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></Field>
          <Field label="Tags (comma sep)"><input value={(p.tags || []).join(",")} onChange={(e) => setP({ ...p, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full border rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="SEO Title"><input value={p.seo_title || ""} onChange={(e) => setP({ ...p, seo_title: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="SEO Description"><textarea value={p.seo_description || ""} onChange={(e) => setP({ ...p, seo_description: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm h-20" /></Field>
          <button onClick={save} className="w-full bg-zinc-900 text-white py-2 rounded-md text-sm" data-testid="pe-save">Save product</button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <label className="block"><div className="text-xs text-zinc-500 mb-1">{label}</div>{children}</label>;
}

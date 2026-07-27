import { baseUrl } from "@/constants/testIds";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function Media() {
  const [url, setUrl] = useState("");
  const [uploads, setUploads] = useState(() => JSON.parse(localStorage.getItem("lp_media_log") || "[]"));
  const isVideoUrl = (u = "") => /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(u.split("?")[0]);
  const upload = async (e) => {
    e.preventDefault();
    const kind = isVideoUrl(url) ? "video" : "image";
    const ext = url.split("?")[0].split(".").pop() || (kind === "video" ? "mp4" : "jpg");
    const { data } = await api.post(`${baseUrl}/imagekit/mock-upload`, { url, filename: `media-${Date.now()}.${ext}` });
    const entry = { ...data, kind: data.kind || kind };
    const next = [entry, ...uploads];
    setUploads(next); localStorage.setItem("lp_media_log", JSON.stringify(next));
    setUrl(""); toast.success(`${kind === "video" ? "Video" : "Image"} uploaded to ImageKit (mock)`);
  };
  return (
    <div data-testid="admin-media">
      <h1 className="text-2xl font-admin-head mb-2">Media Library</h1>
      <p className="text-sm text-zinc-500 mb-6">Paste any <b>image or MP4 URL</b> to simulate ImageKit upload. Videos automatically feed the PDP Reels rail when attached to a product.</p>
      <form onSubmit={upload} className="flex gap-2 mb-6" data-testid="media-upload">
        <input type="url" required placeholder="https://…image.jpg or https://…styling-reel.mp4" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 border rounded-md px-3 py-2 text-sm" data-testid="media-url" />
        <button className="bg-zinc-900 text-white text-sm px-4 rounded-md" data-testid="media-upload-btn">Upload</button>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {uploads.map((m, i) => (
          <div key={i} className="bg-white border rounded-md overflow-hidden" data-testid={`media-item-${i}`}>
            <div className="aspect-square bg-zinc-100 relative">
              {m.kind === "video" ? (
                <video src={m.url} muted playsInline loop preload="none" controls className="w-full h-full object-cover" />
              ) : (
                <img src={m.url} className="w-full h-full object-cover" alt="" loading="lazy" />
              )}
              <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full ${m.kind === "video" ? "bg-black/70 text-white" : "bg-white/80"}`}>{m.kind || "image"}</span>
            </div>
            <div className="p-2 text-xs truncate">{m.fileId}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Emails() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const load = () => api.get(`${baseUrl}/admin/email-templates`).then((r) => { setItems(r.data); if (!sel && r.data[0]) setSel(r.data[0]); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const save = async () => { await api.patch(`${baseUrl}/admin/email-templates/${sel.key}`, sel); toast.success("Saved"); load(); };
  const test = async () => { await api.post(`${baseUrl}/admin/email-templates/${sel.key}/test`, {}); toast.success("Test email dispatched (mock provider prints to backend log)"); };
  return (
    <div data-testid="admin-emails" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white border rounded-md">
        <div className="p-4 border-b font-medium">Templates</div>
        <ul>{items.map((t) => (
          <li key={t.key}><button onClick={() => setSel(t)} className={`w-full text-left px-4 py-2 text-sm border-b ${sel?.key === t.key ? "bg-zinc-100" : ""}`} data-testid={`email-tpl-${t.key}`}>{t.name}</button></li>
        ))}</ul>
      </div>
      {sel && (
        <div className="md:col-span-2 bg-white border rounded-md p-5">
          <h2 className="font-admin-head text-xl mb-3">{sel.name}</h2>
          <label className="text-xs text-zinc-500">Subject</label>
          <input value={sel.subject} onChange={(e) => setSel({ ...sel, subject: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm mb-3" data-testid="email-subject" />
          <label className="text-xs text-zinc-500">HTML Body</label>
          <textarea value={sel.body_html} onChange={(e) => setSel({ ...sel, body_html: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm font-mono h-52" data-testid="email-body" />
          <div className="text-xs text-zinc-500 mt-1">Variables: {(sel.variables || []).map((v) => `{${v}}`).join(", ")}</div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-md" data-testid="email-save">Save</button>
            <button onClick={test} className="border text-sm px-4 py-2 rounded-md" data-testid="email-test">Send test</button>
          </div>
          <div className="mt-6">
            <div className="text-xs text-zinc-500 mb-2">Preview</div>
            <div className="border rounded-md p-4 bg-zinc-50" dangerouslySetInnerHTML={{ __html: sel.body_html }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Pages() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const load = () => api.get(`${baseUrl}/admin/pages`).then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => { await api.patch(`${baseUrl}/admin/pages/${sel.slug}`, sel); toast.success("Saved"); load(); };
  return (
    <div data-testid="admin-pages" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white border rounded-md">
        <div className="p-4 border-b font-medium">Pages</div>
        <ul>{items.map((p) => (
          <li key={p.slug}><button onClick={() => setSel(p)} className={`w-full text-left px-4 py-2 text-sm border-b ${sel?.slug === p.slug ? "bg-zinc-100" : ""}`}>{p.title}</button></li>
        ))}</ul>
      </div>
      {sel && (
        <div className="md:col-span-2 bg-white border rounded-md p-5">
          <input value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })} className="w-full border rounded-md px-3 py-2 text-lg mb-3" />
          <textarea value={sel.body_html} onChange={(e) => setSel({ ...sel, body_html: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm h-64 font-mono" />
          <button onClick={save} className="mt-3 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md">Save</button>
        </div>
      )}
    </div>
  );
}

export function Analytics() {
  const [k, setK] = useState(null);
  const [reels, setReels] = useState(null);
  useEffect(() => {
    api.get(`${baseUrl}/admin/analytics`).then((r) => setK(r.data));
    api.get(`${baseUrl}/admin/analytics/reels`).then((r) => setReels(r.data));
  }, []);
  return (
    <div data-testid="admin-analytics">
      <h1 className="text-2xl font-admin-head mb-6">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-md p-4"><div className="text-xs text-zinc-500">Total revenue</div><div className="text-2xl font-admin-head mt-1">₹{(k?.kpi?.revenue || 0).toLocaleString("en-IN")}</div></div>
        <div className="bg-white border rounded-md p-4"><div className="text-xs text-zinc-500">Total orders</div><div className="text-2xl font-admin-head mt-1">{k?.kpi?.orders}</div></div>
        <div className="bg-white border rounded-md p-4"><div className="text-xs text-zinc-500">Customers</div><div className="text-2xl font-admin-head mt-1">{k?.kpi?.customers}</div></div>
        <div className="bg-white border rounded-md p-4"><div className="text-xs text-zinc-500">AOV</div><div className="text-2xl font-admin-head mt-1">₹{(k?.kpi?.avg_order_value || 0).toLocaleString("en-IN")}</div></div>
      </div>
      <div className="bg-white border rounded-md p-5 mb-8">
        <b className="text-sm">Sales by day (last 60)</b>
        <div className="flex items-end gap-1 h-40 mt-4">
          {(k?.sales_by_day || []).map((d, i) => {
            const max = Math.max(...(k?.sales_by_day || []).map((x) => x.revenue), 1);
            const h = (d.revenue / max) * 100;
            return <div key={i} title={`${d._id}: ₹${d.revenue}`} style={{ height: `${h}%` }} className="flex-1 bg-zinc-900 rounded-t-sm min-h-[2px]" />;
          })}
          {(k?.sales_by_day || []).length === 0 && <div className="text-sm text-zinc-500">No sales data yet.</div>}
        </div>
      </div>

      {/* Reel performance */}
      <div className="bg-white border rounded-md p-5" data-testid="reel-analytics">
        <div className="flex justify-between items-baseline mb-3">
          <b className="text-sm">Reel performance</b>
          <div className="text-xs text-zinc-500">
            {reels?.total?.impressions || 0} impressions · {reels?.total?.adds || 0} adds · <b className="text-emerald-700">{reels?.total?.cvr || 0}% CVR</b>
          </div>
        </div>
        {(!reels || reels.rows.length === 0) ? (
          <p className="text-sm text-zinc-500 py-4">No reel activity yet. Views and one-tap add-to-bags will appear here as shoppers browse product pages.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Impressions</th>
                  <th className="p-3">One-tap adds</th>
                  <th className="p-3">CVR</th>
                  <th className="p-3">Performance</th>
                </tr>
              </thead>
              <tbody>
                {reels.rows.map((r) => {
                  const max = Math.max(...reels.rows.map((x) => x.adds), 1);
                  return (
                    <tr key={r.reel_id + r.product_slug} className="border-b" data-testid={`reel-row-${r.product_slug}`}>
                      <td className="p-3">{r.title}</td>
                      <td className="p-3">{r.impressions.toLocaleString("en-IN")}</td>
                      <td className="p-3 font-medium">{r.adds.toLocaleString("en-IN")}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${r.cvr >= 5 ? "bg-emerald-100 text-emerald-800" : r.cvr >= 2 ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-700"}`}>{r.cvr}%</span></td>
                      <td className="p-3"><div className="w-40 h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-zinc-900" style={{ width: `${(r.adds / max) * 100}%` }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function Settings() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get(`${baseUrl}/admin/settings`).then((r) => setS(r.data)); }, []);
  if (!s) return <div>Loading…</div>;
  const save = async () => { await api.patch(`${baseUrl}/admin/settings`, s); toast.success("Saved"); };
  return (
    <div data-testid="admin-settings" className="max-w-2xl">
      <h1 className="text-2xl font-admin-head mb-6">Store settings</h1>
      <div className="bg-white border rounded-md p-5 space-y-3">
        <F label="Store name"><input value={s.store_name} onChange={(e) => setS({ ...s, store_name: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" data-testid="s-name" /></F>
        <F label="From email"><input value={s.from_email} onChange={(e) => setS({ ...s, from_email: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" /></F>
        <F label="GST %"><input type="number" value={s.gst_rate} onChange={(e) => setS({ ...s, gst_rate: parseFloat(e.target.value) })} className="w-full border rounded-md px-3 py-2 text-sm" /></F>
        <F label="Free shipping over ₹"><input type="number" value={s.free_shipping_over} onChange={(e) => setS({ ...s, free_shipping_over: parseFloat(e.target.value) })} className="w-full border rounded-md px-3 py-2 text-sm" /></F>
        <F label="Flat shipping rate ₹"><input type="number" value={s.shipping_flat_rate} onChange={(e) => setS({ ...s, shipping_flat_rate: parseFloat(e.target.value) })} className="w-full border rounded-md px-3 py-2 text-sm" /></F>
        <F label="Active payment gateways">
          <div className="flex gap-3">{["razorpay","payu","cod"].map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(s.active_payment_gateways || []).includes(p)} onChange={(e) => setS({ ...s, active_payment_gateways: e.target.checked ? [...(s.active_payment_gateways || []), p] : (s.active_payment_gateways || []).filter((x) => x !== p) })} data-testid={`gw-${p}`} />{p}</label>
          ))}</div>
        </F>
        <F label="Active courier">
          <select value={s.active_courier} onChange={(e) => setS({ ...s, active_courier: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm"><option value="shiprocket">Shiprocket</option><option value="delhivery">Delhivery</option><option value="bluedart">Blue Dart</option></select>
        </F>
        <F label="Email provider">
          <select value={s.email_provider} onChange={(e) => setS({ ...s, email_provider: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm"><option value="mock">Mock</option><option value="ses">Amazon SES</option><option value="sendgrid">SendGrid</option></select>
        </F>
        <button onClick={save} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-md" data-testid="settings-save">Save</button>
      </div>
    </div>
  );
}
function F({ label, children }) {
  return <label className="block"><div className="text-xs text-zinc-500 mb-1">{label}</div>{children}</label>;
}

export function Collections() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", slug: "", description: "", hero_image: "" });
  const load = () => api.get(`${baseUrl}/admin/collections`).then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const create = async (e) => { e.preventDefault(); await api.post(`${baseUrl}/admin/collections`, form); setForm({ title: "", slug: "", description: "", hero_image: "" }); load(); toast.success("Created"); };
  const del = async (id) => { await api.delete(`${baseUrl}/admin/collections/${id}`); load(); };
  return (
    <div data-testid="admin-collections">
      <h1 className="text-2xl font-admin-head mb-6">Collections</h1>
      <form onSubmit={create} className="bg-white border rounded-md p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-2">
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-md px-2 py-1 text-sm" />
        <input required placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border rounded-md px-2 py-1 text-sm" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-md px-2 py-1 text-sm col-span-2" />
        <input placeholder="Hero image URL" value={form.hero_image} onChange={(e) => setForm({ ...form, hero_image: e.target.value })} className="border rounded-md px-2 py-1 text-sm col-span-4" />
        <button className="bg-zinc-900 text-white rounded-md text-sm px-3">Create</button>
      </form>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((c) => (
          <div key={c.id} className="bg-white border rounded-md overflow-hidden">
            {c.hero_image && <img src={c.hero_image} alt="" className="w-full h-32 object-cover" />}
            <div className="p-3"><b>{c.title}</b><div className="text-xs text-zinc-500">/{c.slug}</div>
              <button onClick={() => del(c.id)} className="mt-2 text-xs text-red-600 underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

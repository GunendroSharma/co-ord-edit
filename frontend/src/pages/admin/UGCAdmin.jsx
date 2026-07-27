import { baseUrl } from "@/constants/testIds";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function UGCAdmin() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ image_url: "", caption: "", author_handle: "", product_ids: [], approved: true });
  const load = () => api.get(`${baseUrl}/admin/ugc`).then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get(`${baseUrl}/admin/products`).then((r) => setProducts(r.data));
  }, []);
  const create = async (e) => {
    e.preventDefault();
    await api.post(`${baseUrl}/admin/ugc`, form);
    setForm({ image_url: "", caption: "", author_handle: "", product_ids: [], approved: true });
    load(); toast.success("Added");
  };
  const toggle = async (p) => { await api.patch(`${baseUrl}/admin/ugc/${p.id}`, { approved: !p.approved }); load(); };
  const del = async (id) => { if (window.confirm("Remove this post?")) { await api.delete(`${baseUrl}/admin/ugc/${id}`); load(); } };
  const toggleProduct = (pid) => setForm({ ...form, product_ids: form.product_ids.includes(pid) ? form.product_ids.filter((x) => x !== pid) : [...form.product_ids, pid] });

  return (
    <div data-testid="admin-ugc">
      <h1 className="text-2xl font-admin-head mb-2">Community Gallery (UGC)</h1>
      <p className="text-sm text-zinc-500 mb-6">Curated posts from shoppers tagging @loompastelco. Add manually or (with a real Instagram Business account) automate ingest via the Instagram Graph API tag-search.</p>

      <form onSubmit={create} className="bg-white border rounded-md p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="ugc-new-form">
        <input required placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="border rounded-md px-3 py-2 text-sm md:col-span-2" data-testid="ugc-image-url" />
        <input placeholder="@handle" value={form.author_handle} onChange={(e) => setForm({ ...form, author_handle: e.target.value })} className="border rounded-md px-3 py-2 text-sm" />
        <input placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="border rounded-md px-3 py-2 text-sm" />
        <div className="md:col-span-2">
          <div className="text-xs text-zinc-500 mb-2">Tag products (click to toggle)</div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {products.map((p) => (
              <button type="button" key={p.id} onClick={() => toggleProduct(p.id)} className={`text-xs px-2 py-1 rounded-full border ${form.product_ids.includes(p.id) ? "bg-zinc-900 text-white" : ""}`} data-testid={`ugc-tag-${p.slug}`}>{p.title}</button>
            ))}
          </div>
        </div>
        <button className="bg-zinc-900 text-white rounded-md text-sm px-4 py-2 md:col-span-2" data-testid="ugc-create-btn">Add post</button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((p) => (
          <div key={p.id} className="bg-white border rounded-md overflow-hidden" data-testid={`ugc-row-${p.id}`}>
            <div className="aspect-square"><img src={p.image_url} alt={p.caption} className="w-full h-full object-cover" /></div>
            <div className="p-3 text-xs space-y-1">
              <div className="font-medium">{p.author_handle || "Anonymous"}</div>
              <div className="text-zinc-500 truncate">{p.caption}</div>
              <div className="text-zinc-500">{(p.product_ids || []).length} tagged</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => toggle(p)} className={`text-xs px-2 py-1 rounded-full border ${p.approved ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100"}`}>{p.approved ? "Approved" : "Draft"}</button>
                <button onClick={() => del(p.id)} className="text-xs text-red-600 underline ml-auto">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

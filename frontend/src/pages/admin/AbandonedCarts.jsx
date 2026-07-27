import { baseUrl } from "@/constants/testIds";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AbandonedCarts() {
  const [items, setItems] = useState([]);
  const load = () => api.get(`${baseUrl}/admin/abandoned-carts`).then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const remind = async (id) => { await api.post(`${baseUrl}/admin/abandoned-carts/${id}/remind`); toast.success("Reminder sent"); load(); };
  return (
    <div data-testid="admin-abandoned-carts">
      <h1 className="text-2xl font-admin-head mb-2">Abandoned Carts</h1>
      <p className="text-sm text-zinc-500 mb-6">Carts left behind by shoppers who entered their email. Background job auto-emails the abandoned-cart template after 2 hours of inactivity. You can also send manually.</p>
      <div className="bg-white border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left"><tr><th className="p-3">Email</th><th className="p-3">Items</th><th className="p-3">Value</th><th className="p-3">Updated</th><th className="p-3">Reminded</th><th className="p-3"></th></tr></thead>
          <tbody>{items.map((c) => (
            <tr key={c.id} className="border-b" data-testid={`ac-row-${c.id}`}>
              <td className="p-3">{c.email}</td>
              <td className="p-3">{(c.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} pieces</td>
              <td className="p-3">₹{(c.subtotal || 0).toLocaleString("en-IN")}</td>
              <td className="p-3">{new Date(c.updated_at).toLocaleString()}</td>
              <td className="p-3">{c.reminded_at ? new Date(c.reminded_at).toLocaleString() : "—"}</td>
              <td className="p-3 text-right"><button onClick={() => remind(c.id)} className="text-xs bg-zinc-900 text-white rounded-md px-3 py-1" data-testid={`ac-remind-${c.id}`}>Send reminder</button></td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No abandoned carts right now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

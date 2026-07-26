import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export function CompleteTheSet({ slug }) {
  const [bundle, setBundle] = useState(null);
  const [selected, setSelected] = useState({});
  const { addItem } = useCart();

  useEffect(() => {
    api.get(`/products/${slug}/bundle`).then((r) => {
      setBundle(r.data);
      // Preselect base + all companions
      const init = { [r.data.base.id]: true };
      r.data.companions.forEach((c) => { init[c.id] = true; });
      setSelected(init);
    });
  }, [slug]);

  if (!bundle || bundle.companions.length === 0) return null;

  const items = [bundle.base, ...bundle.companions];
  const selectedItems = items.filter((i) => selected[i.id]);
  const rawTotal = selectedItems.reduce((s, i) => s + ((i.variants || [{}])[0].price || 0), 0);
  const isFullBundle = selectedItems.length === items.length;
  const total = isFullBundle ? bundle.total_after : rawTotal;
  const saving = isFullBundle ? bundle.you_save : 0;

  const addBundle = () => {
    if (selectedItems.length < 2) { toast.error("Pick at least 2 pieces for a bundle"); return; }
    selectedItems.forEach((p) => {
      const v = (p.variants || [])[0];
      if (v) addItem(p, v, 1);
    });
    if (isFullBundle) {
      localStorage.setItem("lp_auto_coupon", bundle.bundle_code);
      toast.success(`Bundle added! ${bundle.bundle_code} will auto-apply at checkout for 10% off.`);
    } else {
      toast.success("Added to bag");
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 border-t border-[color:var(--sf-border)]" data-testid="bundle-section">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles size={18} className="text-[color:var(--sf-primary)]" strokeWidth={1.5} />
        <div className="overline text-[color:var(--sf-text-soft)]">Complete the Set</div>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
        <h2 className="font-serif-display text-3xl md:text-4xl font-light">Styled to be worn together — save 10%</h2>
        <p className="text-sm text-[color:var(--sf-text-soft)] max-w-sm">Our stylists put these pieces together from the same edit. Add all three and <b>BUNDLE10</b> applies automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 mb-8">
        {items.map((p, idx) => {
          const price = (p.variants || [{}])[0].price || 0;
          return (
            <React.Fragment key={p.id}>
              <label className={`block cursor-pointer group relative ${selected[p.id] ? "" : "opacity-50"}`} data-testid={`bundle-item-${p.slug}`}>
                <input
                  type="checkbox"
                  checked={!!selected[p.id]}
                  onChange={(e) => setSelected({ ...selected, [p.id]: e.target.checked })}
                  className="absolute top-3 left-3 z-10 w-5 h-5 accent-[color:var(--sf-text)]"
                  data-testid={`bundle-check-${p.slug}`}
                />
                <div className="aspect-[3/4] overflow-hidden bg-[color:var(--sf-secondary)]">
                  <img src={(p.media || [{}])[0].url} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-3">
                  <Link to={`/product/${p.slug}`} className="text-sm hover-underline">{p.title}</Link>
                  <div className="text-sm text-[color:var(--sf-text-soft)]">₹{price.toLocaleString("en-IN")}</div>
                </div>
              </label>
              {idx < items.length - 1 && <div className="hidden md:flex text-3xl text-[color:var(--sf-text-soft)] font-light justify-center">+</div>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-6 border-t border-[color:var(--sf-border)] pt-6" data-testid="bundle-summary">
        <div>
          <div className="text-xs overline text-[color:var(--sf-text-soft)] mb-1">
            {isFullBundle ? "Bundle price" : `${selectedItems.length} of ${items.length} selected`}
          </div>
          <div className="flex items-baseline gap-3">
            <div className="font-serif-display text-3xl" data-testid="bundle-price">₹{total.toLocaleString("en-IN")}</div>
            {saving > 0 && (
              <>
                <div className="text-sm line-through text-[color:var(--sf-text-soft)]">₹{bundle.total_before.toLocaleString("en-IN")}</div>
                <div className="text-sm text-[color:var(--sf-accent)] bg-[color:var(--sf-accent)]/20 px-2 py-0.5 rounded-full">
                  You save ₹{saving.toLocaleString("en-IN")}
                </div>
              </>
            )}
          </div>
        </div>
        <button
          onClick={addBundle}
          disabled={selectedItems.length < 2}
          className="ml-auto btn-pill bg-[color:var(--sf-text)] text-white px-8 py-3 text-sm disabled:opacity-40 hover:opacity-90"
          data-testid="bundle-add-btn"
        >
          {isFullBundle ? `Add all ${items.length} — save 10%` : `Add ${selectedItems.length} to bag`}
        </button>
      </div>
    </section>
  );
}

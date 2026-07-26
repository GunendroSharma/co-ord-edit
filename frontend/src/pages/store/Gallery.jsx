import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "@/lib/api";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";

export default function Gallery() {
  const [posts, setPosts] = useState([]);
  const [sel, setSel] = useState(null);
  useEffect(() => { api.get("/ugc").then((r) => setPosts(r.data)); }, []);
  return (
    <div>
      <Helmet><title>Community Gallery — Loom & Pastel Co.</title><meta name="description" content="Real shoppers wearing Loom & Pastel Co. Tag @loompastelco to be featured." /></Helmet>
      <StoreHeader />
      <section className="max-w-7xl mx-auto px-6 py-12" data-testid="ugc-gallery">
        <div className="overline text-[color:var(--sf-text-soft)] mb-3">#WornByYou</div>
        <h1 className="font-serif-display text-5xl font-light mb-3">The Loom Community</h1>
        <p className="text-[color:var(--sf-text-soft)] max-w-2xl mb-10">Real people, real fits. Tag <b>@loompastelco</b> on Instagram to be featured — and shop the exact pieces below.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {posts.map((p) => (
            <button key={p.id} onClick={() => setSel(p)} className="relative group aspect-[4/5] overflow-hidden bg-[color:var(--sf-secondary)]" data-testid={`ugc-tile-${p.id}`}>
              <img src={p.image_url} alt={p.caption} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-3 left-3 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">{p.author_handle}</div>
              {p.tagged_products?.length > 0 && <span className="absolute top-3 right-3 text-[10px] bg-white text-[color:var(--sf-text)] px-2 py-0.5 rounded-full">Shop the look</span>}
            </button>
          ))}
        </div>
        {posts.length === 0 && <p className="text-center py-16 text-[color:var(--sf-text-soft)]">No posts yet — be the first to tag us!</p>}
      </section>
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setSel(null)} data-testid="ugc-modal">
          <div className="bg-white max-w-4xl w-full grid md:grid-cols-2 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img src={sel.image_url} alt={sel.caption} className="w-full h-full object-cover max-h-[90vh]" />
            <div className="p-8 overflow-y-auto">
              <div className="overline text-[color:var(--sf-text-soft)] mb-2">{sel.author_handle}</div>
              <p className="text-lg font-serif-display leading-snug mb-6">{sel.caption}</p>
              {sel.tagged_products?.length > 0 && (
                <>
                  <div className="overline mb-4">Shop the look</div>
                  <div className="space-y-3">
                    {sel.tagged_products.map((tp) => (
                      <Link to={`/product/${tp.slug}`} key={tp.slug} onClick={() => setSel(null)} className="flex gap-3 items-center border p-3 hover:border-[color:var(--sf-text)]" data-testid={`ugc-shop-${tp.slug}`}>
                        <img src={tp.image} alt={tp.title} className="w-16 h-20 object-cover" />
                        <div className="flex-1"><div className="text-sm">{tp.title}</div><div className="text-xs text-[color:var(--sf-text-soft)]">₹{tp.price.toLocaleString("en-IN")}</div></div>
                        <span className="text-xs underline">Shop →</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => setSel(null)} className="mt-6 text-xs underline text-[color:var(--sf-text-soft)]">Close</button>
            </div>
          </div>
        </div>
      )}
      <StoreFooter />
    </div>
  );
}

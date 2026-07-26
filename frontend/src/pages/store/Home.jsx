import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "@/lib/api";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";

function ProductTile({ p }) {
  const price = p.variants?.[0]?.price || 0;
  const compare = p.variants?.[0]?.compare_at_price;
  return (
    <Link to={`/product/${p.slug}`} className="product-tile group block" data-testid={`product-card-${p.slug}`}>
      <div className="aspect-[3/4] overflow-hidden bg-[color:var(--sf-secondary)]">
        <img src={p.media?.[0]?.url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="mt-4">
        <div className="text-[15px] tracking-tight">{p.title}</div>
        <div className="text-sm text-[color:var(--sf-text-soft)] mt-1 flex gap-2">
          <span>₹{price.toLocaleString("en-IN")}</span>
          {compare && <span className="line-through text-xs opacity-70">₹{compare.toLocaleString("en-IN")}</span>}
        </div>
      </div>
    </Link>
  );
}

function InstagramFeed() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/instagram/feed").then((r) => setItems(r.data)); }, []);
  if (items.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 pb-24" data-testid="instagram-feed">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="overline text-[color:var(--sf-text-soft)] mb-3">@loompastelco</div>
          <h2 className="font-serif-display text-4xl font-light">From the atelier</h2>
        </div>
        <a href="https://instagram.com/loompastelco" target="_blank" rel="noreferrer" className="hover-underline text-sm">Follow us →</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        {items.slice(0, 6).map((p) => (
          <a key={p.id} href={p.permalink} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden group" data-testid={`ig-post-${p.id}`}>
            <img src={p.url} alt={p.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  useEffect(() => {
    api.get("/products?limit=8&sort=new").then((r) => setProducts(r.data.items));
    api.get("/collections").then((r) => setCollections(r.data));
  }, []);
  return (
    <div>
      <Helmet>
        <title>Loom & Pastel Co. — Hand-embroidered slow fashion</title>
        <meta name="description" content="Mid-premium women's fusion wear, hand-embroidered co-ord sets and slow-fashion silhouettes from ateliers in India." />
        <meta property="og:title" content="Loom & Pastel Co." />
        <meta property="og:description" content="Hand-embroidered co-ord sets & slow-fashion pieces for the modern woman." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1702468508445-7510f972c37e?w=1200" />
      </Helmet>
      <StoreHeader />
      {/* Hero */}
      <section className="relative" data-testid="hero-section">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          <div className="md:col-span-7 order-2 md:order-1 flex items-center px-8 md:px-16 py-16 md:py-24">
            <div className="max-w-xl">
              <div className="overline text-[color:var(--sf-text-soft)] mb-6">Winter Edit · SS26</div>
              <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tighter font-light">
                Softly-stitched<br /><em className="not-italic text-[color:var(--sf-primary)]">heirlooms</em><br />for the modern woman.
              </h1>
              <p className="mt-8 text-[color:var(--sf-text-soft)] max-w-md leading-relaxed">Hand-embroidered co-ord sets and slow-fashion silhouettes, crafted in small batches across our ateliers in India.</p>
              <div className="mt-10 flex gap-4">
                <Link to="/shop" className="btn-pill bg-[color:var(--sf-text)] text-white px-7 py-3 text-sm hover:opacity-90" data-testid="hero-shop-btn">Shop the Collection</Link>
                <Link to="/collections/festive-reverie" className="btn-pill border border-[color:var(--sf-text)] px-7 py-3 text-sm hover-underline" data-testid="hero-festive-btn">Festive Reverie</Link>
              </div>
            </div>
          </div>
          <div className="md:col-span-5 order-1 md:order-2 relative">
            <div className="aspect-[4/5] md:aspect-auto md:h-full overflow-hidden">
              <img src="https://images.unsplash.com/photo-1702468508445-7510f972c37e?crop=entropy&cs=srgb&fm=jpg&w=1600&q=85" alt="Loom & Pastel" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Editorial split */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center" data-testid="editorial-section">
        <div className="aspect-[4/5] overflow-hidden">
          <img src="https://images.pexels.com/photos/7498815/pexels-photo-7498815.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Detail" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="overline text-[color:var(--sf-text-soft)] mb-6">The Atelier</div>
          <h2 className="font-serif-display text-4xl md:text-5xl leading-tight mb-6 font-light">Every motif, a memory in thread.</h2>
          <p className="text-[color:var(--sf-text-soft)] leading-relaxed">We work with craft clusters across Lucknow, Barmer and Kutch — commissioning hand-embroidered pieces that carry the softness of home. Every silhouette is drawn to move, not to pose.</p>
          <Link to="/pages/about" className="mt-8 inline-block hover-underline">Read our story</Link>
        </div>
      </section>

      {/* Collections grid */}
      <section className="max-w-7xl mx-auto px-6 pb-24" data-testid="collections-section">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="overline text-[color:var(--sf-text-soft)] mb-3">Explore</div>
            <h2 className="font-serif-display text-4xl font-light">Curated Edits</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {collections.map((c) => (
            <Link key={c.id} to={`/collections/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden" data-testid={`collection-card-${c.slug}`}>
              <img src={c.hero_image} alt={c.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <div className="overline mb-1">{c.description?.slice(0, 40)}</div>
                <div className="font-serif-display text-3xl">{c.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="max-w-7xl mx-auto px-6 pb-24" data-testid="new-arrivals-section">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="overline text-[color:var(--sf-text-soft)] mb-3">Just In</div>
            <h2 className="font-serif-display text-4xl font-light">New Arrivals</h2>
          </div>
          <Link to="/shop" className="hover-underline text-sm">Shop All →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {products.map((p) => <ProductTile key={p.id} p={p} />)}
        </div>
      </section>

      <InstagramFeed />

      <StoreFooter />
    </div>
  );
}
export { ProductTile };

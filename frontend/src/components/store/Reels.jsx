import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Play, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

/**
 * Performance-first reels:
 *  - CSS-only Ken-Burns loop on already-cached product images (no video download by default)
 *  - Only 6 tiles rendered; images use loading="lazy" and object-fit cover
 *  - If a reel has a real video_url, we lazy-mount a <video preload="none"> ONLY
 *    when the tile is at least 60% visible. Video is paused + unloaded when it scrolls out.
 *  - prefers-reduced-motion disables all animations & video autoplay.
 */
export function Reels({ slug }) {
  const [reels, setReels] = useState([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    api.get(`/reels?slug=${slug}`).then((r) => setReels(r.data)).catch(() => {});
  }, [slug]);

  // Only mount reels rail after the PDP main content is idle — keeps LCP fast.
  useEffect(() => {
    const id = window.requestIdleCallback ? window.requestIdleCallback(() => setEnabled(true), { timeout: 1200 }) : window.setTimeout(() => setEnabled(true), 600);
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  if (!enabled || reels.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 border-t border-[color:var(--sf-border)]" data-testid="reels-section">
      <div className="flex items-center gap-3 mb-2">
        <Play size={16} className="text-[color:var(--sf-primary)]" fill="currentColor" />
        <div className="overline text-[color:var(--sf-text-soft)]">Watch the fit</div>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
        <h2 className="font-serif-display text-3xl md:text-4xl font-light">Styled in motion</h2>
        <p className="text-sm text-[color:var(--sf-text-soft)] max-w-sm">Short styling reels from the atelier. Tap the bag to add in one step.</p>
      </div>
      {/* Horizontal snap-scroll rail */}
      <div className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6" data-testid="reels-rail">
        {reels.map((r) => <ReelCard key={r.id} reel={r} />)}
      </div>
    </section>
  );
}

function ReelCard({ reel }) {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();
  const hasVideo = !!reel.video_url;
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => setInView(e.isIntersecting && e.intersectionRatio >= 0.6));
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Video play/pause + src (un)mounting driven purely by intersection & motion preference.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo || reduced) return;
    if (inView) {
      if (!v.src) v.src = reel.video_url;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
    return () => {
      if (v && !inView) { try { v.pause(); } catch {} }
    };
  }, [inView, hasVideo, reel.video_url, reduced]);

  const onAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      // Fetch a variant if we don't have one (fallback for products where variant_id missing)
      let p = reel.product;
      if (!p.variant_id) {
        const { data } = await api.get(`/products/${p.slug}`);
        const v = (data.product.variants || [])[0];
        if (!v) throw new Error("no variant");
        addItem(data.product, v, 1);
      } else {
        addItem(
          { id: p.id, title: p.title, slug: p.slug, media: [{ url: p.image }] },
          { id: p.variant_id, size: (p.variant_label || "").split("/")[0].trim(), color: (p.variant_label || "").split("/")[1]?.trim() || "", price: p.price },
          1
        );
      }
      toast.success(`${p.title} added to bag`);
    } catch { toast.error("Couldn't add to bag"); }
    finally { setAdding(false); }
  };

  return (
    <article
      ref={rootRef}
      className="reel-card snap-start shrink-0 w-[240px] md:w-[280px] aspect-[9/16] relative overflow-hidden bg-[color:var(--sf-secondary)] rounded-sm"
      data-testid={`reel-${reel.id}`}
      data-inview={inView}
    >
      {/* Poster — cached product image, always present as instant paint */}
      <img
        src={reel.poster_url}
        alt={reel.title}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover reel-kb ${reduced ? "reel-static" : ""} ${inView ? "" : "reel-paused"}`}
      />
      {/* Real video overlay (only when video_url present and card in view) */}
      {hasVideo && inView && !reduced && (
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          preload="none"
          poster={reel.poster_url}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => { const v = videoRef.current; if (v) v.style.display = "none"; }}
        />
      )}
      {/* Gradient scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
      {/* Title + product info */}
      <Link to={`/product/${reel.product.slug}`} className="absolute inset-x-0 bottom-0 p-4 text-white block" data-testid={`reel-link-${reel.id}`}>
        <div className="text-xs overline opacity-80 mb-1">{reel.title}</div>
        <div className="font-serif-display text-lg leading-tight">{reel.product.title}</div>
        <div className="text-xs opacity-90 mt-1">₹{reel.product.price.toLocaleString("en-IN")}</div>
      </Link>
      {/* One-tap add-to-bag */}
      <button
        onClick={onAdd}
        disabled={adding}
        className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-white text-[color:var(--sf-text)] grid place-items-center shadow-md hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
        aria-label={`Add ${reel.product.title} to bag`}
        data-testid={`reel-add-${reel.id}`}
      >
        {adding ? <span className="text-xs">…</span> : <ShoppingBag size={18} strokeWidth={1.75} />}
      </button>
      {/* Play badge */}
      {hasVideo && <div className="absolute top-3 left-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Play size={10} fill="currentColor" /> Live</div>}
    </article>
  );
}

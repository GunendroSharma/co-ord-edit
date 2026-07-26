import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { ProductTile } from "./Home";
import { SizeChartTrigger } from "@/components/store/SizeChart";
import { CompleteTheSet } from "@/components/store/CompleteTheSet";
import { Reels } from "@/components/store/Reels";

export default function ProductDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [selVariant, setSelVariant] = useState(null);
  const [gallery, setGallery] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, title: "", body: "", name: "" });
  const { addItem, wishlist, toggleWishlist } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/products/${slug}`).then((r) => {
      setData(r.data);
      setSelVariant(r.data.product.variants[0]);
      setGallery(0);
      api.get(`/products/${r.data.product.id}/reviews`).then((rr) => setReviews(rr.data));
    });
  }, [slug]);

  if (!data) return <div><StoreHeader /><div className="p-16 text-center">Loading...</div></div>;
  const p = data.product;
  const inWish = wishlist.includes(p.id);
  const uniqueSizes = [...new Set(p.variants.map((v) => v.size))];
  const uniqueColors = [...new Set(p.variants.map((v) => v.color))];

  const submitReview = async (e) => {
    e.preventDefault();
    await api.post(`/products/${p.id}/reviews`, { ...newReview, name: newReview.name || user?.name || "Guest" });
    const { data: revs } = await api.get(`/products/${p.id}/reviews`);
    setReviews(revs);
    setNewReview({ rating: 5, title: "", body: "", name: "" });
    toast.success("Review posted");
  };

  return (
    <div>
      <Helmet>
        <title>{p.seo_title || `${p.title} — Loom & Pastel Co.`}</title>
        <meta name="description" content={p.seo_description || p.description?.slice(0, 155)} />
        <meta property="og:title" content={p.title} />
        <meta property="og:image" content={p.media?.[0]?.url} />
        <meta property="og:type" content="product" />
        <meta property="product:price:amount" content={selVariant?.price} />
        <meta property="product:price:currency" content="INR" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "Product",
          name: p.title, description: p.description, image: (p.media || []).map(m => m.url),
          brand: { "@type": "Brand", name: "Loom & Pastel Co." },
          aggregateRating: p.rating_count > 0 ? { "@type": "AggregateRating", ratingValue: p.rating_avg, reviewCount: p.rating_count } : undefined,
          offers: { "@type": "Offer", priceCurrency: "INR", price: selVariant?.price, availability: (selVariant?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock") },
        })}</script>
      </Helmet>
      <StoreHeader />
      <section className="max-w-7xl mx-auto px-6 py-8 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-10" data-testid="pdp-section">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] overflow-hidden bg-[color:var(--sf-secondary)]" data-testid="pdp-main-image">
            <img src={p.media?.[gallery]?.url} alt={p.title} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {p.media.map((m, i) => (
              <button key={m.file_id} onClick={() => setGallery(i)} className={`aspect-square overflow-hidden ${gallery === i ? "ring-2 ring-[color:var(--sf-text)]" : ""}`} data-testid={`pdp-thumb-${i}`}>
                <img src={m.thumbnail_url || m.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="md:pl-8">
          <div className="overline text-[color:var(--sf-text-soft)] mb-3">{p.category}</div>
          <h1 className="font-serif-display text-4xl md:text-5xl font-light" data-testid="pdp-title">{p.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex text-[color:var(--sf-primary)]">
              {[1,2,3,4,5].map((n) => <Star key={n} size={16} fill={n <= Math.round(p.rating_avg) ? "currentColor" : "none"} strokeWidth={1.5} />)}
            </div>
            <span className="text-sm text-[color:var(--sf-text-soft)]">{p.rating_count} reviews</span>
          </div>
          <div className="flex items-baseline gap-3 mt-6">
            <div className="text-3xl font-serif-display" data-testid="pdp-price">₹{selVariant?.price?.toLocaleString("en-IN")}</div>
            {selVariant?.compare_at_price && <div className="line-through text-[color:var(--sf-text-soft)]">₹{selVariant.compare_at_price.toLocaleString("en-IN")}</div>}
          </div>
          <p className="mt-6 text-[color:var(--sf-text-soft)] leading-relaxed">{p.description}</p>

          <div className="mt-8">
            <div className="overline mb-3">Size</div>
            <div className="flex gap-2 flex-wrap" data-testid="pdp-size-selector">
              {uniqueSizes.map((s) => {
                const v = p.variants.find((x) => x.size === s && x.color === selVariant?.color);
                const active = selVariant?.size === s;
                return (
                  <button key={s} onClick={() => v && setSelVariant(v)} disabled={!v} className={`min-w-[52px] h-11 rounded-full border text-sm ${active ? "bg-[color:var(--sf-text)] text-white border-transparent" : "border-[color:var(--sf-border)]"} ${!v ? "opacity-40" : ""}`} data-testid={`size-${s}`}>{s}</button>
                );
              })}
            </div>
            <SizeChartTrigger category={p.category} />
          </div>

          {uniqueColors.length > 1 && (
            <div className="mt-6">
              <div className="overline mb-3">Colour</div>
              <div className="flex gap-2 flex-wrap">
                {uniqueColors.map((c) => (
                  <button key={c} onClick={() => setSelVariant(p.variants.find((x) => x.color === c && x.size === selVariant?.size) || p.variants.find((x) => x.color === c))} className={`px-4 h-11 rounded-full border text-sm ${selVariant?.color === c ? "bg-[color:var(--sf-text)] text-white border-transparent" : "border-[color:var(--sf-border)]"}`}>{c}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-sm text-[color:var(--sf-text-soft)]" data-testid="pdp-stock">
            {selVariant?.stock > 0 ? `${selVariant.stock} in stock` : selVariant?.backorder ? "Made to order" : "Sold out"}
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={() => selVariant && addItem(p, selVariant)} disabled={!selVariant || (selVariant.stock <= 0 && !selVariant.backorder)} className="flex-1 btn-pill bg-[color:var(--sf-text)] text-white py-4 text-sm disabled:opacity-40" data-testid="pdp-add-to-cart-button">Add to Bag — ₹{selVariant?.price?.toLocaleString("en-IN")}</button>
            <button onClick={() => toggleWishlist(p.id)} className="w-14 rounded-full border border-[color:var(--sf-border)] grid place-items-center" aria-label="Wishlist" data-testid="pdp-wishlist">
              <Heart size={18} fill={inWish ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-10 text-sm space-y-2 text-[color:var(--sf-text-soft)] border-t pt-6">
            <p>· Free shipping on orders above ₹1,499</p>
            <p>· 7-day easy returns · Cash on Delivery available</p>
            <p>· Dry-clean only · Hand-embroidered in India</p>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-4xl mx-auto px-6 py-16" data-testid="reviews-section">
        <div className="overline text-[color:var(--sf-text-soft)] mb-3">Reviews</div>
        <h2 className="font-serif-display text-3xl mb-8">What customers are saying</h2>
        <form onSubmit={submitReview} className="space-y-3 border p-6 mb-10" data-testid="review-form">
          <div className="flex gap-1">
            {[1,2,3,4,5].map((n) => (
              <button type="button" key={n} onClick={() => setNewReview({ ...newReview, rating: n })} data-testid={`review-star-${n}`}>
                <Star size={22} fill={n <= newReview.rating ? "currentColor" : "none"} className="text-[color:var(--sf-primary)]" />
              </button>
            ))}
          </div>
          <input placeholder="Your name" value={newReview.name} onChange={(e) => setNewReview({ ...newReview, name: e.target.value })} className="w-full border px-4 py-3 text-sm" data-testid="review-name" />
          <input placeholder="Headline" value={newReview.title} onChange={(e) => setNewReview({ ...newReview, title: e.target.value })} className="w-full border px-4 py-3 text-sm" data-testid="review-title" />
          <textarea placeholder="Tell us about the piece" value={newReview.body} onChange={(e) => setNewReview({ ...newReview, body: e.target.value })} className="w-full border px-4 py-3 text-sm h-24" data-testid="review-body" />
          <button className="btn-pill bg-[color:var(--sf-text)] text-white px-6 py-2 text-sm" data-testid="review-submit">Post review</button>
        </form>
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="border-b pb-6" data-testid={`review-${r.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex text-[color:var(--sf-primary)]">{[1,2,3,4,5].map((n) => <Star key={n} size={14} fill={n <= r.rating ? "currentColor" : "none"} />)}</div>
                <span className="text-sm font-medium">{r.name}</span>
              </div>
              {r.title && <div className="text-sm font-medium">{r.title}</div>}
              <p className="text-sm text-[color:var(--sf-text-soft)] mt-1">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      {data.related?.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <h3 className="font-serif-display text-3xl mb-8">You may also love</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {data.related.map((p) => <ProductTile key={p.id} p={p} />)}
          </div>
        </section>
      )}
      <CompleteTheSet slug={slug} />
      <Reels slug={slug} />
      <StoreFooter />
    </div>
  );
}

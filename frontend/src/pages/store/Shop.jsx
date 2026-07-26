import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { StoreHeader, StoreFooter } from "@/components/store/Chrome";
import { ProductTile } from "./Home";

export default function Shop() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [collection, setCollection] = useState(null);
  const [total, setTotal] = useState(0);
  const q = params.get("q") || "";
  const sort = params.get("sort") || "new";
  const minPrice = params.get("min_price") || "";
  const maxPrice = params.get("max_price") || "";

  useEffect(() => {
    const load = async () => {
      if (slug) {
        const { data } = await api.get(`/collections/${slug}`);
        setCollection(data.collection);
        setProducts(data.products);
        setTotal(data.products.length);
      } else {
        const qs = new URLSearchParams();
        if (q) qs.set("q", q);
        if (sort) qs.set("sort", sort);
        if (minPrice) qs.set("min_price", minPrice);
        if (maxPrice) qs.set("max_price", maxPrice);
        const { data } = await api.get(`/products?${qs.toString()}`);
        setProducts(data.items); setTotal(data.total);
      }
    };
    load();
  }, [slug, q, sort, minPrice, maxPrice]);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  return (
    <div>
      <StoreHeader />
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="overline text-[color:var(--sf-text-soft)] mb-3">{collection ? "Collection" : "Shop"}</div>
        <h1 className="font-serif-display text-4xl md:text-5xl font-light mb-3" data-testid="shop-title">{collection ? collection.title : "All Pieces"}</h1>
        {collection && <p className="text-[color:var(--sf-text-soft)] max-w-2xl">{collection.description}</p>}

        <div className="flex flex-wrap gap-4 items-center mt-8 mb-6 border-y border-[color:var(--sf-border)] py-4" data-testid="shop-filters">
          <input placeholder="Search" defaultValue={q} onBlur={(e) => setParam("q", e.target.value)} className="bg-transparent border border-[color:var(--sf-border)] px-4 py-2 rounded-full text-sm" data-testid="shop-search" />
          <select value={sort} onChange={(e) => setParam("sort", e.target.value)} className="bg-transparent border border-[color:var(--sf-border)] px-4 py-2 rounded-full text-sm" data-testid="shop-sort">
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="top">Top Rated</option>
          </select>
          <input placeholder="Min ₹" defaultValue={minPrice} onBlur={(e) => setParam("min_price", e.target.value)} className="w-24 bg-transparent border border-[color:var(--sf-border)] px-3 py-2 rounded-full text-sm" data-testid="shop-min" />
          <input placeholder="Max ₹" defaultValue={maxPrice} onBlur={(e) => setParam("max_price", e.target.value)} className="w-24 bg-transparent border border-[color:var(--sf-border)] px-3 py-2 rounded-full text-sm" data-testid="shop-max" />
          <span className="ml-auto text-sm text-[color:var(--sf-text-soft)]">{total} pieces</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {products.map((p) => <ProductTile key={p.id} p={p} />)}
        </div>
        {products.length === 0 && <p className="text-center py-16 text-[color:var(--sf-text-soft)]">No pieces match your filters.</p>}
      </section>
      <StoreFooter />
    </div>
  );
}

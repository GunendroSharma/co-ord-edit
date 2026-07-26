import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const CartCtx = createContext(null);
const KEY = "lp_cart_v1";
const WKEY = "lp_wishlist_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem(KEY) || "[]"));
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem(WKEY) || "[]"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(WKEY, JSON.stringify(wishlist)); }, [wishlist]);

  // Abandoned cart tracking — save snapshot whenever items change and we know the shopper's email
  useEffect(() => {
    const email = localStorage.getItem("lp_shopper_email");
    if (!email) return;
    const t = setTimeout(() => {
      api.post("/cart/save", { email, items }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [items]);

  const addItem = (product, variant, quantity = 1) => {
    setItems((cur) => {
      const idx = cur.findIndex((i) => i.product_id === product.id && i.variant_id === variant.id);
      if (idx >= 0) {
        const clone = [...cur];
        clone[idx] = { ...clone[idx], quantity: clone[idx].quantity + quantity };
        return clone;
      }
      return [...cur, {
        product_id: product.id, variant_id: variant.id, quantity,
        title: product.title, slug: product.slug, price: variant.price,
        variant_label: `${variant.size || ""}${variant.color ? " / " + variant.color : ""}`.trim(),
        image: product.media?.[0]?.url || "",
      }];
    });
    setDrawerOpen(true);
  };

  const updateQty = (product_id, variant_id, quantity) => {
    setItems((cur) => cur.map((i) => (i.product_id === product_id && i.variant_id === variant_id ? { ...i, quantity } : i)).filter((i) => i.quantity > 0));
  };
  const remove = (product_id, variant_id) => setItems((cur) => cur.filter((i) => !(i.product_id === product_id && i.variant_id === variant_id)));
  const clear = () => setItems([]);

  const toggleWishlist = (id) => setWishlist((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartCtx.Provider value={{ items, subtotal, count, addItem, updateQty, remove, clear, wishlist, toggleWishlist, drawerOpen, setDrawerOpen }}>
      {children}
    </CartCtx.Provider>
  );
}
export const useCart = () => useContext(CartCtx);

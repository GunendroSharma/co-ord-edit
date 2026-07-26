import React, { useEffect } from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/store/Chrome";

import Home from "@/pages/store/Home";
import Shop from "@/pages/store/Shop";
import ProductDetail from "@/pages/store/ProductDetail";
import Checkout from "@/pages/store/Checkout";
import { OrderSuccess, OrderTrack } from "@/pages/store/Orders";
import { Login, Signup, Account } from "@/pages/store/Auth";
import ContentPage from "@/pages/store/ContentPage";

import AdminLayout from "@/pages/admin/AdminLayout";
import { AdminLogin, Dashboard, Products, ProductEdit } from "@/pages/admin/AdminCore";
import { Orders, OrderDetail, Customers, Discounts } from "@/pages/admin/AdminOrders";
import { Media, Emails, Pages, Analytics, Settings, Collections } from "@/pages/admin/AdminMore";
import { AbandonedCarts } from "@/pages/admin/AbandonedCarts";
import { UGCAdmin } from "@/pages/admin/UGCAdmin";
import Gallery from "@/pages/store/Gallery";

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(() => {});
      });
    }
  }, []);
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster richColors position="top-center" />
          <CartDrawer />
          <Routes>
            {/* Storefront */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/collections/:slug" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/success/:orderNumber" element={<OrderSuccess />} />
            <Route path="/track" element={<OrderTrack />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/account" element={<Account />} />
            <Route path="/wishlist" element={<Shop />} />
            <Route path="/pages/:slug" element={<ContentPage />} />
            <Route path="/gallery" element={<Gallery />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductEdit />} />
              <Route path="products/:id" element={<ProductEdit />} />
              <Route path="collections" element={<Collections />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:oid" element={<OrderDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="discounts" element={<Discounts />} />
              <Route path="media" element={<Media />} />
              <Route path="emails" element={<Emails />} />
              <Route path="pages" element={<Pages />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="abandoned-carts" element={<AbandonedCarts />} />
              <Route path="ugc" element={<UGCAdmin />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
export default App;

# Loom & Pastel Co. — PRD

## Problem Statement
Full-stack production-grade ecommerce for an Indian D2C apparel brand ("Loom & Pastel Co." — mid-premium women's fusion wear). React (PWA) + FastAPI + MongoDB. Admin as capable as Shopify, deployable on Zeabur/Railway.

## User Personas
- **Shopper** — browses editorial storefront, adds to bag, checks out via Razorpay/PayU/COD.
- **Owner** — full admin access: catalog, orders, staff, settings, gateways.
- **Manager** — catalog + order operations, no staff invites.
- **Support** — orders, customers, refund read-only.
- **Fulfillment** — orders, mark packed/shipped.

## Implemented (Feb 2026)
- **Backend**: FastAPI + Motor, JWT + RBAC, provider abstractions (ImageKit / Razorpay / PayU / Shiprocket / SES / SendGrid) with MOCK_MODE. Endpoints: auth, catalog, collections, reviews, checkout quote/place/verify, orders/track, admin catalog/orders/customers/coupons/media/emails/pages/analytics/settings, webhooks (Razorpay/Shiprocket). Seed with 8 products, 3 collections, 9 email templates, 3 coupons, 4 pages, owner + 3 staff + 1 customer.
- **Storefront**: Home (hero + editorial + collections + new arrivals), Shop with filters/sort, PDP with gallery + variants + reviews + related, Cart drawer, Checkout (address + coupon + gateway + COD), Order success, Track order, Auth (login/signup), Account with orders, Content pages, Newsletter.
- **Admin**: Layout with role-aware sidebar. Dashboard KPIs, Products list + create/edit with variants + mock ImageKit media, Collections CRUD, Orders list + detail + status transitions + refund, Customers, Discounts CRUD, Media library, Email templates editor + send test, Pages CMS, Analytics (KPIs + bar chart), Settings (gateways, courier, shipping, provider).
- **PWA**: manifest.json, service worker (cache-first static, network-first API), offline.html.
- **Design**: Modern minimal luxury per design_guidelines.json — Cormorant Garamond + Outfit for storefront, Manrope + IBM Plex Sans for admin, stone/sage/bone palette, generous whitespace, subtle noise, glass sticky header.

## Prioritized Backlog
- P1 CSV import/export for products, WYSIWYG email builder (currently HTML).
- P1 Real prerender.io integration or Next.js SSR migration for SEO.
- P2 Abandoned cart cron + automatic email trigger.
- P2 Live sitemap.xml + robots.txt generation at build.
- P2 Wishlist page (currently stored, no dedicated UI).
- P2 Multi-currency, i18n.

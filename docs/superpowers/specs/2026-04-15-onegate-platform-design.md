# One Gate — Platform Design Spec

**Slogan:** Beyond Payments
**Date:** 2026-04-15

## Overview

One Gate is a business intelligence platform built on top of an existing 15-year-old Laravel payment gateway. It provides merchants with analytics, reconciliation, POS, inventory management, and integrations — while exposing a developer-friendly API for third-party integrations. The goal is to compete with Yoco by offering an end-to-end solution that goes far beyond payment processing.

## Architecture

**Approach:** Service-Oriented Hybrid — 3 core services split by natural domain boundaries.

### Services

| Service | Stack | Repo | Responsibility |
|---------|-------|------|----------------|
| Frontend | React 19, shadcn/ui, Tailwind CSS 4 | `onegate-frontend` | Merchant Dashboard, POS (PWA), Developer Portal |
| API | Node.js, Express, TypeScript | `onegate-api` | API Gateway + Core Platform (auth, routing, rate limiting, merchants, transactions, reconciliation, integrations, inventory, POS backend, webhooks) |
| Analytics | Python, FastAPI | `onegate-analytics` | BI dashboards, predictive analytics, anomaly/fraud detection, AI recommendations, report generation, data pipeline/ETL |

### Data Layer

| Store | Purpose |
|-------|---------|
| PostgreSQL | Primary transactional DB — merchants, transactions, ledger, reconciliation, inventory, orders, customers |
| MongoDB | Document store — integration configs, webhook logs, audit trails, templates, flexible schemas |
| Redis | Cache, sessions, pub/sub (inter-service events), rate limiting, job queues |

### External Dependencies

- **Existing Laravel Payment Gateway** — consumed via REST API. Handles PCI DSS compliance, card tokenization, and all payment processing (Card, EFT, Google Pay, Apple Pay, Crypto). The new platform never touches raw card data.

### Communication Patterns

- **Frontend → API:** REST over HTTPS (JWT auth for merchants, API keys for developers)
- **API → Analytics:** REST for request/response, Redis pub/sub for async events (e.g., "new transaction" triggers fraud check)
- **API → Laravel Gateway:** REST (existing gateway APIs)
- **Real-time:** WebSocket via API service for live dashboard updates, POS sync

## Target Users

### Merchants (Tiered)

- **SMB** — Small shops, restaurants, freelancers. Simple UI, guided onboarding.
- **Mid-market** — 10-100 employees, have bookkeepers, need Xero/Sage integrations and analytics.
- **Enterprise** — Multi-branch, custom integrations, white-labeling, SLAs, dedicated support.

### Developers

- E-commerce platforms (Shopify, WooCommerce, custom stores)
- SaaS/ERP vendors (accounting, payroll, inventory tools)
- Internal enterprise dev teams building custom integrations

## Merchant Dashboard

### Design Language

Follows Campusly's enterprise-grade aesthetic:

- **Palette:** Neutral — charcoal primary (#171717), muted grays, no bright accent colors
- **Borders:** Subtle — rgba(0,0,0,0.06)
- **Cards:** White, rounded-xl (12px), 1px border
- **Typography:** -apple-system/system-ui, tight tracking on headings, 500 weight for labels, 700 for values
- **StatCards:** Icon with bg-primary/10 container, muted labels, bold values
- **Tables:** Alternating subtle row backgrounds, pill-shaped status badges
- **Spacing:** 24px content padding, 16px card gaps

### Navigation Structure

**Sidebar sections:**
- Dashboard (main overview)
- Transactions (searchable/filterable history with export)
- Reconciliation (automated matching engine)
- Analytics (deep BI charts and reports)
- AI Insights (predictive forecasts, recommendations)
- **Commerce:** Point of Sale, Inventory, Customers
- **Connect:** Integrations, API Keys
- **Settings:** Team & Roles, Billing

### Dashboard Screen

- 4 stat cards: Today's Revenue, Transactions, Reconciliation %, AI Health Score
- Revenue chart (7-day bar chart)
- Payment channel breakdown with progress bars (Card, EFT, Google Pay, Apple Pay, Crypto)
- AI Insight card (subtle left-bordered, not flashy)
- Recent transactions table with search, pagination, status badges

## Reconciliation Engine

### Matching Pipeline (4 stages)

1. **Exact Match** — reference, amount, date all match → auto-reconciled
2. **Fuzzy Match** — amount matches, reference partial match → auto-reconciled with confidence score
3. **Manual Review** — could not auto-match → queued for human review
4. **Discrepancy** — confirmed mismatch → flagged for investigation

### Features

- Auto-ingests bank statements (CSV, OFX, MT940)
- Per-channel reconciliation status with progress bars
- Exception review table: side-by-side gateway vs bank amounts with variance
- Bulk match for clearing multiple similar exceptions
- Xero/Sage auto-sync for matched transactions
- AI learns from manual matches to improve future auto-matching accuracy

## Analytics & Business Intelligence

### Dashboards

- **Revenue trend with AI forecast** — actual data bars transition to dashed forecast bars
- **Cash flow forecasting** — 30-day projected inflows vs outflows
- **Customer insights** — new vs returning, avg basket size, churn risk detection
- **AI recommendations** — actionable cards: pricing optimization, stock alerts, staffing suggestions
- **Top products** — revenue-ranked table
- **Revenue heatmap** — day × hour grid showing peak trading times
- All data filterable by date range and payment channel
- Export: PDF reports, CSV data, scheduled email reports

### AI/ML Capabilities (Python Analytics Engine)

- Cash flow prediction (time series forecasting)
- Demand forecasting (per product/category)
- Anomaly detection (unusual transaction patterns)
- Fraud detection (real-time scoring)
- Customer churn prediction
- Pricing optimization suggestions
- Staffing recommendations based on traffic patterns

## Point of Sale

### Design

- **PWA** — works on tablets, laptops, phones. Offline-capable with sync.
- Split layout: product grid (left) + cart panel (right)
- Category tabs for product filtering
- Product tiles with stock counts, selection badges

### Features

- Product search and custom item entry
- Cart with quantity controls, modifiers (size, extras), item notes
- Customer linking for loyalty & purchase history
- All payment methods via One Gate gateway (Card, EFT, Cash, Google Pay, Apple Pay, Crypto)
- Loyalty discounts auto-applied based on customer history
- Split payments across multiple methods
- Hold orders — park and recall later
- Inventory auto-deduct on sale
- Digital receipts (email/SMS) or connected printer

## Developer Portal

### Design

- Three-panel layout (like Stripe docs): nav sidebar, doc content, live code examples
- Dark code panel with syntax highlighting
- Multi-language code samples: cURL, Node.js, Python, PHP, Ruby

### Features

- Interactive sandbox — test API calls with sandbox keys
- API Reference auto-generated from OpenAPI spec
- Webhook event catalog with signature verification docs
- Official SDKs for Node.js, Python, PHP, Ruby
- Versioned changelog with deprecation notices
- Developer dashboard: API key management, request logs, webhook URL configuration
- OAuth 2.0 for third-party integrations connecting on behalf of merchants

### API Surface

**Payments:**
- POST /v1/payments — Create payment
- GET /v1/payments/:id — Get status
- POST /v1/payments/:id/refund — Refund
- POST /v1/payments/:id/capture — Capture authorization
- GET /v1/payments — List payments
- POST /v1/subscriptions — Recurring payments

**Commerce:**
- CRUD /v1/products — Product catalog
- CRUD /v1/inventory — Stock management
- CRUD /v1/orders — Order management
- CRUD /v1/customers — Customer records
- GET /v1/customers/:id/history — Purchase history

**Analytics:**
- GET /v1/reports/revenue — Revenue reports
- GET /v1/reports/reconciliation — Reconciliation status
- GET /v1/insights — AI recommendations
- GET /v1/forecasts/cashflow — Cash flow predictions
- GET /v1/forecasts/demand — Demand predictions

**Integrations:**
- POST /v1/integrations/xero/sync — Sync to Xero
- POST /v1/integrations/sage/sync — Sync to Sage
- GET /v1/webhooks — List webhooks
- POST /v1/webhooks — Register webhook
- GET /v1/webhooks/events — Event types

## Deployment

**Recommended:** AWS (best compliance story for fintech in SA, most common choice)

- Frontend: Vercel or AWS Amplify (static + SSR)
- API: AWS ECS or EKS (containerized)
- Analytics: AWS ECS with GPU instances for ML workloads
- PostgreSQL: AWS RDS
- MongoDB: MongoDB Atlas or AWS DocumentDB
- Redis: AWS ElastiCache

## Authentication & Authorization

- **Merchants:** JWT-based auth (login/register/forgot-password flow)
- **Developers:** API keys (sk_live_*, sk_test_* pattern like Stripe)
- **OAuth 2.0:** For third-party apps connecting on behalf of merchants
- **RBAC:** Role-based access control (Owner, Admin, Manager, Cashier, Viewer)
- **Multi-tenancy:** All queries scoped by merchantId

## Tier System

| Feature | Starter | Business | Enterprise |
|---------|---------|----------|------------|
| Payment processing | ✓ | ✓ | ✓ |
| POS | 1 device | 5 devices | Unlimited |
| Inventory | 100 SKUs | 10K SKUs | Unlimited |
| Reconciliation | Manual | Automated | Automated + Custom rules |
| Analytics | Basic | Full BI | Full BI + Custom reports |
| AI Insights | — | ✓ | ✓ + Custom models |
| Integrations | — | Xero, Sage | All + Custom |
| API Access | — | Standard | Priority + SLA |
| Support | Email | Priority | Dedicated |

# TODO 34 — Accounting System Integration

> **Priority:** HIGH — Schools cannot operate without proper bookkeeping. Manual double-entry into Sage/Xero is the #1 admin complaint.

## Context
Campusly has a comprehensive fee/payment system but ZERO integration with accounting software. Every rand collected must be manually re-entered into the school's accounting package. South African schools predominantly use Sage One, Pastel, and Xero. International schools use QuickBooks.

---

## 1. Accounting Export Engine (Backend)

### 1a. General Ledger Export
- Map Campusly fee types to GL account codes (configurable per school)
- Export journal entries: fee invoices (debit receivables, credit revenue), payments (debit bank, credit receivables), credit notes, write-offs, discounts
- Date range filtering, term-based or monthly
- Export formats: CSV (universal), IIF (QuickBooks), Sage One API, Xero API

### 1b. Chart of Accounts Mapping UI
- Admin page: `/admin/settings/accounting`
- Map each fee type (tuition, extramural, transport, camp, uniform, other) to a GL account code
- Map payment methods (cash, EFT, card, debit order) to bank accounts
- Map VAT codes (zero-rated, standard-rated, exempt)
- Save mapping per school — `AccountingConfig` model

### 1c. Reconciliation Report
- Compare Campusly payments vs bank statement imports
- Flag unmatched transactions
- Allow manual matching
- Export reconciliation summary

---

## 2. Sage One Integration (South Africa Primary)

### 2a. OAuth2 Connection
- Sage One API OAuth2 flow (connect account from settings page)
- Store access/refresh tokens encrypted per school
- Connection status indicator with last-sync timestamp

### 2b. Auto-Sync Features
- Push invoices to Sage as customer invoices
- Push payments as receipts
- Push credit notes
- Map Campusly students/parents to Sage contacts (auto-create if missing)
- Sync frequency: daily batch or real-time webhook

### 2c. Sync Dashboard
- Last sync status (success/failed/partial)
- Items synced count
- Failed items with error details and retry button
- Manual sync trigger

---

## 3. Xero Integration

### 3a. OAuth2 Connection
- Xero OAuth2 flow with tenant selection
- Store tokens encrypted per school

### 3b. Auto-Sync Features
- Push invoices, payments, credit notes
- Map to Xero contacts and accounts
- Handle Xero's line item structure

---

## 4. Pastel / Sage Pastel Integration

### 4a. File-Based Export (Pastel doesn't have modern API)
- Generate Pastel-compatible CSV import files
- Format: transaction date, account code, description, debit, credit, reference
- Download button on accounting settings page
- Instructions panel for importing into Pastel

---

## 5. QuickBooks Integration

### 5a. OAuth2 Connection
- QuickBooks Online OAuth2 flow
- Store tokens per school

### 5b. Auto-Sync
- Push invoices, payments, credit notes
- Map to QBO customers, items, accounts

---

## 6. Tax Compliance (South Africa)

### 6a. VAT Handling
- Configure whether school is VAT-registered (toggle in settings)
- If registered: add VAT line to invoices (15% standard rate)
- Zero-rated items (tuition fees at independent schools)
- Exempt items
- VAT201 report generation (monthly)

### 6b. Section 18A Tax Certificates
- Already exists in Fundraising module — extend to fee donations/bursary contributions
- Auto-generate certificates for qualifying payments

---

## 7. Financial Reporting Enhancements

### 7a. Income Statement View
- Revenue by fee type (monthly/termly/annual)
- Collection rate trends
- Bad debt expense (write-offs)
- Comparison: budget vs actual

### 7b. Cash Flow Dashboard
- Expected collections (upcoming due dates)
- Actual collections (payments received)
- Forecast next 30/60/90 days based on historical patterns

### 7c. PDF/Excel Export
- Formatted financial reports downloadable as PDF
- Raw data export as Excel with pivot-friendly structure

---

## Data Models

```typescript
interface AccountingConfig {
  schoolId: string;
  provider: 'sage_one' | 'xero' | 'quickbooks' | 'pastel' | 'none';
  credentials: { accessToken: string; refreshToken: string; tenantId?: string; expiresAt: Date };
  glMapping: { feeTypeId: string; accountCode: string; vatCode: string }[];
  bankMapping: { paymentMethod: string; bankAccountCode: string }[];
  vatRegistered: boolean;
  vatNumber?: string;
  syncFrequency: 'realtime' | 'daily' | 'manual';
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
}

interface AccountingSync {
  schoolId: string;
  provider: string;
  direction: 'push' | 'pull';
  entityType: 'invoice' | 'payment' | 'credit_note' | 'contact';
  entityId: string;
  externalId?: string;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
  syncedAt?: Date;
}
```

## API Endpoints
- `GET /api/accounting/config` — Get school accounting config
- `PUT /api/accounting/config` — Update config
- `POST /api/accounting/connect/:provider` — OAuth2 initiate
- `GET /api/accounting/callback/:provider` — OAuth2 callback
- `POST /api/accounting/sync` — Trigger manual sync
- `GET /api/accounting/sync/status` — Get sync status
- `GET /api/accounting/export/:format` — Export GL entries (csv/iif/pastel)
- `GET /api/accounting/vat-report` — VAT201 report
- `GET /api/accounting/income-statement` — Income statement
- `GET /api/accounting/cash-flow` — Cash flow forecast

## Frontend Pages
- `/admin/settings/accounting` — Connection, mapping, sync status
- Enhanced `/admin/fees` reports tab with financial statements

## Revenue Model
- Accounting integration is a **premium bolt-on** (R200-500/month per school)
- Free tier: CSV export only
- Growth tier: Sage One + Pastel
- Enterprise tier: All integrations + real-time sync + VAT compliance

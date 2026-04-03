# Budget Module Completion (Scope 41) — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Complete the partially-implemented Budget Management module

---

## 1. Current State

The budget module is ~70% done. Backend services, models, validation, hooks, types, and 9 of 14 components exist. The main gap is architectural (single tabbed page vs 6 route pages) plus 5 missing components and 2 missing backend endpoints.

## 2. Architecture Change: Single Page → 6 Route Pages

### Current
Everything lives in `/admin/budget/page.tsx` as a tabbed interface.

### Target
Six separate route pages per spec:

| Route | Page | Content |
|---|---|---|
| `/admin/budget` | Dashboard | Summary cards, alerts, pending approvals preview |
| `/admin/budget/setup` | Budget Setup | Create/edit annual budgets with line item editor |
| `/admin/budget/categories` | Categories | Category tree, seed, create/edit dialogs |
| `/admin/budget/expenses` | Expense Tracker | Expense list with filters, new expense dialog |
| `/admin/budget/expenses/approval` | Expense Approval | Pending claims queue with approval cards |
| `/admin/budget/reports` | Reports | Tabbed: variance, monthly, cashflow, multi-year, export |

### Migration Strategy
- Replace current `page.tsx` with a focused dashboard
- Move `BudgetSetupSection.tsx` content into `setup/page.tsx`
- Create new page files for categories, expenses, approval, reports
- Reuse all existing components — no component rewrites needed

## 3. Missing Backend Endpoints

### 3.1 POST /api/budget/expenses/upload-receipt
- Multer middleware for multipart/form-data
- Accept JPEG, PNG, PDF; max 5MB
- Save to `/uploads/budget/receipts/` with UUID filename
- Return `{ url: "/uploads/budget/receipts/uuid.ext" }`
- Auth: school_admin, super_admin, teacher, staff

### 3.2 GET /api/budget/reports/export
- Uses `exceljs` to generate XLSX
- Sheets: Budget Summary, Line Items with Actuals, Variance by Category, Monthly Breakdown
- Query params: schoolId, budgetId, format (xlsx)
- Returns file stream with proper Content-Type and Content-Disposition
- Auth: school_admin, super_admin

## 4. Missing Frontend Components

### 4.1 MonthlyReportChart
- Recharts ComposedChart: bars for monthly income (green) and expenditure (red/destructive), line overlay for cumulative surplus
- Props: `report: MonthlyReport`
- Table below chart with month, income, expenditure, surplus, cumulative columns

### 4.2 MultiYearComparisonChart
- Recharts grouped BarChart comparing budgeted vs actual across years
- Props: `report: ComparisonReport`
- One bar group per year, two bars each (budgeted, actual)
- Summary table below with totals per year

### 4.3 ExportDialog
- Dialog with budget year select and format confirmation
- Triggers download via `useBudgetReports.exportReport()`
- Props: `budgets: Budget[], onExport: (budgetId: string) => Promise<void>`

### 4.4 ExpenseApprovalCard
- Card showing expense detail: description, amount, category, vendor, invoice info, receipt preview
- Approve button (with optional notes input) and Reject button (with required reason input)
- Props: `expense: Expense, onApprove: (id: string, notes?: string) => Promise<void>, onReject: (id: string, reason: string) => Promise<void>`

### 4.5 ReceiptUpload
- File input accepting image/jpeg, image/png, application/pdf; max 5MB
- Shows preview for images, filename for PDFs
- Calls `useExpenses.uploadReceipt()` on file select
- Props: `onUploaded: (url: string) => void`

## 5. Existing Components (Reused As-Is)

- BudgetSummaryCards → Dashboard page
- BudgetAlertBanner → Dashboard page
- BudgetLineItemsTable → Setup page
- CategoryTree → Categories page
- CategoryDialog → Categories page
- ExpenseTable → Expenses page + Approval page
- ExpenseSubmitDialog → Expenses page (integrate ReceiptUpload)
- VarianceChart → Reports page (variance tab)
- CashFlowChart → Reports page (cashflow tab)

## 6. Page Details

### 6.1 Dashboard (`/admin/budget`)
- Budget selector dropdown in PageHeader
- BudgetSummaryCards (4 stat cards)
- BudgetAlertBanner
- Pending approvals preview (first 5, link to full approval page)
- Quick links to setup, expenses, reports

### 6.2 Setup (`/admin/budget/setup`)
- Existing BudgetSetupSection content, extracted as a standalone page
- Budget list with create/edit/delete/approve actions
- Line item editor with category select, amounts, term breakdown

### 6.3 Categories (`/admin/budget/categories`)
- Seed button when empty
- New Category button
- CategoryTree with edit/delete actions
- CategoryDialog for create/edit

### 6.4 Expenses (`/admin/budget/expenses`)
- Filter bar: category, status, term, date range
- New Expense button → ExpenseSubmitDialog (with ReceiptUpload)
- ExpenseTable with all expenses
- Link to approval page for admins

### 6.5 Approval (`/admin/budget/expenses/approval`)
- List of pending expenses as ExpenseApprovalCards
- Each card shows full detail with receipt preview
- Approve/Reject actions inline

### 6.6 Reports (`/admin/budget/reports`)
- Tabs: Variance | Monthly | Cash Flow | Multi-Year | Export
- Each tab loads data on activation via useBudgetReports
- Variance tab: VarianceChart (existing)
- Monthly tab: MonthlyReportChart (new)
- Cash Flow tab: CashFlowChart (existing)
- Multi-Year tab: MultiYearComparisonChart (new)
- Export tab: ExportDialog (new)

## 7. Integration Notes

- All monetary values are integers in cents; format with `formatCurrency()` for display
- Income data in monthly/cashflow reports depends on Fee module payments — backend currently returns 0 as placeholder; this is acceptable for now
- SGB Portal (Scope 40) already consumes budget data via its own endpoints
- Excel export requires adding `exceljs` package to backend

## 8. File Count Estimate

- 6 page files (new/rewritten)
- 5 new components
- 2 backend service additions (in existing service files)
- 1 backend route addition (in existing routes file)
- Update to barrel export index
- ~15-17 files total touched

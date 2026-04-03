# Payroll Module Completion (Scope 42) — Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## 1. Current State

Backend is 100% complete (models, services, routes, tax calc, bank export, certificates). Frontend is ~15%: types done, 3/5 hooks done, 2/14 components done, 0/9 pages.

## 2. Hook Changes

### 2.1 New: `useTaxConfig`
Extract tax table logic from `usePayrollReports` into dedicated hook.
- `taxTable: TaxTable | null`
- `loading: boolean`
- `fetchTaxTable(taxYear?: number): Promise<void>`
- `saveTaxTable(data): Promise<TaxTable>`

### 2.2 New: `usePayslips`
Extract payslip logic from `usePayrollReports` into dedicated hook.
- `payslips: PayslipSummary[]`
- `loading: boolean`
- `fetchMyPayslips(): Promise<void>` — for teacher/staff viewing own
- `fetchPayslip(runId, staffId): Promise<Payslip>`
- `downloadPayslip(runId, staffId): Promise<void>` — PDF download
- `downloadBatchPayslips(runId): Promise<void>` — ZIP download

### 2.3 Refactor: `usePayrollReports`
Remove `fetchPayslip`, `fetchTaxTable`, `saveTaxTable`. Keep:
- `costToCompany`, `fetchCostToCompany`
- `exportBankFile`
- `generateTaxCertificates`
- Add `downloadTaxCertificate(staffId, taxYear): Promise<void>`

## 3. New Components (12)

| Component | File | Props |
|---|---|---|
| SalaryFormDialog | `SalaryFormDialog.tsx` | `open, onOpenChange, salary?, staffList, onSubmit` |
| AllowanceDeductionEditor | `AllowanceDeductionEditor.tsx` | `items, onChange, label ('Allowance'|'Deduction'), showTaxable?` |
| BankDetailsForm | `BankDetailsForm.tsx` | `values, onChange` |
| PayrollRunList | `PayrollRunList.tsx` | `runs, onViewRun` |
| PayrollRunItemsTable | `PayrollRunItemsTable.tsx` | `items, onAdjust?` |
| PayrollItemAdjustDialog | `PayrollItemAdjustDialog.tsx` | `open, onOpenChange, item, onSubmit` |
| PayrollRunActions | `PayrollRunActions.tsx` | `run, onReview, onApprove, onProcess, onExport, onPayslips` |
| PayslipCard | `PayslipCard.tsx` | `payslip` |
| PayslipList | `PayslipList.tsx` | `runs, onViewPayslip` |
| TaxBracketEditor | `TaxBracketEditor.tsx` | `taxTable, onSave` |
| CostToCompanyChart | `CostToCompanyChart.tsx` | `report` |
| CostToCompanyTable | `CostToCompanyTable.tsx` | `report` |

## 4. Pages (9)

| Route | Page | Key hooks |
|---|---|---|
| `/admin/payroll` | Dashboard | usePayrollRuns, usePayrollReports |
| `/admin/payroll/staff` | Salary list | usePayrollSalaries |
| `/admin/payroll/staff/[id]` | Salary detail + history | usePayrollSalaries, usePayslips |
| `/admin/payroll/runs` | Run list | usePayrollRuns |
| `/admin/payroll/runs/[id]` | Run detail + workflow | usePayrollRuns, usePayrollReports |
| `/admin/payroll/runs/new` | Create run | usePayrollRuns |
| `/admin/payroll/tax` | Tax config | useTaxConfig |
| `/admin/payroll/reports` | CTC + certificates | usePayrollReports |
| `/my/payslips` | Staff own payslips | usePayslips, usePayrollRuns |

## 5. Existing Components (Reused)
- PayrollSummaryCards → Dashboard
- SalaryList → Staff salary list page

## 6. Barrel Export
Update `src/components/payroll/index.ts` with all 14 components.

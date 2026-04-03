# Budget Module Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Budget Management module by refactoring the single-page tabbed UI into 6 separate route pages, adding 5 missing frontend components, and implementing 2 missing backend endpoints (receipt upload + Excel export).

**Architecture:** The existing monolith `page.tsx` is replaced with a focused dashboard. Existing components are reused in their new page homes. Two backend endpoints are added for file upload (multer) and Excel export (exceljs). All hooks and types are already complete.

**Tech Stack:** Next.js 16 (React 19), Zustand, Recharts, React Hook Form + Zod, Tailwind CSS 4, Express, Mongoose, multer, exceljs

---

## File Structure

### Backend (c:/Users/shaun/campusly-backend/)
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/modules/budget/routes.ts` | Add receipt upload + export routes |
| Modify | `src/modules/budget/controller.ts` | Add uploadReceipt + exportReport handlers |
| Create | `src/modules/budget/service-upload.ts` | Multer receipt upload logic |
| Create | `src/modules/budget/service-export.ts` | Excel generation with exceljs |

### Frontend Pages (c:/Users/shaun/campusly-frontend/)
| Action | File | Responsibility |
|--------|------|---------------|
| Rewrite | `src/app/(dashboard)/admin/budget/page.tsx` | Dashboard: summary cards, alerts, pending preview |
| Keep | `src/app/(dashboard)/admin/budget/BudgetSetupSection.tsx` | Reused by setup page |
| Create | `src/app/(dashboard)/admin/budget/setup/page.tsx` | Budget create/edit with line items |
| Create | `src/app/(dashboard)/admin/budget/categories/page.tsx` | Category management |
| Create | `src/app/(dashboard)/admin/budget/expenses/page.tsx` | Expense tracker with filters |
| Create | `src/app/(dashboard)/admin/budget/expenses/approval/page.tsx` | Pending claims approval queue |
| Create | `src/app/(dashboard)/admin/budget/reports/page.tsx` | Tabbed reports page |

### Frontend Components
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/components/budget/MonthlyReportChart.tsx` | Bar chart: monthly income vs expenditure |
| Create | `src/components/budget/MultiYearComparisonChart.tsx` | Grouped bar chart: multi-year comparison |
| Create | `src/components/budget/ExportDialog.tsx` | Excel export configuration dialog |
| Create | `src/components/budget/ExpenseApprovalCard.tsx` | Detailed expense card with approve/reject |
| Create | `src/components/budget/ReceiptUpload.tsx` | File upload for receipts |
| Modify | `src/components/budget/ExpenseSubmitDialog.tsx` | Integrate ReceiptUpload component |
| Modify | `src/components/budget/index.ts` | Add new component exports |

---

## Task 1: Backend — Receipt Upload Endpoint

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/budget/service-upload.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/budget/routes.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/budget/controller.ts`

- [ ] **Step 1: Create the upload service**

Create `c:/Users/shaun/campusly-backend/src/modules/budget/service-upload.ts`:

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/budget/receipts');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}_${unique}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
  }
}

export const receiptUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
```

- [ ] **Step 2: Add upload controller handler**

Add to the end of `BudgetController` class in `c:/Users/shaun/campusly-backend/src/modules/budget/controller.ts`:

```typescript
  static async uploadReceipt(req: Request, res: Response): Promise<void> {
    const multerReq = req as Request & { file?: Express.Multer.File };
    if (!multerReq.file) {
      res.status(400).json(apiResponse(false, undefined, 'No file uploaded'));
      return;
    }
    const url = `/uploads/budget/receipts/${multerReq.file.filename}`;
    res.json(apiResponse(true, { url }, 'Receipt uploaded successfully'));
  }
```

Also add the import at top of controller:
```typescript
// No new imports needed — Request/Response already imported
```

- [ ] **Step 3: Add the upload route**

In `c:/Users/shaun/campusly-backend/src/modules/budget/routes.ts`, add after the reject route and before the Reports section:

```typescript
import { receiptUpload } from './service-upload.js';

// ... after expenses/:id/reject route:

router.post(
  '/expenses/upload-receipt',
  authorize('super_admin', 'school_admin', 'teacher', 'staff'),
  receiptUpload.single('receipt'),
  BudgetController.uploadReceipt,
);
```

- [ ] **Step 4: Ensure uploads directory exists**

```bash
mkdir -p c:/Users/shaun/campusly-backend/uploads/budget/receipts
```

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/budget/service-upload.ts src/modules/budget/routes.ts src/modules/budget/controller.ts
git commit -m "feat(budget): add receipt upload endpoint"
```

---

## Task 2: Backend — Excel Export Endpoint

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/budget/service-export.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/budget/routes.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/budget/controller.ts`

- [ ] **Step 1: Install exceljs**

```bash
cd c:/Users/shaun/campusly-backend && npm install exceljs
```

- [ ] **Step 2: Create the export service**

Create `c:/Users/shaun/campusly-backend/src/modules/budget/service-export.ts`:

```typescript
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { Budget, Expense } from './model.js';
import { NotFoundError } from '../../common/errors.js';

export class ExportService {
  static async generateBudgetExcel(schoolId: string, budgetId: string): Promise<ExcelJS.Workbook> {
    const sid = new mongoose.Types.ObjectId(schoolId);
    const bid = new mongoose.Types.ObjectId(budgetId);

    const budget = await Budget.findOne({ _id: bid, schoolId: sid, isDeleted: false })
      .populate('lineItems.categoryId', 'name code')
      .lean();

    if (!budget) throw new NotFoundError('Budget not found');

    // Get approved expenses by category
    const expensesByCategory = await Expense.aggregate([
      { $match: { schoolId: sid, status: 'approved', isDeleted: false } },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    ]);
    const expenseMap = new Map<string, number>();
    for (const e of expensesByCategory) {
      expenseMap.set(e._id.toString(), e.total as number);
    }

    // Get monthly expenses
    const startOfYear = new Date(`${budget.year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${budget.year}-12-31T23:59:59.999Z`);
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          schoolId: sid,
          status: 'approved',
          isDeleted: false,
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$amount' } } },
    ]);
    const monthMap = new Map<number, number>();
    for (const m of monthlyExpenses) {
      monthMap.set(m._id as number, m.total as number);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Campusly';
    wb.created = new Date();

    // ── Sheet 1: Budget Summary ──
    const summarySheet = wb.addWorksheet('Budget Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 30 },
    ];
    const totalActual = budget.lineItems.reduce((s, li) => {
      const cat = li.categoryId as unknown as { _id: mongoose.Types.ObjectId };
      return s + (expenseMap.get(cat._id.toString()) ?? 0);
    }, 0);
    summarySheet.addRows([
      { field: 'Budget Name', value: budget.name },
      { field: 'Year', value: budget.year },
      { field: 'Status', value: budget.status },
      { field: 'Total Budgeted', value: (budget.totalBudgeted / 100).toFixed(2) },
      { field: 'Total Spent', value: (totalActual / 100).toFixed(2) },
      { field: 'Remaining', value: ((budget.totalBudgeted - totalActual) / 100).toFixed(2) },
    ]);
    summarySheet.getRow(1).font = { bold: true };

    // ── Sheet 2: Line Items ──
    const itemsSheet = wb.addWorksheet('Line Items');
    itemsSheet.columns = [
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Code', key: 'code', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Budgeted (R)', key: 'budgeted', width: 15 },
      { header: 'Actual (R)', key: 'actual', width: 15 },
      { header: 'Variance (R)', key: 'variance', width: 15 },
      { header: 'Utilization %', key: 'utilization', width: 14 },
    ];

    for (const li of budget.lineItems) {
      const cat = li.categoryId as unknown as { _id: mongoose.Types.ObjectId; name: string; code: string };
      const actual = expenseMap.get(cat._id.toString()) ?? 0;
      const variance = li.annualAmount - actual;
      const utilization = li.annualAmount > 0
        ? Math.round((actual / li.annualAmount) * 1000) / 10
        : 0;

      itemsSheet.addRow({
        category: cat.name,
        code: cat.code,
        description: li.description ?? '',
        budgeted: (li.annualAmount / 100).toFixed(2),
        actual: (actual / 100).toFixed(2),
        variance: (variance / 100).toFixed(2),
        utilization,
      });
    }
    itemsSheet.getRow(1).font = { bold: true };

    // ── Sheet 3: Monthly Breakdown ──
    const monthlySheet = wb.addWorksheet('Monthly Breakdown');
    monthlySheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Expenditure (R)', key: 'expenditure', width: 18 },
    ];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    for (let i = 0; i < 12; i++) {
      const exp = monthMap.get(i + 1) ?? 0;
      monthlySheet.addRow({ month: monthNames[i], expenditure: (exp / 100).toFixed(2) });
    }
    monthlySheet.getRow(1).font = { bold: true };

    return wb;
  }
}
```

- [ ] **Step 3: Add export controller handler**

Add to `BudgetController` class in controller.ts:

```typescript
  static async exportReport(req: Request, res: Response): Promise<void> {
    const schoolId = (req.query.schoolId as string) || req.user!.schoolId!;
    const budgetId = req.query.budgetId as string;

    const { ExportService } = await import('./service-export.js');
    const wb = await ExportService.generateBudgetExcel(schoolId, budgetId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="budget-report.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }
```

- [ ] **Step 4: Add the export route**

In routes.ts, add in the Reports section (after the comparison route, before Alerts):

```typescript
router.get(
  '/reports/export',
  authorize('super_admin', 'school_admin'),
  BudgetController.exportReport,
);
```

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/budget/service-export.ts src/modules/budget/routes.ts src/modules/budget/controller.ts package.json package-lock.json
git commit -m "feat(budget): add Excel export endpoint with exceljs"
```

---

## Task 3: Frontend — ReceiptUpload Component

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/budget/ReceiptUpload.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Image as ImageIcon } from 'lucide-react';

interface ReceiptUploadProps {
  onUploaded: (url: string) => void;
  uploadFn: (file: File) => Promise<string>;
  existingUrl?: string;
}

export function ReceiptUpload({ onUploaded, uploadFn, existingUrl }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = (name: string) => /\.(jpe?g|png)$/i.test(name);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, or PDF files are allowed');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadFn(file);
      setFileName(file.name);
      setPreviewUrl(isImage(file.name) ? URL.createObjectURL(file) : null);
      onUploaded(url);
    } catch (err: unknown) {
      console.error('Upload failed', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFileName(null);
    setPreviewUrl(null);
    setError(null);
    onUploaded('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFile}
        className="hidden"
      />

      {!fileName ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          {uploading ? 'Uploading...' : 'Upload Receipt'}
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-md border p-2">
          {previewUrl ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm truncate flex-1">{fileName}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/ReceiptUpload.tsx
git commit -m "feat(budget): add ReceiptUpload component"
```

---

## Task 4: Frontend — Integrate ReceiptUpload into ExpenseSubmitDialog

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/components/budget/ExpenseSubmitDialog.tsx`

- [ ] **Step 1: Add receipt upload integration**

Add `uploadReceipt` to props and a `receiptUrl` state to the dialog. In the existing `ExpenseSubmitDialog`:

1. Add to props interface:
```typescript
interface ExpenseSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  budgetId?: string;
  onSubmit: (data: CreateExpensePayload) => Promise<void>;
  uploadReceipt?: (file: File) => Promise<string>;  // ADD THIS
}
```

2. Add state inside the component:
```typescript
const [receiptUrl, setReceiptUrl] = useState('');
```

3. Add `ReceiptUpload` before the submit button in the form body:
```tsx
{uploadReceipt && (
  <div className="space-y-1">
    <Label>Receipt</Label>
    <ReceiptUpload uploadFn={uploadReceipt} onUploaded={setReceiptUrl} />
  </div>
)}
```

4. Include `receiptUrl` in the submit payload:
```typescript
// In the onSubmit handler, add receiptUrl to the data:
await onSubmit({ ...data, receiptUrl: receiptUrl || undefined });
```

5. Reset `receiptUrl` when dialog closes (in the useEffect that resets the form when `open` changes):
```typescript
setReceiptUrl('');
```

6. Add import at top:
```typescript
import { ReceiptUpload } from './ReceiptUpload';
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/ExpenseSubmitDialog.tsx
git commit -m "feat(budget): integrate receipt upload into expense dialog"
```

---

## Task 5: Frontend — ExpenseApprovalCard Component

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/budget/ExpenseApprovalCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense } from '@/types';

interface ExpenseApprovalCardProps {
  expense: Expense;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

export function ExpenseApprovalCard({ expense, onApprove, onReject }: ExpenseApprovalCardProps) {
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categoryName = typeof expense.categoryId === 'object'
    ? expense.categoryId.name
    : expense.categoryId;
  const submitterName = typeof expense.submittedBy === 'object'
    ? expense.submittedBy.name
    : expense.submittedBy;

  const isImage = expense.receiptUrl
    ? /\.(jpe?g|png)$/i.test(expense.receiptUrl)
    : false;

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(expense.id, notes || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onReject(expense.id, reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{expense.description}</CardTitle>
          <Badge variant="outline">{categoryName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">Amount:</span>{' '}
            <span className="font-semibold">{formatCurrency(expense.amount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Submitted by:</span>{' '}
            <span className="font-medium">{submitterName}</span>
          </div>
          {expense.vendor && (
            <div>
              <span className="text-muted-foreground">Vendor:</span> {expense.vendor}
            </div>
          )}
          {expense.invoiceNumber && (
            <div>
              <span className="text-muted-foreground">Invoice #:</span> {expense.invoiceNumber}
            </div>
          )}
          {expense.invoiceDate && (
            <div>
              <span className="text-muted-foreground">Invoice date:</span>{' '}
              {formatDate(expense.invoiceDate)}
            </div>
          )}
          {expense.term && (
            <div>
              <span className="text-muted-foreground">Term:</span> {expense.term}
            </div>
          )}
        </div>

        {expense.notes && (
          <p className="text-muted-foreground italic">{expense.notes}</p>
        )}

        {expense.receiptUrl && (
          <div className="flex items-center gap-2 rounded-md border p-2">
            {isImage ? (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline truncate"
            >
              View Receipt
            </a>
          </div>
        )}

        {/* Approval notes */}
        {!showReject && (
          <div className="space-y-1">
            <Label className="text-xs">Approval notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
            />
          </div>
        )}

        {/* Rejection reason */}
        {showReject && (
          <div className="space-y-1">
            <Label className="text-xs">
              Rejection reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={2}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {!showReject ? (
          <>
            <Button size="sm" disabled={submitting} onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={submitting || !reason.trim()}
              onClick={handleReject}
            >
              <XCircle className="h-4 w-4 mr-1" /> Confirm Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReject(false)}
            >
              Cancel
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/ExpenseApprovalCard.tsx
git commit -m "feat(budget): add ExpenseApprovalCard component"
```

---

## Task 6: Frontend — MonthlyReportChart Component

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/budget/MonthlyReportChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyReport } from '@/types';

interface MonthlyReportChartProps {
  report: MonthlyReport | null;
}

export function MonthlyReportChart({ report }: MonthlyReportChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.months.map((m) => ({
      month: m.label.slice(0, 3),
      income: m.income / 100,
      expenditure: m.expenditure / 100,
      surplus: m.surplus / 100,
      cumulativeIncome: m.cumulativeIncome / 100,
      cumulativeExpenditure: m.cumulativeExpenditure / 100,
    }));
  }, [report]);

  if (!report || chartData.length === 0) {
    return <EmptyState icon={BarChart3} title="No monthly data" description="No report data available." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Monthly Income vs Expenditure — {report.year}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v * 100)} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenditure" name="Expenditure" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Line
              dataKey="surplus"
              name="Surplus"
              type="monotone"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Table breakdown */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">Month</th>
              <th className="py-2 pr-4 text-right">Income</th>
              <th className="py-2 pr-4 text-right">Expenditure</th>
              <th className="py-2 pr-4 text-right">Surplus</th>
              <th className="py-2 pr-4 text-right">Cum. Income</th>
              <th className="py-2 text-right">Cum. Expenditure</th>
            </tr>
          </thead>
          <tbody>
            {report.months.map((m) => (
              <tr key={m.month} className="border-b">
                <td className="py-2 pr-4">{m.label}</td>
                <td className="py-2 pr-4 text-right">{formatCurrency(m.income)}</td>
                <td className="py-2 pr-4 text-right">{formatCurrency(m.expenditure)}</td>
                <td className={`py-2 pr-4 text-right ${m.surplus < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(m.surplus)}
                </td>
                <td className="py-2 pr-4 text-right">{formatCurrency(m.cumulativeIncome)}</td>
                <td className="py-2 text-right">{formatCurrency(m.cumulativeExpenditure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/MonthlyReportChart.tsx
git commit -m "feat(budget): add MonthlyReportChart component"
```

---

## Task 7: Frontend — MultiYearComparisonChart Component

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/budget/MultiYearComparisonChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ComparisonReport } from '@/types';

const YEAR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

interface MultiYearComparisonChartProps {
  report: ComparisonReport | null;
}

export function MultiYearComparisonChart({ report }: MultiYearComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.totals.map((t) => ({
      year: String(t.year),
      budgeted: t.budgeted / 100,
      actual: t.actual / 100,
    }));
  }, [report]);

  if (!report || report.years.length === 0) {
    return <EmptyState icon={BarChart3} title="No comparison data" description="Select years to compare." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Multi-Year Budget Comparison</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v * 100)} />
            <Legend />
            <Bar dataKey="budgeted" name="Budgeted" fill={YEAR_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill={YEAR_COLORS[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">Category</th>
              {report.years.map((y) => (
                <th key={y} className="py-2 pr-4 text-right" colSpan={2}>
                  {y}
                </th>
              ))}
            </tr>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 pr-4" />
              {report.years.map((y) => (
                <th key={y} className="py-1 pr-2 text-right text-xs" colSpan={1}>
                  Budgeted
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.categories.map((cat) => (
              <tr key={cat.categoryName} className="border-b">
                <td className="py-2 pr-4 truncate max-w-[150px]">{cat.categoryName}</td>
                {report.years.map((y) => {
                  const val = cat.values.find((v) => v.year === y);
                  return (
                    <td key={y} className="py-2 pr-4 text-right">
                      {val ? formatCurrency(val.budgeted) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="py-2 pr-4">Total</td>
              {report.totals.map((t) => (
                <td key={t.year} className="py-2 pr-4 text-right">
                  {formatCurrency(t.budgeted)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/MultiYearComparisonChart.tsx
git commit -m "feat(budget): add MultiYearComparisonChart component"
```

---

## Task 8: Frontend — ExportDialog Component

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/budget/ExportDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';
import type { Budget } from '@/types';

interface ExportDialogProps {
  budgets: Budget[];
  onExport: (budgetId: string) => Promise<void>;
}

export function ExportDialog({ budgets, onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    try {
      await onExport(selectedId);
      setOpen(false);
    } catch (err: unknown) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Download className="h-4 w-4 mr-1" /> Export to Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Budget Report</DialogTitle>
          <DialogDescription>
            Download the budget report as an Excel spreadsheet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Budget</Label>
            <Select
              value={selectedId}
              onValueChange={(v: unknown) => setSelectedId(v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a budget..." />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            The export includes: Budget Summary, Line Items with Actuals,
            Variance by Category, and Monthly Breakdown.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!selectedId || exporting} onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            {exporting ? 'Exporting...' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/ExportDialog.tsx
git commit -m "feat(budget): add ExportDialog component"
```

---

## Task 9: Frontend — Update Component Barrel Export

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/components/budget/index.ts`

- [ ] **Step 1: Add new exports**

Replace the content of `src/components/budget/index.ts` with:

```typescript
export { BudgetAlertBanner } from './BudgetAlertBanner';
export { BudgetSummaryCards } from './BudgetSummaryCards';
export { CategoryTree } from './CategoryTree';
export { CategoryDialog } from './CategoryDialog';
export { BudgetLineItemsTable } from './BudgetLineItemsTable';
export { ExpenseTable } from './ExpenseTable';
export { ExpenseSubmitDialog } from './ExpenseSubmitDialog';
export { VarianceChart } from './VarianceChart';
export { CashFlowChart } from './CashFlowChart';
export { ReceiptUpload } from './ReceiptUpload';
export { ExpenseApprovalCard } from './ExpenseApprovalCard';
export { MonthlyReportChart } from './MonthlyReportChart';
export { MultiYearComparisonChart } from './MultiYearComparisonChart';
export { ExportDialog } from './ExportDialog';
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/budget/index.ts
git commit -m "feat(budget): update barrel exports with new components"
```

---

## Task 10: Frontend — Dashboard Page (Rewrite)

**Files:**
- Rewrite: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/budget/page.tsx`

- [ ] **Step 1: Rewrite the dashboard page**

Replace `src/app/(dashboard)/admin/budget/page.tsx` with a focused dashboard:

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calculator, ArrowRight, ClipboardList, FolderTree, Receipt, BarChart3 } from 'lucide-react';
import { useBudget } from '@/hooks/useBudget';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgetReports } from '@/hooks/useBudgetReports';
import { BudgetSummaryCards, BudgetAlertBanner, ExpenseTable } from '@/components/budget';

export default function AdminBudgetPage() {
  const { budgets, activeBudget, loading, fetchBudgets, fetchBudget } = useBudget();
  const { pendingExpenses, fetchPendingExpenses, approveExpense, rejectExpense } = useExpenses();
  const { alerts, fetchAlerts } = useBudgetReports();
  const [selectedBudgetId, setSelectedBudgetId] = useState('');

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0 && !selectedBudgetId) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  useEffect(() => {
    if (!selectedBudgetId) return;
    fetchBudget(selectedBudgetId);
    fetchAlerts(selectedBudgetId);
    fetchPendingExpenses();
  }, [selectedBudgetId, fetchBudget, fetchAlerts, fetchPendingExpenses]);

  const totalExpenses = useMemo(
    () => pendingExpenses.length,
    [pendingExpenses],
  );

  const approvedExpenseTotal = useMemo(() => 0, []); // Computed from activeBudget in cards

  const handleApprove = async (id: string) => {
    await approveExpense(id);
    await fetchPendingExpenses();
  };

  const handleReject = async (id: string) => {
    await rejectExpense(id, 'Rejected by admin');
    await fetchPendingExpenses();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Management" description="Plan, track, and analyse your school budget">
        {budgets.length > 0 && (
          <Select value={selectedBudgetId} onValueChange={(v: unknown) => setSelectedBudgetId(v as string)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      {budgets.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="No budgets yet"
          description="Create your first annual budget to get started."
          action={
            <Link href="/admin/budget/setup">
              <Button>Create Budget</Button>
            </Link>
          }
        />
      ) : (
        <>
          <BudgetSummaryCards budget={activeBudget} totalExpenses={approvedExpenseTotal} />
          <BudgetAlertBanner alerts={alerts} />

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/admin/budget/setup">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="h-4 w-4 mr-2" /> Budget Setup
              </Button>
            </Link>
            <Link href="/admin/budget/categories">
              <Button variant="outline" className="w-full justify-start">
                <FolderTree className="h-4 w-4 mr-2" /> Categories
              </Button>
            </Link>
            <Link href="/admin/budget/expenses">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="h-4 w-4 mr-2" /> Expenses
              </Button>
            </Link>
            <Link href="/admin/budget/reports">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" /> Reports
              </Button>
            </Link>
          </div>

          {/* Pending Approvals Preview */}
          {pendingExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Pending Approvals ({pendingExpenses.length})
                </h3>
                <Link href="/admin/budget/expenses/approval">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <ExpenseTable
                expenses={pendingExpenses.slice(0, 5)}
                showApprovalActions
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/admin/budget/page.tsx
git commit -m "feat(budget): rewrite dashboard as focused overview page"
```

---

## Task 11: Frontend — Budget Setup Page

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/budget/setup/page.tsx`

- [ ] **Step 1: Create the setup page**

```tsx
'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useBudget } from '@/hooks/useBudget';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import { BudgetSetupSection } from '../BudgetSetupSection';

export default function BudgetSetupPage() {
  const { budgets, loading, fetchBudgets, createBudget, updateBudget, deleteBudget } = useBudget();
  const { flatCategories, fetchCategories } = useBudgetCategories();

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [fetchBudgets, fetchCategories]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Setup"
        description="Create and manage annual budgets with line items"
      />
      <BudgetSetupSection
        budgets={budgets}
        categories={flatCategories}
        onCreate={createBudget}
        onUpdate={updateBudget}
        onDelete={deleteBudget}
        onRefresh={fetchBudgets}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/admin/budget/setup/page.tsx"
git commit -m "feat(budget): add separate budget setup page"
```

---

## Task 12: Frontend — Categories Page

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/budget/categories/page.tsx`

- [ ] **Step 1: Create the categories page**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { FolderTree, Plus, Sprout } from 'lucide-react';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import { CategoryTree, CategoryDialog } from '@/components/budget';
import type { BudgetCategory, CreateCategoryPayload } from '@/types';

export default function BudgetCategoriesPage() {
  const {
    categories, loading, fetchCategories,
    createCategory, updateCategory, deleteCategory, seedCategories,
  } = useBudgetCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleSubmit = useCallback(async (data: CreateCategoryPayload) => {
    const parentId = (data.parentId === 'none' || !data.parentId) ? null : data.parentId;
    await createCategory({ ...data, parentId });
    await fetchCategories();
  }, [createCategory, fetchCategories]);

  const handleUpdate = useCallback(async (id: string, data: Partial<BudgetCategory>) => {
    await updateCategory(id, data);
    await fetchCategories();
  }, [updateCategory, fetchCategories]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteCategory(id);
    await fetchCategories();
  }, [deleteCategory, fetchCategories]);

  const handleSeed = useCallback(async () => {
    await seedCategories();
    await fetchCategories();
  }, [seedCategories, fetchCategories]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Categories" description="Manage expense categories and subcategories">
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" onClick={handleSeed}>
              <Sprout className="h-4 w-4 mr-1" /> Seed Defaults
            </Button>
          )}
          <Button onClick={() => { setEditingCategory(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Category
          </Button>
        </div>
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories"
          description="Seed default South African school categories or create your own."
        />
      ) : (
        <CategoryTree
          categories={categories}
          onEdit={(cat) => { setEditingCategory(cat); setDialogOpen(true); }}
          onDelete={handleDelete}
        />
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        parentCategories={categories}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/admin/budget/categories/page.tsx"
git commit -m "feat(budget): add separate categories page"
```

---

## Task 13: Frontend — Expenses Page

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/budget/expenses/page.tsx`

- [ ] **Step 1: Create the expenses page**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Receipt, Plus, ClipboardCheck } from 'lucide-react';
import { useBudget } from '@/hooks/useBudget';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseTable, ExpenseSubmitDialog } from '@/components/budget';
import type { CreateExpensePayload, ExpenseFilters } from '@/types';

export default function BudgetExpensesPage() {
  const { budgets, fetchBudgets } = useBudget();
  const { flatCategories, fetchCategories } = useBudgetCategories();
  const {
    expenses, pendingExpenses, loading, fetchExpenses,
    fetchPendingExpenses, createExpense, approveExpense,
    rejectExpense, uploadReceipt,
  } = useExpenses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
    fetchPendingExpenses();
  }, [fetchBudgets, fetchCategories, fetchPendingExpenses]);

  useEffect(() => {
    const filters: ExpenseFilters = {};
    if (filterStatus !== 'all') filters.status = filterStatus;
    if (filterCategory !== 'all') filters.categoryId = filterCategory;
    if (filterTerm !== 'all') filters.term = Number(filterTerm);
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    fetchExpenses(filters);
  }, [filterStatus, filterCategory, filterTerm, startDate, endDate, fetchExpenses]);

  const handleSubmit = useCallback(async (data: CreateExpensePayload) => {
    await createExpense(data);
    await fetchExpenses();
  }, [createExpense, fetchExpenses]);

  const handleApprove = useCallback(async (id: string) => {
    await approveExpense(id);
    await fetchExpenses();
    await fetchPendingExpenses();
  }, [approveExpense, fetchExpenses, fetchPendingExpenses]);

  const handleReject = useCallback(async (id: string) => {
    await rejectExpense(id, 'Rejected by admin');
    await fetchExpenses();
    await fetchPendingExpenses();
  }, [rejectExpense, fetchExpenses, fetchPendingExpenses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Record, track, and manage expenses">
        <div className="flex gap-2">
          {pendingExpenses.length > 0 && (
            <Link href="/admin/budget/expenses/approval">
              <Button variant="outline" size="sm">
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Pending <Badge variant="secondary" className="ml-1">{pendingExpenses.length}</Badge>
              </Button>
            </Link>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Expense
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={(v: unknown) => setFilterCategory(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {flatCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTerm} onValueChange={(v: unknown) => setFilterTerm(v as string)}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
            <SelectItem value="4">Term 4</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full sm:w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full sm:w-36"
          placeholder="To"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses"
          description="Record your first expense to start tracking."
        />
      ) : (
        <ExpenseTable
          expenses={expenses}
          showApprovalActions
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <ExpenseSubmitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={flatCategories}
        budgetId={budgets[0]?.id}
        onSubmit={handleSubmit}
        uploadReceipt={uploadReceipt}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/admin/budget/expenses/page.tsx"
git commit -m "feat(budget): add expenses page with filters"
```

---

## Task 14: Frontend — Expense Approval Page

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/budget/expenses/approval/page.tsx`

- [ ] **Step 1: Create the approval page**

```tsx
'use client';

import { useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardCheck } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseApprovalCard } from '@/components/budget';

export default function ExpenseApprovalPage() {
  const { pendingExpenses, loading, fetchPendingExpenses, approveExpense, rejectExpense } = useExpenses();

  useEffect(() => { fetchPendingExpenses(); }, [fetchPendingExpenses]);

  const handleApprove = useCallback(async (id: string, notes?: string) => {
    await approveExpense(id, notes);
    await fetchPendingExpenses();
  }, [approveExpense, fetchPendingExpenses]);

  const handleReject = useCallback(async (id: string, reason: string) => {
    await rejectExpense(id, reason);
    await fetchPendingExpenses();
  }, [rejectExpense, fetchPendingExpenses]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Approvals"
        description={`${pendingExpenses.length} pending claim${pendingExpenses.length !== 1 ? 's' : ''} awaiting review`}
      />

      {pendingExpenses.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending claims"
          description="All expense claims have been reviewed."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {pendingExpenses.map((expense) => (
            <ExpenseApprovalCard
              key={expense.id}
              expense={expense}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/admin/budget/expenses/approval/page.tsx"
git commit -m "feat(budget): add expense approval page"
```

---

## Task 15: Frontend — Reports Page

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/budget/reports/page.tsx`

- [ ] **Step 1: Create the reports page**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useBudget } from '@/hooks/useBudget';
import { useBudgetReports } from '@/hooks/useBudgetReports';
import {
  VarianceChart, CashFlowChart, MonthlyReportChart,
  MultiYearComparisonChart, ExportDialog,
} from '@/components/budget';

export default function BudgetReportsPage() {
  const { budgets, fetchBudgets } = useBudget();
  const {
    variance, monthly, cashflow, comparison, loading,
    fetchVariance, fetchMonthly, fetchCashflow, fetchComparison, exportReport,
  } = useBudgetReports();

  const [activeTab, setActiveTab] = useState('variance');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonYears, setComparisonYears] = useState('');

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0 && !selectedBudgetId) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  // Load data when tab or budget changes
  useEffect(() => {
    if (!selectedBudgetId && activeTab !== 'monthly' && activeTab !== 'comparison') return;
    if (activeTab === 'variance' && selectedBudgetId) {
      const term = selectedTerm !== 'all' ? Number(selectedTerm) : undefined;
      fetchVariance(selectedBudgetId, term);
    }
    if (activeTab === 'cashflow' && selectedBudgetId) {
      fetchCashflow(selectedBudgetId);
    }
  }, [activeTab, selectedBudgetId, selectedTerm, fetchVariance, fetchCashflow]);

  useEffect(() => {
    if (activeTab === 'monthly') fetchMonthly(selectedYear);
  }, [activeTab, selectedYear, fetchMonthly]);

  const handleCompare = useCallback(() => {
    if (!comparisonYears.trim()) return;
    const years = comparisonYears.split(',').map((y) => Number(y.trim())).filter(Boolean);
    if (years.length > 0) fetchComparison(years);
  }, [comparisonYears, fetchComparison]);

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Reports" description="Analyse budget performance and trends">
        <ExportDialog budgets={budgets} onExport={exportReport} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="variance">Variance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="comparison">Multi-Year</TabsTrigger>
        </TabsList>

        {/* ── Variance ──────────────────────────────────── */}
        <TabsContent value="variance" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedBudgetId} onValueChange={(v: unknown) => setSelectedBudgetId(v as string)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTerm} onValueChange={(v: unknown) => setSelectedTerm(v as string)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Annual</SelectItem>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
                <SelectItem value="4">Term 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? <LoadingSpinner /> : <VarianceChart report={variance} />}
        </TabsContent>

        {/* ── Monthly ───────────────────────────────────── */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <Select
              value={String(selectedYear)}
              onValueChange={(v: unknown) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? <LoadingSpinner /> : <MonthlyReportChart report={monthly} />}
        </TabsContent>

        {/* ── Cash Flow ─────────────────────────────────── */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <Select value={selectedBudgetId} onValueChange={(v: unknown) => setSelectedBudgetId(v as string)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? <LoadingSpinner /> : <CashFlowChart report={cashflow} />}
        </TabsContent>

        {/* ── Multi-Year Comparison ─────────────────────── */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-sm">Years (comma-separated)</Label>
              <Input
                value={comparisonYears}
                onChange={(e) => setComparisonYears(e.target.value)}
                placeholder="2024, 2025, 2026"
                className="w-full sm:w-64"
              />
            </div>
            <Button onClick={handleCompare} disabled={!comparisonYears.trim()}>
              Compare
            </Button>
          </div>
          {loading ? <LoadingSpinner /> : <MultiYearComparisonChart report={comparison} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/admin/budget/reports/page.tsx"
git commit -m "feat(budget): add reports page with variance, monthly, cashflow, multi-year tabs"
```

---

## Task 16: Verify Build

- [ ] **Step 1: Run frontend build check**

```bash
cd c:/Users/shaun/campusly-frontend && npx next build 2>&1 | tail -30
```

Expected: Build succeeds with no type errors.

- [ ] **Step 2: Fix any type or import errors found**

If there are errors, fix them based on the error messages.

- [ ] **Step 3: Run backend TypeScript check**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | tail -20
```

Expected: No type errors.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A && git commit -m "fix(budget): resolve build errors"
```

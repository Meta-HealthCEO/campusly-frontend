'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { IssueLoanDialog } from './IssueLoanDialog';
import type { BookLoanRecord, LibraryBookRecord } from '@/hooks/useLibrary';
import type { Student } from '@/types';

const statusStyles: Record<string, string> = {
  issued: 'bg-blue-100 text-blue-800',
  overdue: 'bg-destructive/10 text-destructive',
  returned: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-gray-100 text-gray-800',
};

function getBookTitle(loan: BookLoanRecord): string {
  if (typeof loan.bookId === 'object' && loan.bookId !== null) return loan.bookId.title;
  return String(loan.bookId);
}

function getBookAuthor(loan: BookLoanRecord): string {
  if (typeof loan.bookId === 'object' && loan.bookId !== null) return loan.bookId.author;
  return '';
}

function getStudentName(loan: BookLoanRecord): string {
  if (typeof loan.studentId === 'object' && loan.studentId !== null) {
    const s = loan.studentId;
    if (s.userId && typeof s.userId === 'object') {
      return `${s.userId.firstName ?? ''} ${s.userId.lastName ?? ''}`.trim();
    }
    return s.admissionNumber ?? s._id;
  }
  return String(loan.studentId);
}

interface LoansTabProps {
  loans: BookLoanRecord[];
  loading: boolean;
  canManage: boolean;
  books: LibraryBookRecord[];
  students: Student[];
  onIssueLoan: (data: { bookId: string; studentId: string; dueDate: string }) => Promise<void>;
  onReturnLoan: (loanId: string, fineAmount?: number) => Promise<void>;
  onMarkLost: (loanId: string, fineAmount: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function LoansTab({
  loans, loading, canManage, books, students,
  onIssueLoan, onReturnLoan, onMarkLost, onRefresh,
}: LoansTabProps) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState<BookLoanRecord | null>(null);
  const [lostLoan, setLostLoan] = useState<BookLoanRecord | null>(null);
  const [fineAmount, setFineAmount] = useState('0');

  const handleIssueLoan = async (data: { bookId: string; studentId: string; dueDate: string }) => {
    try {
      await onIssueLoan(data);
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to issue book';
      toast.error(msg);
    }
  };

  const handleReturn = async () => {
    if (!returnLoan) return;
    try {
      await onReturnLoan(returnLoan.id, Number(fineAmount) || 0);
      setReturnLoan(null);
      setFineAmount('0');
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to return book';
      toast.error(msg);
    }
  };

  const handleMarkLost = async () => {
    if (!lostLoan) return;
    try {
      await onMarkLost(lostLoan.id, Number(fineAmount) || 0);
      setLostLoan(null);
      setFineAmount('0');
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to mark as lost';
      toast.error(msg);
    }
  };

  const columns: ColumnDef<BookLoanRecord, unknown>[] = [
    {
      accessorKey: 'bookId', header: 'Book',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{getBookTitle(row.original)}</p>
          <p className="text-xs text-muted-foreground">{getBookAuthor(row.original)}</p>
        </div>
      ),
    },
    {
      accessorKey: 'studentId', header: 'Student',
      cell: ({ row }) => getStudentName(row.original),
    },
    {
      accessorKey: 'issuedDate', header: 'Issued',
      cell: ({ row }) => formatDate(row.original.issuedDate),
    },
    {
      accessorKey: 'dueDate', header: 'Due Date',
      cell: ({ row }) => {
        const isOverdue = row.original.status === 'overdue' ||
          (row.original.status === 'issued' && new Date(row.original.dueDate) < new Date());
        return (
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {formatDate(row.original.dueDate)}
          </span>
        );
      },
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <Badge variant="secondary" className={statusStyles[row.original.status] ?? ''}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: 'fineAmount', header: 'Fine',
      cell: ({ row }) => row.original.fineAmount > 0 ? `R${row.original.fineAmount.toFixed(2)}` : '-',
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const active = row.original.status === 'issued' || row.original.status === 'overdue';
        if (!active) return null;
        return (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => { setReturnLoan(row.original); setFineAmount('0'); }}>
              <RotateCcw className="mr-1 h-3 w-3" /> Return
            </Button>
            <Button variant="outline" size="sm" disabled={!canManage} onClick={() => { setLostLoan(row.original); setFineAmount('0'); }}>
              <AlertTriangle className="mr-1 h-3 w-3" /> Lost
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIssueOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Issue Book
        </Button>
      </div>

      <DataTable columns={columns} data={loans} />

      <IssueLoanDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        books={books}
        students={students}
        onSubmit={handleIssueLoan}
      />

      {/* Return dialog */}
      <Dialog open={!!returnLoan} onOpenChange={(v) => { if (!v) setReturnLoan(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Return Book</DialogTitle>
            <DialogDescription>
              Return &quot;{returnLoan ? getBookTitle(returnLoan) : ''}&quot;.
              Optionally set a fine for overdue return.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Fine Amount (optional)</Label>
            <Input type="number" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} min="0" step="0.01" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnLoan(null)}>Cancel</Button>
            <Button onClick={handleReturn}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Lost dialog */}
      <Dialog open={!!lostLoan} onOpenChange={(v) => { if (!v) setLostLoan(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
            <DialogDescription>
              Mark &quot;{lostLoan ? getBookTitle(lostLoan) : ''}&quot; as lost.
              Enter the replacement fine amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Replacement Fine</Label>
            <Input type="number" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} min="0" step="0.01" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostLoan(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleMarkLost}>Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

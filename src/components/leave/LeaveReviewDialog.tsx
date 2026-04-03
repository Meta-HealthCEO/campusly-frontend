'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import { LeaveTypeBadge } from './LeaveTypeBadge';
import type { LeaveRequest } from '@/types';

interface LeaveReviewDialogProps {
  request: LeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, data: {
    status: 'approved' | 'declined';
    reviewComment?: string;
  }) => Promise<void>;
  saving?: boolean;
}

export function LeaveReviewDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  saving = false,
}: LeaveReviewDialogProps) {
  const [decision, setDecision] = useState<'approved' | 'declined'>('approved');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open) {
      setDecision('approved');
      setComment('');
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (!request) return;
    await onConfirm(request.id, {
      status: decision,
      reviewComment: comment || undefined,
    });
  }, [request, decision, comment, onConfirm]);

  if (!request) return null;

  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Leave Request</DialogTitle>
          <DialogDescription>
            {request.staffId.firstName} {request.staffId.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Type</span>
              <div className="mt-1"><LeaveTypeBadge type={request.leaveType} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-1"><LeaveStatusBadge status={request.status} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">Dates</span>
              <p className="mt-1 font-medium">{start === end ? start : `${start} - ${end}`}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Working Days</span>
              <p className="mt-1 font-medium">{request.workingDays}</p>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Reason</span>
            <p className="mt-1">{request.reason}</p>
          </div>

          {request.documentUrl && (
            <div className="text-sm">
              <span className="text-muted-foreground">Document</span>
              <p className="mt-1">
                <a href={request.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate block">
                  {request.documentUrl}
                </a>
              </p>
            </div>
          )}

          <hr className="border-border" />

          <div className="space-y-2">
            <Label>Decision <span className="text-destructive">*</span></Label>
            <Select value={decision} onValueChange={(val: unknown) => setDecision(val as 'approved' | 'declined')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="declined">Decline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewComment">Comment</Label>
            <Textarea
              id="reviewComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            variant={decision === 'declined' ? 'destructive' : 'default'}
          >
            {saving ? 'Processing...' : decision === 'approved' ? 'Approve' : 'Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateActionPayload } from '@/types';

interface AddActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActionPayload) => Promise<void>;
}

export function AddActionDialog({ open, onOpenChange, onSubmit }: AddActionDialogProps) {
  const [description, setDescription] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description || !assignedToUserId || !dueDate) return;
    try {
      setSubmitting(true);
      await onSubmit({ description, assignedToUserId, dueDate });
      setDescription('');
      setAssignedToUserId('');
      setDueDate('');
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to create action', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Follow-up Action</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-1">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the action to be taken..."
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label>Assign To (User ID) <span className="text-destructive">*</span></Label>
            <Input
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
              placeholder="Staff member User ID"
            />
          </div>
          <div className="space-y-1">
            <Label>Due Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description || !assignedToUserId || !dueDate}
          >
            {submitting ? 'Adding...' : 'Add Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

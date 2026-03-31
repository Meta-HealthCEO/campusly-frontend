'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, ArrowUpCircle, ArrowDownCircle, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ---- Create Wallet Dialog ----

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: () => Promise<void>;
}

export function CreateWalletDialog({ open, onOpenChange, studentName, onConfirm }: CreateWalletDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Wallet</DialogTitle>
          <DialogDescription>
            Create a new wallet for <strong>{studentName}</strong> with a default daily limit of {formatCurrency(10000)}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            <Plus className="h-4 w-4 mr-1" />
            {submitting ? 'Creating...' : 'Create Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Load Money Dialog ----

interface LoadMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: (amountRands: number) => Promise<void>;
}

export function LoadMoneyDialog({ open, onOpenChange, studentName, onConfirm }: LoadMoneyDialogProps) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount >= 10;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    await onConfirm(parsedAmount);
    setSubmitting(false);
    setAmount('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setAmount(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Load Money - {studentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="load-amount">Amount (ZAR)</Label>
            <Input
              id="load-amount"
              type="number"
              placeholder="e.g. 100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              step="10"
            />
            <p className="text-xs text-muted-foreground">Minimum top-up: R10.00</p>
          </div>
          <div className="flex gap-2">
            {[50, 100, 200, 500].map((preset) => (
              <Button key={preset} variant="outline" size="sm" onClick={() => setAmount(String(preset))}>
                R{preset}
              </Button>
            ))}
          </div>
          <Button className="w-full" disabled={!isValid || submitting} onClick={handleSubmit}>
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            {submitting ? 'Loading...' : `Load ${isValid ? `R${parsedAmount.toFixed(2)}` : 'Money'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Deduct Money Dialog ----

interface DeductMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  currentBalance: number;
  onConfirm: (amountRands: number, description: string) => Promise<void>;
}

export function DeductMoneyDialog({ open, onOpenChange, studentName, currentBalance, onConfirm }: DeductMoneyDialogProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && description.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    await onConfirm(parsedAmount, description.trim());
    setSubmitting(false);
    setAmount('');
    setDescription('');
    onOpenChange(false);
  };

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) { setAmount(''); setDescription(''); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deduct Money - {studentName}</DialogTitle>
          <DialogDescription>
            Current balance: {formatCurrency(currentBalance)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="deduct-amount">Amount (ZAR)</Label>
            <Input
              id="deduct-amount"
              type="number"
              placeholder="e.g. 25.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deduct-description">Description (required)</Label>
            <Input
              id="deduct-description"
              type="text"
              placeholder="e.g. Manual deduction - lost item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={!isValid || submitting} onClick={handleSubmit}>
            <ArrowDownCircle className="h-4 w-4 mr-1" />
            {submitting ? 'Deducting...' : `Deduct ${!isNaN(parsedAmount) && parsedAmount > 0 ? `R${parsedAmount.toFixed(2)}` : 'Money'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Update Daily Limit Dialog ----

interface DailyLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  currentLimit: number;
  onConfirm: (limitRands: number) => Promise<void>;
}

export function DailyLimitDialog({ open, onOpenChange, studentName, currentLimit, onConfirm }: DailyLimitDialogProps) {
  const [limit, setLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedLimit = parseFloat(limit);
  const isValid = !isNaN(parsedLimit) && parsedLimit > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    await onConfirm(parsedLimit);
    setSubmitting(false);
    setLimit('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setLimit(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Daily Limit - {studentName}</DialogTitle>
          <DialogDescription>
            Current limit: {formatCurrency(currentLimit)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="daily-limit">New Daily Limit (ZAR)</Label>
            <Input
              id="daily-limit"
              type="number"
              placeholder="e.g. 100.00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="1"
              step="10"
            />
          </div>
          <div className="flex gap-2">
            {[50, 100, 200, 500].map((preset) => (
              <Button key={preset} variant="outline" size="sm" onClick={() => setLimit(String(preset))}>
                R{preset}
              </Button>
            ))}
          </div>
          <Button className="w-full" disabled={!isValid || submitting} onClick={handleSubmit}>
            <ShieldCheck className="h-4 w-4 mr-1" />
            {submitting ? 'Updating...' : 'Update Daily Limit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


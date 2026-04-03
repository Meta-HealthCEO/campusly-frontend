'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AllowanceDeductionEditor } from './AllowanceDeductionEditor';
import { BankDetailsForm } from './BankDetailsForm';
import type {
  Allowance, DeductionItem, BankDetails, CreateSalaryPayload, SalaryRecord,
} from '@/types';

// ─── Local types ──────────────────────────────────────────────────────────────

interface AllowanceRow { name: string; amount: number; taxable: boolean; }
interface DeductionRow { name: string; amount: number; preTax: boolean; }

interface FormFields {
  staffId: string;
  department: string;
  basicSalaryRands: string;
  taxNumber: string;
  uifNumber: string;
  dateOfBirth: string;
  startDate: string;
  reason: string;
}

interface SalaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: SalaryRecord | null;
  staffList: { id: string; firstName: string; lastName: string }[];
  onSubmit: (data: CreateSalaryPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<SalaryRecord> & { reason?: string }) => Promise<void>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_BANK: BankDetails = {
  bankName: '',
  accountNumber: '',
  branchCode: '',
  accountType: 'cheque',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SalaryFormDialog({
  open, onOpenChange, salary, staffList, onSubmit, onUpdate,
}: SalaryFormDialogProps) {
  const isEdit = salary !== null;

  const [allowances, setAllowances] = useState<AllowanceRow[]>([]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails>(DEFAULT_BANK);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormFields>({
    defaultValues: {
      staffId: '',
      department: '',
      basicSalaryRands: '',
      taxNumber: '',
      uifNumber: '',
      dateOfBirth: '',
      startDate: '',
      reason: '',
    },
  });

  // Reset form when dialog opens or salary changes
  useEffect(() => {
    if (!open) return;

    if (salary) {
      reset({
        staffId: salary.staffId.id,
        department: salary.department ?? '',
        basicSalaryRands: (salary.basicSalary / 100).toFixed(2),
        taxNumber: salary.taxNumber ?? '',
        uifNumber: salary.uifNumber ?? '',
        dateOfBirth: salary.dateOfBirth,
        startDate: salary.startDate,
        reason: '',
      });
      setAllowances(salary.allowances as AllowanceRow[]);
      setDeductions(salary.deductions as DeductionRow[]);
      setBankDetails(salary.bankDetails);
    } else {
      reset({
        staffId: '',
        department: '',
        basicSalaryRands: '',
        taxNumber: '',
        uifNumber: '',
        dateOfBirth: '',
        startDate: '',
        reason: '',
      });
      setAllowances([]);
      setDeductions([]);
      setBankDetails(DEFAULT_BANK);
    }
  }, [open, salary, reset]);

  const handleFormSubmit = async (fields: FormFields) => {
    setSubmitting(true);
    try {
      const basicSalary = Math.round(parseFloat(fields.basicSalaryRands || '0') * 100);

      if (isEdit && onUpdate) {
        await onUpdate(salary.id, {
          basicSalary,
          allowances: allowances as Allowance[],
          deductions: deductions as DeductionItem[],
          bankDetails,
          department: fields.department || null,
          taxNumber: fields.taxNumber || null,
          uifNumber: fields.uifNumber || null,
          dateOfBirth: fields.dateOfBirth,
          startDate: fields.startDate,
          reason: fields.reason || undefined,
        });
      } else {
        const payload: CreateSalaryPayload = {
          staffId: fields.staffId,
          basicSalary,
          allowances: allowances as Allowance[],
          deductions: deductions as DeductionItem[],
          bankDetails,
          department: fields.department || null,
          taxNumber: fields.taxNumber || null,
          uifNumber: fields.uifNumber || null,
          dateOfBirth: fields.dateOfBirth,
          startDate: fields.startDate,
        };
        await onSubmit(payload);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to save salary record', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Salary Record' : 'Add Salary Record'}</DialogTitle>
        </DialogHeader>

        <form
          id="salary-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto py-4 space-y-6 pr-1"
        >
          {/* Section 1 — Staff & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isEdit && (
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="staffId">
                  Staff Member <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(v: unknown) => setValue('staffId', v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.staffId && (
                  <p className="text-xs text-destructive">{errors.staffId.message}</p>
                )}
              </div>
            )}

            {isEdit && (
              <div className="space-y-1 sm:col-span-2">
                <Label>Staff Member</Label>
                <p className="text-sm font-medium">
                  {salary?.staffId.firstName} {salary?.staffId.lastName}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="department">Department</Label>
              <Input id="department" placeholder="e.g. Mathematics" {...register('department')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="basicSalaryRands">
                Basic Salary (R) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="basicSalaryRands"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('basicSalaryRands', { required: 'Basic salary is required' })}
              />
              {errors.basicSalaryRands && (
                <p className="text-xs text-destructive">{errors.basicSalaryRands.message}</p>
              )}
            </div>
          </div>

          {/* Section 2 — Allowances */}
          <AllowanceDeductionEditor
            label="Allowances"
            items={allowances}
            onChange={(rows) => setAllowances(rows as AllowanceRow[])}
          />

          {/* Section 3 — Deductions */}
          <AllowanceDeductionEditor
            label="Deductions"
            items={deductions}
            onChange={(rows) => setDeductions(rows as DeductionRow[])}
          />

          {/* Section 4 — Bank Details */}
          <BankDetailsForm values={bankDetails} onChange={setBankDetails} />

          {/* Section 5 — Tax & Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="taxNumber">Tax Number</Label>
              <Input id="taxNumber" placeholder="SARS tax number" {...register('taxNumber')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="uifNumber">UIF Number</Label>
              <Input id="uifNumber" placeholder="UIF reference" {...register('uifNumber')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth', { required: 'Date of birth is required' })}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="startDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>
          </div>

          {/* Section 6 — Change Reason (edit only) */}
          {isEdit && (
            <div className="space-y-1">
              <Label htmlFor="reason">Reason for Change</Label>
              <Textarea
                id="reason"
                placeholder="Describe why this salary record is being updated..."
                rows={3}
                {...register('reason')}
              />
            </div>
          )}
        </form>

        <DialogFooter className="pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="salary-form" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Salary Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

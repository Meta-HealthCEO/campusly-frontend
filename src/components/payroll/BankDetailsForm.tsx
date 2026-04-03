'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BankDetails, AccountType } from '@/types';

const SA_BANKS = [
  'FNB', 'Standard Bank', 'ABSA', 'Nedbank', 'Capitec',
  'Investec', 'African Bank', 'TymeBank',
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cheque', label: 'Cheque' },
  { value: 'savings', label: 'Savings' },
  { value: 'transmission', label: 'Transmission' },
];

interface BankDetailsFormProps {
  values: BankDetails;
  onChange: (values: BankDetails) => void;
}

export function BankDetailsForm({ values, onChange }: BankDetailsFormProps) {
  const update = (field: keyof BankDetails, value: string) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Bank Details</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Bank Name <span className="text-destructive">*</span></Label>
          <Select value={values.bankName} onValueChange={(v: unknown) => update('bankName', v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {SA_BANKS.map((bank) => (
                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account Type <span className="text-destructive">*</span></Label>
          <Select value={values.accountType} onValueChange={(v: unknown) => update('accountType', v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account Number <span className="text-destructive">*</span></Label>
          <Input
            value={values.accountNumber}
            onChange={(e) => update('accountNumber', e.target.value)}
            placeholder="Account number"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Branch Code <span className="text-destructive">*</span></Label>
          <Input
            value={values.branchCode}
            onChange={(e) => update('branchCode', e.target.value)}
            placeholder="Branch code"
          />
        </div>
      </div>
    </div>
  );
}

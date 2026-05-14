'use client';

import { Mail, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type DeliveryMode = 'email' | 'slip';

interface StudentDeliveryModeToggleProps {
  value: DeliveryMode;
  onChange: (value: DeliveryMode) => void;
}

export function StudentDeliveryModeToggle({ value, onChange }: StudentDeliveryModeToggleProps) {
  return (
    <div className="space-y-2">
      <Label>Delivery method</Label>
      <div
        role="radiogroup"
        aria-label="Delivery method"
        className="inline-flex w-full overflow-hidden rounded-md border p-0.5 sm:w-auto"
      >
        <Button
          type="button"
          variant={value === 'email' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 sm:flex-initial inline-flex items-center gap-1.5"
          onClick={() => onChange('email')}
          aria-pressed={value === 'email'}
        >
          <Mail className="h-3.5 w-3.5" /> Email invite
        </Button>
        <Button
          type="button"
          variant={value === 'slip' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 sm:flex-initial inline-flex items-center gap-1.5"
          onClick={() => onChange('slip')}
          aria-pressed={value === 'slip'}
        >
          <Printer className="h-3.5 w-3.5" /> Printable slip
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {value === 'email'
          ? "We'll email the student their login details."
          : "Generate a printable slip with the student's login details (no email sent)."}
      </p>
    </div>
  );
}

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CurriculumPlan } from '@/types/curriculum';

interface PlanSelectorDropdownProps {
  plans: CurriculumPlan[];
  selectedId: string;
  onChange: (id: string) => void;
}

function getPlanLabel(plan: CurriculumPlan): string {
  return `${plan.subjectId.name} — ${plan.gradeId.name} Term ${plan.term}`;
}

export function PlanSelectorDropdown({ plans, selectedId, onChange }: PlanSelectorDropdownProps) {
  return (
    <Select value={selectedId} onValueChange={(val: unknown) => onChange(val as string)}>
      <SelectTrigger className="w-full sm:w-72">
        <SelectValue placeholder="Select a curriculum plan" />
      </SelectTrigger>
      <SelectContent>
        {plans.map((plan) => (
          <SelectItem key={plan.id} value={plan.id}>
            {getPlanLabel(plan)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

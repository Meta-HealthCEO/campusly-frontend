'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { MODULES } from '@/lib/constants';
import type { WizardData } from './types';

interface Props {
  data: WizardData;
  toggleModule: (id: string) => void;
}

export function OnboardStep2({ data, toggleModule }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select which modules to enable for this school
      </p>
      {MODULES.map((mod) => (
        <div key={mod.id} className="flex items-center gap-3 rounded-lg border p-3">
          <Checkbox
            checked={data.modules.includes(mod.id)}
            onCheckedChange={() => toggleModule(mod.id)}
          />
          <div>
            <p className="text-sm font-medium">{mod.name}</p>
            <p className="text-xs text-muted-foreground">{mod.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

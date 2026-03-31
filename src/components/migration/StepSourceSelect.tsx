'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Database } from 'lucide-react';
import type { SourceSystem } from '@/types/migration';
import { SOURCE_SYSTEM_LABELS, SOURCE_SYSTEM_DESCRIPTIONS } from '@/types/migration';

const SOURCE_SYSTEMS: SourceSystem[] = ['d6_connect', 'karri', 'adam', 'schooltool', 'excel', 'csv'];

interface StepSourceSelectProps {
  onSelect: (system: SourceSystem) => void;
}

export function StepSourceSelect({ onSelect }: StepSourceSelectProps) {
  const [selected, setSelected] = useState<SourceSystem | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Source System</CardTitle>
        <CardDescription>
          Choose the system your school data is coming from. Known South African platforms have
          pre-configured field mappings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCE_SYSTEMS.map((system) => (
            <button
              key={system}
              type="button"
              onClick={() => setSelected(system)}
              className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                selected === system
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-medium">{SOURCE_SYSTEM_LABELS[system]}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {SOURCE_SYSTEM_DESCRIPTIONS[system]}
              </p>
            </button>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            disabled={!selected}
            onClick={() => selected && onSelect(selected)}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

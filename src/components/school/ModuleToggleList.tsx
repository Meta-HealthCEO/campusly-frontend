'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MODULES } from '@/lib/constants';

interface ModuleToggleListProps {
  enabledModules: string[];
  onToggle: (moduleId: string, enabled: boolean) => Promise<void>;
  disabled?: boolean;
}

export function ModuleToggleList({
  enabledModules,
  onToggle,
  disabled = false,
}: ModuleToggleListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Configuration</CardTitle>
        <CardDescription>Enable or disable school modules</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {MODULES.map((mod) => {
            const isEnabled = enabledModules.includes(mod.id);
            return (
              <div
                key={mod.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{mod.name}</p>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`module-${mod.id}`} className="sr-only">
                    {mod.name}
                  </Label>
                  <Switch
                    id={`module-${mod.id}`}
                    checked={isEnabled}
                    disabled={disabled}
                    onCheckedChange={(checked) => {
                      void onToggle(mod.id, checked);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

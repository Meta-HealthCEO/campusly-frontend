'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassroomCodeCard } from '@/components/shared/ClassroomCodeCard';
import { joinMessage, type ClassOption } from '@/lib/onboarding';
import type { CreatedClass } from '@/hooks/useTeacherOnboarding';

interface FirstClassStepProps {
  options: ClassOption[];
  loading: boolean;
  creating: boolean;
  created: CreatedClass | null;
  onCreate: (name: string, option: ClassOption) => void;
}

/** Step 2: name a class for one grade and subject; then share its join code. */
export function FirstClassStep({ options, loading, creating, created, onCreate }: FirstClassStepProps) {
  const [key, setKey] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const option = options.find((o: ClassOption) => o.key === key) ?? options[0] ?? null;
  const shownName = name ?? option?.label ?? '';

  if (created) {
    const copyMessage = async (): Promise<void> => {
      try {
        await navigator.clipboard.writeText(joinMessage(created.classroomCode, window.location.origin));
        toast.success('Join message copied — paste it to your learners');
      } catch (err: unknown) {
        console.error('Copy failed', err);
        toast.error("Couldn't copy. Select the code and copy it yourself.");
      }
    };
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{created.name} is ready</h2>
          <p className="text-sm text-muted-foreground">
            Send learners the join message: its link opens sign-up with this code filled in.
          </p>
        </div>
        <ClassroomCodeCard classId={created.id} className={created.name} initialCode={created.classroomCode || undefined} />
        <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => void copyMessage()} disabled={!created.classroomCode}>
          <Copy className="h-4 w-4" aria-hidden /> Copy join message
        </Button>
      </div>
    );
  }

  if (loading) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Getting your grades and subjects…</p>;
  }
  if (!option) {
    return <p className="text-sm text-muted-foreground">Pick at least one grade and subject in step 1 first.</p>;
  }

  return (
    <form
      id="first-class-form"
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); if (shownName.trim()) onCreate(shownName.trim(), option); }}
    >
      <div>
        <h2 className="text-lg font-semibold">Your first class</h2>
        <p className="text-sm text-muted-foreground">A class is a group of learners you teach one subject to.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="first-class-subject">Grade and subject <span className="text-destructive">*</span></Label>
        <Select value={option.key} onValueChange={(v: unknown) => { setKey(String(v)); setName(null); }} disabled={creating}>
          <SelectTrigger id="first-class-subject" className="min-h-11 w-full">
            <SelectValue>{option.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o: ClassOption) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="first-class-name">Class name <span className="text-destructive">*</span></Label>
        <Input id="first-class-name" value={shownName} onChange={(e) => setName(e.target.value)} maxLength={50} className="min-h-11 w-full" disabled={creating} />
      </div>
    </form>
  );
}

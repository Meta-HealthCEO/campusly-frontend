'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { GallerySection, Specimen } from './GallerySection';
import { OverlayStates } from './OverlayStates';

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
const TEXT_SIZES = ['xs', 'sm', 'default', 'lg'] as const;
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const;
const STATES = ['rest', 'disabled', 'loading'] as const;
const FORCED_FOCUS = 'ring-2 ring-ring ring-offset-2 ring-offset-background';

type Variant = (typeof VARIANTS)[number];
type State = (typeof STATES)[number];

function ButtonRow({ variant, state }: { variant: Variant; state: State }) {
  const busy = state === 'loading';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-caption text-muted-foreground sm:w-16">{state}</span>
      {TEXT_SIZES.map((size) => (
        <Button key={size} variant={variant} size={size} disabled={state !== 'rest'}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {size === 'default' ? 'Save' : size}
        </Button>
      ))}
      {ICON_SIZES.map((size) => (
        <Button key={size} variant={variant} size={size} disabled={state !== 'rest'} aria-label={`Add (${variant}, ${size})`}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
        </Button>
      ))}
    </div>
  );
}

function Buttons() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {VARIANTS.map((variant: Variant) => (
        <Specimen key={variant} title={variant === 'default' ? 'default (primary)' : variant === 'outline' ? 'outline (secondary)' : variant}>
          <div className="space-y-3">
            {STATES.map((state: State) => <ButtonRow key={state} variant={variant} state={state} />)}
          </div>
        </Specimen>
      ))}
      <Specimen title="focus (forced); hover is live" className="lg:col-span-2">
        <div className="flex flex-wrap gap-3">
          {VARIANTS.map((variant: Variant) => (
            <Button key={variant} variant={variant} className={FORCED_FOCUS}>{variant}</Button>
          ))}
        </div>
      </Specimen>
    </div>
  );
}

function FormControls() {
  const [volume, setVolume] = useState<number[]>([40]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Specimen title="Input">
        <div className="space-y-1.5">
          <Label htmlFor="g-name">Class name <span className="text-destructive">*</span></Label>
          <Input id="g-name" placeholder="e.g. Grade 10 A" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-name-off">Disabled</Label>
          <Input id="g-name-off" defaultValue="Grade 11 B" disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-email">Invalid</Label>
          <Input id="g-email" defaultValue="lindiwe@" aria-invalid="true" aria-describedby="g-email-error" />
          <p id="g-email-error" className="text-xs text-destructive">Enter a full email address.</p>
        </div>
      </Specimen>
      <Specimen title="Textarea and select">
        <div className="space-y-1.5">
          <Label htmlFor="g-notes">Notes for the class</Label>
          <Textarea id="g-notes" placeholder="What should they bring on Monday?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-notes-bad">Invalid</Label>
          <Textarea id="g-notes-bad" defaultValue="x" aria-invalid="true" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-grade">Grade</Label>
          <Select defaultValue="12">
            <SelectTrigger id="g-grade" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Grade 10</SelectItem>
              <SelectItem value="11">Grade 11</SelectItem>
              <SelectItem value="12">Grade 12</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Specimen>
      <Specimen title="Checkbox, radio and switch">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"><Checkbox defaultChecked /> Email me the marks</label>
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"><Checkbox /> Show the memo</label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground md:min-h-0"><Checkbox disabled /> Disabled</label>
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"><Checkbox aria-invalid="true" /> Invalid</label>
        </div>
        <RadioGroup aria-label="Term" defaultValue="t3" className="grid gap-2 sm:grid-cols-3">
          {['t1', 't2', 't3'].map((t: string, i: number) => (
            <label key={t} className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"><RadioGroupItem value={t} /> Term {i + 1}</label>
          ))}
        </RadioGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"><Switch defaultChecked /> Reminders on</label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground md:min-h-0"><Switch disabled /> Disabled</label>
        </div>
      </Specimen>
      <Specimen title="Slider and tabs">
        <label className="grid gap-3 text-sm">
          <span className="flex justify-between"><span>Pass mark</span><span className="font-heading font-semibold tabular-nums">{volume[0]}%</span></span>
          <Slider value={volume} onValueChange={setVolume} />
        </label>
        <Tabs defaultValue="week">
          <TabsList>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="term">This term</TabsTrigger>
            <TabsTrigger value="year" disabled>Year</TabsTrigger>
          </TabsList>
          <TabsContent value="week" className="pt-3 text-sm text-muted-foreground">Tabs are underlined (both list variants); the active tab carries a 2px cobalt rule.</TabsContent>
          <TabsContent value="term" className="pt-3 text-sm text-muted-foreground">The second tab.</TabsContent>
        </Tabs>
      </Specimen>
    </div>
  );
}

/** Spec §4: every control in rest, disabled, loading, invalid and focus states, in the current theme. */
export function ControlStates() {
  return (
    <GallerySection
      id="controls"
      index="03"
      title="Controls"
      description="Primary is the one filled cobalt button per screen; outline is the secondary. Tab through to see the 2px focus ring."
    >
      <Buttons />
      <FormControls />
      <OverlayStates />
    </GallerySection>
  );
}

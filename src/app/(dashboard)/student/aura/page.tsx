'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Shuffle, Save, ArrowRight, Sparkles, Flame, Crown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AdventurerAvatar, type AdventurerLook } from '@/components/student/AdventurerAvatar';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

// ─── Catalog ─────────────────────────────────────────────────────────────────
// Curated subsets of DiceBear Adventurer variants. Full set is much larger;
// these are the most distinct so the picker stays scannable.

const HAIR_OPTIONS = [
  'short01', 'short05', 'short10', 'short15', 'short19',
  'long03', 'long10', 'long16', 'long20', 'long26',
];
const EYE_OPTIONS = ['variant01', 'variant05', 'variant09', 'variant14', 'variant19', 'variant24'];
const BROW_OPTIONS = ['variant01', 'variant05', 'variant08', 'variant11', 'variant15'];
const MOUTH_OPTIONS = ['variant01', 'variant05', 'variant10', 'variant15', 'variant20', 'variant26'];
const GLASSES_OPTIONS = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05'];
const EARRING_OPTIONS = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06'];
const FEATURE_OPTIONS = ['birthmark', 'blush', 'freckles', 'mustache'];

const SKIN_COLORS = [
  { key: '9e5622', label: 'Deep' },
  { key: '763900', label: 'Rich' },
  { key: 'ac6651', label: 'Bronze' },
  { key: 'ecad80', label: 'Warm' },
  { key: 'f2d3b1', label: 'Light' },
  { key: '85b4cb', label: 'Cosmic' },
];
const HAIR_COLORS = [
  '0e0e0e', '3eac2c', '562306', '6a4e35', '85c2c6',
  'ab2a18', 'ac6511', 'cb6820', 'dba3be', 'f7c585',
];
const BG_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf',
  '0f172a', '1e1b4b', 'f97316',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dripScore(look: AdventurerLook): number {
  let score = 50;
  if (look.glassesProbability) score += 12;
  if (look.earringsProbability) score += 10;
  if (look.featuresProbability) score += 8;
  if (look.backgroundColor && ['0f172a', '1e1b4b', 'f97316'].includes(look.backgroundColor)) score += 12;
  if (look.hairColor && ['ab2a18', '3eac2c', 'dba3be', 'cb6820', '85c2c6'].includes(look.hairColor)) score += 8;
  return Math.min(99, score);
}

function dripLabel(score: number): string {
  if (score >= 90) return 'Untouchable';
  if (score >= 80) return 'Main character';
  if (score >= 70) return 'Cooking';
  if (score >= 60) return 'Solid drip';
  return 'Warming up';
}

// ─── Pickers ─────────────────────────────────────────────────────────────────

interface VariantPickerProps {
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
  baseLook: AdventurerLook;
  category: keyof AdventurerLook;
  seed: string;
}

function VariantPicker({ value, options, onChange, baseLook, category, seed }: VariantPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {options.map((opt) => {
        const isActive = value === opt;
        const previewLook = { ...baseLook, [category]: opt };
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-xl border-2 bg-muted/30 transition-all',
              isActive
                ? 'border-primary ring-2 ring-primary/30 scale-[1.02]'
                : 'border-transparent hover:border-primary/40',
            )}
            aria-pressed={isActive}
            aria-label={`Variant ${opt}`}
          >
            <AdventurerAvatar
              seed={seed}
              look={previewLook}
              size={112}
              aura="none"
              className="!h-full !w-full"
            />
            {isActive && (
              <div className="absolute top-1.5 right-1.5 rounded-full bg-primary p-1 text-primary-foreground shadow-md">
                <Sparkles className="h-3 w-3" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ColorPickerProps {
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
  labelFor?: (color: string) => string;
}

function ColorPicker({ value, options, onChange, labelFor }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((color) => {
        const isActive = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            style={{ backgroundColor: `#${color}` }}
            className={cn(
              'h-11 w-11 rounded-full border-2 transition-all',
              isActive
                ? 'border-primary ring-4 ring-primary/20 scale-110'
                : 'border-border/40 hover:scale-105',
            )}
            aria-label={labelFor ? labelFor(color) : `Color ${color}`}
            aria-pressed={isActive}
          />
        );
      })}
    </div>
  );
}

function ToggleRow({
  on, onChange, onLabel, offLabel,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={on ? 'default' : 'outline'}
        onClick={() => onChange(true)}
        className="flex-1"
      >
        {onLabel}
      </Button>
      <Button
        size="sm"
        variant={!on ? 'default' : 'outline'}
        onClick={() => onChange(false)}
        className="flex-1"
      >
        {offLabel}
      </Button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const DEFAULT_LOOK: AdventurerLook = {
  hair: 'short15',
  eyes: 'variant14',
  eyebrows: 'variant05',
  mouth: 'variant10',
  skinColor: 'ecad80',
  hairColor: '562306',
  backgroundColor: 'b6e3f4',
  backgroundType: 'gradientLinear',
  glassesProbability: 0,
  earringsProbability: 0,
  featuresProbability: 0,
};

export default function AuraStudioPage() {
  const { user } = useAuthStore();
  const seed = user?.id ?? 'demo';
  const [look, setLook] = useState<AdventurerLook>(DEFAULT_LOOK);

  const update = useCallback((partial: Partial<AdventurerLook>) => {
    setLook((prev) => ({ ...prev, ...partial }));
  }, []);

  const randomize = useCallback(() => {
    setLook({
      hair: pick(HAIR_OPTIONS),
      eyes: pick(EYE_OPTIONS),
      eyebrows: pick(BROW_OPTIONS),
      mouth: pick(MOUTH_OPTIONS),
      glasses: pick(GLASSES_OPTIONS),
      glassesProbability: Math.random() > 0.5 ? 100 : 0,
      earrings: pick(EARRING_OPTIONS),
      earringsProbability: Math.random() > 0.4 ? 100 : 0,
      features: pick(FEATURE_OPTIONS),
      featuresProbability: Math.random() > 0.7 ? 100 : 0,
      skinColor: pick(SKIN_COLORS).key,
      hairColor: pick(HAIR_COLORS),
      backgroundColor: pick(BG_COLORS),
      backgroundType: 'gradientLinear',
    });
  }, []);

  const score = dripScore(look);
  const label = dripLabel(score);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aura Studio"
        description="Build your look. Earn coins, unlock fits, run the school."
      >
        <Link href="/student/aura/locker">
          <Button variant="outline" size="sm">
            My Locker
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Avatar showcase */}
        <Card className="lg:col-span-5 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background">
          <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-8">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 -m-8 animate-pulse rounded-full bg-gradient-to-br from-primary/40 via-fuchsia-400/30 to-amber-300/40 blur-3xl" aria-hidden />
              <AdventurerAvatar
                seed={seed}
                look={look}
                size={320}
                aura="radiant"
                className="relative"
              />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-2xl font-bold tracking-tight">
                {user?.firstName ?? 'You'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3.5 w-3.5" />
                  Aura Lv 3
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Drip {score}
                </Badge>
                <Badge className="gap-1 bg-gradient-to-r from-fuchsia-500 to-amber-500 text-white border-0">
                  {label}
                </Badge>
              </div>
            </div>

            <div className="flex w-full gap-2">
              <Button onClick={randomize} variant="outline" className="flex-1">
                <Shuffle className="mr-2 h-4 w-4" />
                Shuffle
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-primary to-fuchsia-600 hover:opacity-90">
                <Save className="mr-2 h-4 w-4" />
                Save Look
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Picker */}
        <Card className="lg:col-span-7">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="hair">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="hair">Hair</TabsTrigger>
                <TabsTrigger value="face">Face</TabsTrigger>
                <TabsTrigger value="extras">Extras</TabsTrigger>
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="bg">Vibe</TabsTrigger>
              </TabsList>

              <TabsContent value="hair" className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Hair style</h3>
                <VariantPicker
                  value={look.hair}
                  options={HAIR_OPTIONS}
                  onChange={(v) => update({ hair: v })}
                  baseLook={look}
                  category="hair"
                  seed={seed}
                />
              </TabsContent>

              <TabsContent value="face" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Eyes</h3>
                  <VariantPicker
                    value={look.eyes}
                    options={EYE_OPTIONS}
                    onChange={(v) => update({ eyes: v })}
                    baseLook={look}
                    category="eyes"
                    seed={seed}
                  />
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Brows</h3>
                  <VariantPicker
                    value={look.eyebrows}
                    options={BROW_OPTIONS}
                    onChange={(v) => update({ eyebrows: v })}
                    baseLook={look}
                    category="eyebrows"
                    seed={seed}
                  />
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Mouth</h3>
                  <VariantPicker
                    value={look.mouth}
                    options={MOUTH_OPTIONS}
                    onChange={(v) => update({ mouth: v })}
                    baseLook={look}
                    category="mouth"
                    seed={seed}
                  />
                </section>
              </TabsContent>

              <TabsContent value="extras" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Glasses</h3>
                  <ToggleRow
                    on={(look.glassesProbability ?? 0) > 0}
                    onChange={(on) => update({ glassesProbability: on ? 100 : 0 })}
                    onLabel="Wear glasses"
                    offLabel="No glasses"
                  />
                  {(look.glassesProbability ?? 0) > 0 && (
                    <VariantPicker
                      value={look.glasses}
                      options={GLASSES_OPTIONS}
                      onChange={(v) => update({ glasses: v })}
                      baseLook={look}
                      category="glasses"
                      seed={seed}
                    />
                  )}
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Earrings</h3>
                  <ToggleRow
                    on={(look.earringsProbability ?? 0) > 0}
                    onChange={(on) => update({ earringsProbability: on ? 100 : 0 })}
                    onLabel="Wear earrings"
                    offLabel="No earrings"
                  />
                  {(look.earringsProbability ?? 0) > 0 && (
                    <VariantPicker
                      value={look.earrings}
                      options={EARRING_OPTIONS}
                      onChange={(v) => update({ earrings: v })}
                      baseLook={look}
                      category="earrings"
                      seed={seed}
                    />
                  )}
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Features</h3>
                  <ToggleRow
                    on={(look.featuresProbability ?? 0) > 0}
                    onChange={(on) => update({ featuresProbability: on ? 100 : 0 })}
                    onLabel="Add feature"
                    offLabel="None"
                  />
                  {(look.featuresProbability ?? 0) > 0 && (
                    <VariantPicker
                      value={look.features}
                      options={FEATURE_OPTIONS}
                      onChange={(v) => update({ features: v })}
                      baseLook={look}
                      category="features"
                      seed={seed}
                    />
                  )}
                </section>
              </TabsContent>

              <TabsContent value="color" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skin</h3>
                  <ColorPicker
                    value={look.skinColor}
                    options={SKIN_COLORS.map((c) => c.key)}
                    onChange={(v) => update({ skinColor: v })}
                    labelFor={(c) => SKIN_COLORS.find((x) => x.key === c)?.label ?? c}
                  />
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Hair color</h3>
                  <ColorPicker
                    value={look.hairColor}
                    options={HAIR_COLORS}
                    onChange={(v) => update({ hairColor: v })}
                  />
                </section>
              </TabsContent>

              <TabsContent value="bg" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Background</h3>
                  <ColorPicker
                    value={look.backgroundColor}
                    options={BG_COLORS}
                    onChange={(v) => update({ backgroundColor: v })}
                  />
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Background type</h3>
                  <ToggleRow
                    on={look.backgroundType === 'gradientLinear'}
                    onChange={(on) => update({ backgroundType: on ? 'gradientLinear' : 'solid' })}
                    onLabel="Gradient"
                    offLabel="Solid"
                  />
                </section>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Avatars by{' '}
        <a href="https://www.dicebear.com/styles/adventurer/" target="_blank" rel="noopener noreferrer" className="underline">
          DiceBear Adventurer
        </a>{' '}
        · CC BY 4.0 · Lisa Wischofsky
      </p>
    </div>
  );
}

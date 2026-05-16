'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Crown, Flame, Shuffle, Sparkles, Save,
  Shirt, Glasses, Smile, Palette, Wand2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AvataaarsAvatar, type AvataaarsLook } from '@/components/student/AvataaarsAvatar';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

// ─── Catalog (curated, scannable subsets) ──────────────────────────────────

const TOP_OPTIONS = [
  'shortFlat', 'shortCurly', 'shortRound', 'shortWaved', 'shaggy',
  'bigHair', 'curly', 'bun', 'dreads', 'fro',
  'longButNotTooLong', 'miaWallace', 'straight01', 'theCaesar', 'shavedSides',
  'hat', 'winterHat02', 'turban', 'hijab', 'froBand',
];
const EYE_OPTIONS = ['default', 'happy', 'wink', 'squint', 'surprised', 'hearts', 'side', 'eyeRoll'];
const BROW_OPTIONS = ['default', 'raisedExcited', 'sadConcerned', 'flatNatural', 'upDown'];
const MOUTH_OPTIONS = ['smile', 'default', 'serious', 'twinkle', 'tongue', 'eating', 'screamOpen'];
const CLOTHING_OPTIONS = [
  'hoodie', 'graphicShirt', 'blazerAndShirt', 'blazerAndSweater',
  'collarAndSweater', 'overall', 'shirtCrewNeck', 'shirtVNeck', 'shirtScoopNeck',
];
const ACCESSORY_OPTIONS = ['prescription02', 'round', 'sunglasses', 'wayfarers', 'kurt', 'eyepatch'];
const GRAPHIC_OPTIONS = ['bear', 'diamond', 'skull', 'pizza', 'hola', 'resist', 'bat', 'deer', 'cumbia', 'skullOutline'];
const FACIAL_HAIR_OPTIONS = ['beardLight', 'beardMedium', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'];

const SKIN_COLORS = [
  { key: '614335', label: 'Deep' },
  { key: 'ae5d29', label: 'Rich' },
  { key: 'd08b5b', label: 'Bronze' },
  { key: 'edb98a', label: 'Warm' },
  { key: 'fd9841', label: 'Tan' },
  { key: 'ffdbb4', label: 'Light' },
  { key: 'f8d25c', label: 'Cosmic' },
];
const HAIR_COLORS = [
  '2c1b18', '4a312c', 'a55728', 'b58143', 'd6b370',
  'ecdcbf', 'c93305', 'e8e1e1', '724133', 'b53fc9',
];
const CLOTHES_COLORS = [
  '262e33', '65c9ff', '5199e4', '929598', '3c4f5c',
  'ff488e', 'ff5c5c', 'ffafb9', 'ffffb1', 'ffffff',
  '25557c', 'a7ffc4', 'd0c3a3',
];
const BG_COLORS = [
  'ffd5dc', 'b6e3f4', 'c0aede', 'd1d4f9', 'ffdfbf',
  '0f172a', '1e1b4b', 'f97316', 'fb7185', 'a855f7',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const HOT_BACKGROUNDS = ['0f172a', '1e1b4b', 'f97316', 'fb7185', 'a855f7'];
const HOT_HAIR = ['b53fc9', 'c93305', 'a55728'];
const RARE_TOPS = ['fro', 'hijab', 'turban', 'froBand', 'bigHair', 'dreads'];
const STATEMENT_CLOTHING = ['hoodie', 'graphicShirt', 'overall'];

function dripScore(look: AvataaarsLook): number {
  let score = 40;
  if (look.accessoriesProbability) score += 12;
  if (look.facialHairProbability) score += 6;
  if (look.backgroundColor && HOT_BACKGROUNDS.includes(look.backgroundColor)) score += 14;
  if (look.hairColor && HOT_HAIR.includes(look.hairColor)) score += 10;
  if (look.top && RARE_TOPS.includes(look.top)) score += 8;
  if (look.clothing && STATEMENT_CLOTHING.includes(look.clothing)) score += 6;
  if (look.clothing === 'graphicShirt' && look.clothingGraphic) score += 4;
  return Math.min(99, score);
}

function dripLabel(score: number): string {
  if (score >= 90) return 'Untouchable';
  if (score >= 80) return 'Main character';
  if (score >= 70) return 'Cooking';
  if (score >= 60) return 'Solid drip';
  return 'Warming up';
}

const STORAGE_KEY_PREFIX = 'campusly:aura-look:';

// ─── Pickers ────────────────────────────────────────────────────────────────

interface VariantPickerProps {
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
  baseLook: AvataaarsLook;
  category: keyof AvataaarsLook;
  seed: string;
}

function VariantPicker({ value, options, onChange, baseLook, category, seed }: VariantPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {options.map((opt) => {
        const isActive = value === opt;
        // Ensure picker tiles show the variant even if its probability is off
        // in the base look (e.g. accessories off but you're picking glasses).
        const probabilityOverride: Partial<AvataaarsLook> = {};
        if (category === 'accessories') probabilityOverride.accessoriesProbability = 100;
        if (category === 'facialHair') probabilityOverride.facialHairProbability = 100;
        const previewLook: AvataaarsLook = { ...baseLook, ...probabilityOverride, [category]: opt };
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
            aria-label={opt}
          >
            <AvataaarsAvatar
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

const DEFAULT_LOOK: AvataaarsLook = {
  top: 'shortWaved',
  hairColor: '4a312c',
  eyes: 'default',
  eyebrows: 'default',
  mouth: 'smile',
  clothing: 'hoodie',
  clothesColor: '65c9ff',
  skinColor: 'edb98a',
  backgroundColor: 'b6e3f4',
  accessoriesProbability: 0,
  facialHairProbability: 0,
};

export default function AuraStudioPage() {
  const { user } = useAuthStore();
  const seed = user?.id ?? 'demo';
  const storageKey = user ? `${STORAGE_KEY_PREFIX}${user.id}` : null;

  const [look, setLook] = useState<AvataaarsLook>(DEFAULT_LOOK);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage. Per-user key so devices shared between siblings
  // don't crosstalk.
  useEffect(() => {
    setHydrated(true);
    if (!storageKey || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AvataaarsLook;
        setLook({ ...DEFAULT_LOOK, ...parsed });
      } catch {
        // Stored JSON is corrupt; ignore and keep defaults.
      }
    }
  }, [storageKey]);

  const update = useCallback((partial: Partial<AvataaarsLook>) => {
    setLook((prev) => ({ ...prev, ...partial }));
  }, []);

  const randomize = useCallback(() => {
    setLook({
      top: pick(TOP_OPTIONS),
      hairColor: pick(HAIR_COLORS),
      eyes: pick(EYE_OPTIONS),
      eyebrows: pick(BROW_OPTIONS),
      mouth: pick(MOUTH_OPTIONS),
      clothing: pick(CLOTHING_OPTIONS),
      clothesColor: pick(CLOTHES_COLORS),
      clothingGraphic: pick(GRAPHIC_OPTIONS),
      accessories: pick(ACCESSORY_OPTIONS),
      accessoriesProbability: Math.random() > 0.5 ? 100 : 0,
      facialHair: pick(FACIAL_HAIR_OPTIONS),
      facialHairProbability: Math.random() > 0.7 ? 100 : 0,
      skinColor: pick(SKIN_COLORS).key,
      backgroundColor: pick(BG_COLORS),
    });
  }, []);

  const save = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(look));
  }, [look, storageKey]);

  const score = dripScore(look);
  const label = dripLabel(score);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aura Studio"
        description="Build your look. Earn coins, unlock fits, run the school."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Avatar showcase ─────────────────────────────────────── */}
        <Card className="lg:col-span-5 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background">
          {/* Pop-art halftone overlay — gives the card a comic-book texture */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 pointer-events-none [background-image:radial-gradient(currentColor_1.2px,transparent_1.2px)] [background-size:14px_14px] text-primary"
          />
          <CardContent className="relative flex flex-col items-center gap-6 p-6 sm:p-8">
            <div className="relative flex items-center justify-center">
              {/* Pulsing aura halo */}
              <div
                className="absolute inset-0 -m-10 animate-pulse rounded-full bg-gradient-to-br from-primary/40 via-fuchsia-400/35 to-amber-300/40 blur-3xl"
                aria-hidden
              />
              <AvataaarsAvatar
                seed={seed}
                look={look}
                size={320}
                aura="radiant"
                className="relative"
              />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">
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
                <Badge className="gap-1 border-0 bg-gradient-to-r from-fuchsia-500 to-amber-500 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  {label}
                </Badge>
              </div>
            </div>

            <div className="flex w-full gap-2">
              <Button onClick={randomize} variant="outline" className="flex-1">
                <Shuffle className="mr-2 h-4 w-4" />
                Shuffle
              </Button>
              <Button
                onClick={save}
                className="flex-1 bg-gradient-to-r from-primary to-fuchsia-600 hover:opacity-90"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Look
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Picker ──────────────────────────────────────────────── */}
        <Card className="lg:col-span-7">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="hair">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="hair">
                  <Wand2 className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Hair</span>
                </TabsTrigger>
                <TabsTrigger value="face">
                  <Smile className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Face</span>
                </TabsTrigger>
                <TabsTrigger value="fit">
                  <Shirt className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Fit</span>
                </TabsTrigger>
                <TabsTrigger value="extras">
                  <Glasses className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Extras</span>
                </TabsTrigger>
                <TabsTrigger value="vibe">
                  <Palette className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Vibe</span>
                </TabsTrigger>
              </TabsList>

              {/* ── Hair / Top ─────────────────────────────────────── */}
              <TabsContent value="hair" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Hair / Headwear
                  </h3>
                  <VariantPicker
                    value={look.top}
                    options={TOP_OPTIONS}
                    onChange={(v) => update({ top: v, topProbability: 100 })}
                    baseLook={look}
                    category="top"
                    seed={seed}
                  />
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Hair color
                  </h3>
                  <ColorPicker
                    value={look.hairColor}
                    options={HAIR_COLORS}
                    onChange={(v) => update({ hairColor: v })}
                  />
                </section>
              </TabsContent>

              {/* ── Face ──────────────────────────────────────────── */}
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
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skin</h3>
                  <ColorPicker
                    value={look.skinColor}
                    options={SKIN_COLORS.map((c) => c.key)}
                    onChange={(v) => update({ skinColor: v })}
                    labelFor={(c) => SKIN_COLORS.find((x) => x.key === c)?.label ?? c}
                  />
                </section>
              </TabsContent>

              {/* ── Fit (Clothing) ────────────────────────────────── */}
              <TabsContent value="fit" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Outfit
                  </h3>
                  <VariantPicker
                    value={look.clothing}
                    options={CLOTHING_OPTIONS}
                    onChange={(v) => update({ clothing: v })}
                    baseLook={look}
                    category="clothing"
                    seed={seed}
                  />
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Outfit color
                  </h3>
                  <ColorPicker
                    value={look.clothesColor}
                    options={CLOTHES_COLORS}
                    onChange={(v) => update({ clothesColor: v })}
                  />
                </section>
                {look.clothing === 'graphicShirt' && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Tee graphic
                    </h3>
                    <VariantPicker
                      value={look.clothingGraphic}
                      options={GRAPHIC_OPTIONS}
                      onChange={(v) => update({ clothingGraphic: v })}
                      baseLook={look}
                      category="clothingGraphic"
                      seed={seed}
                    />
                  </section>
                )}
              </TabsContent>

              {/* ── Extras (Glasses + Facial Hair) ────────────────── */}
              <TabsContent value="extras" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Glasses
                  </h3>
                  <ToggleRow
                    on={(look.accessoriesProbability ?? 0) > 0}
                    onChange={(on) => update({ accessoriesProbability: on ? 100 : 0 })}
                    onLabel="Wear glasses"
                    offLabel="No glasses"
                  />
                  {(look.accessoriesProbability ?? 0) > 0 && (
                    <VariantPicker
                      value={look.accessories}
                      options={ACCESSORY_OPTIONS}
                      onChange={(v) => update({ accessories: v })}
                      baseLook={look}
                      category="accessories"
                      seed={seed}
                    />
                  )}
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Facial hair
                  </h3>
                  <ToggleRow
                    on={(look.facialHairProbability ?? 0) > 0}
                    onChange={(on) => update({ facialHairProbability: on ? 100 : 0 })}
                    onLabel="Add"
                    offLabel="None"
                  />
                  {(look.facialHairProbability ?? 0) > 0 && (
                    <VariantPicker
                      value={look.facialHair}
                      options={FACIAL_HAIR_OPTIONS}
                      onChange={(v) => update({ facialHair: v })}
                      baseLook={look}
                      category="facialHair"
                      seed={seed}
                    />
                  )}
                </section>
              </TabsContent>

              {/* ── Vibe (Background) ─────────────────────────────── */}
              <TabsContent value="vibe" className="mt-4 space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Background
                  </h3>
                  <ColorPicker
                    value={look.backgroundColor}
                    options={BG_COLORS}
                    onChange={(v) => update({ backgroundColor: v })}
                  />
                </section>
                <p className="text-xs text-muted-foreground">
                  Bold backgrounds (dark navy, sunset orange, hot pink) push your Drip score higher. Try one.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Hydration placeholder — prevents stale flash before localStorage loads */}
      {!hydrated && (
        <div aria-hidden className="sr-only">Loading…</div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Avatars by{' '}
        <a
          href="https://www.dicebear.com/styles/avataaars/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          DiceBear · Avataaars
        </a>{' '}
        by Pablo Stanley · Free for personal & commercial use
      </p>
    </div>
  );
}

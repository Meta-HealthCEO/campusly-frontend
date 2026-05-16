'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Crown, Flame, Shuffle, Sparkles, Save,
  Shirt, Glasses, Smile, Palette, Wand2, Frame,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AvataaarsAvatar, type AvataaarsLook } from '@/components/student/AvataaarsAvatar';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

// ─── Catalog (full sets — avataaars has more than the obvious) ──────────────

const TOP_OPTIONS = [
  'shortFlat', 'shortCurly', 'shortRound', 'shortWaved', 'shortMagnum',
  'shaggy', 'shaggyMullet', 'sides', 'theCaesar', 'theCaesarAndSidePart',
  'bigHair', 'curly', 'bun', 'bob', 'curvy',
  'dreads', 'dreads01', 'dreads02', 'fro', 'froBand',
  'frida', 'frizzle', 'longButNotTooLong', 'miaWallace', 'shavedSides',
  'straight01', 'straight02', 'straightAndStrand',
  'hat', 'winterHat02', 'winterHat03', 'winterHat04',
  'turban', 'hijab',
];
const EYE_OPTIONS = [
  'default', 'happy', 'wink', 'winkWacky', 'squint', 'surprised',
  'hearts', 'side', 'eyeRoll', 'closed', 'cry', 'xDizzy',
];
const BROW_OPTIONS = [
  'default', 'raisedExcited', 'sadConcerned', 'flatNatural', 'upDown',
  'defaultNatural', 'angryNatural', 'frownNatural', 'raisedExcitedNatural', 'sadConcernedNatural', 'unibrowNatural',
];
const MOUTH_OPTIONS = [
  'smile', 'default', 'serious', 'twinkle', 'tongue', 'eating',
  'screamOpen', 'concerned', 'disbelief', 'grimace', 'sad', 'vomit',
];
const CLOTHING_OPTIONS = [
  'hoodie', 'graphicShirt', 'blazerAndShirt', 'blazerAndSweater',
  'collarAndSweater', 'overall', 'shirtCrewNeck', 'shirtVNeck', 'shirtScoopNeck',
];
const ACCESSORY_OPTIONS = ['prescription02', 'prescription01', 'round', 'sunglasses', 'wayfarers', 'kurt', 'eyepatch'];
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
  '0ea5e9', '22c55e', 'eab308',
];
const CLOTHES_COLORS = [
  '262e33', '65c9ff', '5199e4', '929598', '3c4f5c',
  'ff488e', 'ff5c5c', 'ffafb9', 'ffffb1', 'ffffff',
  '25557c', 'a7ffc4', 'd0c3a3',
];

// ─── Frame catalog (CSS-only cosmetic layer over the avatar showcase) ──────

interface FrameDef {
  key: string;
  label: string;
  className: string;
  /** Rarity tier — drives the badge and a small drip bonus. */
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const FRAME_OPTIONS: FrameDef[] = [
  { key: 'none', label: 'None', className: '', rarity: 'common' },
  { key: 'electric', label: 'Electric Blue', className: 'ring-4 ring-sky-400 shadow-[0_0_50px_rgba(56,189,248,0.7)]', rarity: 'common' },
  { key: 'gold', label: 'Gold Pop', className: 'ring-4 ring-amber-300 shadow-[0_0_50px_rgba(251,191,36,0.7)]', rarity: 'rare' },
  { key: 'lime', label: 'Lime Circuit', className: 'ring-4 ring-lime-300 shadow-[0_0_50px_rgba(163,230,53,0.7)]', rarity: 'rare' },
  { key: 'platinum', label: 'Platinum Wave', className: 'ring-4 ring-slate-100 shadow-[0_0_50px_rgba(226,232,240,0.85)]', rarity: 'epic' },
  { key: 'rainbow', label: 'Rainbow Pulse', className: 'ring-4 ring-fuchsia-400 shadow-[0_0_60px_rgba(217,70,239,0.8),0_0_120px_rgba(251,191,36,0.45)] animate-pulse', rarity: 'epic' },
  { key: 'inferno', label: 'Inferno', className: 'ring-4 ring-orange-400 shadow-[0_0_60px_rgba(251,146,60,0.85),0_0_100px_rgba(239,68,68,0.55)]', rarity: 'legendary' },
];

// ─── Scene catalog (background patterns instead of just solid colors) ──────

interface SceneDef {
  key: string;
  label: string;
  /** Inline style applied to the showcase background. */
  style: React.CSSProperties;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** Color for the DiceBear avatar's backgroundColor so it blends. */
  avatarBg?: string;
}

const SCENE_OPTIONS: SceneDef[] = [
  { key: 'soft-pink', label: 'Soft Pink', style: { background: '#ffd5dc' }, rarity: 'common', avatarBg: 'ffd5dc' },
  { key: 'sky', label: 'Sky', style: { background: '#b6e3f4' }, rarity: 'common', avatarBg: 'b6e3f4' },
  { key: 'lilac', label: 'Lilac', style: { background: '#c0aede' }, rarity: 'common', avatarBg: 'c0aede' },
  { key: 'halftone', label: 'Halftone Pop', style: { background: 'radial-gradient(#0f172a 1.2px, transparent 1.2px) 0 0 / 14px 14px, #fde047' }, rarity: 'rare', avatarBg: 'fde047' },
  { key: 'comic', label: 'Comic Burst', style: { background: 'radial-gradient(circle at 25% 25%, #facc15 0 12%, transparent 13%), radial-gradient(circle at 75% 70%, #06b6d4 0 10%, transparent 11%), linear-gradient(135deg,#f97316,#ec4899,#2563eb)' }, rarity: 'epic', avatarBg: 'ec4899' },
  { key: 'sunset', label: 'Mzansi Sunset', style: { background: 'linear-gradient(135deg, #f97316, #facc15, #14b8a6)' }, rarity: 'rare', avatarBg: 'fb923c' },
  { key: 'arcade', label: 'Arcade Pop', style: { background: 'linear-gradient(135deg, #0f172a, #7c3aed, #06b6d4)' }, rarity: 'epic', avatarBg: '7c3aed' },
  { key: 'blueprint', label: 'Blueprint', style: { background: 'linear-gradient(135deg,#0f4c81,#2563eb)' }, rarity: 'rare', avatarBg: '2563eb' },
  { key: 'holo', label: 'Holographic', style: { background: 'linear-gradient(135deg,#fef3c7,#a5f3fc,#f9a8d4,#c4b5fd)' }, rarity: 'legendary', avatarBg: 'f9a8d4' },
  { key: 'midnight', label: 'Midnight', style: { background: 'radial-gradient(ellipse at top, #1e293b 0%, #020617 60%)' }, rarity: 'rare', avatarBg: '0f172a' },
  { key: 'stripes', label: 'Sunset Stripes', style: { background: 'repeating-linear-gradient(135deg, #f97316 0 24px, #fbbf24 24px 48px, #f43f5e 48px 72px)' }, rarity: 'epic', avatarBg: 'f97316' },
  { key: 'lava', label: 'Lava Lamp', style: { background: 'radial-gradient(circle at 20% 80%, #f43f5e 0 18%, transparent 19%), radial-gradient(circle at 80% 30%, #fb923c 0 16%, transparent 17%), radial-gradient(circle at 60% 60%, #facc15 0 12%, transparent 13%), #0f172a' }, rarity: 'legendary', avatarBg: '0f172a' },
];

// ─── Drip score (rarity-aware) ──────────────────────────────────────────────

const HOT_HAIR = ['b53fc9', 'c93305', 'a55728', '0ea5e9', '22c55e', 'eab308'];
const RARE_TOPS = ['fro', 'hijab', 'turban', 'froBand', 'bigHair', 'dreads', 'dreads01', 'dreads02', 'frida'];
const STATEMENT_CLOTHING = ['hoodie', 'graphicShirt', 'overall'];

interface DripInputs {
  look: AvataaarsLook;
  frame: FrameDef;
  scene: SceneDef;
}

function rarityPoints(r: FrameDef['rarity']): number {
  return { common: 0, rare: 6, epic: 12, legendary: 20 }[r];
}

function dripScore({ look, frame, scene }: DripInputs): number {
  let score = 35;
  if (look.accessoriesProbability) score += 10;
  if (look.facialHairProbability) score += 4;
  if (look.hairColor && HOT_HAIR.includes(look.hairColor)) score += 8;
  if (look.top && RARE_TOPS.includes(look.top)) score += 6;
  if (look.clothing && STATEMENT_CLOTHING.includes(look.clothing)) score += 5;
  if (look.clothing === 'graphicShirt' && look.clothingGraphic) score += 4;
  score += rarityPoints(frame.rarity);
  score += rarityPoints(scene.rarity);
  return Math.min(99, score);
}

function dripLabel(score: number): string {
  if (score >= 90) return 'Untouchable';
  if (score >= 80) return 'Main character';
  if (score >= 70) return 'Cooking';
  if (score >= 60) return 'Solid drip';
  return 'Warming up';
}

const rarityBadgeStyles: Record<FrameDef['rarity'], string> = {
  common: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  rare: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
  epic: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-200',
  legendary: 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-white',
};

const STORAGE_KEY_PREFIX = 'campusly:aura-look:';

interface SavedLook {
  look: AvataaarsLook;
  frameKey: string;
  sceneKey: string;
}

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

function FramePicker({
  value, onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {FRAME_OPTIONS.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              'relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 bg-muted/30 p-3 transition-all',
              isActive ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/40',
            )}
            aria-pressed={isActive}
          >
            <div className={cn('h-14 w-14 rounded-full bg-gradient-to-br from-primary/30 to-fuchsia-400/30', opt.className)} />
            <span className="text-xs font-medium">{opt.label}</span>
            <span className={cn('absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider', rarityBadgeStyles[opt.rarity])}>
              {opt.rarity}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ScenePicker({
  value, onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {SCENE_OPTIONS.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              'relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 transition-all',
              isActive ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/40',
            )}
            style={opt.style}
            aria-pressed={isActive}
            aria-label={opt.label}
          >
            <span className="rounded bg-black/50 px-2 py-0.5 text-xs font-medium text-white">{opt.label}</span>
            <span className={cn('absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider', rarityBadgeStyles[opt.rarity])}>
              {opt.rarity}
            </span>
          </button>
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
      <Button size="sm" variant={on ? 'default' : 'outline'} onClick={() => onChange(true)} className="flex-1">{onLabel}</Button>
      <Button size="sm" variant={!on ? 'default' : 'outline'} onClick={() => onChange(false)} className="flex-1">{offLabel}</Button>
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
  const [frameKey, setFrameKey] = useState<string>('none');
  const [sceneKey, setSceneKey] = useState<string>('sky');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!storageKey || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SavedLook;
        if (parsed.look) setLook({ ...DEFAULT_LOOK, ...parsed.look });
        if (parsed.frameKey) setFrameKey(parsed.frameKey);
        if (parsed.sceneKey) setSceneKey(parsed.sceneKey);
      } catch {
        // Corrupt — ignore and use defaults.
      }
    }
  }, [storageKey]);

  const frame = FRAME_OPTIONS.find((f) => f.key === frameKey) ?? FRAME_OPTIONS[0];
  const scene = SCENE_OPTIONS.find((s) => s.key === sceneKey) ?? SCENE_OPTIONS[0];

  // The avatar's own backgroundColor follows the chosen scene so the two
  // blend rather than fight.
  const lookWithScene: AvataaarsLook = { ...look, backgroundColor: scene.avatarBg ?? look.backgroundColor };

  const update = useCallback((partial: Partial<AvataaarsLook>) => {
    setLook((prev) => ({ ...prev, ...partial }));
  }, []);

  const randomize = useCallback(() => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
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
    });
    setFrameKey(pick(FRAME_OPTIONS).key);
    setSceneKey(pick(SCENE_OPTIONS).key);
  }, []);

  const save = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const payload: SavedLook = { look, frameKey, sceneKey };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [look, frameKey, sceneKey, storageKey]);

  const score = dripScore({ look, frame, scene });
  const label = dripLabel(score);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aura Studio"
        description="Build your look. Earn coins, unlock fits, run the school."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Avatar showcase ─────────────────────────────────────── */}
        {/* `relative` is critical: contains the halftone overlay so it doesn't escape upward. */}
        <Card className="relative lg:col-span-5 overflow-hidden border-primary/30">
          {/* Scene background — full bleed inside the card */}
          <div aria-hidden className="absolute inset-0" style={scene.style} />
          {/* Soft scrim so badges/text remain legible across all scenes */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
          <CardContent className="relative flex flex-col items-center gap-6 p-6 sm:p-8">
            <div className="relative flex items-center justify-center">
              {/* Pulsing aura halo */}
              <div
                className="absolute inset-0 -m-10 animate-pulse rounded-full bg-gradient-to-br from-primary/40 via-fuchsia-400/35 to-amber-300/40 blur-3xl"
                aria-hidden
              />
              {/* Frame ring + avatar */}
              <div className={cn('relative rounded-full transition-all', frame.className)}>
                <AvataaarsAvatar
                  seed={seed}
                  look={lookWithScene}
                  size={320}
                  aura="none"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">
                {user?.firstName ?? 'You'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3.5 w-3.5" />
                  Aura Lv 3
                </Badge>
                <Badge variant="outline" className="gap-1 bg-background/90">
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
              <Button onClick={randomize} variant="outline" className="flex-1 bg-background/90">
                <Shuffle className="mr-2 h-4 w-4" />
                Shuffle
              </Button>
              <Button onClick={save} className="flex-1 bg-gradient-to-r from-primary to-fuchsia-600 hover:opacity-90">
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
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="hair" title="Hair"><Wand2 className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="face" title="Face"><Smile className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="fit" title="Fit"><Shirt className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="extras" title="Extras"><Glasses className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="frame" title="Frame"><Frame className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="scene" title="Scene"><Palette className="h-4 w-4" /></TabsTrigger>
              </TabsList>

              <TabsContent value="hair" className="mt-4 space-y-5">
                <Section title={`Hair / Headwear (${TOP_OPTIONS.length})`}>
                  <VariantPicker value={look.top} options={TOP_OPTIONS} onChange={(v) => update({ top: v, topProbability: 100 })} baseLook={look} category="top" seed={seed} />
                </Section>
                <Section title="Hair color">
                  <ColorPicker value={look.hairColor} options={HAIR_COLORS} onChange={(v) => update({ hairColor: v })} />
                </Section>
              </TabsContent>

              <TabsContent value="face" className="mt-4 space-y-5">
                <Section title={`Eyes (${EYE_OPTIONS.length})`}>
                  <VariantPicker value={look.eyes} options={EYE_OPTIONS} onChange={(v) => update({ eyes: v })} baseLook={look} category="eyes" seed={seed} />
                </Section>
                <Section title={`Brows (${BROW_OPTIONS.length})`}>
                  <VariantPicker value={look.eyebrows} options={BROW_OPTIONS} onChange={(v) => update({ eyebrows: v })} baseLook={look} category="eyebrows" seed={seed} />
                </Section>
                <Section title={`Mouth (${MOUTH_OPTIONS.length})`}>
                  <VariantPicker value={look.mouth} options={MOUTH_OPTIONS} onChange={(v) => update({ mouth: v })} baseLook={look} category="mouth" seed={seed} />
                </Section>
                <Section title="Skin">
                  <ColorPicker value={look.skinColor} options={SKIN_COLORS.map((c) => c.key)} onChange={(v) => update({ skinColor: v })} labelFor={(c) => SKIN_COLORS.find((x) => x.key === c)?.label ?? c} />
                </Section>
              </TabsContent>

              <TabsContent value="fit" className="mt-4 space-y-5">
                <Section title={`Outfit (${CLOTHING_OPTIONS.length})`}>
                  <VariantPicker value={look.clothing} options={CLOTHING_OPTIONS} onChange={(v) => update({ clothing: v })} baseLook={look} category="clothing" seed={seed} />
                </Section>
                <Section title="Outfit color">
                  <ColorPicker value={look.clothesColor} options={CLOTHES_COLORS} onChange={(v) => update({ clothesColor: v })} />
                </Section>
                {look.clothing === 'graphicShirt' && (
                  <Section title={`Tee graphic (${GRAPHIC_OPTIONS.length})`}>
                    <VariantPicker value={look.clothingGraphic} options={GRAPHIC_OPTIONS} onChange={(v) => update({ clothingGraphic: v })} baseLook={look} category="clothingGraphic" seed={seed} />
                  </Section>
                )}
              </TabsContent>

              <TabsContent value="extras" className="mt-4 space-y-5">
                <Section title="Glasses">
                  <ToggleRow on={(look.accessoriesProbability ?? 0) > 0} onChange={(on) => update({ accessoriesProbability: on ? 100 : 0 })} onLabel="Wear glasses" offLabel="No glasses" />
                  {(look.accessoriesProbability ?? 0) > 0 && (
                    <VariantPicker value={look.accessories} options={ACCESSORY_OPTIONS} onChange={(v) => update({ accessories: v })} baseLook={look} category="accessories" seed={seed} />
                  )}
                </Section>
                <Section title="Facial hair">
                  <ToggleRow on={(look.facialHairProbability ?? 0) > 0} onChange={(on) => update({ facialHairProbability: on ? 100 : 0 })} onLabel="Add" offLabel="None" />
                  {(look.facialHairProbability ?? 0) > 0 && (
                    <VariantPicker value={look.facialHair} options={FACIAL_HAIR_OPTIONS} onChange={(v) => update({ facialHair: v })} baseLook={look} category="facialHair" seed={seed} />
                  )}
                </Section>
              </TabsContent>

              <TabsContent value="frame" className="mt-4 space-y-3">
                <Section title={`Frame (${FRAME_OPTIONS.length})`}>
                  <FramePicker value={frameKey} onChange={setFrameKey} />
                </Section>
                <p className="text-xs text-muted-foreground">Rarer frames bump your Drip score. Legendary frames stack hardest.</p>
              </TabsContent>

              <TabsContent value="scene" className="mt-4 space-y-3">
                <Section title={`Scene (${SCENE_OPTIONS.length})`}>
                  <ScenePicker value={sceneKey} onChange={setSceneKey} />
                </Section>
                <p className="text-xs text-muted-foreground">Bold scenes (Comic Burst, Holographic, Lava Lamp) push your Drip higher than plain colors.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {!hydrated && <div aria-hidden className="sr-only">Loading…</div>}

      <p className="text-center text-xs text-muted-foreground">
        Avatars by{' '}
        <a href="https://www.dicebear.com/styles/avataaars/" target="_blank" rel="noopener noreferrer" className="underline">
          DiceBear · Avataaars
        </a>{' '}
        · Free for personal &amp; commercial use
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}

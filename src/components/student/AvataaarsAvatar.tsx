'use client';

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import { cn } from '@/lib/utils';

/**
 * Subset of DiceBear Avataaars options we expose in the Aura Studio picker.
 * Picker UI is responsible for emitting only valid variant keys for each slot.
 */
export interface AvataaarsLook {
  top?: string;
  topProbability?: number;
  hairColor?: string;
  hatColor?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  accessories?: string;
  accessoriesProbability?: number;
  accessoriesColor?: string;
  clothing?: string;
  clothesColor?: string;
  clothingGraphic?: string;
  facialHair?: string;
  facialHairProbability?: number;
  facialHairColor?: string;
  skinColor?: string;
  backgroundColor?: string;
}

interface AvataaarsAvatarProps {
  seed: string;
  look?: AvataaarsLook;
  size?: number;
  className?: string;
  /** Soft halo behind the avatar. */
  aura?: 'none' | 'steady' | 'bright' | 'radiant';
}

const auraTones: Record<NonNullable<AvataaarsAvatarProps['aura']>, string> = {
  none: '',
  steady: 'bg-sky-400/40',
  bright: 'bg-amber-300/55',
  radiant: 'bg-fuchsia-400/55',
};

function toArray(value?: string): string[] | undefined {
  return value ? [value] : undefined;
}

export function AvataaarsAvatar({
  seed,
  look,
  size = 240,
  className,
  aura = 'steady',
}: AvataaarsAvatarProps) {
  const dataUri = useMemo(() => {
    // DiceBear's per-option types are tight unions; we cast at the boundary.
    const options = {
      seed,
      size,
      top: toArray(look?.top),
      topProbability: look?.topProbability,
      hairColor: toArray(look?.hairColor),
      hatColor: toArray(look?.hatColor),
      eyes: toArray(look?.eyes),
      eyebrows: toArray(look?.eyebrows),
      mouth: toArray(look?.mouth),
      accessories: toArray(look?.accessories),
      accessoriesProbability: look?.accessoriesProbability,
      accessoriesColor: toArray(look?.accessoriesColor),
      clothing: toArray(look?.clothing),
      clothesColor: toArray(look?.clothesColor),
      clothingGraphic: toArray(look?.clothingGraphic),
      facialHair: toArray(look?.facialHair),
      facialHairProbability: look?.facialHairProbability,
      facialHairColor: toArray(look?.facialHairColor),
      skinColor: toArray(look?.skinColor),
      backgroundColor: toArray(look?.backgroundColor),
      radius: 50,
    } as Parameters<typeof createAvatar<typeof avataaars>>[1];
    return createAvatar(avataaars, options).toDataUri();
  }, [seed, size, look]);

  const tone = auraTones[aura];

  return (
    <div
      className={cn('relative isolate inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {tone && (
        <div
          aria-hidden
          className={cn('absolute inset-0 rounded-full blur-3xl', tone)}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG via data URI; next/image would require remotePatterns config */}
      <img
        src={dataUri}
        alt="Your aura avatar"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-2xl"
        draggable={false}
      />
    </div>
  );
}

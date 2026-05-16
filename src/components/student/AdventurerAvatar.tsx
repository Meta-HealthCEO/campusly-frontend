'use client';

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { cn } from '@/lib/utils';

/**
 * Adventurer-style options we expose to the Aura Style Studio.
 *
 * DiceBear takes string-array values for each customisable slot. We type the
 * subset we use so the studio's picker stays type-safe; callers can still pass
 * any subset and rely on DiceBear defaults for the rest.
 */
export interface AdventurerLook {
  hair?: string;
  hairColor?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  glasses?: string;
  glassesProbability?: number;
  earrings?: string;
  earringsProbability?: number;
  features?: string;
  featuresProbability?: number;
  skinColor?: string;
  backgroundColor?: string;
  backgroundType?: 'solid' | 'gradientLinear';
}

interface AdventurerAvatarProps {
  /** Stable seed used when an option is not specified (drives base proportions). */
  seed: string;
  look?: AdventurerLook;
  size?: number;
  className?: string;
  /** Soft halo behind the avatar — the "aura" effect. */
  aura?: 'none' | 'steady' | 'bright' | 'radiant';
}

const auraTones: Record<NonNullable<AdventurerAvatarProps['aura']>, string> = {
  none: '',
  steady: 'bg-sky-400/40',
  bright: 'bg-amber-300/55',
  radiant: 'bg-fuchsia-400/55',
};

function toArray(value?: string): string[] | undefined {
  return value ? [value] : undefined;
}

export function AdventurerAvatar({
  seed,
  look,
  size = 240,
  className,
  aura = 'steady',
}: AdventurerAvatarProps) {
  const dataUri = useMemo(() => {
    // DiceBear's per-option types are tight unions of variant keys; we accept
    // string values at the API boundary because the picker UI only emits keys
    // from a known catalog. The cast is the single unsafe point.
    const options = {
      seed,
      size,
      hair: toArray(look?.hair),
      hairColor: toArray(look?.hairColor),
      eyes: toArray(look?.eyes),
      eyebrows: toArray(look?.eyebrows),
      mouth: toArray(look?.mouth),
      glasses: toArray(look?.glasses),
      glassesProbability: look?.glassesProbability,
      earrings: toArray(look?.earrings),
      earringsProbability: look?.earringsProbability,
      features: toArray(look?.features),
      featuresProbability: look?.featuresProbability,
      skinColor: toArray(look?.skinColor),
      backgroundColor: toArray(look?.backgroundColor),
      backgroundType: look?.backgroundType ? [look.backgroundType] : undefined,
      radius: 50,
    } as Parameters<typeof createAvatar<typeof adventurer>>[1];
    const avatar = createAvatar(adventurer, options);
    return avatar.toDataUri();
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
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI from local SVG generator; next/image would require remotePatterns */}
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

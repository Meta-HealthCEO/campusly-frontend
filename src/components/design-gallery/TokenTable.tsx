'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pairContrast } from '@/lib/design/contrast';
import { MIN_RATIO, REQUIRED_TOKENS, TOKEN_PAIRS, type TokenPair } from '@/lib/design/token-pairs';
import { GallerySection } from './GallerySection';

type Tokens = Record<string, string>;

function readTokens(): Tokens {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(REQUIRED_TOKENS.map((t: string) => [t, style.getPropertyValue(`--${t}`).trim()]));
}

const USE_LABEL: Record<TokenPair['use'], string> = { text: 'Text 4.5:1', large: 'Large text 3:1', ui: 'UI 3:1' };

const pairKey = (p: TokenPair) => `${p.fg}/${p.bg}/${p.bgAlpha ?? 1}`;

/** Every token as a swatch, then every pair the components use with its measured ratio (spec §2.2). */
export function TokenTable() {
  const { resolvedTheme } = useTheme();
  const [tokens, setTokens] = useState<Tokens | null>(null);
  useEffect(() => {
    // One frame later: next-themes swaps the `dark` class in its own effect, after this one.
    const frame = requestAnimationFrame(() => setTokens(readTokens()));
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  return (
    <GallerySection
      id="tokens"
      index="01"
      title="Colour tokens and contrast"
      description="One token set for every portal. Each pair below is measured live in the current theme, from the same table the unit test checks."
    >
      {!tokens ? (
        <Skeleton className="h-64 w-full rounded-card" />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Object.entries(tokens).map(([name, value]) => (
              <li key={name} className="min-w-0 space-y-1">
                <span className="block h-12 rounded-control border border-border" style={{ background: `var(--${name})` }} />
                <span className="block truncate text-caption font-semibold">{name}</span>
                <span className="block text-caption uppercase tabular-nums text-muted-foreground">{value}</span>
              </li>
            ))}
          </ul>
          <div data-scroll-x className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Use</TableHead>
                  <TableHead className="text-right">Ratio</TableHead>
                  <TableHead>AA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TOKEN_PAIRS.map((p: TokenPair) => {
                  const ground = p.ground ?? 'card';
                  const ratio = pairContrast(tokens[p.fg], tokens[p.bg], tokens[ground], p.bgAlpha ?? 1);
                  const ok = ratio >= MIN_RATIO[p.use];
                  const fill = `color-mix(in srgb, var(--${p.bg}) ${(p.bgAlpha ?? 1) * 100}%, var(--${ground}))`;
                  return (
                    <TableRow key={pairKey(p)}>
                      <TableCell>
                        <span className="inline-flex min-w-12 justify-center rounded-control border border-border px-2 py-1 font-heading font-bold" style={{ color: `var(--${p.fg})`, background: fill }}>
                          Aa
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {p.fg} on {p.bg}{p.bgAlpha ? ` (${p.bgAlpha * 100}%)` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{USE_LABEL[p.use]}</TableCell>
                      <TableCell className="text-right font-heading font-semibold tabular-nums">{ratio.toFixed(1)}:1</TableCell>
                      <TableCell><Badge variant={ok ? 'secure' : 'weak'}>{ok ? 'AA' : 'Below AA'}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </GallerySection>
  );
}

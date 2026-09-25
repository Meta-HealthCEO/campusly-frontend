'use client';

import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChecklistItem } from '@/lib/onboarding';

interface GettingStartedCardProps {
  items: ChecklistItem[];
}

/** The onboarding steps on Today, until they are done. */
export function GettingStartedCard({ items }: GettingStartedCardProps) {
  const doneCount = items.filter((i: ChecklistItem) => i.done).length;
  if (doneCount === items.length) return null;
  const next = items.find((i: ChecklistItem) => !i.done);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Getting started
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item: ChecklistItem) => (
          <div
            key={item.title}
            className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card p-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex min-w-0 items-start gap-3">
              {item.done ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-label="Done" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-label="To do" />
              )}
              <div className="min-w-0">
                <p className={item.done ? 'text-sm font-medium text-muted-foreground' : 'text-sm font-medium'}>{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.helper}</p>
              </div>
            </div>
            {item === next ? (
              <Link href={item.href} className="inline-flex min-h-11 shrink-0 items-center text-sm text-primary hover:underline">
                Continue
              </Link>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

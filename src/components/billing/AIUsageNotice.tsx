'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIUsageMeter } from '@/components/billing/AIUsageMeter';
import { aiActionsLeft, aiLimitCopy, shouldWarn, type AIUsage } from '@/lib/ai-allowance';

/** Shown next to AI buttons only when a free teacher has fewer than 5 AI actions left. */
export function AIUsageNotice({ usage }: { usage: AIUsage | null }) {
  if (!usage || usage.plan === 'school' || !shouldWarn(usage)) return null;
  return <AIUsageMeter usage={usage} compact />;
}

/**
 * In place of an AI flow when no AI actions are left this month, so a teacher
 * doesn't fill in a form the server will refuse. Renders nothing otherwise.
 */
export function AIUsedUpState({ usage }: { usage: AIUsage | null }) {
  if (!usage || usage.plan === 'school' || aiActionsLeft(usage) !== 0) return null;
  const copy = aiLimitCopy(usage, new Date());
  return (
    <EmptyState
      icon={Sparkles}
      title={copy.title}
      description={copy.body}
      action={usage.plan === 'free' ? (
        <Link href="/my/billing" className={cn(buttonVariants({ size: 'lg' }), 'min-h-11')}>
          Upgrade to Pro
        </Link>
      ) : undefined}
    />
  );
}

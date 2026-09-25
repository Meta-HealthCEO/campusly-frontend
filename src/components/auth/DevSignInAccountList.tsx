import { ArrowRight, Loader2 } from 'lucide-react';
import { FOCUS_RING } from '@/components/ui/focus';
import { cn } from '@/lib/utils';
import { devAccountSubtitle } from '@/lib/dev-sign-in';
import type { DevSignInAccount } from '@/types/dev-sign-in';

interface DevSignInAccountListProps {
  title: string;
  accounts: DevSignInAccount[];
  busyId: string | null;
  onPick: (account: DevSignInAccount) => void;
}

/** One titled group of one-click accounts: name on one line, "role · detail" below. */
export function DevSignInAccountList({ title, accounts, busyId, onPick }: DevSignInAccountListProps) {
  if (accounts.length === 0) return null;
  const headingId = `dev-sign-in-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <section aria-labelledby={headingId} className="space-y-1">
      <h3
        id={headingId}
        className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        {title}
      </h3>
      <ul className="space-y-0.5">
        {accounts.map((account: DevSignInAccount) => {
          const isBusy = busyId === account.id;
          return (
            <li key={account.id}>
              <button
                type="button"
                onClick={() => onPick(account)}
                disabled={busyId !== null}
                aria-busy={isBusy || undefined}
                title={account.email}
                className={cn(
                  'group flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted disabled:cursor-default disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{account.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {devAccountSubtitle(account)}
                  </span>
                </span>
                {isBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-foreground" aria-hidden="true" />
                ) : (
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-accent-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

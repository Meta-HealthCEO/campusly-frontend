'use client';

import { FlaskConical, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDevSignIn } from '@/hooks/useDevSignIn';
import { DevSignInAccountList } from './DevSignInAccountList';

/**
 * Development-only card beside the sign-in card: one click signs in as the
 * developer's own account or one demo account per role, no password. The login
 * page renders it only when DEV_SIGN_IN_ENABLED, so production builds drop it.
 */
export function DevSignInPanel() {
  const { groups, loading, error, busyId, signInError, reload, signIn } = useDevSignIn(true);
  const isEmpty = !loading && !error && groups.own.length === 0 && groups.roles.length === 0;

  return (
    <Card
      aria-label="Development sign-in"
      className="w-full max-w-md max-h-[28rem] border-dashed lg:max-h-[40rem] lg:w-80 lg:shrink-0"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10">
            <FlaskConical className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle>Development sign-in</CardTitle>
            <CardDescription className="text-xs">Local copy. One click, no password.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2">
        {loading && (
          <p className="flex items-center gap-2 px-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading accounts…
          </p>
        )}

        {error && (
          <div className="space-y-2 px-3" role="alert">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="min-h-11 w-full" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        )}

        {isEmpty && (
          <p className="px-3 text-sm text-muted-foreground">
            No development accounts found — run the demo seed.
          </p>
        )}

        {signInError && (
          <p className="px-3 text-sm text-destructive" role="alert">{signInError}</p>
        )}

        <DevSignInAccountList title="Your account" accounts={groups.own} busyId={busyId} onPick={signIn} />
        <DevSignInAccountList title="Roles" accounts={groups.roles} busyId={busyId} onPick={signIn} />
      </CardContent>
    </Card>
  );
}

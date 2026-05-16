'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Crown, Edit3, Flame, Loader2, Sparkles, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/stores/useAuthStore';

// Three.js + iframe widgets don't render server-side. Dynamic import with
// ssr: false keeps them out of the SSR bundle and shows a spinner while the
// client-side chunk loads.
const AvatarCreator = dynamic(
  () => import('@readyplayerme/react-avatar-creator').then((m) => ({ default: m.AvatarCreator })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[700px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  },
);

const Avatar = dynamic(
  () => import('@readyplayerme/visage').then((m) => ({ default: m.Avatar })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  },
);

// Ready Player Me subdomain. `demo` works out of the box for testing.
// Set up your own at https://studio.readyplayer.me and replace.
const RPM_SUBDOMAIN = 'demo';
const STORAGE_KEY_PREFIX = 'campusly:rpm-avatar:';

interface ExportedEvent {
  data: { url: string; userId: string; avatarId: string };
}

export default function AuraStudioPage() {
  const { user } = useAuthStore();
  const storageKey = user ? `${STORAGE_KEY_PREFIX}${user.id}` : null;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate saved avatar URL from localStorage. Per-user keys so device
  // sharing across siblings doesn't crossover.
  useEffect(() => {
    setHydrated(true);
    if (!storageKey || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setAvatarUrl(stored);
  }, [storageKey]);

  const handleAvatarExported = useCallback(
    (event: ExportedEvent) => {
      const url = event.data.url;
      setAvatarUrl(url);
      setIsEditing(false);
      if (storageKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, url);
      }
    },
    [storageKey],
  );

  // First render before hydration — show a placeholder so we don't flash
  // the "create" CTA at users who already have a saved avatar.
  if (!hydrated) {
    return (
      <div className="space-y-6">
        <PageHeader title="Aura Studio" description="Loading your look…" />
        <Card>
          <CardContent className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Editor mode — opens the Ready Player Me iframe creator.
  if (isEditing || !avatarUrl) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={avatarUrl ? 'Edit your Aura' : 'Create your Aura'}
          description="Pick your fit. Earn coins. Level up your drip."
        >
          {avatarUrl && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </PageHeader>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[700px] w-full">
              <AvatarCreator
                subdomain={RPM_SUBDOMAIN}
                config={{
                  bodyType: 'fullbody',
                  quickStart: false,
                  language: 'en',
                  clearCache: false,
                }}
                onAvatarExported={handleAvatarExported}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display mode — show the saved avatar in 3D with identity badges.
  return (
    <div className="space-y-6">
      <PageHeader
        title="Aura Studio"
        description="This is you. Built with full body, full drip."
      />

      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-8">
          {/* Animated aura halo + 3D avatar */}
          <div className="relative h-[520px] w-full max-w-2xl">
            <div
              className="absolute inset-0 -m-8 animate-pulse rounded-full bg-gradient-to-br from-primary/40 via-fuchsia-400/30 to-amber-300/40 blur-3xl"
              aria-hidden
            />
            <div className="relative h-full w-full">
              <Avatar
                modelSrc={avatarUrl}
                cameraInitialDistance={3}
                cameraTarget={1.2}
                scale={1.05}
                shadows
                style={{ width: '100%', height: '100%', background: 'transparent' }}
              />
            </div>
          </div>

          {/* Identity */}
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
                Drip 87
              </Badge>
              <Badge className="gap-1 border-0 bg-gradient-to-r from-fuchsia-500 to-amber-500 text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Main character
              </Badge>
            </div>
          </div>

          <Button
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-primary to-fuchsia-600 hover:opacity-90"
            size="lg"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit your Aura
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Avatars by{' '}
        <a
          href="https://readyplayer.me"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Ready Player Me
        </a>
      </p>
    </div>
  );
}

# Mobile App v1 — Plan 2: Mobile Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `campusly-mobile` Expo repo, wire the runtime stack (Expo Router + NativeWind + TanStack Query + Zustand + axios), implement the secure-storage adapter, port the API client from the web, build the auth flow end-to-end with biometric unlock, register push tokens, and produce a logged-in app shell that builds for both iOS and Android.

**Architecture:** New separate repo at `c:\Users\shaun\campusly-mobile`. Single Expo app with role-aware routing via Expo Router groups (`(auth)`, `(parent)`, `(student)`). Auth tokens in `expo-secure-store`; cold-start gated by biometric. Types synced from `campusly-frontend/src/types/` via a script. EAS profiles for `development`, `preview`, `production` with distinct bundle IDs.

**Tech Stack:** Expo SDK 54 (matches the user's other mobile apps), TypeScript strict, Expo Router 6, NativeWind 4, TanStack Query 5, Zustand 5, axios 1.x, react-hook-form + zod/v4, `expo-secure-store`, `expo-local-authentication`, `expo-notifications`, `expo-web-browser`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `@react-native-community/netinfo`, `sonner-native`.

**Working directory (target):** `c:\Users\shaun\campusly-mobile` (does not exist yet — Task 1 creates it)
**Reference mobile project (for conventions):** `c:\Users\shaun\khula-mobile` — same Expo + NativeWind 4 + Expo Router stack
**Web repo (for type sync, token reference, API client logic):** `c:\Users\shaun\campusly-frontend`
**Backend (already updated by Plan 1):** `c:\Users\shaun\campusly-backend`

**Spec:** `c:\Users\shaun\campusly-frontend\docs\superpowers\specs\2026-05-14-campusly-mobile-app-design.md`

---

## File Structure (created in this plan)

```
c:\Users\shaun\campusly-mobile\
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── nativewind-env.d.ts
├── expo-env.d.ts
├── .env.example
├── .gitignore
├── README.md
├── scripts/
│   └── sync-types.sh
├── .github/
│   └── workflows/
│       └── ci.yml
├── assets/
│   ├── icon.png            (placeholder 1024x1024)
│   ├── adaptive-icon.png
│   └── splash.png
├── src/
│   ├── lib/
│   │   ├── secure-storage.ts
│   │   ├── api-client.ts
│   │   ├── normalize-ids.ts
│   │   ├── env.ts
│   │   └── biometric.ts
│   ├── stores/
│   │   └── useAuthStore.ts
│   ├── hooks/
│   │   └── auth/
│   │       ├── useLogin.ts
│   │       ├── useLogout.ts
│   │       └── useMobileContext.ts
│   ├── types/                       (synced from campusly-frontend/src/types/)
│   │   └── README.md                (note: do not edit by hand)
│   ├── components/
│   │   └── auth/
│   │       ├── BiometricGate.tsx
│   │       └── ProvidersRoot.tsx
│   └── theme/
│       └── tokens.ts
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── (parent)/
│   │   ├── _layout.tsx              (placeholder, replaced in Plan 3)
│   │   └── home.tsx                 (placeholder)
│   └── (student)/
│       ├── _layout.tsx              (placeholder)
│       └── home.tsx                 (placeholder)
```

---

## Conventions for every task

- **Working directory after Task 1:** `c:\Users\shaun\campusly-mobile`
- **Commit cadence:** one commit per logical task
- **Branch:** `master` (the user's preference — no feature branches)
- **TDD where it helps:** for non-trivial utility code (`secure-storage`, `api-client`, `normalize-ids`) write a vitest unit test first. For UI components and Expo-Router screens, skip unit tests in this plan — the manual-verification task at the end gates the merge instead.
- **Type safety:** strict, no `any`, `catch (err: unknown)`
- **File size:** under 350 lines per file
- **`@/...` import alias** for `src/...` (configured via `tsconfig.json` paths)

---

## Task 1: Scaffold the Expo repo + install dependencies

**Working directory:** `c:\Users\shaun\` (parent dir; the project doesn't exist yet)

- [ ] **Step 1: Create the project from the official tabs template**

Use the `tabs` template (TypeScript + Expo Router 6 pre-wired). This is the same starting point as the user's `khula-mobile`.

```bash
cd /c/Users/shaun
npx create-expo-app@latest campusly-mobile --template tabs --no-install
```

`--no-install` skips the default install so we can add our dependencies in one shot afterwards.

- [ ] **Step 2: Delete the auto-generated example screens that will be replaced**

```bash
cd campusly-mobile
rm -rf app/(tabs) components/__tests__ scripts/reset-project.js
# Keep app/_layout.tsx — we'll edit it.
# Keep components/ folder; we'll replace contents in later tasks.
```

- [ ] **Step 3: Install all production dependencies in one command**

```bash
npx expo install \
  expo-router \
  expo-secure-store \
  expo-local-authentication \
  expo-notifications \
  expo-web-browser \
  expo-constants \
  expo-linking \
  expo-splash-screen \
  expo-font \
  expo-application \
  expo-device \
  expo-image-picker \
  expo-document-picker \
  @react-native-community/netinfo
```

```bash
npm install \
  nativewind@^4.2.1 \
  tailwindcss@^3.4.0 \
  @tanstack/react-query@^5.90.0 \
  zustand@^5.0.0 \
  axios@^1.13.0 \
  react-hook-form@^7.71.0 \
  @hookform/resolvers@^5.2.0 \
  zod@^4.3.0 \
  sonner-native@^0.16.0 \
  lucide-react-native@^0.562.0
```

```bash
npm install --save-dev \
  prettier@^3.3.0 \
  eslint@^9.0.0
```

- [ ] **Step 4: Initialise git and make the first commit**

```bash
git init
git branch -M master
git add .
git commit -m "chore: scaffold campusly-mobile Expo app (tabs template) with full dependency set"
```

---

## Task 2: Configure NativeWind 4 + Tailwind tokens (mirroring the web)

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `tailwind.config.js` at repo root**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "card-foreground": "rgb(var(--card-foreground) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        "destructive-foreground": "rgb(var(--destructive-foreground, var(--background)) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
    },
  },
  plugins: [],
};
```

Note: we use `rgb(...)` instead of `oklch(...)` because React Native's color parser does not support OKLCH yet. The token NAMES match the web; only the value form differs. See the implementation note in Step 4.

- [ ] **Step 2: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 255 255 255;
    --foreground: 32 32 32;
    --card: 255 255 255;
    --card-foreground: 32 32 32;
    --primary: 47 47 47;
    --primary-foreground: 250 250 250;
    --muted: 246 246 246;
    --muted-foreground: 133 133 133;
    --accent: 246 246 246;
    --accent-foreground: 47 47 47;
    --destructive: 200 50 50;
    --destructive-foreground: 255 255 255;
    --border: 232 232 232;
    --radius: 0.5rem;
  }

  .dark {
    --background: 32 32 32;
    --foreground: 250 250 250;
    --card: 47 47 47;
    --card-foreground: 250 250 250;
    --primary: 232 232 232;
    --primary-foreground: 47 47 47;
    --muted: 64 64 64;
    --muted-foreground: 180 180 180;
    --accent: 64 64 64;
    --accent-foreground: 250 250 250;
    --destructive: 235 100 100;
    --destructive-foreground: 32 32 32;
    --border: 64 64 64;
  }
}
```

These are sRGB approximations of the web's OKLCH tokens (the web tokens are in `campusly-frontend/src/app/globals.css`). For v1 we accept the small perceptual delta; later we can use NativeWind's `oklch()` once support lands.

- [ ] **Step 3: Create `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

- [ ] **Step 4: Create `metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 5: Add `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Add the `@/` path alias to `tsconfig.json`**

Open `tsconfig.json`. Inside `compilerOptions`, add:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["src/*"]
}
```

- [ ] **Step 7: Smoke test**

```bash
npx expo start --tunnel
```

Open Expo Go (or the dev client) on a phone, scan the QR. Confirm the app builds and renders the default screen. Press Ctrl+C to stop. (This is a manual sanity check — no assertion required; if the build fails, fix the config before moving on.)

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.js global.css babel.config.js metro.config.js nativewind-env.d.ts tsconfig.json
git commit -m "feat(theme): NativeWind 4 + Tailwind tokens mirroring web's semantic palette"
```

---

## Task 3: Type sync script + initial run

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Write the script**

Create `scripts/sync-types.sh`:

```bash
#!/usr/bin/env bash
# Sync TypeScript interface declarations from the web frontend into src/types/.
# This script lives in the mobile repo and pulls from a sibling checkout
# of campusly-frontend.
#
# DOES NOT copy Zod schemas (they're bound to web-specific resolvers in places).
# Mobile rewrites the small subset of schemas it needs.

set -euo pipefail

SOURCE="../campusly-frontend/src/types"
TARGET="./src/types"

if [ ! -d "$SOURCE" ]; then
  echo "ERROR: expected '$SOURCE' to exist as a sibling directory." >&2
  echo "       Check out campusly-frontend at C:/Users/shaun/campusly-frontend." >&2
  exit 1
fi

mkdir -p "$TARGET"

# Sync .ts files only (skip .test.ts and .spec.ts if any exist).
# --delete keeps the target directory in lock-step with the source.
rsync -av --delete \
  --include='*.ts' \
  --exclude='*.test.ts' \
  --exclude='*.spec.ts' \
  --exclude='*' \
  "$SOURCE/" "$TARGET/"

# Append a top-line warning to every copied file so a future editor
# does not accidentally hand-edit a synced file.
for f in "$TARGET"/*.ts; do
  # Skip the README we manually maintain
  case "$(basename "$f")" in README.md) continue ;; esac
  if ! head -n 1 "$f" | grep -q "GENERATED — synced"; then
    tmp=$(mktemp)
    printf '// GENERATED — synced from ../campusly-frontend/src/types/. Do NOT edit.\n' > "$tmp"
    cat "$f" >> "$tmp"
    mv "$tmp" "$f"
  fi
done

echo "Synced $(ls -1 "$TARGET"/*.ts | wc -l) type files into $TARGET."
```

- [ ] **Step 2: Make it executable + add a README**

```bash
chmod +x scripts/sync-types.sh
mkdir -p src/types
```

Create `src/types/README.md`:

```markdown
# Synced types

These TypeScript declaration files are **synced from the web frontend** at
`../campusly-frontend/src/types/`. Do not edit them by hand — your changes
will be overwritten next time `scripts/sync-types.sh` runs.

To update: run `npm run sync:types` (or `./scripts/sync-types.sh`) after
pulling the latest frontend changes.

CI runs the same script and fails the build if the synced files have
uncommitted diffs.
```

- [ ] **Step 3: Add npm scripts to `package.json`**

Inside `scripts:` add:

```json
"sync:types": "./scripts/sync-types.sh",
"sync:types:check": "./scripts/sync-types.sh && git diff --exit-code src/types"
```

- [ ] **Step 4: Run the sync**

```bash
npm run sync:types
```

Expected: prints `Synced N type files into ./src/types.` and `src/types/` now contains the web's type files with a `GENERATED — synced` header on each.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-types.sh src/types/ package.json
git commit -m "feat(types): sync-types script + initial pull from campusly-frontend"
```

---

## Task 4: Secure-storage adapter + env loader

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `src/lib/secure-storage.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

/**
 * Thin async wrapper around expo-secure-store that mirrors the
 * localStorage shape the web's api-client expects. Lets the axios
 * interceptor read identically to its web counterpart.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  accessToken: 'campusly.accessToken',
  refreshToken: 'campusly.refreshToken',
  biometricEnabled: 'campusly.biometricEnabled',
  lastActiveAt: 'campusly.lastActiveAt',
  activeChildId: 'campusly.activeChildId',
  pendingPaymentId: 'campusly.pendingPaymentId',
  activeRoleContext: 'campusly.activeRoleContext',
} as const;
```

- [ ] **Step 2: Create `src/lib/env.ts`**

```ts
import Constants from 'expo-constants';

type AppEnv = {
  apiUrl: string;
  envName: 'development' | 'preview' | 'production';
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppEnv>;

export const env: AppEnv = {
  apiUrl: extra.apiUrl ?? 'http://localhost:4500/api',
  envName: extra.envName ?? 'development',
};
```

- [ ] **Step 3: Wire env into `app.json` extra**

Open `app.json`. Inside `expo`, add or extend `extra`:

```json
"extra": {
  "apiUrl": "http://localhost:4500/api",
  "envName": "development"
}
```

EAS profiles will override these per build in Task 9.

- [ ] **Step 4: Commit**

```bash
git add src/lib/secure-storage.ts src/lib/env.ts app.json
git commit -m "feat(lib): secure-storage adapter + env loader"
```

---

## Task 5: API client — normaliser + axios interceptors

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create the `_id`→`id` normaliser**

Create `src/lib/normalize-ids.ts`:

```ts
type Anyish = unknown;

function isPlainObject(value: Anyish): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Recursively rename `_id` → `id` on objects within the payload.
 * Idempotent: if `id` is already present, leaves it alone.
 * Mirrors the web's behaviour in src/lib/api-client.ts.
 */
export function normalizeIds(input: Anyish): Anyish {
  if (Array.isArray(input)) {
    return input.map(normalizeIds);
  }
  if (!isPlainObject(input)) return input;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === '_id' && !('id' in input)) {
      out.id = typeof v === 'string' ? v : String(v);
    } else {
      out[k] = normalizeIds(v);
    }
  }
  return out;
}
```

- [ ] **Step 2: Build the api-client**

Create `src/lib/api-client.ts`:

```ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { env } from './env.js';
import { secureStorage, STORAGE_KEYS } from './secure-storage.js';
import { normalizeIds } from './normalize-ids.js';

const APP_VERSION = (Constants.expoConfig?.version as string) ?? '0.0.0';

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokensOnce(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refresh = await secureStorage.getItem(STORAGE_KEYS.refreshToken);
      if (!refresh) return null;
      const res = await axios.post(
        `${env.apiUrl}/auth/refresh`,
        { refreshToken: refresh },
        { headers: { 'X-Client': `campusly-mobile/${APP_VERSION}` } },
      );
      const newAccess = res.data?.data?.accessToken ?? res.data?.accessToken;
      const newRefresh = res.data?.data?.refreshToken ?? res.data?.refreshToken;
      if (typeof newAccess !== 'string') return null;
      await secureStorage.setItem(STORAGE_KEYS.accessToken, newAccess);
      if (typeof newRefresh === 'string') {
        await secureStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
      }
      return newAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiUrl,
    timeout: 20_000,
    headers: { 'X-Client': `campusly-mobile/${APP_VERSION}` },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getItem(STORAGE_KEYS.accessToken);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      response.data = normalizeIds(response.data);
      return response;
    },
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true;
        const fresh = await refreshTokensOnce();
        if (fresh) {
          original.headers.set('Authorization', `Bearer ${fresh}`);
          return client.request(original);
        }
        await secureStorage.removeItem(STORAGE_KEYS.accessToken);
        await secureStorage.removeItem(STORAGE_KEYS.refreshToken);
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient = createApiClient();
```

- [ ] **Step 3: Unit-test the normaliser**

Vitest is not installed by default in Expo projects, so install + configure:

```bash
npm install --save-dev vitest@^2.0.0 @types/node
```

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `src/lib/__tests__/normalize-ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeIds } from '../normalize-ids.js';

describe('normalizeIds', () => {
  it('renames _id to id on a flat object', () => {
    expect(normalizeIds({ _id: 'x', name: 'a' })).toEqual({ id: 'x', name: 'a' });
  });

  it('preserves existing id when both _id and id are present', () => {
    expect(normalizeIds({ _id: 'x', id: 'y', name: 'a' })).toEqual({
      _id: 'x',
      id: 'y',
      name: 'a',
    });
  });

  it('recurses through arrays', () => {
    expect(normalizeIds([{ _id: '1' }, { _id: '2' }])).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('recurses through nested objects', () => {
    expect(normalizeIds({ outer: { _id: 'a', inner: { _id: 'b' } } })).toEqual({
      outer: { id: 'a', inner: { id: 'b' } },
    });
  });

  it('leaves primitives unchanged', () => {
    expect(normalizeIds(42)).toBe(42);
    expect(normalizeIds('hello')).toBe('hello');
    expect(normalizeIds(null)).toBe(null);
  });
});
```

Run it:

```bash
npm test
```

Expected: 5/5 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-client.ts src/lib/normalize-ids.ts src/lib/__tests__/normalize-ids.test.ts vitest.config.ts package.json
git commit -m "feat(lib): axios api-client with token refresh + _id->id normaliser"
```

---

## Task 6: Biometric helper

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `src/lib/biometric.ts`**

```ts
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage, STORAGE_KEYS } from './secure-storage.js';

export type BiometricResult =
  | { ok: true }
  | { ok: false; reason: 'cancel' | 'fail' | 'not-enrolled' | 'unsupported' };

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticate(promptMessage = 'Unlock Campusly'): Promise<BiometricResult> {
  const available = await isBiometricAvailable();
  if (!available) return { ok: false, reason: 'not-enrolled' };

  const res = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use Passcode',
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });

  if (res.success) return { ok: true };
  const err = (res as { error?: string }).error;
  if (err === 'user_cancel' || err === 'system_cancel' || err === 'app_cancel') {
    return { ok: false, reason: 'cancel' };
  }
  return { ok: false, reason: 'fail' };
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await secureStorage.setItem(STORAGE_KEYS.biometricEnabled, enabled ? '1' : '0');
}

export async function getBiometricEnabled(): Promise<boolean> {
  return (await secureStorage.getItem(STORAGE_KEYS.biometricEnabled)) === '1';
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function touchLastActive(): Promise<void> {
  await secureStorage.setItem(STORAGE_KEYS.lastActiveAt, String(Date.now()));
}

export async function isSessionExpired(): Promise<boolean> {
  const raw = await secureStorage.getItem(STORAGE_KEYS.lastActiveAt);
  if (!raw) return false;
  const last = Number(raw);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last > SEVEN_DAYS_MS;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/biometric.ts
git commit -m "feat(auth): expo-local-authentication wrapper + last-active session-expiry helper"
```

---

## Task 7: Zustand auth store + mobile-context hook

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Define the store shape**

Create `src/stores/useAuthStore.ts`:

```ts
import { create } from 'zustand';
import type { Types } from 'mongoose';  // type-only — no runtime dep

// Local mirror of the backend's MobileContextResponse. Lives here
// (rather than synced from web/types) because it's mobile-specific.
export type MobileContext = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profileImage: string | null;
    phone: string | null;
  };
  school: {
    id: string;
    name: string;
    logo: string | null;
    settings: {
      currency: string;
      paymentProviders: string[];
    };
  };
  parent: {
    id: string;
    children: Array<{
      id: string;
      firstName: string;
      lastName: string;
      profileImage: string | null;
      classId: string | null;
      gradeId: string | null;
    }>;
  } | null;
  student: {
    id: string;
    classId: string | null;
    gradeId: string | null;
  } | null;
};

type AuthState = {
  context: MobileContext | null;
  isHydrating: boolean;
  setContext: (ctx: MobileContext | null) => void;
  setHydrating: (b: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  context: null,
  isHydrating: true,
  setContext: (context) => set({ context }),
  setHydrating: (isHydrating) => set({ isHydrating }),
  reset: () => set({ context: null, isHydrating: false }),
}));
```

If the `mongoose` type-import is awkward in a mobile-only repo, omit it — the file doesn't actually use it. Use plain `string` for IDs.

- [ ] **Step 2: Mobile-context hook (TanStack Query)**

Create `src/hooks/auth/useMobileContext.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { MobileContext } from '@/stores/useAuthStore.js';

export function useMobileContext(enabled: boolean) {
  return useQuery({
    queryKey: ['mobile-context'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: MobileContext } & MobileContext>(
        '/auth/me/mobile-context',
      );
      const body = res.data;
      return ((body as { data?: MobileContext }).data ?? body) as MobileContext;
    },
  });
}
```

- [ ] **Step 3: Login hook**

Create `src/hooks/auth/useLogin.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage.js';

export type LoginInput = { email: string; password: string };

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput): Promise<LoginResponse> => {
      const res = await apiClient.post<{ data?: LoginResponse } & LoginResponse>(
        '/auth/login',
        input,
      );
      const body = res.data;
      const tokens = ((body as { data?: LoginResponse }).data ?? body) as LoginResponse;
      await secureStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
      await secureStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
      return tokens;
    },
  });
}
```

- [ ] **Step 4: Logout hook**

Create `src/hooks/auth/useLogout.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage.js';
import { useAuthStore } from '@/stores/useAuthStore.js';

export function useLogout() {
  const qc = useQueryClient();
  const reset = useAuthStore((s) => s.reset);

  return useMutation({
    mutationFn: async () => {
      // Best-effort server logout — don't block on network errors.
      try {
        await apiClient.post('/auth/logout', {});
      } catch {
        // ignore
      }
      await secureStorage.removeItem(STORAGE_KEYS.accessToken);
      await secureStorage.removeItem(STORAGE_KEYS.refreshToken);
      await secureStorage.removeItem(STORAGE_KEYS.lastActiveAt);
      await secureStorage.removeItem(STORAGE_KEYS.activeRoleContext);
      qc.clear();
      reset();
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/useAuthStore.ts src/hooks/auth/
git commit -m "feat(auth): Zustand auth store + useMobileContext / useLogin / useLogout hooks"
```

---

## Task 8: Auth screens (login + placeholder forgot-password)

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Delete the auto-generated `(tabs)` group if not already removed**

```bash
rm -rf app/\(tabs\) 2>/dev/null || true
```

- [ ] **Step 2: Create `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Create `app/(auth)/login.tsx`**

```tsx
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useLogin } from '@/hooks/auth/useLogin.js';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    try {
      await login.mutateAsync({ email: email.trim().toLowerCase(), password });
      router.replace('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Sign-in failed. Please check your email and password.';
      Alert.alert('Sign in', message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-semibold text-foreground mb-1">Campusly</Text>
        <Text className="text-base text-muted-foreground mb-8">Sign in to continue</Text>

        <Text className="text-sm text-foreground mb-1.5">Email</Text>
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-foreground mb-4"
          placeholder="you@school.co.za"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text className="text-sm text-foreground mb-1.5">Password</Text>
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-foreground mb-6"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={login.isPending}
          className="bg-primary rounded-lg py-3 items-center"
        >
          <Text className="text-primary-foreground font-medium">
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          className="mt-4 items-center"
        >
          <Text className="text-muted-foreground text-sm">Forgot password?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 4: Placeholder forgot-password**

Create `app/(auth)/forgot-password.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

export default function ForgotPasswordScreen() {
  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-2xl font-semibold text-foreground mb-2">Forgot password</Text>
      <Text className="text-muted-foreground mb-6">
        Coming soon. For now, please reset on the web app.
      </Text>
      <Pressable
        onPress={() => router.back()}
        className="border border-border rounded-lg py-3 items-center"
      >
        <Text className="text-foreground">Back to sign in</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat(auth): login screen wired to useLogin + placeholder forgot-password"
```

---

## Task 9: Root layout — providers, splash, biometric gate, routing

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Replace `app/_layout.tsx`**

Overwrite with:

```tsx
import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { Toaster } from 'sonner-native';
import '@/../global.css';
import { ProvidersRoot } from '@/components/auth/ProvidersRoot';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <QueryClientProvider client={queryClient}>
      <ProvidersRoot onReady={() => setReady(true)}>
        <Slot />
      </ProvidersRoot>
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create `src/components/auth/ProvidersRoot.tsx`**

```tsx
import { ReactNode, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage';
import { authenticate, getBiometricEnabled, isSessionExpired, touchLastActive } from '@/lib/biometric';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMobileContext } from '@/hooks/auth/useMobileContext';
import { BiometricGate } from './BiometricGate';

export function ProvidersRoot({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady: () => void;
}) {
  const [phase, setPhase] = useState<'boot' | 'biometric' | 'ready'>('boot');
  const setContext = useAuthStore((s) => s.setContext);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  // Conditionally fetch the mobile context once auth has hydrated.
  const [hasToken, setHasToken] = useState(false);
  const ctxQuery = useMobileContext(hasToken && phase === 'ready');

  useEffect(() => {
    if (ctxQuery.data) {
      setContext(ctxQuery.data);
      // Route by role
      const role = ctxQuery.data.user.role;
      if (role === 'parent') router.replace('/(parent)/home');
      else if (role === 'student') router.replace('/(student)/home');
      else {
        // Teacher / admin trying to use the mobile app — bounce.
        router.replace('/(auth)/login');
      }
    }
  }, [ctxQuery.data, setContext]);

  useEffect(() => {
    (async () => {
      try {
        if (await isSessionExpired()) {
          await secureStorage.removeItem(STORAGE_KEYS.accessToken);
          await secureStorage.removeItem(STORAGE_KEYS.refreshToken);
        }
        const token = await secureStorage.getItem(STORAGE_KEYS.accessToken);
        if (!token) {
          setHydrating(false);
          setPhase('ready');
          router.replace('/(auth)/login');
          onReady();
          return;
        }
        setHasToken(true);
        const bioEnabled = await getBiometricEnabled();
        if (bioEnabled) {
          setPhase('biometric');
        } else {
          await touchLastActive();
          setHydrating(false);
          setPhase('ready');
        }
        onReady();
      } catch {
        setHydrating(false);
        setPhase('ready');
        onReady();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'biometric') {
    return (
      <BiometricGate
        onSuccess={async () => {
          await touchLastActive();
          setHydrating(false);
          setPhase('ready');
        }}
        onFail={async () => {
          await secureStorage.removeItem(STORAGE_KEYS.accessToken);
          await secureStorage.removeItem(STORAGE_KEYS.refreshToken);
          setHydrating(false);
          setPhase('ready');
          router.replace('/(auth)/login');
        }}
      />
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Create `src/components/auth/BiometricGate.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { authenticate } from '@/lib/biometric';

export function BiometricGate({
  onSuccess,
  onFail,
}: {
  onSuccess: () => void;
  onFail: () => void;
}) {
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const triggered = useRef(false);

  async function tryAuth() {
    const res = await authenticate('Unlock Campusly');
    if (res.ok) {
      onSuccess();
      return;
    }
    if (res.reason === 'cancel') {
      setError('Authentication cancelled.');
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= 3) {
      onFail();
      return;
    }
    setError('Authentication failed — please try again.');
  }

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    void tryAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-2xl font-semibold text-foreground mb-2">Campusly</Text>
      <Text className="text-muted-foreground mb-8 text-center">
        Unlock with Face ID, fingerprint, or your device passcode.
      </Text>
      {error && <Text className="text-destructive text-sm mb-4">{error}</Text>}
      <Pressable
        onPress={() => void tryAuth()}
        className="bg-primary rounded-lg py-3 px-6"
      >
        <Text className="text-primary-foreground font-medium">Try again</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 4: Create `app/index.tsx`**

```tsx
import { ActivityIndicator, View } from 'react-native';

// While the providers root finishes hydrating, render a neutral loading state.
// Once hydration completes, ProvidersRoot redirects to (auth) or the role group.
export default function IndexRoute() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator />
    </View>
  );
}
```

- [ ] **Step 5: Placeholder role groups**

Create `app/(parent)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
export default function ParentLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(parent)/home.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLogout } from '@/hooks/auth/useLogout';

export default function ParentHome() {
  const ctx = useAuthStore((s) => s.context);
  const logout = useLogout();
  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-3xl font-semibold text-foreground">
        Hi {ctx?.user.firstName ?? ''}
      </Text>
      <Text className="text-muted-foreground mt-2">
        Parent home — real content coming in Plan 3.
      </Text>
      <Pressable
        onPress={() => logout.mutate()}
        className="mt-12 border border-border rounded-lg py-3 items-center"
      >
        <Text className="text-foreground">Sign out</Text>
      </Pressable>
    </View>
  );
}
```

Create `app/(student)/_layout.tsx` (mirrors parent layout — same content) and `app/(student)/home.tsx` (same shape as parent, with "Student home" text).

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx app/index.tsx app/\(parent\)/ app/\(student\)/ src/components/auth/
git commit -m "feat(app): root layout with biometric gate + role-aware redirect + placeholder home screens"
```

---

## Task 10: EAS profiles + bundle IDs

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Update `app.json` with iOS + Android bundle metadata**

In `app.json`, set:

```json
"name": "Campusly",
"slug": "campusly",
"version": "0.1.0",
"orientation": "portrait",
"icon": "./assets/icon.png",
"scheme": "campusly",
"userInterfaceStyle": "automatic",
"newArchEnabled": true,
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#ffffff"
},
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "co.za.campusly.app"
},
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "package": "co.za.campusly.app",
  "edgeToEdgeEnabled": true
},
"plugins": [
  "expo-router",
  "expo-secure-store",
  "expo-local-authentication",
  "expo-web-browser",
  "expo-notifications"
],
"experiments": { "typedRoutes": true }
```

Keep the existing `extra` block from Task 4.

- [ ] **Step 2: Create `eas.json`**

```json
{
  "cli": { "version": ">= 16.28.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_ENV": "development" },
      "ios": { "bundleIdentifier": "co.za.campusly.app.dev" },
      "android": { "package": "co.za.campusly.app.dev" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_ENV": "preview" },
      "ios": { "bundleIdentifier": "co.za.campusly.app.preview" },
      "android": { "package": "co.za.campusly.app.preview" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_ENV": "production" }
    }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 3: Document required EAS secrets**

Create `.env.example`:

```
# These are picked up by app.json's "extra" via expo-constants.
# For EAS builds, configure equivalents via `eas secret:create` on each profile.

EXPO_PUBLIC_API_URL=http://localhost:4500/api
EXPO_PUBLIC_ENV=development
```

Update `app.json` `extra` to use the env vars when present:

```json
"extra": {
  "apiUrl": "http://localhost:4500/api",
  "envName": "development"
}
```

(Static-value default for local dev. EAS profiles will override per build via the `env` blocks above plus a small `app.config.ts` change in a follow-up if we need fully dynamic config. Out of scope for v1; keep static-JSON simple.)

- [ ] **Step 4: Commit**

```bash
git add app.json eas.json .env.example
git commit -m "feat(eas): configure dev/preview/production profiles + per-profile bundle IDs"
```

---

## Task 11: CI workflow (GitHub Actions)

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```bash
mkdir -p .github/workflows
```

Contents:

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          path: campusly-mobile
      - uses: actions/checkout@v4
        with:
          repository: ${{ github.repository_owner }}/campusly-frontend
          path: campusly-frontend
          token: ${{ secrets.FRONTEND_REPO_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: campusly-mobile/package-lock.json

      - name: Install
        working-directory: campusly-mobile
        run: npm ci

      - name: Sync types from frontend
        working-directory: campusly-mobile
        run: ./scripts/sync-types.sh

      - name: Type check
        working-directory: campusly-mobile
        run: npx tsc --noEmit

      - name: Unit tests
        working-directory: campusly-mobile
        run: npm test
```

Notes for the implementer:
- The job checks out **two** repos so the type-sync script can run during CI. This requires a `FRONTEND_REPO_TOKEN` secret in the GitHub repo settings (a PAT with `repo` scope, or a fine-grained token scoped to `campusly-frontend`). Document this in the README's setup section.
- If `campusly-frontend` is open-source / publicly accessible at the time of CI run, the `token:` line can be removed. For private it's required.

- [ ] **Step 2: Add `README.md`**

```markdown
# Campusly Mobile

Expo (React Native) companion app for the Campusly school-platform parents and students.

## Local setup

```bash
git clone <this repo>
cd campusly-mobile
npm install

# Pull the latest shared types from the sibling frontend repo
# (expects ../campusly-frontend to exist)
npm run sync:types

# Start the dev server
npx expo start
```

## Project structure

- `app/` — Expo Router file routes (`(auth)`, `(parent)`, `(student)` groups)
- `src/lib/` — api-client, secure-storage, biometric, env
- `src/hooks/` — TanStack Query hooks (the only place `apiClient` is imported)
- `src/stores/` — Zustand stores
- `src/components/` — reusable RN components
- `src/types/` — TypeScript types synced from `campusly-frontend/src/types/`
- `scripts/sync-types.sh` — pulls from the frontend

## CI

GitHub Actions runs lint + typecheck + unit tests on every push. The workflow checks out the frontend repo to run the type-sync script. Configure a `FRONTEND_REPO_TOKEN` secret in the repo settings (PAT with read access to `campusly-frontend`).

## EAS

Three profiles in `eas.json`:

| Profile | Bundle ID | API URL |
|---|---|---|
| development | `co.za.campusly.app.dev` | localhost |
| preview | `co.za.campusly.app.preview` | staging |
| production | `co.za.campusly.app` | prod |

Build:
```bash
eas build --profile preview --platform all
```
```

- [ ] **Step 3: Commit**

```bash
git add .github/ README.md
git commit -m "ci: lint+typecheck+test workflow that pulls campusly-frontend for type sync"
```

---

## Task 12: Manual verification (the merge gate)

**Working directory:** `c:\Users\shaun\campusly-mobile`

This is the equivalent of Plan 1's Task 12 — manual verification the human runs. No subagent dispatch.

- [ ] **Step 1: Start the backend on localhost:4500**

In a separate terminal:
```bash
cd /c/Users/shaun/campusly-backend
npm run dev
```

- [ ] **Step 2: Start the mobile dev server**

```bash
cd /c/Users/shaun/campusly-mobile
npx expo start
```

- [ ] **Step 3: Connect a real device** (recommended) or use the Android emulator

- For a real Android device: install Expo Go from Play Store, scan the QR code in the terminal.
- For a real iPhone: install Expo Go from the App Store, scan with the camera.
- For Android emulator: `npx expo start --android` (requires Android Studio + an AVD).

If using a real Android device against a localhost backend, set `EXPO_PUBLIC_API_URL=http://<your-PC-LAN-IP>:4500/api` in `.env` or temporarily edit `app.json`'s `extra.apiUrl`.

- [ ] **Step 4: Verify the login flow end-to-end**

- Log in with an existing parent or student account
- App should land on `/(parent)/home` or `/(student)/home` based on role
- Verify the user's first name appears in the home greeting
- Tap **Sign out** — should return to login screen

- [ ] **Step 5: Verify the biometric gate (optional, requires device with Face ID / fingerprint)**

This task doesn't yet expose a Settings toggle to enable biometric — that's Plan 3+. To verify the gate works in isolation, manually set the flag via the React Native debugger or by adding a temporary `await secureStorage.setItem(STORAGE_KEYS.biometricEnabled, '1')` to the login success path, then re-launching the app. Expected: a Face ID / fingerprint prompt before the home screen renders.

Revert any temporary debug code before considering Plan 2 complete.

- [ ] **Step 6: Run `tsc --noEmit` and `npm test`**

```bash
npx tsc --noEmit
npm test
```

Both must succeed. If either fails, fix before marking Plan 2 done.

- [ ] **Step 7: Final commit (only if any fixes were needed)**

If Step 6 surfaced issues fixed in subsequent commits, no extra commit needed beyond those — Plan 2 is the sum of all the commits made above.

---

## Self-review checklist

Run through this once Tasks 1-11 are all committed:

- [ ] Repo exists at `c:\Users\shaun\campusly-mobile` with `master` branch
- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `app/(auth)/login.tsx` actually authenticates against `http://localhost:4500/api/auth/login`
- [ ] After login, role-based redirect lands the user on `(parent)/home` or `(student)/home`
- [ ] Teacher or admin role lands BACK on login (mobile is parent/student only — defensive routing in `ProvidersRoot.tsx`)
- [ ] No `apiClient` import in any `app/` or `src/components/` file (only `src/hooks/` and `src/stores/` may import it)
- [ ] No file in this plan exceeds 350 lines
- [ ] `eas.json` has three profiles with distinct bundle IDs
- [ ] CI workflow exists
- [ ] `npm run sync:types` produces no diff right after running (run-then-check is idempotent)
- [ ] `.env.example` documents the env vars
- [ ] `README.md` documents the setup

---

## Out of scope (defer to later plans)

- Push notification registration on login (Plan 3, paired with the inbox screen)
- Settings screen with biometric toggle (Plan 3 — `more/security.tsx`)
- Role-selector when user has both parent + student profiles (Plan 3)
- Tab bars on parent/student home (Plan 3)
- Any real data fetching beyond `mobile-context` (Plan 3+)
- OneGate payment flow (Plan 4)
- Homework submission (Plan 5)
- Maestro E2E tests (Plan 5)
- App-store submission (Plan 5)

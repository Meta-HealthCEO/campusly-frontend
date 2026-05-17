# Mobile App v1 — Plan 3: Student v1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full student-facing experience inside `c:\Users\shaun\campusly-mobile`'s `(student)` route group — bottom tabs, student home with today's snapshot, notifications inbox with push registration, settings screens (biometric toggle, sign out, notification preferences), a grades view, and the homework lifecycle (list, detail, typed submission for quiz / exercise / reading).

**Architecture:** Layered on top of Plan 2's foundations. Hooks under `src/hooks/student/` hold every `apiClient` call (pages and components stay clean per CLAUDE.md). Submission rendering uses a discriminated-union pattern: a single `HomeworkPlayer` component dispatches to `QuizPlayer` / `ExercisePlayer` / `ReadingPlayer` based on `homework.type`. Push tokens are registered via `expo-notifications`. Settings screens read/write SecureStore flags and `/api/notifications/preferences`.

**Tech Stack (already in repo):** Expo SDK 54, Expo Router 6, NativeWind 4, TanStack Query 5, Zustand 5, axios, react-hook-form + zod, `expo-secure-store`, `expo-local-authentication`, `expo-notifications`, `@react-native-community/netinfo`, `sonner-native`.

**Working directory:** `c:\Users\shaun\campusly-mobile`
**Backend:** `c:\Users\shaun\campusly-backend` (already updated by Plan 1)
**Spec:** `c:\Users\shaun\campusly-frontend\docs\superpowers\specs\2026-05-14-campusly-mobile-app-design.md`
**Reference patterns:** `c:\Users\shaun\khula-mobile` (same stack)

---

## Backend endpoint cheatsheet (verified during planning)

| Purpose | Path | Method | Notes |
|---|---|---|---|
| Student dashboard | `/api/student/dashboard` | GET | Aggregated today's view |
| Homework list (paginated) | `/api/homework` | GET | Query: `page`, `limit`, `sort`, `search`, `classId`, `subjectId` |
| Homework detail | `/api/homework/:id` | GET | Returns the typed brief + questions/quiz/content |
| Student submissions | `/api/homework/student/:studentId/submissions` | GET | Flat array, references `homeworkId` |
| Quiz submission | `/api/homework/:id/submit` | POST | Body: `{ type:"quiz", answers:[{ questionIndex, studentAnswer }] }` |
| Exercise submission | `/api/homework/:id/submit` | POST | Body: `{ type:"exercise", answers:[{ questionId, studentAnswer }] }` |
| Reading submission | `/api/homework/:id/submit` | POST | Body: `{ type:"reading", markedReadAt, comprehensionAnswers:[{ questionId, studentAnswer }] }` |
| Student marks | `/api/academic/marks/student/:studentId` | GET | Query: `term`, `academicYear` |
| Notifications inbox | `/api/notifications` | GET | Query: `page`, `limit`, `isRead` |
| Mark notification read | `/api/notifications/:id/read` | PATCH | |
| Notification prefs | `/api/notifications/preferences` | GET/PUT | PUT body accepts `categories: { homework, grades, attendance, billing, announcements }` |
| Device register | `/api/communication/devices` | POST | Body: `{ deviceToken, platform: 'web'\|'ios'\|'android', deviceName? }` |
| Device unregister | `/api/communication/devices/:token` | DELETE | `:token` is the device token in the URL path |

---

## File Structure (created in this plan)

```
src/
  hooks/student/
    useStudentDashboard.ts
    useHomeworkList.ts
    useHomeworkDetail.ts
    useStudentSubmissions.ts
    useSubmitHomework.ts
    useGrades.ts
  hooks/notifications/
    useNotifications.ts
    useMarkNotificationRead.ts
    useNotificationPreferences.ts
    usePushRegistration.ts
  hooks/profile/
    useUpdateProfile.ts            (stub, used by More screen)
  components/student/
    HomeworkCard.tsx
    GradeRow.tsx
    NotificationRow.tsx
    EmptyState.tsx
    LoadingSpinner.tsx
    ErrorBlock.tsx
  components/homework/
    HomeworkPlayer.tsx             (type-router)
    QuizPlayer.tsx
    ExercisePlayer.tsx
    ReadingPlayer.tsx
  lib/
    push.ts                        (expo-notifications helpers)

app/
  (student)/
    _layout.tsx                    (REPLACED — adds Tabs)
    home.tsx                       (REPLACED — real content)
    homework/
      index.tsx
      [id].tsx
      [id]/submit.tsx
    grades.tsx
    notifications.tsx
    more/
      index.tsx
      security.tsx
      notification-prefs.tsx
      profile.tsx
```

---

## Conventions for every task in this plan

- **Working directory:** `c:\Users\shaun\campusly-mobile`
- **Commit cadence:** one commit per logical task
- **Branch:** `master` (no feature branches)
- **TDD:** write a vitest unit test first for any pure logic helpers (answer-shape builders, validators). Skip unit tests for UI components — the manual verification at the end of this plan is the gate.
- **No `apiClient` import outside `src/hooks/`** — pages and components consume hooks only.
- **`@/` import alias** for `src/` (already configured by Plan 2).
- **No `any` types** in production code.
- **Files under 350 lines.**
- **NativeWind classes only** for styling. Use semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `text-destructive`). Never hardcoded hex.
- **Touch targets ≥ 44px** (use `py-3` / `px-4` minimums on buttons and tappable rows).

---

## Task 1: Student tabs layout

**Files:**
- Replace: `app/(student)/_layout.tsx`

- [ ] **Step 1: Read existing**

```bash
cat "app/(student)/_layout.tsx"
```

This is Plan 2's placeholder — a basic Stack. We're replacing with a Tabs layout.

- [ ] **Step 2: Replace with the Tabs layout**

```tsx
import { Tabs } from 'expo-router';
import { Bell, BookOpen, Home, MoreHorizontal, Trophy } from 'lucide-react-native';

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2f2f2f',
        tabBarInactiveTintColor: '#858585',
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: 'Homework',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="grades"
        options={{
          title: 'Grades',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

Note: `lucide-react-native` was installed in Plan 2 Task 1. The icon color is hardcoded for now because NativeWind classes don't apply to react-native props that aren't `style`/`className`. A theming pass to read these from CSS vars can come later.

- [ ] **Step 3: Stub the four new tabs so the layout renders without 404**

The `home` and previous tabs may already exist; create stubs for the others to make the `Tabs` layout valid.

Create `app/(student)/grades.tsx`:
```tsx
import { Text, View } from 'react-native';
export default function GradesStub() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Grades — coming next</Text>
    </View>
  );
}
```

Create `app/(student)/notifications.tsx` and `app/(student)/more/index.tsx` with similar stubs (substitute the placeholder text).

Create `app/(student)/homework/index.tsx`:
```tsx
import { Text, View } from 'react-native';
export default function HomeworkStub() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Homework — coming next</Text>
    </View>
  );
}
```

- [ ] **Step 4: Verify type check + commit**

```bash
npx tsc --noEmit
git add "app/(student)/"
git commit -m "feat(student): tabs layout with 5 sections + stub screens"
```

---

## Task 2: Shared UI primitives — `EmptyState`, `LoadingSpinner`, `ErrorBlock`

**Files:**
- Create: `src/components/student/EmptyState.tsx`
- Create: `src/components/student/LoadingSpinner.tsx`
- Create: `src/components/student/ErrorBlock.tsx`

(Placed under `student/` for now; we'll move them to `src/components/shared/` once parent screens land too.)

- [ ] **Step 1: `LoadingSpinner`**

```tsx
import { ActivityIndicator, View } from 'react-native';

export function LoadingSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator />
    </View>
  );
}
```

- [ ] **Step 2: `EmptyState`**

```tsx
import { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export function EmptyState({ title, description, icon }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 bg-background">
      {icon ? <View className="mb-4 opacity-60">{icon}</View> : null}
      <Text className="text-foreground text-lg font-medium text-center">{title}</Text>
      {description ? (
        <Text className="text-muted-foreground text-sm mt-2 text-center">{description}</Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: `ErrorBlock`**

```tsx
import { Pressable, Text, View } from 'react-native';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorBlock({ message, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 bg-background">
      <Text className="text-destructive text-base text-center">{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          className="mt-6 border border-border rounded-lg py-3 px-6"
        >
          <Text className="text-foreground">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/components/student/
git commit -m "feat(student): shared UI primitives (EmptyState, LoadingSpinner, ErrorBlock)"
```

---

## Task 3: Notifications inbox + push registration

**Files:**
- Create: `src/hooks/notifications/useNotifications.ts`
- Create: `src/hooks/notifications/useMarkNotificationRead.ts`
- Create: `src/hooks/notifications/usePushRegistration.ts`
- Create: `src/lib/push.ts`
- Create: `src/components/student/NotificationRow.tsx`
- Replace: `app/(student)/notifications.tsx`
- Modify: `src/components/auth/ProvidersRoot.tsx` (register push token after ready phase)

### Step 1 — `src/lib/push.ts`

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type DevicePushToken = {
  token: string;
  platform: 'ios' | 'android' | 'web';
};

export async function requestPermissionAndGetToken(): Promise<DevicePushToken | null> {
  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const ask = await Notifications.requestPermissionsAsync();
    granted = ask.granted ?? false;
  }
  if (!granted) return null;

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const platform =
    Platform.OS === 'ios'
      ? 'ios'
      : Platform.OS === 'android'
        ? 'android'
        : 'web';
  return { token: String(tokenData.data), platform };
}
```

### Step 2 — `usePushRegistration` hook

```ts
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { requestPermissionAndGetToken } from '@/lib/push';
import { useAuthStore } from '@/stores/useAuthStore';

export function usePushRegistration(enabled: boolean) {
  const registered = useRef(false);
  const hasContext = !!useAuthStore((s) => s.context);

  useEffect(() => {
    if (!enabled || !hasContext || registered.current) return;
    registered.current = true;
    (async () => {
      try {
        const tok = await requestPermissionAndGetToken();
        if (!tok) return;
        await apiClient.post('/communication/devices', {
          deviceToken: tok.token,
          platform: tok.platform,
        });
      } catch {
        // ignore — registration retries on next launch
        registered.current = false;
      }
    })();
  }, [enabled, hasContext]);
}
```

### Step 3 — `useNotifications` + `useMarkNotificationRead` hooks

`src/hooks/notifications/useNotifications.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  createdAt: string;
  data?: {
    category?: 'homework' | 'grades' | 'attendance' | 'billing' | 'announcements';
    deepLink?: string;
  };
};

type Page = { items: NotificationItem[]; total: number; page: number };

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await apiClient.get<Page | { data?: Page }>(
        '/notifications?page=1&limit=50',
      );
      const body = res.data as Page | { data?: Page };
      const page = ('data' in body && body.data ? body.data : body) as Page;
      return page;
    },
  });
}
```

`src/hooks/notifications/useMarkNotificationRead.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`, {});
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

### Step 4 — `NotificationRow` component

```tsx
import { Pressable, Text, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import type { NotificationItem } from '@/hooks/notifications/useNotifications';

type Props = {
  item: NotificationItem;
  onPress?: (item: NotificationItem) => void;
};

export function NotificationRow({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      className={`px-4 py-4 border-b border-border ${item.isRead ? '' : 'bg-accent/40'}`}
    >
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-foreground font-medium flex-1 mr-3" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: false })}
        </Text>
      </View>
      <Text className="text-muted-foreground text-sm" numberOfLines={2}>
        {item.message}
      </Text>
    </Pressable>
  );
}
```

Add `date-fns` if not already a dep:
```bash
npm install date-fns
```

### Step 5 — Replace `app/(student)/notifications.tsx`

```tsx
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { useMarkNotificationRead } from '@/hooks/notifications/useMarkNotificationRead';
import { NotificationRow } from '@/components/student/NotificationRow';
import { EmptyState } from '@/components/student/EmptyState';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

export default function NotificationsScreen() {
  const { data, isLoading, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message="Couldn't load notifications." onRetry={() => refetch()} />;

  const items = data?.items ?? [];
  if (items.length === 0) {
    return <EmptyState title="No notifications" description="When something happens, it'll show up here." />;
  }

  return (
    <View className="flex-1 bg-background pt-12">
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={async (n) => {
              if (!n.isRead) markRead.mutate(n.id);
              if (n.data?.deepLink) router.push(n.data.deepLink as never);
            }}
          />
        )}
        onRefresh={() => refetch()}
        refreshing={isLoading}
      />
    </View>
  );
}
```

### Step 6 — Wire push registration into the providers root

In `src/components/auth/ProvidersRoot.tsx`, add the hook call AFTER the existing hooks (it's a no-op until `enabled` is true):

```tsx
import { usePushRegistration } from '@/hooks/notifications/usePushRegistration';
// ... inside the component body, alongside the other hooks:
usePushRegistration(phase === 'ready' && hasToken);
```

Insert this BEFORE the `useEffect`s. The hook gates itself on auth state via `useAuthStore`.

### Step 7 — Commit

```bash
npx tsc --noEmit
git add src/lib/push.ts src/hooks/notifications/ src/components/student/NotificationRow.tsx "app/(student)/notifications.tsx" src/components/auth/ProvidersRoot.tsx package.json package-lock.json
git commit -m "feat(student): notifications inbox + push device registration on login"
```

---

## Task 4: More tab — sign out, biometric toggle, notification prefs

**Files:**
- Create: `src/hooks/notifications/useNotificationPreferences.ts`
- Create: `app/(student)/more/index.tsx` (full implementation)
- Create: `app/(student)/more/_layout.tsx`
- Create: `app/(student)/more/security.tsx`
- Create: `app/(student)/more/notification-prefs.tsx`
- Create: `app/(student)/more/profile.tsx`

### Step 1 — `useNotificationPreferences` hook

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type NotificationPrefs = {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  categories: {
    homework: boolean;
    grades: boolean;
    attendance: boolean;
    billing: boolean;
    announcements: boolean;
  };
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-prefs'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: NotificationPrefs } & NotificationPrefs>(
        '/notifications/preferences',
      );
      const body = res.data;
      return ((body as { data?: NotificationPrefs }).data ?? body) as NotificationPrefs;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs> & {
      categories?: Partial<NotificationPrefs['categories']>;
    }) => {
      const res = await apiClient.put<{ data?: NotificationPrefs } & NotificationPrefs>(
        '/notifications/preferences',
        patch,
      );
      const body = res.data;
      return ((body as { data?: NotificationPrefs }).data ?? body) as NotificationPrefs;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });
}
```

### Step 2 — `app/(student)/more/_layout.tsx`

```tsx
import { Stack } from 'expo-router';
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: true, headerTitleAlign: 'center' }} />;
}
```

### Step 3 — `app/(student)/more/index.tsx`

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, LogOut, ShieldCheck, Bell, User } from 'lucide-react-native';
import { useLogout } from '@/hooks/auth/useLogout';
import { useAuthStore } from '@/stores/useAuthStore';

type Row = { label: string; icon: typeof User; href: string };

const ROWS: Row[] = [
  { label: 'Profile', icon: User, href: '/(student)/more/profile' },
  { label: 'Security', icon: ShieldCheck, href: '/(student)/more/security' },
  { label: 'Notifications', icon: Bell, href: '/(student)/more/notification-prefs' },
];

export default function MoreIndex() {
  const logout = useLogout();
  const ctx = useAuthStore((s) => s.context);
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-4 py-8 border-b border-border">
        <Text className="text-2xl font-semibold text-foreground">
          {ctx?.user.firstName} {ctx?.user.lastName}
        </Text>
        <Text className="text-muted-foreground mt-1">{ctx?.user.email}</Text>
      </View>

      <View className="mt-4">
        {ROWS.map((r) => {
          const Icon = r.icon;
          return (
            <Pressable
              key={r.href}
              onPress={() => router.push(r.href as never)}
              className="flex-row items-center px-4 py-4 border-b border-border bg-background"
            >
              <Icon size={20} color="#2f2f2f" />
              <Text className="ml-3 text-foreground flex-1">{r.label}</Text>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => logout.mutate()}
        className="mx-4 mt-8 border border-destructive/40 rounded-lg py-3 flex-row items-center justify-center"
      >
        <LogOut size={18} color="#c83232" />
        <Text className="ml-2 text-destructive font-medium">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
```

### Step 4 — `app/(student)/more/security.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { getBiometricEnabled, isBiometricAvailable, setBiometricEnabled } from '@/lib/biometric';

export default function SecurityScreen() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      setAvailable(await isBiometricAvailable());
      setEnabled(await getBiometricEnabled());
    })();
  }, []);

  async function toggle(next: boolean) {
    await setBiometricEnabled(next);
    setEnabled(next);
  }

  return (
    <View className="flex-1 bg-background px-4 pt-6">
      <View className="flex-row items-center justify-between py-4 border-b border-border">
        <View className="flex-1 pr-4">
          <Text className="text-foreground font-medium">Unlock with biometrics</Text>
          <Text className="text-muted-foreground text-sm mt-1">
            {available
              ? 'Require Face ID, fingerprint, or device passcode when opening the app.'
              : 'Not available on this device.'}
          </Text>
        </View>
        <Switch value={enabled} onValueChange={toggle} disabled={!available} />
      </View>
    </View>
  );
}
```

### Step 5 — `app/(student)/more/notification-prefs.tsx`

```tsx
import { ScrollView, Switch, Text, View } from 'react-native';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPrefs,
} from '@/hooks/notifications/useNotificationPreferences';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

const CATEGORIES: Array<{ key: keyof NotificationPrefs['categories']; label: string; description: string }> = [
  { key: 'homework', label: 'Homework', description: 'New homework, due reminders' },
  { key: 'grades', label: 'Grades', description: 'When marks or reports are released' },
  { key: 'attendance', label: 'Attendance', description: 'Absences and late arrivals' },
  { key: 'billing', label: 'Fees & Wallet', description: 'Invoices, payments, top-ups' },
  { key: 'announcements', label: 'Announcements', description: 'School-wide bulletins' },
];

export default function NotificationPrefsScreen() {
  const { data, isLoading, error, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (isLoading) return <LoadingSpinner />;
  if (error || !data) return <ErrorBlock message="Couldn't load preferences." onRetry={() => refetch()} />;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-4 py-6 border-b border-border">
        <Text className="text-foreground font-medium mb-1">Push notifications</Text>
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-muted-foreground flex-1 pr-4">
            Receive push notifications on this device.
          </Text>
          <Switch
            value={data.push}
            onValueChange={(push) => update.mutate({ push })}
          />
        </View>
      </View>

      <View className="px-4 py-4">
        <Text className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
          Categories
        </Text>
        {CATEGORIES.map((c) => (
          <View key={c.key} className="flex-row items-center justify-between py-3 border-b border-border">
            <View className="flex-1 pr-4">
              <Text className="text-foreground font-medium">{c.label}</Text>
              <Text className="text-muted-foreground text-xs mt-1">{c.description}</Text>
            </View>
            <Switch
              value={data.categories[c.key]}
              onValueChange={(next) =>
                update.mutate({ categories: { [c.key]: next } as Partial<NotificationPrefs['categories']> })
              }
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

### Step 6 — `app/(student)/more/profile.tsx` (read-only for v1)

```tsx
import { Text, View } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ProfileScreen() {
  const ctx = useAuthStore((s) => s.context);
  if (!ctx) return null;
  return (
    <View className="flex-1 bg-background px-4 pt-6">
      <Row label="Name" value={`${ctx.user.firstName} ${ctx.user.lastName}`} />
      <Row label="Email" value={ctx.user.email} />
      {ctx.user.phone ? <Row label="Phone" value={ctx.user.phone} /> : null}
      <Row label="School" value={ctx.school.name} />
      <Row label="Role" value={ctx.user.role} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-b border-border">
      <Text className="text-muted-foreground text-xs uppercase tracking-wide">{label}</Text>
      <Text className="text-foreground mt-1">{value}</Text>
    </View>
  );
}
```

### Step 7 — Commit

```bash
npx tsc --noEmit
git add src/hooks/notifications/useNotificationPreferences.ts "app/(student)/more/"
git commit -m "feat(student): More tab — profile, security (biometric toggle), notification prefs, sign out"
```

---

## Task 5: Grades screen

**Files:**
- Create: `src/hooks/student/useGrades.ts`
- Create: `src/components/student/GradeRow.tsx`
- Replace: `app/(student)/grades.tsx`

### Step 1 — `useGrades`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

export type MarkItem = {
  id: string;
  assessmentName: string;
  subjectId: string;
  subjectName?: string;
  mark: number;
  totalMarks: number;
  term?: number;
  academicYear?: number;
  recordedAt?: string;
};

export function useGrades() {
  const studentId = useAuthStore((s) => s.context?.student?.id);
  return useQuery({
    queryKey: ['grades', studentId],
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: MarkItem[] } | MarkItem[]>(
        `/academic/marks/student/${studentId}`,
      );
      const body = res.data;
      return ((body as { data?: MarkItem[] }).data ?? body) as MarkItem[];
    },
  });
}
```

### Step 2 — `GradeRow`

```tsx
import { Text, View } from 'react-native';
import type { MarkItem } from '@/hooks/student/useGrades';

export function GradeRow({ item }: { item: MarkItem }) {
  const pct = item.totalMarks > 0 ? Math.round((item.mark / item.totalMarks) * 100) : 0;
  return (
    <View className="px-4 py-4 border-b border-border flex-row items-center justify-between">
      <View className="flex-1 pr-4">
        <Text className="text-foreground font-medium" numberOfLines={1}>
          {item.assessmentName}
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">
          {item.subjectName ?? 'Subject'}{item.term ? ` · Term ${item.term}` : ''}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-foreground font-semibold">
          {item.mark}/{item.totalMarks}
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">{pct}%</Text>
      </View>
    </View>
  );
}
```

### Step 3 — Replace `app/(student)/grades.tsx`

```tsx
import { FlatList, View } from 'react-native';
import { useGrades } from '@/hooks/student/useGrades';
import { GradeRow } from '@/components/student/GradeRow';
import { EmptyState } from '@/components/student/EmptyState';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

export default function GradesScreen() {
  const { data, isLoading, error, refetch } = useGrades();
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message="Couldn't load grades." onRetry={() => refetch()} />;

  const items = data ?? [];
  if (items.length === 0) return <EmptyState title="No grades yet" description="Marks appear here as your teachers release them." />;

  return (
    <View className="flex-1 bg-background pt-12">
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GradeRow item={item} />}
        onRefresh={() => refetch()}
        refreshing={isLoading}
      />
    </View>
  );
}
```

### Step 4 — Commit

```bash
npx tsc --noEmit
git add src/hooks/student/useGrades.ts src/components/student/GradeRow.tsx "app/(student)/grades.tsx"
git commit -m "feat(student): grades screen reading /academic/marks/student/:id"
```

---

## Task 6: Student home screen

**Files:**
- Create: `src/hooks/student/useStudentDashboard.ts`
- Replace: `app/(student)/home.tsx`

### Step 1 — `useStudentDashboard`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type StudentDashboard = {
  todayHomework: Array<{
    id: string;
    title: string;
    dueDate: string;
    subjectName?: string;
    type?: 'quiz' | 'exercise' | 'reading';
  }>;
  upcomingHomework?: Array<{
    id: string;
    title: string;
    dueDate: string;
    subjectName?: string;
  }>;
  todayLessons?: Array<{
    id: string;
    title: string;
    subjectName?: string;
    startTime?: string;
  }>;
};

export function useStudentDashboard() {
  return useQuery({
    queryKey: ['student-dashboard'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: StudentDashboard } & StudentDashboard>(
        '/student/dashboard',
      );
      const body = res.data;
      return ((body as { data?: StudentDashboard }).data ?? body) as StudentDashboard;
    },
  });
}
```

**Implementer note:** If the actual backend response shape differs from the TypeScript above (likely — `buildStudentDashboard` may return different field names), READ `c:\Users\shaun\campusly-backend\src\modules\Student\controller-dashboard.ts` and `service-dashboard.ts` (or similar) to see the real shape, then adjust the `StudentDashboard` type to match. Preserve the spirit of the screen below — it just needs "today's homework" and (optionally) "today's lessons."

### Step 2 — Replace `app/(student)/home.tsx`

```tsx
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStudentDashboard } from '@/hooks/student/useStudentDashboard';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';
import { HomeworkCard } from '@/components/student/HomeworkCard';

export default function StudentHome() {
  const ctx = useAuthStore((s) => s.context);
  const { data, isLoading, error, refetch } = useStudentDashboard();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message="Couldn't load today's overview." onRetry={() => refetch()} />;

  const today = data?.todayHomework ?? [];
  const upcoming = data?.upcomingHomework ?? [];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 56, paddingBottom: 32 }}>
      <View className="px-4 mb-6">
        <Text className="text-3xl font-semibold text-foreground">
          Hi {ctx?.user.firstName ?? ''}
        </Text>
        <Text className="text-muted-foreground mt-1">
          {today.length === 0 ? "Nothing due today — nice." : `${today.length} due today.`}
        </Text>
      </View>

      {today.length > 0 ? (
        <View className="px-4">
          <Text className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Due today</Text>
          {today.map((h) => (
            <HomeworkCard
              key={h.id}
              homework={h}
              onPress={() => router.push(`/(student)/homework/${h.id}` as never)}
            />
          ))}
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View className="px-4 mt-6">
          <Text className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Coming up</Text>
          {upcoming.slice(0, 5).map((h) => (
            <HomeworkCard
              key={h.id}
              homework={h}
              onPress={() => router.push(`/(student)/homework/${h.id}` as never)}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
```

`HomeworkCard` is created in Task 7 — to avoid breaking the build now, also create a minimal version of `HomeworkCard.tsx` here (it's reused in Task 7's list screen anyway):

Create `src/components/student/HomeworkCard.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';

type HomeworkLike = {
  id: string;
  title: string;
  dueDate: string;
  subjectName?: string;
  type?: 'quiz' | 'exercise' | 'reading';
};

export function HomeworkCard({
  homework,
  onPress,
}: {
  homework: HomeworkLike;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-card border border-border rounded-lg p-4 mb-3"
    >
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-card-foreground font-medium flex-1 mr-3" numberOfLines={2}>
          {homework.title}
        </Text>
        {homework.type ? (
          <Text className="text-muted-foreground text-xs uppercase tracking-wide">
            {homework.type}
          </Text>
        ) : null}
      </View>
      <Text className="text-muted-foreground text-sm">
        {homework.subjectName ?? 'Subject'} · due {format(new Date(homework.dueDate), 'd MMM')}
      </Text>
    </Pressable>
  );
}
```

### Step 3 — Commit

```bash
npx tsc --noEmit
git add src/hooks/student/useStudentDashboard.ts src/components/student/HomeworkCard.tsx "app/(student)/home.tsx"
git commit -m "feat(student): home screen with today + upcoming homework, HomeworkCard component"
```

---

## Task 7: Homework list screen

**Files:**
- Create: `src/hooks/student/useHomeworkList.ts`
- Create: `src/hooks/student/useStudentSubmissions.ts`
- Replace: `app/(student)/homework/index.tsx`

### Step 1 — `useHomeworkList`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type HomeworkListItem = {
  id: string;
  title: string;
  dueDate: string;
  totalMarks: number;
  type: 'quiz' | 'exercise' | 'reading';
  classId: string;
  subjectId: string;
  subjectName?: string;
  status?: 'pending' | 'submitted' | 'overdue';
};

type Page = { items: HomeworkListItem[]; total: number; page: number };

export function useHomeworkList(params?: { search?: string }) {
  return useQuery({
    queryKey: ['homework-list', params?.search ?? null],
    staleTime: 60_000,
    queryFn: async () => {
      const search = params?.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const res = await apiClient.get<{ data?: Page } | Page>(
        `/homework?page=1&limit=100${search}`,
      );
      const body = res.data;
      const page = ('data' in (body as object) && (body as { data?: Page }).data
        ? (body as { data: Page }).data
        : (body as Page));
      return page;
    },
  });
}
```

### Step 2 — `useStudentSubmissions`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

export type SubmissionItem = {
  id: string;
  homeworkId: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
};

export function useStudentSubmissions() {
  const studentId = useAuthStore((s) => s.context?.student?.id);
  return useQuery({
    queryKey: ['student-submissions', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: SubmissionItem[] } | SubmissionItem[]>(
        `/homework/student/${studentId}/submissions`,
      );
      const body = res.data;
      return ((body as { data?: SubmissionItem[] }).data ?? body) as SubmissionItem[];
    },
  });
}
```

### Step 3 — Replace `app/(student)/homework/index.tsx`

```tsx
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useHomeworkList } from '@/hooks/student/useHomeworkList';
import { useStudentSubmissions } from '@/hooks/student/useStudentSubmissions';
import { HomeworkCard } from '@/components/student/HomeworkCard';
import { EmptyState } from '@/components/student/EmptyState';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

type Filter = 'all' | 'pending' | 'submitted';

export default function HomeworkListScreen() {
  const [filter, setFilter] = useState<Filter>('pending');
  const list = useHomeworkList();
  const subs = useStudentSubmissions();

  const submittedIds = useMemo(
    () => new Set((subs.data ?? []).map((s) => s.homeworkId)),
    [subs.data],
  );

  const items = useMemo(() => {
    const all = list.data?.items ?? [];
    if (filter === 'pending') return all.filter((h) => !submittedIds.has(h.id));
    if (filter === 'submitted') return all.filter((h) => submittedIds.has(h.id));
    return all;
  }, [list.data, submittedIds, filter]);

  if (list.isLoading || subs.isLoading) return <LoadingSpinner />;
  if (list.error) return <ErrorBlock message="Couldn't load homework." onRetry={() => list.refetch()} />;

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="flex-row px-4 mb-3 gap-2">
        {(['pending', 'submitted', 'all'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-2 rounded-full border ${
              filter === f ? 'bg-primary border-primary' : 'border-border bg-background'
            }`}
          >
            <Text className={filter === f ? 'text-primary-foreground' : 'text-foreground'}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <EmptyState
          title={
            filter === 'submitted'
              ? "Nothing submitted yet"
              : filter === 'pending'
                ? "All caught up"
                : "No homework"
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          data={items}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => (
            <HomeworkCard
              homework={item}
              onPress={() => router.push(`/(student)/homework/${item.id}` as never)}
            />
          )}
          onRefresh={() => {
            list.refetch();
            subs.refetch();
          }}
          refreshing={list.isFetching || subs.isFetching}
        />
      )}
    </View>
  );
}
```

### Step 4 — Commit

```bash
npx tsc --noEmit
git add src/hooks/student/useHomeworkList.ts src/hooks/student/useStudentSubmissions.ts "app/(student)/homework/index.tsx"
git commit -m "feat(student): homework list with pending/submitted/all filters"
```

---

## Task 8: Homework detail screen + start-flow router

**Files:**
- Create: `src/hooks/student/useHomeworkDetail.ts`
- Create: `app/(student)/homework/[id].tsx`

### Step 1 — `useHomeworkDetail`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type QuizQuestion = {
  questionText: string;
  options: string[];
  correctIndex?: number;
};

export type ExerciseQuestion = {
  id: string;
  questionText: string;
  type?: 'short' | 'long';
};

export type ComprehensionQuestion = {
  id: string;
  questionText: string;
};

export type HomeworkDetail = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  totalMarks: number;
  subjectId: string;
  subjectName?: string;
  type: 'quiz' | 'exercise' | 'reading';
  questions?: ExerciseQuestion[];           // exercise
  quiz?: { questions: QuizQuestion[] };     // quiz
  contentResourceId?: string;               // reading
  comprehensionQuestions?: ComprehensionQuestion[]; // reading
};

export function useHomeworkDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['homework-detail', id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: HomeworkDetail } & HomeworkDetail>(
        `/homework/${id}`,
      );
      const body = res.data;
      return ((body as { data?: HomeworkDetail }).data ?? body) as HomeworkDetail;
    },
  });
}
```

**Implementer note:** the exact shape of `quiz.questions`, `questions` (exercise), and `comprehensionQuestions` (reading) depends on the backend's Homework model. Read `c:\Users\shaun\campusly-backend\src\modules\Homework\model.ts` / `controller.ts` to confirm. Adjust the type. Keep the three-way discriminator on `type`.

### Step 2 — `app/(student)/homework/[id].tsx`

```tsx
import { ScrollView, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useHomeworkDetail } from '@/hooks/student/useHomeworkDetail';
import { useStudentSubmissions } from '@/hooks/student/useStudentSubmissions';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

export default function HomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useHomeworkDetail(id);
  const subs = useStudentSubmissions();

  if (detail.isLoading) return <LoadingSpinner />;
  if (detail.error || !detail.data) {
    return <ErrorBlock message="Couldn't load this homework." onRetry={() => detail.refetch()} />;
  }

  const hw = detail.data;
  const submitted = (subs.data ?? []).some((s) => s.homeworkId === hw.id);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <Text className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
        {hw.type} · {hw.subjectName ?? 'Subject'}
      </Text>
      <Text className="text-2xl font-semibold text-foreground mb-2">{hw.title}</Text>
      <Text className="text-muted-foreground mb-6">
        Due {format(new Date(hw.dueDate), 'EEE d MMM, HH:mm')} · {hw.totalMarks} marks
      </Text>
      {hw.description ? (
        <Text className="text-foreground leading-6 mb-8">{hw.description}</Text>
      ) : null}

      {submitted ? (
        <View className="bg-muted rounded-lg p-4">
          <Text className="text-foreground font-medium">Submitted</Text>
          <Text className="text-muted-foreground text-sm mt-1">
            Your teacher will mark this and you'll see the result in Grades.
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push(`/(student)/homework/${hw.id}/submit` as never)}
          className="bg-primary rounded-lg py-3 items-center"
        >
          <Text className="text-primary-foreground font-medium">Start</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
```

### Step 3 — Commit

```bash
npx tsc --noEmit
git add src/hooks/student/useHomeworkDetail.ts "app/(student)/homework/[id].tsx"
git commit -m "feat(student): homework detail screen with submitted-state guard"
```

---

## Task 9: Homework submission (quiz + exercise + reading)

**Files:**
- Create: `src/hooks/student/useSubmitHomework.ts`
- Create: `src/components/homework/HomeworkPlayer.tsx`
- Create: `src/components/homework/QuizPlayer.tsx`
- Create: `src/components/homework/ExercisePlayer.tsx`
- Create: `src/components/homework/ReadingPlayer.tsx`
- Create: `app/(student)/homework/[id]/submit.tsx`

### Step 1 — `useSubmitHomework`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type QuizSubmission = {
  type: 'quiz';
  answers: Array<{ questionIndex: number; studentAnswer: string }>;
};
export type ExerciseSubmission = {
  type: 'exercise';
  answers: Array<{ questionId: string; studentAnswer: string }>;
};
export type ReadingSubmission = {
  type: 'reading';
  markedReadAt: string; // ISO
  comprehensionAnswers: Array<{ questionId: string; studentAnswer: string }>;
};

export type SubmissionBody = QuizSubmission | ExerciseSubmission | ReadingSubmission;

export function useSubmitHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: SubmissionBody }) => {
      const res = await apiClient.post(`/homework/${id}/submit`, body);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['student-submissions'] });
      qc.invalidateQueries({ queryKey: ['homework-detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['student-dashboard'] });
      qc.invalidateQueries({ queryKey: ['homework-list'] });
    },
  });
}
```

### Step 2 — `QuizPlayer`

```tsx
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { HomeworkDetail } from '@/hooks/student/useHomeworkDetail';

type Props = {
  homework: HomeworkDetail;
  onSubmit: (answers: Array<{ questionIndex: number; studentAnswer: string }>) => void;
  submitting: boolean;
};

export function QuizPlayer({ homework, onSubmit, submitting }: Props) {
  const questions = homework.quiz?.questions ?? [];
  const [picked, setPicked] = useState<Record<number, string>>({});

  const allAnswered = questions.every((_, i) => picked[i] !== undefined);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {questions.map((q, i) => (
        <View key={i} className="mb-6">
          <Text className="text-foreground font-medium mb-3">
            {i + 1}. {q.questionText}
          </Text>
          {q.options.map((opt, optI) => {
            const selected = picked[i] === opt;
            return (
              <Pressable
                key={optI}
                onPress={() => setPicked((p) => ({ ...p, [i]: opt }))}
                className={`border rounded-lg p-3 mb-2 ${
                  selected ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <Text className={selected ? 'text-foreground font-medium' : 'text-foreground'}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Pressable
        disabled={!allAnswered || submitting}
        onPress={() =>
          onSubmit(
            Object.entries(picked).map(([k, v]) => ({
              questionIndex: Number(k),
              studentAnswer: v,
            })),
          )
        }
        className={`rounded-lg py-3 items-center ${allAnswered ? 'bg-primary' : 'bg-muted'}`}
      >
        <Text className={allAnswered ? 'text-primary-foreground font-medium' : 'text-muted-foreground'}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

### Step 3 — `ExercisePlayer`

```tsx
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { HomeworkDetail } from '@/hooks/student/useHomeworkDetail';

type Props = {
  homework: HomeworkDetail;
  onSubmit: (answers: Array<{ questionId: string; studentAnswer: string }>) => void;
  submitting: boolean;
};

export function ExercisePlayer({ homework, onSubmit, submitting }: Props) {
  const questions = homework.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const allAnswered = questions.every((q) => (answers[q.id] ?? '').trim().length > 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {questions.map((q, i) => (
        <View key={q.id} className="mb-6">
          <Text className="text-foreground font-medium mb-3">
            {i + 1}. {q.questionText}
          </Text>
          <TextInput
            className="border border-border rounded-lg p-3 text-foreground"
            multiline
            placeholder="Your answer"
            placeholderTextColor="#9ca3af"
            value={answers[q.id] ?? ''}
            onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            style={{ minHeight: q.type === 'long' ? 120 : 64 }}
          />
        </View>
      ))}
      <Pressable
        disabled={!allAnswered || submitting}
        onPress={() =>
          onSubmit(
            Object.entries(answers).map(([questionId, studentAnswer]) => ({
              questionId,
              studentAnswer,
            })),
          )
        }
        className={`rounded-lg py-3 items-center ${allAnswered ? 'bg-primary' : 'bg-muted'}`}
      >
        <Text className={allAnswered ? 'text-primary-foreground font-medium' : 'text-muted-foreground'}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

### Step 4 — `ReadingPlayer`

```tsx
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { HomeworkDetail } from '@/hooks/student/useHomeworkDetail';

type Props = {
  homework: HomeworkDetail;
  onSubmit: (payload: {
    markedReadAt: string;
    comprehensionAnswers: Array<{ questionId: string; studentAnswer: string }>;
  }) => void;
  submitting: boolean;
};

export function ReadingPlayer({ homework, onSubmit, submitting }: Props) {
  const [read, setRead] = useState(false);
  const questions = homework.comprehensionQuestions ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const allAnswered =
    read &&
    questions.every((q) => (answers[q.id] ?? '').trim().length > 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="bg-muted rounded-lg p-4 mb-4">
        <Text className="text-foreground">
          Open the reading material from your teacher's notes or shared link, then come back here to confirm and answer the comprehension questions.
        </Text>
      </View>
      <Pressable
        onPress={() => setRead((r) => !r)}
        className={`border rounded-lg p-3 mb-6 flex-row items-center ${
          read ? 'border-primary bg-primary/10' : 'border-border'
        }`}
      >
        <View
          className={`w-5 h-5 rounded border mr-3 ${
            read ? 'bg-primary border-primary' : 'border-border'
          }`}
        />
        <Text className="text-foreground">I've read the material</Text>
      </Pressable>

      {questions.map((q, i) => (
        <View key={q.id} className="mb-6">
          <Text className="text-foreground font-medium mb-3">
            {i + 1}. {q.questionText}
          </Text>
          <TextInput
            className="border border-border rounded-lg p-3 text-foreground"
            multiline
            placeholder="Your answer"
            placeholderTextColor="#9ca3af"
            value={answers[q.id] ?? ''}
            onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            style={{ minHeight: 80 }}
          />
        </View>
      ))}

      <Pressable
        disabled={!allAnswered || submitting}
        onPress={() =>
          onSubmit({
            markedReadAt: new Date().toISOString(),
            comprehensionAnswers: Object.entries(answers).map(([questionId, studentAnswer]) => ({
              questionId,
              studentAnswer,
            })),
          })
        }
        className={`rounded-lg py-3 items-center ${allAnswered ? 'bg-primary' : 'bg-muted'}`}
      >
        <Text className={allAnswered ? 'text-primary-foreground font-medium' : 'text-muted-foreground'}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

### Step 5 — `HomeworkPlayer` (type router)

```tsx
import type { HomeworkDetail } from '@/hooks/student/useHomeworkDetail';
import { QuizPlayer } from './QuizPlayer';
import { ExercisePlayer } from './ExercisePlayer';
import { ReadingPlayer } from './ReadingPlayer';

type Props = {
  homework: HomeworkDetail;
  submitting: boolean;
  onQuizSubmit: (answers: Array<{ questionIndex: number; studentAnswer: string }>) => void;
  onExerciseSubmit: (answers: Array<{ questionId: string; studentAnswer: string }>) => void;
  onReadingSubmit: (payload: {
    markedReadAt: string;
    comprehensionAnswers: Array<{ questionId: string; studentAnswer: string }>;
  }) => void;
};

export function HomeworkPlayer({
  homework,
  submitting,
  onQuizSubmit,
  onExerciseSubmit,
  onReadingSubmit,
}: Props) {
  switch (homework.type) {
    case 'quiz':
      return <QuizPlayer homework={homework} submitting={submitting} onSubmit={onQuizSubmit} />;
    case 'exercise':
      return <ExercisePlayer homework={homework} submitting={submitting} onSubmit={onExerciseSubmit} />;
    case 'reading':
      return <ReadingPlayer homework={homework} submitting={submitting} onSubmit={onReadingSubmit} />;
  }
}
```

### Step 6 — Submit screen

Create `app/(student)/homework/[id]/submit.tsx`:

```tsx
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHomeworkDetail } from '@/hooks/student/useHomeworkDetail';
import { useSubmitHomework } from '@/hooks/student/useSubmitHomework';
import { HomeworkPlayer } from '@/components/homework/HomeworkPlayer';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

export default function HomeworkSubmitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useHomeworkDetail(id);
  const submit = useSubmitHomework();

  if (detail.isLoading) return <LoadingSpinner />;
  if (detail.error || !detail.data) {
    return <ErrorBlock message="Couldn't load this homework." onRetry={() => detail.refetch()} />;
  }

  async function dispatch(payload:
    | { type: 'quiz'; answers: Array<{ questionIndex: number; studentAnswer: string }> }
    | { type: 'exercise'; answers: Array<{ questionId: string; studentAnswer: string }> }
    | { type: 'reading'; markedReadAt: string; comprehensionAnswers: Array<{ questionId: string; studentAnswer: string }> }
  ) {
    try {
      await submit.mutateAsync({ id: id as string, body: payload });
      router.replace(`/(student)/homework/${id}` as never);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Submission failed. Please try again.';
      Alert.alert('Submit', msg);
    }
  }

  return (
    <View className="flex-1 bg-background pt-12">
      <HomeworkPlayer
        homework={detail.data}
        submitting={submit.isPending}
        onQuizSubmit={(answers) => dispatch({ type: 'quiz', answers })}
        onExerciseSubmit={(answers) => dispatch({ type: 'exercise', answers })}
        onReadingSubmit={(payload) => dispatch({ type: 'reading', ...payload })}
      />
    </View>
  );
}
```

### Step 7 — Commit

```bash
npx tsc --noEmit
git add src/hooks/student/useSubmitHomework.ts src/components/homework/ "app/(student)/homework/[id]/"
git commit -m "feat(student): homework submission flow (quiz/exercise/reading) with typed dispatcher"
```

---

## Task 10: Manual verification (the merge gate)

User-run. Skip the subagent.

- [ ] Start backend: `cd c:\Users\shaun\campusly-backend && npm run dev`
- [ ] Start mobile: `cd c:\Users\shaun\campusly-mobile && npx expo start`
- [ ] Log in as a STUDENT account
- [ ] On the home tab: today's homework cards appear (or "Nothing due today")
- [ ] Tap the **Homework** tab: list of pending homework appears; switch to "Submitted" filter to see past submissions
- [ ] Tap a homework: detail screen loads, "Start" button visible
- [ ] Tap **Start** on a quiz, answer questions, submit. Confirm:
  - Network call shows `POST /homework/:id/submit` body matches `{ type:'quiz', answers:[...] }`
  - On success, screen returns to detail, now shows "Submitted"
  - Pull-to-refresh on Homework list shows the item moved to Submitted filter
- [ ] Repeat for an exercise and a reading homework
- [ ] **Grades** tab: list of marks renders, %'s calculated correctly
- [ ] **Inbox** tab: notifications list renders. Tap one — `isRead` flips, deep-link routes (or no-op if no deepLink)
- [ ] **More** tab:
  - Profile shows name, email, school, role
  - Security: toggle biometric on, close app, relaunch → biometric prompt fires; toggle off, relaunch → no prompt
  - Notifications: toggle a category off → `PUT /notifications/preferences` fires with `{ categories: { homework: false } }` (verify in backend logs)
  - Sign out: clears session, routes to login
- [ ] Push registration: in backend logs, confirm a `POST /communication/devices` was made when the student first granted permission

If any of these fails, file a fix. Otherwise Plan 3 is complete.

---

## Self-review checklist

- [ ] All five tabs in `(student)/_layout.tsx` render without 404
- [ ] No `apiClient` import in any `app/` or `src/components/` file (only `src/hooks/`)
- [ ] No `any` types in production code
- [ ] No file exceeds 350 lines
- [ ] Empty + loading + error states on every list screen
- [ ] All Mongo-friendly mutations invalidate the relevant TanStack query keys (`student-submissions`, `student-dashboard`, `homework-list`, `homework-detail`, `notifications`, `notification-prefs`)
- [ ] Backend's actual response shapes match the TypeScript types — adjust the types if reality differs
- [ ] Push registration only fires once per login (ref guard) and is cleared on logout (already wired in Plan 2's `useLogout` via `DELETE /communication/devices/:token` — note: Plan 2's useLogout does NOT currently call delete-device; if it doesn't, add it now)

**Implementer note on logout:** when implementing Task 3 (push registration), verify Plan 2's `useLogout` hook already deletes the device token on the server. If not, ADD that step BEFORE the `qc.clear()` call. Pseudocode:

```ts
const token = await secureStorage.getItem('campusly.pushToken');
if (token) {
  try { await apiClient.delete(`/communication/devices/${token}`); } catch {}
}
```

Also store the token in SecureStore when `usePushRegistration` first registers it (key: `campusly.pushToken`).

---

## Out of scope (defer to later plans)

- Parent flows (Plan 4 — payments + parent shell)
- Accessibility audit + VoiceOver pass
- Maestro E2E
- App-store submission
- Native Apple Pay / Google Pay
- Real-time updates (Socket.IO subscription for new homework)
- Offline mutation queue
- Assignments module (different from homework — has file upload)

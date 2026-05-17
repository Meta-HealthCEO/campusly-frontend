# Mobile App v1 — Plan 4: Teacher v1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the teacher-facing experience inside `c:\Users\shaun\campusly-mobile`. Five "phone-native" capabilities: today's schedule, classes + rosters, roll-call attendance, homework marking, and read-only inbox of notifications + announcements. Replaces the parent placeholder built in Plan 2 — parents stay on web.

**Architecture:** Layered on top of Plans 2 + 3. The `(parent)` route group is removed; a new `(teacher)` route group is added with its own bottom-tab layout. Hooks under `src/hooks/teacher/`. The role gate in `ProvidersRoot` now routes `teacher → /(teacher)/home`, `student → /(student)/home`, anything else (including `parent`) → a friendly "Use the web app" screen.

**Tech stack (already in repo):** Expo SDK 54, Expo Router 6, NativeWind 4, TanStack Query 5, Zustand 5, axios, react-hook-form + zod, `expo-secure-store`, `expo-local-authentication`, `expo-notifications`, `sonner-native`, `lucide-react-native`, `date-fns`.

**Working directory:** `c:\Users\shaun\campusly-mobile`
**Backend:** `c:\Users\shaun\campusly-backend`
**Spec:** `c:\Users\shaun\campusly-frontend\docs\superpowers\specs\2026-05-14-campusly-mobile-app-design.md` (parent scope sections are now superseded by this plan)

---

## Verified backend endpoint cheatsheet

| Purpose | Path | Method | Body / params |
|---|---|---|---|
| Teacher's classes | `/api/academic/classes` | GET | (auto-filtered by JWT) |
| Class detail | `/api/academic/classes/:classId` | GET | — |
| Class roster | `/api/students?classId=:classId` | GET | — |
| Teacher timetable | `/api/academic/timetable/teacher/:teacherId` | GET | Returns full week; client filters today |
| Today's roll (existing records) | `/api/attendance/class/:classId?date=YYYY-MM-DD` | GET | — |
| Daily summary | `/api/attendance/stats/class/:classId` | GET | — |
| Bulk roll-call | `/api/attendance/bulk` | POST | `{ classId, date, period, records: [{ studentId, status, notes? }] }` |
| Single mark | `/api/attendance` | POST | `{ studentId, classId, date, period, status, notes? }` |
| Teacher workbench dashboard | `/api/teacher-workbench/dashboard` | GET | Aggregates pending counts |
| Pending submissions for marking | `/api/teacher-workbench/marking-hub/pending` | GET | Returns submissions awaiting marking |
| Get submission detail | (verify at impl time) | GET | See Task 6 note |
| Mark submission | (verify at impl time) | POST/PATCH | See Task 6 note — rubric-based for assignments, may differ for homework |
| Notifications inbox | `/api/notifications` | GET | (already wired in Plan 3) |
| Announcements list | `/api/announcements` | GET | Read-only on mobile (teachers can't create) |
| Mark announcement read | `/api/announcements/:id/mark-read` | PATCH | — |

**Teacher's `teacherId`** comes from the `mobile-context` response. **HEADS UP:** Plan 2's `mobile-context` response shape currently has `student` and `parent` keys; a `teacher` key may not exist yet. If the teacher's identity needs to surface in the response, the FIRST task of this plan extends the backend's mobile-context endpoint to also include a `teacher` object — small additive change.

---

## File Structure (created/modified in this plan)

```
campusly-backend/
  src/modules/Auth/controllers/mobileContext.controller.ts  (modify — add teacher key)
  src/modules/Auth/__tests__/mobileContext.test.ts          (modify — add teacher test case)

campusly-mobile/
  src/hooks/teacher/
    useTeacherDashboard.ts
    useTeacherClasses.ts
    useClassRoster.ts
    useTeacherTimetable.ts
    useTodayRoll.ts
    useSubmitRoll.ts
    usePendingMarking.ts
    useSubmissionDetail.ts
    useMarkSubmission.ts
  src/hooks/announcements/
    useAnnouncements.ts
    useMarkAnnouncementRead.ts
  src/components/teacher/
    ClassCard.tsx
    StudentRollRow.tsx
    PendingSubmissionRow.tsx
    ScheduleCard.tsx
  src/stores/useAuthStore.ts                                (modify — add teacher to MobileContext type)

app/
  (parent)/                                                 (REMOVE entire folder)
  (teacher)/
    _layout.tsx                                             (NEW — Tabs)
    home.tsx
    classes/
      index.tsx
      [classId]/
        index.tsx                                           (roster view)
        roll-call.tsx
    mark/
      index.tsx                                             (pending list)
      [submissionId].tsx                                    (mark detail)
    inbox.tsx                                               (notifications + announcements merged)
    more/
      _layout.tsx
      index.tsx
      security.tsx
      notification-prefs.tsx
      profile.tsx
  unsupported-role.tsx                                      (NEW — friendly bounce screen for parents)

src/components/auth/ProvidersRoot.tsx                       (modify — route teacher / parent)
src/components/auth/UnsupportedRole.tsx                     (NEW)
```

---

## Conventions

- **Working directory:** `c:\Users\shaun\campusly-mobile` for mobile work, `c:\Users\shaun\campusly-backend` for the one backend modification in Task 1.
- **Commit cadence:** one commit per task, on `master` for both repos.
- **TDD:** unit tests on the backend modification (Task 1) follow the Vitest pattern from Plan 1. Mobile UI uses manual verification.
- **No `apiClient` import outside `src/hooks/`**.
- **No `any` types**, files under 350 lines, semantic NativeWind tokens only, 44px+ touch targets.

---

## Task 1: Extend backend `/auth/me/mobile-context` to include teacher identity

**Working directory:** `c:\Users\shaun\campusly-backend`

The mobile-context endpoint currently returns `user`, `school`, `parent`, `student`. To support teacher mobile flows (specifically the timetable endpoint which needs the teacher's id), add a `teacher` key resolved from a `Staff`/`Teacher` collection or — if no such collection exists separately — by detecting `user.role === 'teacher'` and returning `{ id: user.id }` directly.

- [ ] **Step 1: Inspect the current controller**

```bash
cat src/modules/Auth/controllers/mobileContext.controller.ts
```

- [ ] **Step 2: Discover the teacher data model**

```bash
ls src/modules/Staff/ src/modules/Teacher/ 2>/dev/null
grep -rn "schema.*teacherId" src/modules/Academic/ | head -5
```

Determine:
- Does a `Staff` or `Teacher` Mongoose model exist? Or is the `User` document itself the source of truth for teachers (with `role: 'teacher'`)?
- If a separate `Staff` model exists, its `userId` field links to the user.

- [ ] **Step 3: Extend the controller**

If a separate Staff/Teacher model exists:
```ts
import { Staff } from '../../Staff/model.js'; // or Teacher
// ... in the Promise.all alongside parentDoc / studentDoc:
Staff.findOne({ userId: userObjectId, schoolId: schoolObjectId, isDeleted: { $ne: true } })
  .select('subjects departments')
  .lean(),
// In the response builder:
teacher: staffDoc
  ? { id: String(staffDoc._id), subjects: staffDoc.subjects ?? [], departments: staffDoc.departments ?? [] }
  : (user.role === 'teacher' ? { id: String(user._id), subjects: [], departments: [] } : null),
```

If NO separate model:
```ts
teacher: user.role === 'teacher'
  ? { id: String(user._id), subjects: [], departments: [] }
  : null,
```

- [ ] **Step 4: Extend the test**

In `src/modules/Auth/__tests__/mobileContext.test.ts`, add a test case mirroring the existing "parent" / "student" cases but for a teacher user. Assert `res.body.teacher` is non-null with at least `id`, and `parent` and `student` are null.

- [ ] **Step 5: Run tests + commit**

```bash
npx vitest run src/modules/Auth/__tests__/mobileContext.test.ts
git add src/modules/Auth/controllers/mobileContext.controller.ts src/modules/Auth/__tests__/mobileContext.test.ts
git commit -m "feat(auth): mobile-context endpoint includes teacher identity"
```

---

## Task 2: Mobile — sync types + extend MobileContext type to include teacher

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Re-sync the shared types**

```bash
npm run sync:types
```

- [ ] **Step 2: Extend `MobileContext` in `src/stores/useAuthStore.ts`**

Add to the type definition:

```ts
teacher: {
  id: string;
  subjects?: string[];
  departments?: string[];
} | null;
```

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add src/stores/useAuthStore.ts src/types/
git commit -m "feat(auth): extend MobileContext type with teacher key + resync types"
```

---

## Task 3: Replace `(parent)` route group with `(teacher)`; route teachers, bounce parents

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Delete the parent route group**

```bash
git rm -r "app/(parent)"
```

- [ ] **Step 2: Create the `unsupported-role` screen**

`app/unsupported-role.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { useLogout } from '@/hooks/auth/useLogout';

export default function UnsupportedRoleScreen() {
  const logout = useLogout();
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
        Use the web app
      </Text>
      <Text className="text-muted-foreground text-base mb-8 text-center">
        The Campusly mobile app is for teachers and students. Parents and admins can access everything on the web at campusly.co.za.
      </Text>
      <Pressable
        onPress={() => logout.mutate()}
        className="border border-border rounded-lg py-3 px-6"
      >
        <Text className="text-foreground">Sign out</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: Stub the teacher group + home so routing works in Task 4**

```bash
mkdir -p "app/(teacher)"
```

Create `app/(teacher)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function TeacherLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(teacher)/home.tsx`:
```tsx
import { Text, View } from 'react-native';
export default function TeacherHomeStub() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Teacher home — coming next</Text>
    </View>
  );
}
```

- [ ] **Step 4: Update `ProvidersRoot.tsx` role gate**

Find the `useEffect` that reacts to `ctxQuery.data` and replace the role-routing switch:

```ts
const role = ctxQuery.data.user.role;
if (role === 'teacher') {
  router.replace('/(teacher)/home');
} else if (role === 'student') {
  router.replace('/(student)/home');
} else {
  // parent / admin / anything else — mobile is teacher+student only
  router.replace('/unsupported-role');
}
```

- [ ] **Step 5: Type check + commit**

```bash
npx tsc --noEmit
git add app/ src/components/auth/ProvidersRoot.tsx
git commit -m "feat(teacher): replace (parent) route group with (teacher); bounce unsupported roles"
```

---

## Task 4: Teacher tabs layout

**Working directory:** `c:\Users\shaun\campusly-mobile`

5 tabs: Home / Classes / Mark / Inbox / More.

- [ ] **Step 1: Replace `app/(teacher)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Bell, BookCheck, Home, MoreHorizontal, Users } from 'lucide-react-native';

export default function TeacherLayout() {
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
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="mark" options={{ title: 'Mark', tabBarIcon: ({ color, size }) => <BookCheck color={color} size={size} /> }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Stub the four new tabs**

`app/(teacher)/classes/index.tsx`, `app/(teacher)/mark/index.tsx`, `app/(teacher)/inbox.tsx`, `app/(teacher)/more/index.tsx` — each a one-line "coming next" stub matching the student pattern.

```bash
mkdir -p "app/(teacher)/classes" "app/(teacher)/mark" "app/(teacher)/more"
```

Each stub:
```tsx
import { Text, View } from 'react-native';
export default function Stub() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Coming next</Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add "app/(teacher)/"
git commit -m "feat(teacher): tabs layout (Home/Classes/Mark/Inbox/More) + stubs"
```

---

## Task 5: Teacher home — today's schedule + pending mark count

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `src/hooks/teacher/useTeacherDashboard.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type TeacherDashboard = {
  questionCount?: number;
  pendingModerations?: number;
  pendingMarkingCount: number;
  coverageProgress?: { total: number; completed: number };
  recentActivity?: unknown[];
};

export function useTeacherDashboard() {
  return useQuery({
    queryKey: ['teacher-dashboard'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: TeacherDashboard } & TeacherDashboard>(
        '/teacher-workbench/dashboard',
      );
      const body = res.data;
      return ((body as { data?: TeacherDashboard }).data ?? body) as TeacherDashboard;
    },
  });
}
```

- [ ] **Step 2: Create `src/hooks/teacher/useTeacherTimetable.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

export type Period = {
  id: string;
  classId: string | { id: string; name: string };
  day: number; // 1 = Mon ... 7 = Sun
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string | { id: string; name: string };
  teacherId: string;
  room?: string;
};

export function useTeacherTimetable() {
  const teacherId = useAuthStore((s) => s.context?.teacher?.id);
  return useQuery({
    queryKey: ['teacher-timetable', teacherId],
    enabled: !!teacherId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: Period[] } | Period[]>(
        `/academic/timetable/teacher/${teacherId}`,
      );
      const body = res.data;
      return ((body as { data?: Period[] }).data ?? body) as Period[];
    },
  });
}

export function todayDayNumber(): number {
  // JS Date.getDay(): 0=Sun..6=Sat. Backend uses 1=Mon..7=Sun.
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}
```

- [ ] **Step 3: Create `src/components/teacher/ScheduleCard.tsx`**

```tsx
import { Text, View } from 'react-native';
import type { Period } from '@/hooks/teacher/useTeacherTimetable';

function name(value: Period['classId']): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name ?? '';
}

export function ScheduleCard({ period }: { period: Period }) {
  return (
    <View className="bg-card border border-border rounded-lg p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-muted-foreground text-xs">
          Period {period.period} · {period.startTime}–{period.endTime}
        </Text>
        {period.room ? <Text className="text-muted-foreground text-xs">{period.room}</Text> : null}
      </View>
      <Text className="text-card-foreground font-medium">{name(period.subjectId)}</Text>
      <Text className="text-muted-foreground text-sm">{name(period.classId)}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Replace `app/(teacher)/home.tsx`**

```tsx
import { ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherTimetable, todayDayNumber } from '@/hooks/teacher/useTeacherTimetable';
import { useTeacherDashboard } from '@/hooks/teacher/useTeacherDashboard';
import { ScheduleCard } from '@/components/teacher/ScheduleCard';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

export default function TeacherHome() {
  const ctx = useAuthStore((s) => s.context);
  const timetable = useTeacherTimetable();
  const dashboard = useTeacherDashboard();

  if (timetable.isLoading || dashboard.isLoading) return <LoadingSpinner />;
  if (timetable.error) {
    return <ErrorBlock message="Couldn't load schedule." onRetry={() => timetable.refetch()} />;
  }

  const today = todayDayNumber();
  const todays = (timetable.data ?? [])
    .filter((p) => p.day === today)
    .sort((a, b) => a.period - b.period);

  const pendingMark = dashboard.data?.pendingMarkingCount ?? 0;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 56, paddingBottom: 32 }}>
      <View className="px-4 mb-6">
        <Text className="text-3xl font-semibold text-foreground">
          Hi {ctx?.user.firstName ?? ''}
        </Text>
        <Text className="text-muted-foreground mt-1">
          {todays.length === 0 ? 'Nothing on the schedule today.' : `${todays.length} period${todays.length === 1 ? '' : 's'} today.`}
        </Text>
      </View>

      {pendingMark > 0 ? (
        <View className="mx-4 mb-6 bg-accent rounded-lg p-4">
          <Text className="text-accent-foreground font-medium">
            {pendingMark} submission{pendingMark === 1 ? '' : 's'} to mark
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            Tap the Mark tab to grade them.
          </Text>
        </View>
      ) : null}

      {todays.length > 0 ? (
        <View className="px-4">
          <Text className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
            Today's schedule
          </Text>
          {todays.map((p) => <ScheduleCard key={p.id} period={p} />)}
        </View>
      ) : null}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/hooks/teacher/useTeacherTimetable.ts src/hooks/teacher/useTeacherDashboard.ts src/components/teacher/ScheduleCard.tsx "app/(teacher)/home.tsx"
git commit -m "feat(teacher): home with today's schedule + pending-mark callout"
```

---

## Task 6: Classes — list + class detail with roster

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `src/hooks/teacher/useTeacherClasses.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type TeacherClass = {
  id: string;
  name: string;
  gradeId?: string | { id: string; name: string };
  capacity?: number;
  classroomCode?: string;
  isHomeroom?: boolean;
};

export function useTeacherClasses() {
  return useQuery({
    queryKey: ['teacher-classes'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: TeacherClass[] } | TeacherClass[]>(
        '/academic/classes',
      );
      const body = res.data;
      return ((body as { data?: TeacherClass[] }).data ?? body) as TeacherClass[];
    },
  });
}
```

- [ ] **Step 2: Create `src/hooks/teacher/useClassRoster.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type RosterStudent = {
  id: string;
  admissionNumber?: string;
  userId?: string | { id: string; firstName: string; lastName: string; profileImage?: string };
  photoUrl?: string;
  enrollmentStatus?: string;
};

export function useClassRoster(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-roster', classId],
    enabled: !!classId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: { students?: RosterStudent[] } } | { students?: RosterStudent[] }>(
        `/students?classId=${classId}`,
      );
      const body = res.data;
      const inner = ((body as { data?: { students?: RosterStudent[] } }).data ?? body) as { students?: RosterStudent[] };
      return inner.students ?? [];
    },
  });
}

export function studentDisplayName(s: RosterStudent): string {
  if (s.userId && typeof s.userId === 'object') {
    return `${s.userId.firstName} ${s.userId.lastName}`.trim() || s.admissionNumber || 'Student';
  }
  return s.admissionNumber || 'Student';
}
```

- [ ] **Step 3: Create `src/components/teacher/ClassCard.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { TeacherClass } from '@/hooks/teacher/useTeacherClasses';

function gradeName(g: TeacherClass['gradeId']): string {
  if (!g) return '';
  if (typeof g === 'string') return '';
  return g.name ?? '';
}

export function ClassCard({ cls, onPress }: { cls: TeacherClass; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-card border border-border rounded-lg p-4 mb-3 flex-row items-center"
    >
      <View className="flex-1">
        <Text className="text-card-foreground font-medium">{cls.name}</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          {gradeName(cls.gradeId)}{cls.isHomeroom ? ' · Homeroom' : ''}
        </Text>
      </View>
      <ChevronRight size={18} color="#9ca3af" />
    </Pressable>
  );
}
```

- [ ] **Step 4: Replace `app/(teacher)/classes/index.tsx`**

```tsx
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useTeacherClasses } from '@/hooks/teacher/useTeacherClasses';
import { ClassCard } from '@/components/teacher/ClassCard';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';
import { EmptyState } from '@/components/student/EmptyState';

export default function ClassesScreen() {
  const { data, isLoading, error, refetch, isFetching } = useTeacherClasses();
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message="Couldn't load classes." onRetry={() => refetch()} />;

  const items = data ?? [];
  if (items.length === 0) {
    return <EmptyState title="No classes" description="You aren't assigned to any classes yet." />;
  }

  return (
    <View className="flex-1 bg-background pt-12">
      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ClassCard
            cls={item}
            onPress={() => router.push(`/(teacher)/classes/${item.id}` as never)}
          />
        )}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
    </View>
  );
}
```

- [ ] **Step 5: Create the class detail screen**

```bash
mkdir -p "app/(teacher)/classes/[classId]"
```

`app/(teacher)/classes/[classId]/index.tsx`:

```tsx
import { FlatList, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardCheck } from 'lucide-react-native';
import { useClassRoster, studentDisplayName } from '@/hooks/teacher/useClassRoster';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';
import { EmptyState } from '@/components/student/EmptyState';

export default function ClassDetailScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { data, isLoading, error, refetch, isFetching } = useClassRoster(classId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message="Couldn't load roster." onRetry={() => refetch()} />;

  const students = data ?? [];

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="px-4 mb-3">
        <Pressable
          onPress={() => router.push(`/(teacher)/classes/${classId}/roll-call` as never)}
          className="bg-primary rounded-lg py-3 flex-row items-center justify-center"
        >
          <ClipboardCheck size={18} color="#fafafa" />
          <Text className="ml-2 text-primary-foreground font-medium">Take roll call</Text>
        </Pressable>
      </View>

      {students.length === 0 ? (
        <EmptyState title="No students in this class" />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          data={students}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <View className="py-3 border-b border-border flex-row items-center">
              <Text className="text-foreground flex-1">{studentDisplayName(item)}</Text>
              {item.admissionNumber ? (
                <Text className="text-muted-foreground text-xs">#{item.admissionNumber}</Text>
              ) : null}
            </View>
          )}
          onRefresh={() => refetch()}
          refreshing={isFetching}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit
git add src/hooks/teacher/useTeacherClasses.ts src/hooks/teacher/useClassRoster.ts src/components/teacher/ClassCard.tsx "app/(teacher)/classes/"
git commit -m "feat(teacher): classes list + class detail with roster + take-roll button"
```

---

## Task 7: Roll-call screen — per-class attendance marking

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create `src/hooks/teacher/useTodayRoll.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type AttendanceRecord = {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  period?: number;
  status: AttendanceStatus;
  notes?: string;
};

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useTodayRoll(classId: string | undefined) {
  return useQuery({
    queryKey: ['today-roll', classId, todayIso()],
    enabled: !!classId,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: AttendanceRecord[] } | AttendanceRecord[]>(
        `/attendance/class/${classId}?date=${todayIso()}`,
      );
      const body = res.data;
      return ((body as { data?: AttendanceRecord[] }).data ?? body) as AttendanceRecord[];
    },
  });
}

export { todayIso };
```

(Note: uses local-date formatting per the CLAUDE.md pitfall about `toISOString()` returning UTC.)

- [ ] **Step 2: Create `src/hooks/teacher/useSubmitRoll.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AttendanceStatus } from './useTodayRoll';

export type RollRecord = { studentId: string; status: AttendanceStatus; notes?: string };

export function useSubmitRoll(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, period, records }: { date: string; period?: number; records: RollRecord[] }) => {
      const res = await apiClient.post('/attendance/bulk', {
        classId,
        date,
        period: period ?? 1,
        records,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today-roll', classId] });
      qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
  });
}
```

- [ ] **Step 3: Create `src/components/teacher/StudentRollRow.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';
import type { AttendanceStatus } from '@/hooks/teacher/useTodayRoll';
import { studentDisplayName, type RosterStudent } from '@/hooks/teacher/useClassRoster';

const STATUSES: { key: AttendanceStatus; label: string; classes: string }[] = [
  { key: 'present', label: 'P', classes: 'bg-primary border-primary' },
  { key: 'absent',  label: 'A', classes: 'bg-destructive border-destructive' },
  { key: 'late',    label: 'L', classes: 'bg-accent border-accent' },
];

type Props = {
  student: RosterStudent;
  selected: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
};

export function StudentRollRow({ student, selected, onChange }: Props) {
  return (
    <View className="py-3 border-b border-border flex-row items-center">
      <Text className="text-foreground flex-1" numberOfLines={1}>
        {studentDisplayName(student)}
      </Text>
      <View className="flex-row gap-2">
        {STATUSES.map((s) => {
          const isSelected = selected === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => onChange(s.key)}
              className={`w-10 h-10 rounded-full border items-center justify-center ${
                isSelected ? s.classes : 'border-border bg-background'
              }`}
            >
              <Text
                className={`font-semibold ${
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Create the roll-call screen**

`app/(teacher)/classes/[classId]/roll-call.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useClassRoster } from '@/hooks/teacher/useClassRoster';
import { useTodayRoll, todayIso, type AttendanceStatus } from '@/hooks/teacher/useTodayRoll';
import { useSubmitRoll } from '@/hooks/teacher/useSubmitRoll';
import { StudentRollRow } from '@/components/teacher/StudentRollRow';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';
import { EmptyState } from '@/components/student/EmptyState';

export default function RollCallScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const roster = useClassRoster(classId);
  const today = useTodayRoll(classId);
  const submit = useSubmitRoll(classId as string);
  const [picked, setPicked] = useState<Record<string, AttendanceStatus>>({});

  // Seed from existing today's records when they load
  useMemo(() => {
    if (!today.data) return;
    const init: Record<string, AttendanceStatus> = {};
    today.data.forEach((r) => {
      init[r.studentId] = r.status;
    });
    setPicked((prev) => ({ ...init, ...prev }));
  }, [today.data]);

  if (roster.isLoading || today.isLoading) return <LoadingSpinner />;
  if (roster.error) return <ErrorBlock message="Couldn't load roster." onRetry={() => roster.refetch()} />;

  const students = roster.data ?? [];
  const markedCount = Object.keys(picked).length;
  const total = students.length;

  async function save() {
    const records = Object.entries(picked).map(([studentId, status]) => ({ studentId, status }));
    if (records.length === 0) return;
    try {
      await submit.mutateAsync({ date: todayIso(), records });
      Alert.alert('Roll saved', `${records.length} students recorded.`);
      router.back();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Couldn\'t save roll. Please try again.';
      Alert.alert('Save failed', msg);
    }
  }

  if (students.length === 0) return <EmptyState title="No students" />;

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="px-4 mb-3 flex-row items-center justify-between">
        <Text className="text-muted-foreground text-sm">
          {markedCount}/{total} marked
        </Text>
        <Pressable
          onPress={save}
          disabled={submit.isPending || markedCount === 0}
          className={`rounded-lg py-2 px-4 ${markedCount === 0 ? 'bg-muted' : 'bg-primary'}`}
        >
          <Text className={markedCount === 0 ? 'text-muted-foreground' : 'text-primary-foreground font-medium'}>
            {submit.isPending ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        data={students}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <StudentRollRow
            student={item}
            selected={picked[item.id] ?? null}
            onChange={(status) => setPicked((p) => ({ ...p, [item.id]: status }))}
          />
        )}
      />
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/hooks/teacher/useTodayRoll.ts src/hooks/teacher/useSubmitRoll.ts src/components/teacher/StudentRollRow.tsx "app/(teacher)/classes/[classId]/roll-call.tsx"
git commit -m "feat(teacher): roll-call screen with P/A/L per-student toggles + bulk save"
```

---

## Task 8: Marking hub — pending submissions list

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Verify endpoints at the backend**

Before coding, READ the backend's teacher-workbench routes and homework controllers to determine:
- Exact response shape of `GET /api/teacher-workbench/marking-hub/pending` — what fields per item?
- The actual MARKING endpoint for **homework** submissions (not assignment rubric marking). Likely `/api/homework/submissions/:submissionId/mark` or `/api/homework/:homeworkId/submissions/:studentId/grade`. **If only the assignment-rubric endpoint exists for now**, scope this task to display + open-the-detail only, and defer the "submit mark" mutation to a follow-up. Report this in the commit.

```bash
ls /c/Users/shaun/campusly-backend/src/modules/Homework/
grep -rn "submissions/.*mark\|/mark/" /c/Users/shaun/campusly-backend/src/modules/Homework/ /c/Users/shaun/campusly-backend/src/modules/TeacherWorkbench/ | head -10
```

- [ ] **Step 2: Create `src/hooks/teacher/usePendingMarking.ts`**

Use whatever shape the pending endpoint actually returns. Starting point:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type PendingSubmission = {
  id: string;
  homeworkId: string;
  homeworkTitle?: string;
  studentId: string;
  studentName?: string;
  submittedAt: string;
  type?: 'quiz' | 'exercise' | 'reading';
  subject?: string;
};

export function usePendingMarking() {
  return useQuery({
    queryKey: ['pending-marking'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: PendingSubmission[] } | PendingSubmission[]>(
        '/teacher-workbench/marking-hub/pending',
      );
      const body = res.data;
      return ((body as { data?: PendingSubmission[] }).data ?? body) as PendingSubmission[];
    },
  });
}
```

If the real shape differs significantly, adjust the type AND the row component below.

- [ ] **Step 3: Create `src/components/teacher/PendingSubmissionRow.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronRight } from 'lucide-react-native';
import type { PendingSubmission } from '@/hooks/teacher/usePendingMarking';

export function PendingSubmissionRow({ item, onPress }: { item: PendingSubmission; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-4 border-b border-border bg-background flex-row items-center"
    >
      <View className="flex-1 pr-3">
        <Text className="text-foreground font-medium" numberOfLines={1}>
          {item.studentName ?? 'Student'}
        </Text>
        <Text className="text-muted-foreground text-sm mt-1" numberOfLines={1}>
          {item.homeworkTitle ?? 'Homework'} · {item.subject ?? ''}
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">
          {formatDistanceToNowStrict(new Date(item.submittedAt), { addSuffix: true })}
        </Text>
      </View>
      <ChevronRight size={18} color="#9ca3af" />
    </Pressable>
  );
}
```

- [ ] **Step 4: Replace `app/(teacher)/mark/index.tsx`**

```tsx
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { usePendingMarking } from '@/hooks/teacher/usePendingMarking';
import { PendingSubmissionRow } from '@/components/teacher/PendingSubmissionRow';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';
import { EmptyState } from '@/components/student/EmptyState';

export default function MarkScreen() {
  const { data, isLoading, error, refetch, isFetching } = usePendingMarking();
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message="Couldn't load submissions." onRetry={() => refetch()} />;

  const items = data ?? [];
  if (items.length === 0) {
    return <EmptyState title="All caught up" description="Nothing to mark right now." />;
  }

  return (
    <View className="flex-1 bg-background pt-12">
      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <PendingSubmissionRow
            item={item}
            onPress={() => router.push(`/(teacher)/mark/${item.id}` as never)}
          />
        )}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/hooks/teacher/usePendingMarking.ts src/components/teacher/PendingSubmissionRow.tsx "app/(teacher)/mark/index.tsx"
git commit -m "feat(teacher): marking hub — pending submissions list"
```

---

## Task 9: Mark submission detail + score

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Discover the marking endpoint**

This is the implementer's responsibility — find the actual endpoint and payload.

```bash
grep -rn "submissions.*mark\|grade\|markedBy" /c/Users/shaun/campusly-backend/src/modules/Homework/ | head -20
```

Document in your commit message which endpoint + payload you used.

- [ ] **Step 2: Create `useSubmissionDetail` + `useMarkSubmission` hooks**

`src/hooks/teacher/useSubmissionDetail.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type SubmissionAnswer = {
  questionId?: string;
  questionIndex?: number;
  questionText?: string;
  studentAnswer: string;
};

export type SubmissionDetail = {
  id: string;
  homeworkId: string;
  homeworkTitle?: string;
  homeworkType?: 'quiz' | 'exercise' | 'reading';
  studentId: string;
  studentName?: string;
  submittedAt: string;
  answers?: SubmissionAnswer[];
  comprehensionAnswers?: SubmissionAnswer[];
  markedReadAt?: string;
  totalMarks?: number;
};

export function useSubmissionDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['submission-detail', id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      // Path depends on actual backend route — likely /homework/submissions/:id or similar
      const res = await apiClient.get<{ data?: SubmissionDetail } & SubmissionDetail>(
        `/homework/submissions/${id}`,
      );
      const body = res.data;
      return ((body as { data?: SubmissionDetail }).data ?? body) as SubmissionDetail;
    },
  });
}
```

`src/hooks/teacher/useMarkSubmission.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type MarkPayload = {
  totalMark: number;
  feedback?: string;
  publish?: boolean;
};

export function useMarkSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: MarkPayload }) => {
      const res = await apiClient.post(`/homework/submissions/${id}/mark`, body);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pending-marking'] });
      qc.invalidateQueries({ queryKey: ['submission-detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
  });
}
```

If the backend doesn't have these exact paths, adapt. If only an assignment-rubric endpoint exists and homework marking isn't yet wired, STOP and commit only the read-side (Task 8 + Task 9 step 2's detail hook + a "view-only" screen) with a `DONE_WITH_CONCERNS` status.

- [ ] **Step 3: Create the mark detail screen**

`app/(teacher)/mark/[submissionId].tsx`:

```tsx
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSubmissionDetail } from '@/hooks/teacher/useSubmissionDetail';
import { useMarkSubmission } from '@/hooks/teacher/useMarkSubmission';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';

export default function MarkSubmissionScreen() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const detail = useSubmissionDetail(submissionId);
  const mark = useMarkSubmission();
  const [scoreText, setScoreText] = useState('');
  const [feedback, setFeedback] = useState('');

  if (detail.isLoading) return <LoadingSpinner />;
  if (detail.error || !detail.data) {
    return <ErrorBlock message="Couldn't load submission." onRetry={() => detail.refetch()} />;
  }

  const s = detail.data;
  const answers = s.answers ?? s.comprehensionAnswers ?? [];

  async function submit() {
    const num = Number(scoreText);
    if (!Number.isFinite(num) || num < 0) {
      Alert.alert('Score', 'Enter a non-negative number.');
      return;
    }
    try {
      await mark.mutateAsync({
        id: submissionId as string,
        body: { totalMark: num, feedback: feedback.trim() || undefined, publish: true },
      });
      Alert.alert('Marked', 'Submission marked and published to the student.');
      router.back();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save mark.';
      Alert.alert('Save failed', msg);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 48, paddingBottom: 32 }}>
        <Text className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
          {s.homeworkType ?? 'homework'}
        </Text>
        <Text className="text-2xl font-semibold text-foreground">{s.homeworkTitle ?? 'Submission'}</Text>
        <Text className="text-muted-foreground mt-1 mb-6">{s.studentName ?? 'Student'}</Text>

        {answers.map((a, i) => (
          <View key={i} className="mb-4">
            <Text className="text-foreground font-medium mb-1">
              {i + 1}. {a.questionText ?? 'Question'}
            </Text>
            <View className="bg-card border border-border rounded-lg p-3">
              <Text className="text-foreground">{a.studentAnswer}</Text>
            </View>
          </View>
        ))}

        <View className="mt-6">
          <Text className="text-foreground font-medium mb-2">
            Score{s.totalMarks ? ` (out of ${s.totalMarks})` : ''}
          </Text>
          <TextInput
            className="border border-border rounded-lg p-3 text-foreground mb-4"
            keyboardType="numeric"
            value={scoreText}
            onChangeText={setScoreText}
            placeholder="e.g. 8"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-foreground font-medium mb-2">Feedback (optional)</Text>
          <TextInput
            className="border border-border rounded-lg p-3 text-foreground mb-6"
            multiline
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Comments for the student"
            placeholderTextColor="#9ca3af"
            style={{ minHeight: 100 }}
          />

          <Pressable
            onPress={submit}
            disabled={mark.isPending || !scoreText}
            className={`rounded-lg py-3 items-center ${scoreText ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text className={scoreText ? 'text-primary-foreground font-medium' : 'text-muted-foreground'}>
              {mark.isPending ? 'Saving…' : 'Save and publish'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/hooks/teacher/useSubmissionDetail.ts src/hooks/teacher/useMarkSubmission.ts "app/(teacher)/mark/[submissionId].tsx"
git commit -m "feat(teacher): mark submission detail — view answers, score, feedback, publish"
```

---

## Task 10: Inbox — notifications + announcements merged

**Working directory:** `c:\Users\shaun\campusly-mobile`

- [ ] **Step 1: Create announcement hooks**

`src/hooks/announcements/useAnnouncements.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority?: 'low' | 'normal' | 'high';
  targetAudience?: 'school' | 'grade' | 'class';
  publishedAt: string;
  readBy?: Array<{ userId: string; readAt: string }>;
};

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data?: Announcement[] } | Announcement[]>('/announcements');
      const body = res.data;
      return ((body as { data?: Announcement[] }).data ?? body) as Announcement[];
    },
  });
}
```

`src/hooks/announcements/useMarkAnnouncementRead.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/announcements/${id}/mark-read`, {});
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
```

- [ ] **Step 2: Replace `app/(teacher)/inbox.tsx` with a two-tab inbox**

```tsx
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { useMarkNotificationRead } from '@/hooks/notifications/useMarkNotificationRead';
import { useAnnouncements } from '@/hooks/announcements/useAnnouncements';
import { useMarkAnnouncementRead } from '@/hooks/announcements/useMarkAnnouncementRead';
import { NotificationRow } from '@/components/student/NotificationRow';
import { EmptyState } from '@/components/student/EmptyState';
import { LoadingSpinner } from '@/components/student/LoadingSpinner';
import { ErrorBlock } from '@/components/student/ErrorBlock';
import { useAuthStore } from '@/stores/useAuthStore';

type Tab = 'notifications' | 'announcements';

export default function TeacherInbox() {
  const [tab, setTab] = useState<Tab>('notifications');
  const userId = useAuthStore((s) => s.context?.user.id);

  const notifs = useNotifications();
  const markNotifRead = useMarkNotificationRead();
  const annos = useAnnouncements();
  const markAnnoRead = useMarkAnnouncementRead();

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="flex-row px-4 mb-3 gap-2">
        {(['notifications', 'announcements'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`px-3 py-2 rounded-full border ${
              tab === t ? 'bg-primary border-primary' : 'border-border bg-background'
            }`}
          >
            <Text className={tab === t ? 'text-primary-foreground' : 'text-foreground'}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'notifications' ? (
        notifs.isLoading ? <LoadingSpinner /> :
        notifs.error ? <ErrorBlock message="Couldn't load notifications." onRetry={() => notifs.refetch()} /> :
        (notifs.data?.items ?? []).length === 0 ? <EmptyState title="No notifications" /> :
        <FlatList
          data={notifs.data?.items ?? []}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={(n) => {
                if (!n.isRead) markNotifRead.mutate(n.id);
                if (n.data?.deepLink) router.push(n.data.deepLink as never);
              }}
            />
          )}
          onRefresh={() => notifs.refetch()}
          refreshing={notifs.isFetching}
        />
      ) : (
        annos.isLoading ? <LoadingSpinner /> :
        annos.error ? <ErrorBlock message="Couldn't load announcements." onRetry={() => annos.refetch()} /> :
        (annos.data ?? []).length === 0 ? <EmptyState title="No announcements" /> :
        <FlatList
          data={annos.data ?? []}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => {
            const read = !!item.readBy?.some((r) => r.userId === userId);
            return (
              <Pressable
                onPress={() => {
                  if (!read) markAnnoRead.mutate(item.id);
                }}
                className={`px-4 py-4 border-b border-border ${read ? '' : 'bg-accent/40'}`}
              >
                <Text className="text-foreground font-medium" numberOfLines={1}>{item.title}</Text>
                <Text className="text-muted-foreground text-sm mt-1" numberOfLines={3}>{item.content}</Text>
              </Pressable>
            );
          }}
          onRefresh={() => annos.refetch()}
          refreshing={annos.isFetching}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add src/hooks/announcements/ "app/(teacher)/inbox.tsx"
git commit -m "feat(teacher): inbox tab with notifications + announcements (read-only)"
```

---

## Task 11: More tab — clone the student's More group

**Working directory:** `c:\Users\shaun\campusly-mobile`

The student's More group has profile/security/notification-prefs/sign-out. Teachers need exactly the same. Reuse the screens by creating thin re-exports from `app/(teacher)/more/`.

- [ ] **Step 1: Create the layout + four screens**

```bash
mkdir -p "app/(teacher)/more"
```

`app/(teacher)/more/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: true, headerTitleAlign: 'center' }} />;
}
```

`app/(teacher)/more/index.tsx`: copy the structure from `app/(student)/more/index.tsx` but update the `href` strings to `/(teacher)/more/...`.

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, LogOut, ShieldCheck, Bell, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useLogout } from '@/hooks/auth/useLogout';
import { useAuthStore } from '@/stores/useAuthStore';

type Row = { label: string; icon: LucideIcon; href: string };

const ROWS: Row[] = [
  { label: 'Profile', icon: User, href: '/(teacher)/more/profile' },
  { label: 'Security', icon: ShieldCheck, href: '/(teacher)/more/security' },
  { label: 'Notifications', icon: Bell, href: '/(teacher)/more/notification-prefs' },
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

For `profile.tsx`, `security.tsx`, `notification-prefs.tsx` — these are screens, not shared components, but they have zero teacher-specific logic. **Re-export the student versions directly:**

`app/(teacher)/more/profile.tsx`:
```tsx
export { default } from '@/../app/(student)/more/profile';
```

`app/(teacher)/more/security.tsx`:
```tsx
export { default } from '@/../app/(student)/more/security';
```

`app/(teacher)/more/notification-prefs.tsx`:
```tsx
export { default } from '@/../app/(student)/more/notification-prefs';
```

If those re-export imports don't resolve via the `@/` alias, fall back to relative imports: `export { default } from '../../(student)/more/profile';`. Expo Router supports re-export pattern as long as the file has a default export.

If for some reason Expo Router refuses to share a route component across two route groups (because it might cause two routes to register the same screen), the fallback is to copy the screens — they're each <50 lines, no real duplication cost.

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add "app/(teacher)/more/"
git commit -m "feat(teacher): More tab — reuses student's profile/security/notification-prefs"
```

---

## Task 12: Manual verification

User-runs. Skip the subagent.

- [ ] Start backend + mobile (`npm run dev` + `npx expo start`)
- [ ] Log in as a TEACHER account
- [ ] Home tab: today's schedule cards render; pending mark callout shows if backend has unmarked submissions
- [ ] Classes tab: list of your classes; tap one → roster appears
- [ ] On class detail, tap "Take roll call" → student rows with P/A/L toggles render
- [ ] Mark each student, tap "Save" → backend logs show `POST /attendance/bulk`. Confirm records persisted by re-opening the screen — toggles should be pre-seeded.
- [ ] Mark tab: pending submissions list
- [ ] Tap a submission → answers render → enter a score + feedback → "Save and publish" → backend logs show the marking POST
- [ ] Inbox tab: notifications list works; switch to Announcements sub-tab → school announcements render
- [ ] More tab: profile/security/notification-prefs all work (same as student, reused)
- [ ] Sign out → returns to login
- [ ] Log in as a PARENT account → lands on "Use the web app" screen with a sign-out button (no parent surfaces visible)

If anything breaks, paste the error.

---

## Self-review checklist

- [ ] `(parent)` folder removed; `(teacher)` folder created
- [ ] Role gate in `ProvidersRoot` routes teacher → `(teacher)/home`, student → `(student)/home`, anything else → `/unsupported-role`
- [ ] All 5 teacher tabs render without 404
- [ ] No `apiClient` import outside `src/hooks/`
- [ ] No `any` types
- [ ] All files under 350 lines
- [ ] Backend `mobile-context` endpoint includes `teacher` key (added in Task 1)
- [ ] `useAuthStore.MobileContext` type includes `teacher` key
- [ ] Roll-call uses local-date (`todayIso()` helper, NOT `toISOString().slice(0,10)`)
- [ ] Mark endpoint payload matches what the actual backend accepts (verified in Task 8/9)

---

## Out of scope (deferred)

- Creating announcements from mobile (admin-only; teachers use web)
- Editing/deleting attendance after save
- Live classroom join (LiveKit)
- AI tools (paper generation, marking)
- Lesson plan view (Plan 5)
- Workbench (Plan 5)
- Detailed gradebook
- Push notifications targeting (mobile already receives the existing dispatcher's pushes; no per-recipient-type wiring needed)
- App-store submission (Plan 5)

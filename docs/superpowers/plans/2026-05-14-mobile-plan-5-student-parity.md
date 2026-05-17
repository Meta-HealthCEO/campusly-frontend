# Mobile App — Plan 5: Student Parity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile student app to feature parity with the web student portal (`src/app/(dashboard)/student/` — 38 routes). v3 of the (student) route group.

**Scope decision (Option A):** Full parity except true builder-UIs where mobile UX would be hostile (none exist in the student portal — students don't author content). All 33 currently-missing screens get a real mobile implementation.

**Architecture:** Layered on Plans 2 + 3. New hooks under `src/hooks/student/`, new components under `src/components/student/`. Existing student tabs (`home`, `homework`, `grades`, `notifications`, `more`) get nested sub-routes; new top-level tabs may be added by promoting the More menu into a real "Hub" tab or by switching to a hamburger drawer (decided in Task 0).

**Tech stack (already in repo):** Expo SDK 54, Expo Router 6, NativeWind 4, TanStack Query 5, Zustand 5, axios, react-hook-form + zod, lucide-react-native, date-fns, sonner-native.

**Working directory:** `c:\Users\shaun\campusly-mobile`
**Backend:** `c:\Users\shaun\campusly-backend`
**Web reference:** `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\student\`

---

## Backend endpoint cheatsheet (verified during planning)

| Feature | Path | Notes |
|---|---|---|
| Timetable | `/api/academic/timetable/student/:studentId` (likely) | Mirror the teacher's endpoint shape — confirm during Task 1 |
| Lessons list | `/api/student/lessons` or `/api/lessons` filtered by student | `useStudentLessons` on web — find the actual endpoint |
| Lesson detail | `/api/lessons/:id` or `/api/student/lessons/:id` | Includes materials list |
| Lesson material | `/api/lessons/:id/materials/:materialId` | Reading / video / worksheet |
| Tests list | `/api/student/tests` (or `useStudentAssignedPapers`) | Returns papers assigned to the student |
| Test take | `/api/papers/:id/start` and `/api/papers/:id/submit` | Confirm at Task 4 |
| Classroom sessions | `/api/classroom/sessions` (already in backend exploration) | LiveKit join token endpoint |
| Classroom join token | `/api/classroom/sessions/:id/join` | Returns LiveKit token |
| Video library | `/api/classroom/videos` (or similar) | Recorded session list |
| Video detail / progress | `/api/classroom/videos/:id`, watch-history endpoint | |
| Achievements / gamification | `useStudentAchievements` / `useGamification` hooks on web | Find the actual endpoints |
| Aura | `/api/student/aura` (likely) | Returns score, timeline, momentum stats |
| Aura locker | `/api/student/aura/locker` (likely) | Cosmetic shop |
| Wallet | `/api/wallets/student/:studentId` and `/api/wallets/:id/transactions` | Already in CLAUDE.md API map |
| Tuck shop menu | `/api/tuck-shop/menu` | Already in CLAUDE.md API map |
| Sports | `/api/sports/*` | Player card, stats, training, injuries, team announcements |
| Wellbeing surveys | `/api/wellbeing/*` (likely) | Survey + submission |
| Library | `/api/library/student/:studentId` (likely) | Borrowed books, due dates, reading challenge |
| Portfolio | `/api/portfolio/*` (likely) | Extracurriculars, community service, transcript |
| Assignments (long-form) | `/api/assignments` and `/api/assignments/:id/submit` | Different from homework — has file upload |
| Progress / mastery | `/api/student/progress` (likely) | Subject mastery dashboard |
| Careers — APS / programmes | `/api/careers/aps`, `/api/careers/programmes` | APS calc + uni programme match |
| Careers — explore / aptitude | `/api/careers/explore`, `/api/careers/aptitude` | Career clusters, aptitude quiz |
| Careers — bursaries / applications | `/api/careers/bursaries`, `/api/careers/applications` | Funding match + tracker |
| Careers — subjects | `/api/careers/subjects` | Subject choice advisor |
| Classes info | `/api/student/classes` | Read-only homeroom card |
| Subject-by-subject grades | (within `/api/academic/marks/student/:id`) | Group + compute averages client-side |
| Profile (rich) | `/api/student/profile` or extend `/auth/me/mobile-context` | Includes avatar/details/admission |

**Each task that creates a hook MUST start by reading the web's corresponding hook + the matching backend controller to discover the actual endpoint and response shape. Plan template paths above are best-effort starting points.**

---

## File structure overview (created in this plan)

```
src/hooks/student/
  useStudentTimetable.ts
  useStudentLessons.ts
  useStudentLessonDetail.ts
  useStudentLessonExport.ts
  useStudentTests.ts
  useTakeTest.ts
  useClassroomSessions.ts
  useClassroomJoinToken.ts
  useVideoLibrary.ts
  useVideoProgress.ts
  useStudentAchievements.ts
  useStudentAura.ts
  useAuraLocker.ts
  useStudentWallet.ts
  useTuckShopMenu.ts
  useStudentSports.ts
  useWellbeingSurvey.ts
  useStudentLibrary.ts
  useStudentPortfolio.ts
  useStudentAssignments.ts
  useSubmitAssignment.ts
  useStudentProgress.ts
  useStudentClassesInfo.ts
  useStudentProfile.ts

src/hooks/careers/
  useAPS.ts
  useProgrammeMatcher.ts
  useCareerExplorer.ts
  useAptitude.ts
  useBursaries.ts
  useApplications.ts
  useSubjectAdvisor.ts

src/components/student/
  TimetableDay.tsx
  LessonCard.tsx
  LessonMaterialItem.tsx
  TestCard.tsx
  QuestionAnswerInput.tsx
  ClassroomSessionCard.tsx
  VideoCard.tsx
  AchievementBadge.tsx
  AuraTimelineRow.tsx
  AuraLockerItem.tsx
  WalletTransactionRow.tsx
  TuckShopItem.tsx
  SportStatCard.tsx
  LibraryBookCard.tsx
  AssignmentCard.tsx
  ProgressBar.tsx
  SubjectGradeCard.tsx
  CareerCard.tsx
  ProgrammeCard.tsx
  BursaryCard.tsx
  ApplicationStatusBadge.tsx

app/(student)/
  _layout.tsx                       (MODIFY — tab structure decision in Task 0)
  timetable.tsx                     (new)
  lessons/
    index.tsx
    [id]/
      index.tsx
      materials/
        [materialId].tsx
  tests/
    index.tsx
    [paperId].tsx
  classroom/
    index.tsx
    library.tsx
    video/[id].tsx
  achievements.tsx
  aura/
    index.tsx
    locker.tsx
  wallet.tsx
  sports.tsx
  wellbeing.tsx
  library.tsx
  assignments/
    index.tsx
    [id].tsx
  progress.tsx
  classes.tsx
  profile.tsx                       (replace the More-tab profile sub-screen)
  grades.tsx                        (REPLACE with subject-grouped view)
  careers/
    index.tsx
    explore.tsx
    careers.tsx
    aptitude.tsx
    bursaries.tsx
    applications.tsx
    subjects.tsx
```

---

## Conventions for every task

- **Working directory:** `c:\Users\shaun\campusly-mobile`
- **TDD:** unit tests only on pure helpers (formatters, calculators like APS score). UI is gated by manual verification (Task 16).
- **No `apiClient` import outside `src/hooks/`**
- **No `any` types**; files under 350 lines
- **NativeWind semantic tokens only** (`bg-background`, `text-foreground`, etc.)
- **Reuse existing primitives**: `LoadingSpinner`, `EmptyState`, `ErrorBlock`, `HomeworkCard` patterns, `NotificationRow`
- **Each hook MUST verify its endpoint + response shape against the actual web hook + backend code before writing code**. Pattern: read the web hook (`grep -rn "useStudent<X>" c:\Users\shaun\campusly-frontend\src\hooks\`), follow it to the API call, read the backend controller — then write a matching mobile hook.

---

## Task 0: Navigation structure decision

The student app now needs to expose 30+ screens. The 5-tab bar from Plan 3 isn't enough. Decision: **promote "More" into a "Hub" tab that opens a scrollable menu of all secondary features**, keeping the four most-used tabs as their own primary tabs.

**Final tab structure (5 tabs, iOS HIG-compliant):**
- **Home** (existing — minor enhancements in Task 5)
- **Learn** (combines Lessons + Tests + Classroom into a sub-stack — replaces "Homework" tab; homework still accessible from Home + Learn)
- **Grades** (existing — replaced in Task 8 with subject-grouped view)
- **Inbox** (existing notifications)
- **Hub** (renamed from "More" — contains all the secondary screens as a long scrollable menu)

The Hub screen has a sectioned scroll: "Today" (timetable, wallet, library), "Me" (achievements, aura, sports, portfolio, progress, classes, profile), "Careers" (link to careers section), "Settings" (existing — security, notification prefs, sign out).

Homework remains accessible from the Home screen's "Due today" cards AND from a Learn-tab subroute.

- [ ] **Step 0.1: Replace `app/(student)/_layout.tsx`** with the new 5-tab structure

```tsx
import { Tabs } from 'expo-router';
import { Bell, GraduationCap, Home, LayoutGrid, Trophy } from 'lucide-react-native';

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
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: ({ color, size }) => <GraduationCap color={color} size={size} /> }} />
      <Tabs.Screen name="grades" options={{ title: 'Grades', tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="hub" options={{ title: 'Hub', tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }} />

      {/* The remaining screens below are hidden from the tab bar but still routable */}
      <Tabs.Screen name="homework" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="timetable" options={{ href: null }} />
      <Tabs.Screen name="achievements" options={{ href: null }} />
      <Tabs.Screen name="aura" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="sports" options={{ href: null }} />
      <Tabs.Screen name="wellbeing" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="assignments" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="classes" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="careers" options={{ href: null }} />
      <Tabs.Screen name="tests" options={{ href: null }} />
      <Tabs.Screen name="classroom" options={{ href: null }} />
      <Tabs.Screen name="lessons" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 0.2: Create the Learn tab landing** — `app/(student)/learn/index.tsx` (new folder)

Simple 3-card screen with links to Lessons / Tests / Classroom. Real screens land in later tasks.

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BookOpen, ClipboardList, Video } from 'lucide-react-native';

const ITEMS = [
  { label: 'Lessons', href: '/(student)/lessons', icon: BookOpen, desc: 'Materials, videos, worksheets' },
  { label: 'Tests', href: '/(student)/tests', icon: ClipboardList, desc: 'Assigned papers & past results' },
  { label: 'Classroom', href: '/(student)/classroom', icon: Video, desc: 'Live sessions & recordings' },
];

export default function LearnHub() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 32 }}>
      <Text className="text-3xl font-semibold text-foreground mb-2">Learn</Text>
      <Text className="text-muted-foreground mb-6">Pick where you want to go.</Text>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Pressable key={item.href} onPress={() => router.push(item.href as never)} className="bg-card border border-border rounded-lg p-4 mb-3 flex-row items-center">
            <Icon size={24} color="#2f2f2f" />
            <View className="ml-3 flex-1">
              <Text className="text-card-foreground font-medium">{item.label}</Text>
              <Text className="text-muted-foreground text-sm mt-1">{item.desc}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 0.3: Create the Hub tab landing** — `app/(student)/hub/index.tsx` (new folder; rename `more` to `hub`)

Long sectioned scroll: Today / Me / Careers / Settings. Each row is a Pressable that navigates to the respective screen. Mirror the More-tab pattern from Plan 3 Task 4 but with sections + many more rows.

The existing `app/(student)/more/_layout.tsx` + sub-screens (`profile`, `security`, `notification-prefs`) move under `app/(student)/hub/settings/` (rename folder). The four screens stay, just at the new location.

Each task below creates the screen named in that task's title; the Hub screen links to them all.

- [ ] **Step 0.4: Commit**

```bash
git rm -r "app/(student)/more"
npx tsc --noEmit
git add app/
git commit -m "feat(student): 5-tab layout (Home/Learn/Grades/Inbox/Hub) + Learn + Hub stubs"
```

The existing student screens (home, homework, grades, notifications) survive unchanged.

---

## Task 1: Timetable

**Web ref:** `/student/timetable`
**Hook:** `useStudentTimetable`

- [ ] Discover the actual endpoint. Read the web hook + backend controller.
- [ ] Create `src/hooks/student/useStudentTimetable.ts` (likely `GET /api/academic/timetable/student/:studentId`).
- [ ] Create `src/components/student/TimetableDay.tsx` — a single-day list of periods (period#, subject, time, room).
- [ ] Create `app/(student)/timetable.tsx` — header with day picker (Mon-Fri tabs + "Today" auto-select), `FlatList` of `TimetableDay` for the picked day.
- [ ] Empty state if no periods. Loading + error states.
- [ ] Pull-to-refresh.
- [ ] Commit `feat(student): timetable screen with weekday picker`.

---

## Task 2: Lessons (list + detail + materials)

**Web ref:** `/student/lessons`, `/student/lessons/[id]`, `/student/lessons/[id]/materials/[materialId]`
**Hooks:** `useStudentLessons`, `useStudentLesson`, `useStudentLessonExport`

- [ ] Discover endpoints. Web hooks live in `src/hooks/student-lessons/` or similar. Backend at `src/modules/Lesson/`.
- [ ] Create three hooks: `useStudentLessons` (list), `useStudentLessonDetail` (one lesson with materials), and optional `useStudentLessonExport` (download PDF pack).
- [ ] Create `LessonCard` and `LessonMaterialItem` components.
- [ ] Screens:
  - `app/(student)/lessons/index.tsx` — searchable list with subject/status filters (chips)
  - `app/(student)/lessons/[id]/index.tsx` — lesson detail with objectives, materials list, "Download pack" button
  - `app/(student)/lessons/[id]/materials/[materialId].tsx` — material viewer (renders reading text via `Text`, image via `Image`, video via `react-native-video` or `expo-av`, worksheet/PDF via WebView)
- [ ] If `expo-av` not installed, install it: `npx expo install expo-av`. If PDFs need rendering, use `expo-web-browser`'s `openBrowserAsync` for v1 instead of a full PDF viewer.
- [ ] Three commits, one per logical chunk: list, detail, material-viewer.

---

## Task 3: Tests / Assessments

**Web ref:** `/student/tests`, `/student/tests/[paperId]`
**Hooks:** `useStudentAssignedPapers`, `useStudentMarking`, `useStudentTests`

- [ ] Discover endpoints — read web hooks + backend `src/modules/QuestionBank/` (where papers live).
- [ ] `useStudentTests` for the list (statuses: scheduled / in_progress / submitted / graded).
- [ ] `useTakeTest` for starting + submitting.
- [ ] `TestCard` component for the list.
- [ ] Screens:
  - `app/(student)/tests/index.tsx` — paginated/filtered list
  - `app/(student)/tests/[paperId].tsx` — either the test-taking UI (multi-question stepper) if not started, or result review if graded. Test-taking shares many patterns with `HomeworkPlayer` from Plan 3 Task 9 — reuse `QuizPlayer` / `ExercisePlayer` shapes where possible.
- [ ] **Important caveat:** tests can be timed. The taking screen needs a countdown timer if the paper has a `durationMinutes` field — render at the top, auto-submit on expiry.
- [ ] One commit.

---

## Task 4: Classroom — sessions + video library + player

**Web ref:** `/student/classroom`, `/student/classroom/library`, `/student/classroom/video/[id]`
**Hooks:** `useClassroomSessions`, `getJoinToken`, `useVideoLibrary`, `useVideoPlayer`

- [ ] LiveKit join requires `livekit-react-native` and its peer deps — install: `npx expo install livekit-react-native @livekit/react-native-webrtc @livekit/react-native-expo-plugin`. Add the plugin to `app.json`.
- [ ] Three hooks: sessions list, join token request, video library list, watch-history progress.
- [ ] Screens:
  - `app/(student)/classroom/index.tsx` — upcoming + past sessions; "Join" CTA on live ones (calls join-token endpoint → opens LiveKit room screen)
  - `app/(student)/classroom/library.tsx` — filterable list of recordings
  - `app/(student)/classroom/video/[id].tsx` — video player with metadata + description; uses `expo-av` Video component; saves progress on pause/end
  - `app/(student)/classroom/room/[sessionId].tsx` — LiveKit room (audio + video controls). New screen.
- [ ] If LiveKit setup is too heavy for this task, scope it to "join in external app" via `Linking.openURL(joinUrl)` and defer native room UI to Plan 7. Document in commit if you take this fallback.
- [ ] Two commits: one for sessions + library + video player, one for LiveKit room (or fallback).

---

## Task 5: Gamification — achievements + aura + locker

**Web ref:** `/student/achievements`, `/student/aura`, `/student/aura/locker`
**Hooks:** `useStudentAchievements`, `useGamification`, `useStudentAura`, `useStudentAuraLocker`

- [ ] Four hooks. Each backed by `/api/achiever/*` or `/api/student/aura/*` — verify.
- [ ] `AchievementBadge`, `AuraTimelineRow`, `AuraLockerItem` components.
- [ ] Screens:
  - `app/(student)/achievements.tsx` — badges grid, XP level, streaks, house points leaderboard
  - `app/(student)/aura/index.tsx` — score card, timeline of effort events, momentum stats
  - `app/(student)/aura/locker.tsx` — cosmetic shop (filter by category: outfits, sneakers, bags, accessories, aura-effects, backdrops, frames, titles); buy + equip mutations
- [ ] Locker grid is image-heavy — use `Image` with explicit width/height; lazy-load via `FlatList` `windowSize`.
- [ ] Two commits: achievements + aura, then locker.

---

## Task 6: Wallet + Tuck Shop

**Web ref:** `/student/wallet`
**Hook:** `useStudentWallet`

- [ ] Hooks: `useStudentWallet` (balance + transactions), `useTuckShopMenu` (items + prices + allergens).
- [ ] `WalletTransactionRow`, `TuckShopItem` components.
- [ ] Screen `app/(student)/wallet.tsx` — balance card at top, two tabs: "History" and "Shop". (No purchase action from mobile in v1 — parents handle top-ups on the web. View-only.)
- [ ] One commit.

---

## Task 7: Sports dashboard

**Web ref:** `/student/sports`
**Hooks:** `useSportStats`, `useTrainingSessions`, `useInjuries`, `useTeamAnnouncements`

- [ ] Four hooks. Verify backend at `/api/sports/*` and `/api/achiever/*`.
- [ ] `SportStatCard` for the player-card section.
- [ ] Screen `app/(student)/sports.tsx` — sport filter chips, tabs: Stats / Matches / Personal Bests / Training / Injuries / Team news.
- [ ] Dense screen — consider a horizontally-scrolling tab bar (use a Pressable strip, not a full `Tabs` component since we're inside an existing tab).
- [ ] One commit.

---

## Task 8: Subject-grouped Grades + Progress

**Web ref:** `/student/grades`, `/student/progress`
**Hooks:** Existing `useGrades` + new `useStudentProgress`

- [ ] Enhance `useGrades` (Plan 3 Task 5) — group results by subject client-side, compute averages, attach badges (Distinction ≥ 80%, Merit ≥ 70%, Pass ≥ 50%).
- [ ] Replace `app/(student)/grades.tsx` with subject-card view: each card shows subject name, overall avg %, badge, expandable list of individual assessments.
- [ ] New screen `app/(student)/progress.tsx` — mastery dashboard (per-subject mastery %, weakest topics, recent improvement trends). Uses `useStudentProgress`.
- [ ] `SubjectGradeCard`, `ProgressBar` components.
- [ ] Two commits: grades subject-grouping, then progress.

---

## Task 9: Library + Wellbeing surveys

**Web refs:** `/student/library`, `/student/wellbeing`
**Hooks:** `useStudentLibrary`, `useStudentSurvey`

- [ ] Library: borrowed books + due dates + reading challenge (X/10 books).
- [ ] Wellbeing: active survey form (with question types: scale, multiple choice, open text). Submit creates a record.
- [ ] `LibraryBookCard` component.
- [ ] Screens:
  - `app/(student)/library.tsx` — challenge progress strip + borrowed books list with overdue badges
  - `app/(student)/wellbeing.tsx` — either the active survey form or the submitted confirmation
- [ ] Two commits.

---

## Task 10: Assignments (long-form)

**Web ref:** `/student/assignments`, `/student/assignments/[id]`
**Hooks:** `useStudentAssignments`, `submit`

- [ ] Distinct from homework — assignments are long-form projects with rich text briefs, rubrics, and file-upload submissions.
- [ ] Backend at `/api/assignments`. File upload via `POST /api/assignments/uploads/file` (verified in Plan 3's earlier exploration — single `file` field, 25MB cap).
- [ ] Hook: `useStudentAssignments` (list + detail), `useSubmitAssignment` (text + files).
- [ ] `AssignmentCard` for the list.
- [ ] Screens:
  - `app/(student)/assignments/index.tsx` — list with status filter
  - `app/(student)/assignments/[id].tsx` — brief (rendered as `Markdown` via `react-native-markdown-display` or simple `Text` for v1), rubric criteria list, submission area with multiline text + file picker (camera + library + document picker, multi-file)
- [ ] Reuse the file-upload UX pattern from Plan 3's original spec (camera + library + documents, multi-file with per-file progress).
- [ ] One commit.

---

## Task 11: Library card / Class info / Profile screen

**Web refs:** `/student/classes`, `/student/profile`
**Hooks:** `useStudentClassesInfo`, `useStudentProfile`

- [ ] Quick wins — both are read-only data screens.
- [ ] `app/(student)/classes.tsx` — homeroom card (class name, grade, teacher, class code)
- [ ] `app/(student)/profile.tsx` — replace the existing minimal profile (currently under `more/profile`). Add: avatar, personal details (DOB, languages, previous school), class info, appearance theme toggle, account info, security actions (reset password, sign out)
- [ ] If `useStudentProfile` doesn't exist, fall back to `useAuthStore.context` data — but the avatar / DOB / languages may not be in `mobile-context`. **Read** `c:\Users\shaun\campusly-frontend\src\hooks\useCurrentStudent.ts` to know the actual fields.
- [ ] One commit.

---

## Task 12: Portfolio

**Web ref:** `/student/portfolio`
**Hooks:** `usePortfolio`, `downloadTranscript`

- [ ] Tabs: Academic history (timeline of marks per term), Extracurriculars (add + view), Community service (add + view), Transcript download (call API, open via `expo-web-browser`).
- [ ] Add forms use bottom-sheet modal via `@gorhom/bottom-sheet` (already specified in spec but not installed yet — `npx expo install @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated`).
- [ ] One commit.

---

## Task 13: Careers — APS + Programmes + Bursaries

**Web ref:** `/student/careers`, `/student/careers/applications`, `/student/careers/bursaries`
**Hooks:** `useAPS`, `useProgrammeMatcher`, `useApplications`, `useBursaries`

- [ ] Four hooks. Backend at `/api/careers/*`.
- [ ] Components: `CareerCard`, `ProgrammeCard`, `BursaryCard`, `ApplicationStatusBadge`.
- [ ] Screens:
  - `app/(student)/careers/index.tsx` — APS score card + simulator, eligible programme counts, matched university quick links, application deadline timeline
  - `app/(student)/careers/explore.tsx` — programme finder (search, field, university, match status filters); paginated grid of `ProgrammeCard`
  - `app/(student)/careers/bursaries.tsx` — matched bursaries (APS-keyed) + search-all bursaries; paginated
  - `app/(student)/careers/applications.tsx` — tracker (status, deadline timeline), form to create new applications, file uploads for supporting docs (assignment-upload pattern), prefill data generator
- [ ] One commit (or two if applications is heavy).

---

## Task 14: Careers — Explore careers + Aptitude + Subject advisor

**Web ref:** `/student/careers/careers`, `/student/careers/aptitude`, `/student/careers/subjects`
**Hooks:** `useCareerExplorer`, `useAptitude`, `useSubjectAdvisor`

- [ ] Three hooks.
- [ ] Screens:
  - `app/(student)/careers/careers.tsx` — career cluster browser (9 clusters), aptitude-keyed sorting, searchable career cards (description, pathways, programme link)
  - `app/(student)/careers/aptitude.tsx` — multi-section quiz, progress bar, results page with cluster scores + recommendations. Submit via `useAptitude` mutation.
  - `app/(student)/careers/subjects.tsx` — subject choice advisor (current performance, aptitude cluster banner, subject combination recommendations, impact warnings)
- [ ] One commit.

---

## Task 15: Hub tab landing — wire everything

**Web ref:** N/A (mobile-only IA)
**Hook:** — (uses existing auth store)

- [ ] Replace the Hub stub from Task 0 with the full sectioned scroll.
- [ ] Sections + rows:
  - **Today:** Timetable, Wallet, Library, Wellbeing
  - **Me:** Achievements, Aura, Sports, Portfolio, Progress, My Classes, Profile
  - **Careers:** APS & Programmes, Explore Careers, Aptitude, Subject Advisor, Bursaries, Applications
  - **Settings:** Security, Notification preferences, Sign out
- [ ] Each row uses the same `Pressable + Icon + Text + ChevronRight` pattern as the existing student More screen.
- [ ] Group sections with sticky section headers (`SectionList` is the natural pattern).
- [ ] Commit `feat(student): Hub tab with sectioned access to all secondary screens`.

---

## Task 16: Manual verification

User-runs. Walk through every screen.

- [ ] Login as student
- [ ] Home tab still renders dashboard correctly
- [ ] Learn tab → Lessons / Tests / Classroom — each section loads, list + detail work, lesson materials render, video plays, classroom session join works (real or fallback)
- [ ] Grades tab → subject groups expand correctly, % math is right
- [ ] Inbox tab still works
- [ ] Hub tab → tap every row, confirm each destination renders without crash
- [ ] Submit a homework (existing flow still works) — confirm nothing regressed
- [ ] Submit an assignment with attached files (new) — file upload succeeds, progress shown, submission appears in the list
- [ ] Take a test (new) — answer flow works, timer counts down if present, submit succeeds
- [ ] Buy a locker item (new) — Aura Coin balance decrements, item appears equipped if equipped
- [ ] Run `npx tsc --noEmit` and `npm test` — both clean

---

## Self-review checklist

- [ ] All 16 tasks complete with their own commits
- [ ] Every new hook has a verified endpoint (no fabricated paths)
- [ ] No file >350 lines
- [ ] No `any` types in production
- [ ] No `apiClient` imports outside `src/hooks/`
- [ ] All screens have loading + empty + error states
- [ ] Pull-to-refresh wired on every list
- [ ] Hub menu links to every new screen
- [ ] No regressions in Plan 3's homework + grades + notifications screens

---

## Out of scope (deferred to Plan 7 — Ship)

- Accessibility audit (VoiceOver / TalkBack pass)
- Maestro E2E test scripts
- App Store / Play Console listing assets
- Production builds + submit
- Performance profiling on real low-end devices
- Real-time updates (Socket.IO subscriptions for new homework, notifications)
- Offline mutation queue
- Native Apple Pay / Google Pay (none — parents handle payments on web)

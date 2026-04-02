# Career & University Guidance Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete career & university guidance module that aggregates student academic data, calculates APS scores, matches students to university programmes, tracks applications, provides aptitude assessments, and surfaces bursary opportunities.

**Architecture:** Phased implementation across 6 phases. Each phase produces working, testable UI. All API calls live in hooks (strict separation of concerns). Types in `src/types/careers.ts`. Components in `src/components/careers/`. Pages follow existing thin-orchestrator pattern.

**Tech Stack:** Next.js 16 (React 19), Zustand, Axios (apiClient), TanStack Table, React Hook Form + Zod, Tailwind CSS 4, Recharts, Sonner, lucide-react.

**Scope doc:** `scopes/30-career-university-guidance.md`

---

## Phase Overview

| Phase | What it builds | Pages |
|-------|---------------|-------|
| 1 | Foundation: types, nav, hooks, Student Career Dashboard, APS Calculator, Portfolio | `/student/careers`, `/student/portfolio` |
| 2 | Discovery: Programme Explorer, Programme Matcher, University browsing | `/student/careers/explore` |
| 3 | Action: Applications tracker, Bursary Finder, Deadline timeline | `/student/careers/applications`, `/student/careers/bursaries` |
| 4 | Assessment: Aptitude Test, Career Explorer, Subject Choice Advisor | `/student/careers/aptitude`, `/student/careers/careers`, `/student/careers/subjects` |
| 5 | Admin: University CRUD, Programme CRUD, Bursary CRUD (CSV import) | `/admin/careers/universities`, `/admin/careers/programmes`, `/admin/careers/bursaries` |
| 6 | Parent: Parent career view, Parent portfolio view | `/parent/careers`, `/parent/portfolio` |

---

## Full File Map

### Types
- **Create:** `src/types/careers.ts` — All career module interfaces
- **Modify:** `src/types/index.ts` — Add `export * from './careers'`

### Navigation
- **Modify:** `src/lib/constants.ts` — Add ROUTES + NAV entries for student, parent, admin

### Hooks (one per sub-domain, under 350 lines each)
- **Create:** `src/hooks/usePortfolio.ts` — Portfolio fetching, extracurricular/community service mutations, transcript download
- **Create:** `src/hooks/useAPS.ts` — APS fetching + client-side simulation
- **Create:** `src/hooks/useProgrammeMatcher.ts` — Programme match results with filters/pagination
- **Create:** `src/hooks/useProgrammes.ts` — Programme search/filter/CRUD
- **Create:** `src/hooks/useUniversities.ts` — University list/CRUD
- **Create:** `src/hooks/useApplications.ts` — Application CRUD, document upload, prefill, deadlines
- **Create:** `src/hooks/useAptitude.ts` — Fetch questions, submit answers, get results
- **Create:** `src/hooks/useCareerExplorer.ts` — Browse careers by cluster
- **Create:** `src/hooks/useSubjectAdvisor.ts` — Subject choice recommendations
- **Create:** `src/hooks/useBursaries.ts` — Bursary search/filter/CRUD/match

### Components (`src/components/careers/`)

**APS & Portfolio (Phase 1):**
- `APSScoreCard.tsx` — APS total with per-subject breakdown, color-coded ratings
- `APSSimulator.tsx` — Per-subject sliders, client-side APS recalc, programmes unlocked delta
- `PortfolioTimeline.tsx` — Year-by-year academic history vertical timeline
- `PortfolioExtracurriculars.tsx` — Extracurriculars list with add form
- `PortfolioCommunityService.tsx` — Community service list with add form
- `TranscriptDownload.tsx` — Button + loading state for PDF transcript

**Programme Discovery (Phase 2):**
- `ProgrammeCard.tsx` — Match result card with university logo, APS bar, subject gaps, fit %
- `ProgrammeMatchBar.tsx` — Horizontal bar: green (actual) vs grey (required) APS
- `SubjectGapList.tsx` — Compact list of subject requirements with met/unmet indicators
- `ProgrammeFilter.tsx` — Filter bar: field, university, qualification type, APS range
- `MatchSummaryStats.tsx` — StatCard row: eligible count, close count, universities count
- `UniversityCard.tsx` — University logo, name, type, location, application dates

**Applications & Bursaries (Phase 3):**
- `ApplicationTracker.tsx` — Status pipeline with badges and action buttons
- `ApplicationForm.tsx` — Create/edit application dialog with document upload
- `DeadlineTimeline.tsx` — Vertical timeline of upcoming deadlines sorted by urgency
- `BursaryCard.tsx` — Provider, coverage, deadline, eligibility, apply link

**Assessment (Phase 4):**
- `AptitudeQuestion.tsx` — Likert-scale question renderer
- `AptitudeResults.tsx` — Cluster bar chart + career suggestions
- `CareerClusterCard.tsx` — Career cluster with icon, score, description
- `CareerCard.tsx` — Single career: name, salary range, demand badge, linked programmes
- `SubjectAdvisorResults.tsx` — Subject combination cards with programme count comparison
- `SubjectImpactWarning.tsx` — Warning banner for high-impact choices

**Admin (Phase 5):**
- `UniversityForm.tsx` — Create/edit university dialog form
- `ProgrammeForm.tsx` — Create/edit programme dialog form
- `BursaryForm.tsx` — Create/edit bursary dialog form
- `CSVImportDialog.tsx` — Reusable CSV import dialog with progress/errors

**Parent (Phase 6):**
- `ChildSelector.tsx` — Parent multi-child dropdown (if not already existing — check `useCurrentParent`)

### Pages

**Student pages:**
- `src/app/(dashboard)/student/careers/page.tsx` — Career Dashboard
- `src/app/(dashboard)/student/careers/explore/page.tsx` — Programme Explorer
- `src/app/(dashboard)/student/careers/applications/page.tsx` — My Applications
- `src/app/(dashboard)/student/careers/aptitude/page.tsx` — Aptitude Test
- `src/app/(dashboard)/student/careers/careers/page.tsx` — Career Explorer
- `src/app/(dashboard)/student/careers/subjects/page.tsx` — Subject Choice Advisor
- `src/app/(dashboard)/student/careers/bursaries/page.tsx` — Bursary Finder
- `src/app/(dashboard)/student/portfolio/page.tsx` — Academic Portfolio

**Admin pages:**
- `src/app/(dashboard)/admin/careers/universities/page.tsx` — University Management
- `src/app/(dashboard)/admin/careers/programmes/page.tsx` — Programme Management
- `src/app/(dashboard)/admin/careers/bursaries/page.tsx` — Bursary Management

**Parent pages:**
- `src/app/(dashboard)/parent/careers/page.tsx` — Parent Career View
- `src/app/(dashboard)/parent/portfolio/page.tsx` — Parent Portfolio View

### Validation Schemas
- **Create:** `src/lib/validations/careers.ts` — Zod schemas for all career forms

---

## Phase 1: Foundation — Types, Nav, APS, Portfolio, Student Career Dashboard

### Task 1: Create career types

**Files:**
- Create: `src/types/careers.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create `src/types/careers.ts`**

```ts
// ============================================================
// Career & University Guidance — TypeScript Interfaces
// ============================================================

// --- Portfolio ---

export interface TermResult {
  term: number;
  percentage: number;
  assessmentCount: number;
}

export interface SubjectRecord {
  subjectId: string;
  name: string;
  level: string;
  code: string;
  terms: TermResult[];
  finalPercentage: number;
  apsPoints: number;
}

export interface AcademicYear {
  year: number;
  grade: string;
  subjects: SubjectRecord[];
  totalAPS: number;
  promoted: boolean;
  promotionStatus: 'promoted' | 'condoned' | 'retained';
}

export interface Extracurricular {
  year: number;
  activity: string;
  role: string;
  description: string;
  verifiedBy?: string;
}

export interface CommunityServiceEntry {
  year: number;
  organization: string;
  hours: number;
  description: string;
  verifiedBy?: string;
}

export interface StudentPortfolio {
  id: string;
  studentId: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  academicHistory: AcademicYear[];
  achievements: {
    year: number;
    title: string;
    category: string;
    points: number;
  }[];
  extracurriculars: Extracurricular[];
  communityService: CommunityServiceEntry[];
}

// --- APS ---

export interface APSConversionEntry {
  min: number;
  max: number;
  rating: number;
  points: number;
  description: string;
}

export interface APSSubject {
  subjectId: string;
  name: string;
  level: string;
  currentPercentage: number;
  rating: number;
  apsPoints: number;
}

export interface APSResult {
  totalAPS: number;
  maxAPS: number;
  lifeOrientation: {
    percentage: number;
    apsPoints: number;
    note?: string;
  };
  subjects: APSSubject[];
  apsConversionTable: APSConversionEntry[];
}

export interface APSSimulationAdjustment {
  subjectId: string;
  hypotheticalPercentage: number;
}

export interface APSSimulationSubject {
  name: string;
  currentPercentage: number;
  hypotheticalPercentage: number;
  currentAPS: number;
  simulatedAPS: number;
  change: string;
}

export interface APSSimulationResult {
  currentAPS: number;
  simulatedAPS: number;
  improvement: number;
  subjects: APSSimulationSubject[];
  newProgrammesUnlocked: number;
}

// --- Universities ---

export interface University {
  id: string;
  name: string;
  shortName: string;
  type: 'traditional' | 'comprehensive' | 'university_of_technology' | 'tvet' | 'private';
  province: string;
  city: string;
  logo?: string;
  website?: string;
  applicationPortalUrl?: string;
  applicationOpenDate?: string;
  applicationCloseDate?: string;
  applicationFee: number;
  generalRequirements?: string;
  contactEmail?: string;
  contactPhone?: string;
  programmeCount?: number;
  isActive?: boolean;
}

export type UniversityType = University['type'];

// --- Programmes ---

export interface SubjectRequirement {
  subjectName: string;
  minimumPercentage: number;
  isCompulsory: boolean;
}

export interface Programme {
  id: string;
  universityId: string;
  universityName?: string;
  universityLogo?: string;
  faculty: string;
  department?: string;
  name: string;
  qualificationType: 'bachelor' | 'diploma' | 'higher_certificate' | 'postgrad_diploma';
  duration: string;
  minimumAPS: number;
  subjectRequirements: SubjectRequirement[];
  nbtRequired: { al: boolean; ql: boolean; mat: boolean };
  nbtMinimumScores?: { al?: number; ql?: number; mat?: number };
  careerOutcomes: string[];
  annualTuition?: number;
  linkedBursaries?: string[];
  applicationDeadline?: string;
  additionalNotes?: string;
  dataVerifiedDate?: string;
  isActive?: boolean;
}

export type QualificationType = Programme['qualificationType'];

// --- Programme Matcher ---

export interface SubjectGap {
  subjectName: string;
  required: number;
  actual: number;
  gap: number;
}

export interface ProgrammeMatch {
  programmeId: string;
  programmeName: string;
  universityName: string;
  universityLogo?: string;
  faculty: string;
  qualificationType: string;
  status: 'eligible' | 'close' | 'not_eligible';
  apsRequired: number;
  apsActual: number;
  apsGap: number;
  subjectGaps: SubjectGap[];
  missingSubjects: string[];
  overallFit: number;
  annualTuition?: number;
  applicationDeadline?: string;
}

export interface ProgrammeMatchSummary {
  eligible: number;
  close: number;
  total: number;
}

export interface ProgrammeMatchResult {
  studentAPS: number;
  summary: ProgrammeMatchSummary;
  matches: ProgrammeMatch[];
  page: number;
  limit: number;
  totalPages: number;
}

// --- Applications ---

export interface AppDocument {
  name: string;
  type: 'id_copy' | 'transcript' | 'proof_of_payment' | 'motivation_letter' | 'other';
  url: string;
  uploadedAt: string;
}

export interface CareerApplication {
  id: string;
  studentId: string;
  programmeId: string;
  universityId: string;
  programmeName?: string;
  universityName?: string;
  universityLogo?: string;
  status: 'draft' | 'submitted' | 'acknowledged' | 'accepted' | 'waitlisted' | 'rejected';
  submittedAt?: string;
  applicationReference?: string;
  documents: AppDocument[];
  applicationFee?: { amount: number; paid: boolean };
  notes?: string;
  responseDate?: string;
  responseDetails?: string;
  createdAt: string;
}

export type ApplicationStatus = CareerApplication['status'];

export interface Deadline {
  type: 'application' | 'bursary';
  name: string;
  deadline: string;
  daysRemaining: number;
  status: string;
  urgent: boolean;
}

// --- Aptitude ---

export interface AptitudeQuestion {
  id: string;
  text: string;
  type: 'likert';
  options: string[];
}

export interface AptitudeSection {
  name: string;
  description: string;
  questions: AptitudeQuestion[];
}

export interface AptitudeQuestionnaire {
  sections: AptitudeSection[];
  totalQuestions: number;
  estimatedMinutes: number;
}

export interface ClusterResult {
  name: string;
  score: number;
  rank: number;
  description: string;
}

export interface AptitudeResult {
  id: string;
  clusters: ClusterResult[];
  personalityType: string;
  suggestedCareers: string[];
  completedAt: string;
}

// --- Career Explorer ---

export interface Career {
  name: string;
  cluster: string;
  description: string;
  salaryRange: { entry: number; mid: number; senior: number };
  demand: 'growing' | 'stable' | 'declining';
  requiredQualification: string;
  linkedProgrammeCount: number;
  skills: string[];
}

// --- Subject Choice Advisor ---

export interface SubjectCombinationRecommendation {
  subjectCombination: string[];
  reasoning: string;
  programmesUnlocked: number;
  careerPaths: string[];
}

export interface SubjectWarning {
  subject: string;
  impact: string;
}

export interface SubjectAdvisorResult {
  aptitudeTopCluster: string;
  currentPerformance: Record<string, number>;
  recommendations: SubjectCombinationRecommendation[];
  warnings: SubjectWarning[];
}

// --- Bursaries ---

export interface Bursary {
  id: string;
  name: string;
  provider: string;
  description?: string;
  eligibilityCriteria?: string;
  minimumAPS?: number;
  fieldOfStudy: string[];
  coverageDetails?: string;
  applicationOpenDate?: string;
  applicationCloseDate?: string;
  applicationUrl?: string;
  linkedUniversities?: string[];
  annualValue?: number;
  isActive?: boolean;
}

// --- Pagination ---

export interface CareersPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- [ ] **Step 2: Add barrel export to `src/types/index.ts`**

Add this line at the end of `src/types/index.ts`:

```ts
export * from './careers';
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 2: Add navigation routes and menu entries

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add route constants**

Add these to the `ROUTES` object, after the existing student routes:

```ts
  // Student — Careers
  STUDENT_CAREERS: '/student/careers',
  STUDENT_CAREERS_EXPLORE: '/student/careers/explore',
  STUDENT_CAREERS_APPLICATIONS: '/student/careers/applications',
  STUDENT_CAREERS_APTITUDE: '/student/careers/aptitude',
  STUDENT_CAREERS_CAREERS: '/student/careers/careers',
  STUDENT_CAREERS_SUBJECTS: '/student/careers/subjects',
  STUDENT_CAREERS_BURSARIES: '/student/careers/bursaries',
  STUDENT_PORTFOLIO: '/student/portfolio',

  // Parent — Careers
  PARENT_CAREERS: '/parent/careers',
  PARENT_PORTFOLIO: '/parent/portfolio',

  // Admin — Careers
  ADMIN_CAREERS_UNIVERSITIES: '/admin/careers/universities',
  ADMIN_CAREERS_PROGRAMMES: '/admin/careers/programmes',
  ADMIN_CAREERS_BURSARIES: '/admin/careers/bursaries',
```

- [ ] **Step 2: Add icon imports**

Add `Compass, Target` to the lucide-react import at the top of `constants.ts`.

- [ ] **Step 3: Add STUDENT_NAV entry**

Add to STUDENT_NAV array:

```ts
  {
    label: 'Career Guidance', href: ROUTES.STUDENT_CAREERS, icon: Compass, module: 'careers',
    children: [
      { label: 'Dashboard', href: ROUTES.STUDENT_CAREERS, icon: Compass },
      { label: 'Explore Programmes', href: ROUTES.STUDENT_CAREERS_EXPLORE, icon: GraduationCap },
      { label: 'My Applications', href: ROUTES.STUDENT_CAREERS_APPLICATIONS, icon: FileText },
      { label: 'Aptitude Test', href: ROUTES.STUDENT_CAREERS_APTITUDE, icon: Target },
      { label: 'Bursaries', href: ROUTES.STUDENT_CAREERS_BURSARIES, icon: DollarSign },
      { label: 'Portfolio', href: ROUTES.STUDENT_PORTFOLIO, icon: BookOpen },
    ],
  },
```

- [ ] **Step 4: Add PARENT_NAV entry**

Add to PARENT_NAV array:

```ts
  {
    label: 'Career Guidance', href: ROUTES.PARENT_CAREERS, icon: Compass, module: 'careers',
    children: [
      { label: 'Overview', href: ROUTES.PARENT_CAREERS, icon: Compass },
      { label: 'Portfolio', href: ROUTES.PARENT_PORTFOLIO, icon: BookOpen },
    ],
  },
```

- [ ] **Step 5: Add ADMIN_NAV entry**

Add to ADMIN_NAV array (before Reports):

```ts
  {
    label: 'Career Guidance', href: ROUTES.ADMIN_CAREERS_UNIVERSITIES, icon: Compass, module: 'careers',
    children: [
      { label: 'Universities', href: ROUTES.ADMIN_CAREERS_UNIVERSITIES, icon: GraduationCap },
      { label: 'Programmes', href: ROUTES.ADMIN_CAREERS_PROGRAMMES, icon: BookOpen },
      { label: 'Bursaries', href: ROUTES.ADMIN_CAREERS_BURSARIES, icon: DollarSign },
    ],
  },
```

- [ ] **Step 6: Add `'careers'` to the MODULES array**

```ts
  { id: 'careers', name: 'Career Guidance', description: 'University guidance, APS calculator, and career planning' },
```

---

### Task 3: Create `usePortfolio` hook

**Files:**
- Create: `src/hooks/usePortfolio.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  StudentPortfolio,
  Extracurricular,
  CommunityServiceEntry,
} from '@/types';

interface UsePortfolioReturn {
  portfolio: StudentPortfolio | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addExtracurricular: (data: Omit<Extracurricular, 'verifiedBy'>) => Promise<void>;
  addCommunityService: (data: Omit<CommunityServiceEntry, 'verifiedBy'>) => Promise<void>;
  downloadTranscript: () => Promise<void>;
}

export function usePortfolio(studentId: string): UsePortfolioReturn {
  const [portfolio, setPortfolio] = useState<StudentPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/careers/portfolio/student/${studentId}`);
      const data = unwrapResponse<StudentPortfolio>(res);
      setPortfolio(data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load portfolio'));
      console.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addExtracurricular = useCallback(
    async (data: Omit<Extracurricular, 'verifiedBy'>) => {
      await apiClient.post(`/careers/portfolio/student/${studentId}/extracurricular`, data);
      await fetchPortfolio();
    },
    [studentId, fetchPortfolio],
  );

  const addCommunityService = useCallback(
    async (data: Omit<CommunityServiceEntry, 'verifiedBy'>) => {
      await apiClient.post(`/careers/portfolio/student/${studentId}/community-service`, data);
      await fetchPortfolio();
    },
    [studentId, fetchPortfolio],
  );

  const downloadTranscript = useCallback(async () => {
    const res = await apiClient.get(
      `/careers/portfolio/student/${studentId}/transcript`,
      { responseType: 'blob' },
    );
    const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }, [studentId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    portfolio,
    loading,
    error,
    refetch: fetchPortfolio,
    addExtracurricular,
    addCommunityService,
    downloadTranscript,
  };
}
```

---

### Task 4: Create `useAPS` hook

**Files:**
- Create: `src/hooks/useAPS.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  APSResult,
  APSSimulationAdjustment,
  APSSimulationResult,
} from '@/types';

interface UseAPSReturn {
  aps: APSResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  simulate: (adjustments: APSSimulationAdjustment[]) => Promise<APSSimulationResult>;
}

export function useAPS(studentId: string): UseAPSReturn {
  const [aps, setAps] = useState<APSResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAPS = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/careers/aps/student/${studentId}`);
      const data = unwrapResponse<APSResult>(res);
      setAps(data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load APS'));
      console.error('Failed to load APS');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const simulate = useCallback(
    async (adjustments: APSSimulationAdjustment[]): Promise<APSSimulationResult> => {
      const res = await apiClient.post(`/careers/aps/student/${studentId}/simulate`, {
        adjustments,
      });
      return unwrapResponse<APSSimulationResult>(res);
    },
    [studentId],
  );

  useEffect(() => {
    fetchAPS();
  }, [fetchAPS]);

  return { aps, loading, error, refetch: fetchAPS, simulate };
}
```

---

### Task 5: Create APS components

**Files:**
- Create: `src/components/careers/APSScoreCard.tsx`
- Create: `src/components/careers/APSSimulator.tsx`

- [ ] **Step 1: Create `APSScoreCard.tsx`**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { APSResult } from '@/types';

interface APSScoreCardProps {
  aps: APSResult;
}

function getRatingColor(rating: number): string {
  if (rating >= 6) return 'bg-emerald-500';
  if (rating >= 4) return 'bg-amber-500';
  return 'bg-destructive';
}

function getRatingLabel(rating: number): string {
  const labels: Record<number, string> = {
    7: 'Outstanding',
    6: 'Meritorious',
    5: 'Substantial',
    4: 'Adequate',
    3: 'Moderate',
    2: 'Elementary',
    1: 'Not Achieved',
  };
  return labels[rating] ?? '';
}

export function APSScoreCard({ aps }: APSScoreCardProps) {
  const percentage = Math.round((aps.totalAPS / aps.maxAPS) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>APS Score</span>
          <span className="text-3xl font-bold text-primary">
            {aps.totalAPS}/{aps.maxAPS}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} className="h-3" />

        <div className="space-y-2">
          {aps.subjects.map((subject) => (
            <div
              key={subject.subjectId}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate flex-1 mr-2">{subject.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-10 text-right">
                  {subject.currentPercentage}%
                </span>
                <Badge
                  variant="secondary"
                  className={`${getRatingColor(subject.rating)} text-white text-xs w-6 justify-center`}
                >
                  {subject.apsPoints}
                </Badge>
                <span className="text-xs text-muted-foreground w-20 truncate">
                  {getRatingLabel(subject.rating)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {aps.lifeOrientation && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Life Orientation</span>
              <div className="flex items-center gap-2">
                <span>{aps.lifeOrientation.percentage}%</span>
                <Badge variant="outline" className="text-xs">
                  {aps.lifeOrientation.apsPoints} pts
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {aps.lifeOrientation.note ?? 'Excluded from total (most universities)'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `APSSimulator.tsx`**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp } from 'lucide-react';
import type { APSResult, APSSimulationAdjustment, APSSimulationResult } from '@/types';

interface APSSimulatorProps {
  aps: APSResult;
  onSimulate: (adjustments: APSSimulationAdjustment[]) => Promise<APSSimulationResult>;
}

export function APSSimulator({ aps, onSimulate }: APSSimulatorProps) {
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [result, setResult] = useState<APSSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSliderChange = useCallback((subjectId: string, value: number[]) => {
    setAdjustments((prev) => ({ ...prev, [subjectId]: value[0] }));
    setResult(null);
  }, []);

  const handleSimulate = useCallback(async () => {
    const entries: APSSimulationAdjustment[] = Object.entries(adjustments)
      .filter(([subjectId]) => {
        const subject = aps.subjects.find((s) => s.subjectId === subjectId);
        return subject && adjustments[subjectId] !== subject.currentPercentage;
      })
      .map(([subjectId, hypotheticalPercentage]) => ({
        subjectId,
        hypotheticalPercentage,
      }));

    if (entries.length === 0) return;

    setSimulating(true);
    try {
      const res = await onSimulate(entries);
      setResult(res);
    } catch {
      console.error('Simulation failed');
    } finally {
      setSimulating(false);
    }
  }, [adjustments, aps.subjects, onSimulate]);

  const hasChanges = Object.entries(adjustments).some(([subjectId, val]) => {
    const subject = aps.subjects.find((s) => s.subjectId === subjectId);
    return subject && val !== subject.currentPercentage;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          What-If Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Adjust your subject percentages to see how your APS changes.
        </p>

        <div className="space-y-4">
          {aps.subjects.map((subject) => {
            const current = adjustments[subject.subjectId] ?? subject.currentPercentage;
            const changed = current !== subject.currentPercentage;

            return (
              <div key={subject.subjectId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{subject.name}</span>
                  <span className={changed ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                    {current}%
                  </span>
                </div>
                <Slider
                  value={[current]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(val) => handleSliderChange(subject.subjectId, val)}
                />
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleSimulate}
          disabled={!hasChanges || simulating}
          className="w-full"
        >
          {simulating ? 'Calculating...' : 'Simulate'}
        </Button>

        {result && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current APS</span>
              <span className="font-bold">{result.currentAPS}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Simulated APS</span>
              <span className="font-bold text-primary">{result.simulatedAPS}</span>
            </div>
            {result.improvement > 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">
                  +{result.improvement} points &middot; {result.newProgrammesUnlocked} new programmes unlocked
                </span>
              </div>
            )}

            <div className="space-y-1">
              {result.subjects.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1 mr-2">{s.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{s.currentAPS}</span>
                    <span>&rarr;</span>
                    <Badge
                      variant={s.simulatedAPS > s.currentAPS ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {s.simulatedAPS} ({s.change})
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 6: Create Portfolio components

**Files:**
- Create: `src/components/careers/PortfolioTimeline.tsx`
- Create: `src/components/careers/PortfolioExtracurriculars.tsx`
- Create: `src/components/careers/PortfolioCommunityService.tsx`
- Create: `src/components/careers/TranscriptDownload.tsx`

- [ ] **Step 1: Create `PortfolioTimeline.tsx`**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AcademicYear } from '@/types';

interface PortfolioTimelineProps {
  academicHistory: AcademicYear[];
}

function promotionBadge(status: AcademicYear['promotionStatus']) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    promoted: { label: 'Promoted', variant: 'default' },
    condoned: { label: 'Condoned', variant: 'secondary' },
    retained: { label: 'Retained', variant: 'destructive' },
  };
  const entry = map[status] ?? map.promoted;
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function PortfolioTimeline({ academicHistory }: PortfolioTimelineProps) {
  const sorted = [...academicHistory].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-4">
      {sorted.map((year) => (
        <Card key={`${year.year}-${year.grade}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>
                {year.grade} &mdash; {year.year}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">APS: {year.totalAPS}</Badge>
                {promotionBadge(year.promotionStatus)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {year.subjects.map((subject) => (
                <div
                  key={subject.subjectId}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="truncate flex-1 mr-2">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-muted-foreground ml-1 text-xs">({subject.code})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{subject.finalPercentage}%</span>
                    <Badge variant="secondary" className="text-xs">
                      {subject.apsPoints}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `PortfolioExtracurriculars.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Award } from 'lucide-react';
import { toast } from 'sonner';
import type { Extracurricular } from '@/types';

interface PortfolioExtracurricularsProps {
  extracurriculars: Extracurricular[];
  onAdd: (data: Omit<Extracurricular, 'verifiedBy'>) => Promise<void>;
  readOnly?: boolean;
}

export function PortfolioExtracurriculars({
  extracurriculars,
  onAdd,
  readOnly = false,
}: PortfolioExtracurricularsProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear(), activity: '', role: '', description: '' });

  const handleSubmit = async () => {
    if (!form.activity || !form.role) return;
    setSubmitting(true);
    try {
      await onAdd(form);
      toast.success('Extracurricular added');
      setOpen(false);
      setForm({ year: new Date().getFullYear(), activity: '', role: '', description: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add extracurricular');
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = extracurriculars.reduce<Record<number, Extracurricular[]>>((acc, item) => {
    (acc[item.year] ??= []).push(item);
    return acc;
  }, {});

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Extracurriculars
          </div>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </DialogTrigger>
              <DialogContent className="flex flex-col max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle>Add Extracurricular</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  <div>
                    <Label>Year <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Activity <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.activity}
                      onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))}
                      placeholder="e.g. Debating Society"
                    />
                  </div>
                  <div>
                    <Label>Role <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      placeholder="e.g. Captain"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={submitting || !form.activity || !form.role}>
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {years.length === 0 ? (
          <p className="text-sm text-muted-foreground">No extracurriculars recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {years.map((year) => (
              <div key={year}>
                <h4 className="text-sm font-semibold mb-2">{year}</h4>
                <div className="space-y-2">
                  {grouped[year].map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{item.activity}</span>
                        <span className="text-muted-foreground"> &mdash; {item.role}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      {item.verifiedBy ? (
                        <Badge variant="default" className="text-xs ml-2 shrink-0">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create `PortfolioCommunityService.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Heart } from 'lucide-react';
import { toast } from 'sonner';
import type { CommunityServiceEntry } from '@/types';

interface PortfolioCommunityServiceProps {
  communityService: CommunityServiceEntry[];
  onAdd: (data: Omit<CommunityServiceEntry, 'verifiedBy'>) => Promise<void>;
  readOnly?: boolean;
}

export function PortfolioCommunityService({
  communityService,
  onAdd,
  readOnly = false,
}: PortfolioCommunityServiceProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear(), organization: '', hours: 0, description: '' });

  const handleSubmit = async () => {
    if (!form.organization || form.hours <= 0) return;
    setSubmitting(true);
    try {
      await onAdd(form);
      toast.success('Community service entry added');
      setOpen(false);
      setForm({ year: new Date().getFullYear(), organization: '', hours: 0, description: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add community service');
    } finally {
      setSubmitting(false);
    }
  };

  const totalHours = communityService.reduce((sum, e) => sum + e.hours, 0);

  const grouped = communityService.reduce<Record<number, CommunityServiceEntry[]>>((acc, item) => {
    (acc[item.year] ??= []).push(item);
    return acc;
  }, {});

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Community Service
            <Badge variant="outline" className="text-xs">{totalHours} hrs total</Badge>
          </div>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </DialogTrigger>
              <DialogContent className="flex flex-col max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle>Add Community Service</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  <div>
                    <Label>Year <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Organization <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.organization}
                      onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                      placeholder="e.g. SPCA"
                    />
                  </div>
                  <div>
                    <Label>Hours <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      value={form.hours || ''}
                      onChange={(e) => setForm((f) => ({ ...f, hours: Number(e.target.value) }))}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={submitting || !form.organization || form.hours <= 0}>
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {years.length === 0 ? (
          <p className="text-sm text-muted-foreground">No community service recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {years.map((year) => (
              <div key={year}>
                <h4 className="text-sm font-semibold mb-2">{year}</h4>
                <div className="space-y-2">
                  {grouped[year].map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{item.organization}</span>
                        <span className="text-muted-foreground"> &mdash; {item.hours} hours</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      {item.verifiedBy ? (
                        <Badge variant="default" className="text-xs ml-2 shrink-0">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create `TranscriptDownload.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TranscriptDownloadProps {
  onDownload: () => Promise<void>;
}

export function TranscriptDownload({ onDownload }: TranscriptDownloadProps) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    setDownloading(true);
    try {
      await onDownload();
      toast.success('Transcript downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download transcript');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={downloading} variant="outline">
      {downloading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {downloading ? 'Generating...' : 'Download Transcript'}
    </Button>
  );
}
```

---

### Task 7: Create Student Portfolio page

**Files:**
- Create: `src/app/(dashboard)/student/portfolio/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PortfolioTimeline } from '@/components/careers/PortfolioTimeline';
import { PortfolioExtracurriculars } from '@/components/careers/PortfolioExtracurriculars';
import { PortfolioCommunityService } from '@/components/careers/PortfolioCommunityService';
import { TranscriptDownload } from '@/components/careers/TranscriptDownload';
import { BookOpen } from 'lucide-react';

export default function StudentPortfolioPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const studentId = student?.id ?? '';
  const { portfolio, loading, addExtracurricular, addCommunityService, downloadTranscript } =
    usePortfolio(studentId);

  if (studentLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <PageHeader title="Academic Portfolio" description="Your cumulative academic record" />
        <EmptyState
          icon={BookOpen}
          title="No portfolio data yet"
          description="Your academic history will appear here once marks have been recorded."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Portfolio" description="Your cumulative academic record">
        <TranscriptDownload onDownload={downloadTranscript} />
      </PageHeader>

      <Tabs defaultValue="academic">
        <TabsList className="flex-wrap">
          <TabsTrigger value="academic">Academic History</TabsTrigger>
          <TabsTrigger value="extracurriculars">Extracurriculars</TabsTrigger>
          <TabsTrigger value="community">Community Service</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="mt-4">
          {portfolio.academicHistory.length === 0 ? (
            <EmptyState icon={BookOpen} title="No academic records" description="Year-end snapshots will appear here." />
          ) : (
            <PortfolioTimeline academicHistory={portfolio.academicHistory} />
          )}
        </TabsContent>

        <TabsContent value="extracurriculars" className="mt-4">
          <PortfolioExtracurriculars
            extracurriculars={portfolio.extracurriculars}
            onAdd={addExtracurricular}
          />
        </TabsContent>

        <TabsContent value="community" className="mt-4">
          <PortfolioCommunityService
            communityService={portfolio.communityService}
            onAdd={addCommunityService}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Task 8: Create Student Career Dashboard page

**Files:**
- Create: `src/app/(dashboard)/student/careers/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useAPS } from '@/hooks/useAPS';
import { useProgrammeMatcher } from '@/hooks/useProgrammeMatcher';
import { useApplications } from '@/hooks/useApplications';
import { APSScoreCard } from '@/components/careers/APSScoreCard';
import { APSSimulator } from '@/components/careers/APSSimulator';
import { DeadlineTimeline } from '@/components/careers/DeadlineTimeline';
import {
  Compass, GraduationCap, FileText, Target,
  DollarSign, BookOpen,
} from 'lucide-react';

export default function StudentCareerDashboardPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const studentId = student?.id ?? '';
  const { aps, loading: apsLoading, simulate } = useAPS(studentId);
  const { matchResult, loading: matchLoading } = useProgrammeMatcher(studentId);
  const { deadlines, loading: deadlinesLoading } = useApplications(studentId);

  const loading = studentLoading || apsLoading || matchLoading || deadlinesLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Career Guidance" description="Plan your future" />
        <EmptyState icon={Compass} title="Student profile not found" description="Please contact your school administrator." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Career Guidance" description="Plan your future — explore programmes, track applications, and discover opportunities" />

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="APS Score"
          value={aps ? `${aps.totalAPS}/${aps.maxAPS}` : '—'}
          icon={Target}
          description="Current admission point score"
        />
        <StatCard
          title="Eligible Programmes"
          value={matchResult ? String(matchResult.summary.eligible) : '—'}
          icon={GraduationCap}
          description={matchResult ? `at ${new Set(matchResult.matches.filter((m) => m.status === 'eligible').map((m) => m.universityName)).size} universities` : ''}
        />
        <StatCard
          title="Close Matches"
          value={matchResult ? String(matchResult.summary.close) : '—'}
          icon={Compass}
          description="Within reach with improvement"
        />
        <StatCard
          title="Applications"
          value="—"
          icon={FileText}
          description="Track in My Applications"
        />
      </div>

      {/* APS + Simulator row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {aps ? (
          <>
            <APSScoreCard aps={aps} />
            <APSSimulator aps={aps} onSimulate={simulate} />
          </>
        ) : (
          <Card className="lg:col-span-2">
            <CardContent className="py-8">
              <EmptyState icon={Target} title="No APS data" description="APS will be calculated once marks are recorded." />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deadlines */}
      {deadlines.length > 0 && (
        <DeadlineTimeline deadlines={deadlines} />
      )}

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Explore</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <Link href="/student/careers/explore">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <GraduationCap className="h-5 w-5" />
                <span className="text-xs">Programmes</span>
              </Button>
            </Link>
            <Link href="/student/careers/aptitude">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Target className="h-5 w-5" />
                <span className="text-xs">Aptitude Test</span>
              </Button>
            </Link>
            <Link href="/student/careers/bursaries">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-xs">Bursaries</span>
              </Button>
            </Link>
            <Link href="/student/careers/careers">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Compass className="h-5 w-5" />
                <span className="text-xs">Careers</span>
              </Button>
            </Link>
            <Link href="/student/portfolio">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs">Portfolio</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Note:** This page references `useProgrammeMatcher`, `useApplications`, and `DeadlineTimeline` which will be created in later phases. For Phase 1, create stub hooks that return empty defaults so the page compiles.

---

### Task 9: Create stub hooks for Phase 1 compilation

**Files:**
- Create: `src/hooks/useProgrammeMatcher.ts`
- Create: `src/hooks/useApplications.ts`

- [ ] **Step 1: Create `useProgrammeMatcher.ts` stub**

```ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { ProgrammeMatchResult } from '@/types';

interface MatchFilters {
  status?: 'eligible' | 'close' | 'all';
  universityId?: string;
  field?: string;
  page?: number;
  limit?: number;
}

interface UseProgrammeMatcherReturn {
  matchResult: ProgrammeMatchResult | null;
  loading: boolean;
  error: string | null;
  refetch: (filters?: MatchFilters) => Promise<void>;
}

export function useProgrammeMatcher(
  studentId: string,
  initialFilters?: MatchFilters,
): UseProgrammeMatcherReturn {
  const [matchResult, setMatchResult] = useState<ProgrammeMatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(
    async (filters?: MatchFilters) => {
      if (!studentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {};
        const f = filters ?? initialFilters;
        if (f?.status) params.status = f.status;
        if (f?.universityId) params.universityId = f.universityId;
        if (f?.field) params.field = f.field;
        if (f?.page) params.page = f.page;
        if (f?.limit) params.limit = f.limit;
        const res = await apiClient.get(`/careers/match/student/${studentId}`, { params });
        const data = unwrapResponse<ProgrammeMatchResult>(res);
        setMatchResult(data);
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to load programme matches'));
        console.error('Failed to load programme matches');
      } finally {
        setLoading(false);
      }
    },
    [studentId, initialFilters],
  );

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matchResult, loading, error, refetch: fetchMatches };
}
```

- [ ] **Step 2: Create `useApplications.ts` stub**

```ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { CareerApplication, Deadline } from '@/types';

interface UseApplicationsReturn {
  applications: CareerApplication[];
  deadlines: Deadline[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createApplication: (programmeId: string, notes?: string) => Promise<CareerApplication>;
  updateApplication: (id: string, data: Partial<CareerApplication>) => Promise<void>;
  uploadDocument: (applicationId: string, file: File, name: string, type: string) => Promise<void>;
  getPrefill: (applicationId: string) => Promise<Record<string, unknown>>;
}

export function useApplications(studentId: string): UseApplicationsReturn {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [appsRes, deadlinesRes] = await Promise.allSettled([
        apiClient.get(`/careers/applications/student/${studentId}`),
        apiClient.get(`/careers/deadlines/student/${studentId}`),
      ]);
      if (appsRes.status === 'fulfilled') {
        const raw = unwrapResponse(appsRes.value);
        const items = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).items ?? [];
        setApplications(items as CareerApplication[]);
      }
      if (deadlinesRes.status === 'fulfilled') {
        const raw = unwrapList<Deadline>(deadlinesRes.value);
        setDeadlines(raw);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load applications'));
      console.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const createApplication = useCallback(
    async (programmeId: string, notes?: string): Promise<CareerApplication> => {
      const res = await apiClient.post('/careers/applications', { programmeId, notes });
      const data = unwrapResponse<CareerApplication>(res);
      await fetchApplications();
      return data;
    },
    [fetchApplications],
  );

  const updateApplication = useCallback(
    async (id: string, data: Partial<CareerApplication>) => {
      await apiClient.patch(`/careers/applications/${id}`, data);
      await fetchApplications();
    },
    [fetchApplications],
  );

  const uploadDocument = useCallback(
    async (applicationId: string, file: File, name: string, docType: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('type', docType);
      await apiClient.post(`/careers/applications/${applicationId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchApplications();
    },
    [fetchApplications],
  );

  const getPrefill = useCallback(
    async (applicationId: string): Promise<Record<string, unknown>> => {
      const res = await apiClient.get(`/careers/applications/${applicationId}/prefill`);
      return unwrapResponse<Record<string, unknown>>(res);
    },
    [],
  );

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    deadlines,
    loading,
    error,
    refetch: fetchApplications,
    createApplication,
    updateApplication,
    uploadDocument,
    getPrefill,
  };
}
```

---

### Task 10: Create `DeadlineTimeline` component (needed by Career Dashboard)

**Files:**
- Create: `src/components/careers/DeadlineTimeline.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import type { Deadline } from '@/types';

interface DeadlineTimelineProps {
  deadlines: Deadline[];
}

export function DeadlineTimeline({ deadlines }: DeadlineTimelineProps) {
  const sorted = [...deadlines].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((d, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {d.urgent && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.deadline).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant={d.type === 'bursary' ? 'secondary' : 'outline'} className="text-xs">
                    {d.type}
                  </Badge>
                  <Badge
                    variant={d.urgent ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {d.daysRemaining} days
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 11: Verify Phase 1 compiles

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -40`

Fix any errors.

- [ ] **Step 2: Run dev server**

Run: `npm run dev` — verify no build errors on the student careers and portfolio pages.

- [ ] **Step 3: Commit Phase 1**

```bash
git add src/types/careers.ts src/types/index.ts src/lib/constants.ts \
  src/hooks/usePortfolio.ts src/hooks/useAPS.ts src/hooks/useProgrammeMatcher.ts \
  src/hooks/useApplications.ts \
  src/components/careers/ \
  src/app/\(dashboard\)/student/careers/page.tsx \
  src/app/\(dashboard\)/student/portfolio/page.tsx
git commit -m "feat(careers): Phase 1 — types, nav, APS, portfolio, student career dashboard"
```

---

### Phase 1 Audit Checklist

After Phase 1 is complete, verify against scope:

- [ ] All types from scope section 5.7 are in `src/types/careers.ts`
- [ ] Navigation routes added for student, parent, admin
- [ ] `usePortfolio` hook: fetches portfolio, adds extracurricular, adds community service, downloads transcript
- [ ] `useAPS` hook: fetches APS, runs simulation
- [ ] `APSScoreCard` shows per-subject breakdown with color-coded ratings
- [ ] `APSSimulator` has per-subject sliders, client-side recalc, programmes unlocked delta
- [ ] `PortfolioTimeline` shows year-by-year academic history
- [ ] Student can add extracurriculars and community service entries
- [ ] Teacher verification flag shown on unverified entries
- [ ] Transcript download button with loading state
- [ ] Student Career Dashboard: APS card, programme match summary, quick links
- [ ] No `apiClient` imports in page or component files
- [ ] No `any` types
- [ ] No `text-red-*` — uses `text-destructive`
- [ ] All grids have mobile breakpoints
- [ ] All dialogs use flex-col pattern with sticky footer
- [ ] All files under 350 lines
- [ ] Empty state + loading state for every data view
- [ ] All `catch` blocks use `catch (err: unknown)`

---

## Phases 2–6: Detailed in subsequent tasks during execution

Each phase will follow the same pattern: create hooks → create components → create pages → verify compilation → audit against scope. The file map above shows all files for all phases. Detailed task breakdowns for Phases 2–6 will be written at the start of each phase to keep plans focused and current.

# 30 — Career & University Guidance — NEW MODULE

## Vision

Every learner who passes through Campusly should leave school with a complete academic record and a clear path to their future — whether that's university, TVET college, a learnership, or direct employment. The system tracks their full academic history from Grade 8 to Grade 12, calculates their APS score in real time, matches them to university programmes they qualify for, and lets them apply with one click.

This is the feature that makes Campusly indispensable to families. A parent pays school fees for years — this module shows them the ROI.

---

## The Problem This Solves

In South Africa:
- Many learners don't apply to university because the process is confusing
- Parents don't understand APS or how subject choices affect eligibility
- Learners pick subjects in Grade 9 without knowing the downstream consequences
- Application deadlines are missed because no one tracks them
- Each university has a different portal, different requirements, different deadlines
- Career guidance at most schools is a single assembly talk in Grade 11

Campusly can fix all of this with data it already has.

---

## Phase 2 Features

### 1. Cumulative Academic Record

**The Learner Portfolio** — a living academic transcript that builds from Grade 8 onwards.

**What it tracks:**
- Per-year, per-term marks for every subject (pulled from Academic module)
- Final year-end percentages per subject per year
- Subject levels (Home Language, First Additional Language, Mathematics vs. Maths Literacy, etc.)
- Promotion history (promoted, condoned, retained)
- Achievements and awards (from Achiever module)
- Extracurriculars: sport teams, cultural activities, leadership positions (from Sport, Event modules)
- Community service hours (new field — manual entry by student, verified by teacher)
- Disciplinary record summary (clean / minor incidents — from Attendance/Discipline module)

**How it's built:**
- Automatically aggregated from existing module data — no manual entry for academics
- Year-end snapshot frozen when promotion is run (immutable historical record)
- Students and parents can view at any time via `/student/portfolio` or `/parent/portfolio`
- Downloadable as a formatted PDF transcript with school branding

**Data Model: `StudentPortfolio`**
```
StudentPortfolio {
  _id, studentId, schoolId,
  academicHistory: [{
    year: 2025,
    grade: 'Grade 10',
    subjects: [{
      subjectId, name, level, code,
      terms: [{ term, percentage, assessmentCount }],
      finalPercentage,
      apsPoints,        // auto-calculated from finalPercentage + level
    }],
    totalAPS,
    promoted: true,
    promotionStatus: 'promoted' | 'condoned' | 'retained',
  }],
  achievements: [{ year, title, category, points }],
  extracurriculars: [{ year, activity, role, description }],
  communityService: [{ year, organization, hours, verifiedBy }],
  updatedAt
}
```

**Why:** Universities want a complete picture. Currently this lives in filing cabinets. A digital portfolio that builds automatically is years ahead of any competitor.

---

### 2. Real-Time APS Calculator

**APS (Admission Point Score)** is the standard metric SA universities use. Campusly calculates it automatically.

**APS Conversion Table (NSC standard):**
| Percentage | Rating | APS Points |
|-----------|--------|------------|
| 80–100% | 7 (Outstanding) | 7 |
| 70–79% | 6 (Meritorious) | 6 |
| 60–69% | 5 (Substantial) | 5 |
| 50–59% | 4 (Adequate) | 4 |
| 40–49% | 3 (Moderate) | 3 |
| 30–39% | 2 (Elementary) | 2 |
| 0–29% | 1 (Not Achieved) | 1 |

**How it works:**
- Takes the student's best 6 subjects (excluding Life Orientation, which counts separately)
- Converts each subject's current percentage to APS points
- Sums to get total APS (max 42)
- Life Orientation shown separately (some universities count it, most don't)
- Updates in real time as new marks are captured throughout the year

**Where it's shown:**
- Student dashboard: "Your current APS: 34/42" with breakdown per subject
- Parent dashboard: same view per child
- Subject detail: "If you improve Maths from 58% to 65%, your APS goes from 34 to 35"
- "What-if" simulator: drag sliders to see how improving specific subjects affects APS

**Why:** Most Grade 11 and 12 learners don't know their APS until results day. Real-time APS tracking lets them course-correct while there's still time.

---

### 3. University & Programme Database

A comprehensive database of SA tertiary institutions and their programmes.

**Institutions to include:**
- All 26 public universities (UCT, Wits, Stellenbosch, UP, UJ, UKZN, NWU, UFS, Rhodes, NMU, etc.)
- Major TVET colleges
- Private institutions (Varsity College, Monash SA, STADIO, etc.)

**Per institution:**
- Name, location, type (traditional, comprehensive, university of technology)
- Application portal URL
- Application opening/closing dates
- Application fee
- General admission requirements
- Campus locations
- Contact info

**Per programme/course:**
- Faculty and department
- Qualification type (Bachelor, Diploma, Higher Certificate)
- Duration
- Minimum APS required
- Compulsory subjects with minimum percentages (e.g., "Mathematics 60%, Physical Sciences 50%")
- Recommended subjects
- NBT requirement (yes/no, which components: AL, QL, MAT)
- Career outcomes (what jobs does this degree lead to?)
- Estimated annual tuition fees
- Available bursaries/scholarships linked to this programme
- Application deadline specific to this programme (if different from institution)

**Data Model: `University`**
```
University {
  _id, name, shortName, type, province, city,
  logo, website, applicationPortalUrl,
  applicationOpenDate, applicationCloseDate,
  applicationFee,                 // cents
  generalRequirements: string,
  campuses: [{ name, city, province }],
  contactEmail, contactPhone,
  isActive: true,
  updatedAt
}
```

**Data Model: `Programme`**
```
Programme {
  _id, universityId, faculty, department,
  name,                           // e.g., "Bachelor of Science in Computer Science"
  qualificationType,              // bachelor | diploma | higher_certificate | postgrad_diploma
  duration,                       // e.g., "3 years"
  minimumAPS,
  subjectRequirements: [{
    subjectName,                  // e.g., "Mathematics" (not Maths Literacy)
    minimumPercentage,            // e.g., 60
    isCompulsory: true,
  }],
  nbtRequired: { al: boolean, ql: boolean, mat: boolean },
  nbtMinimumScores: { al: number, ql: number, mat: number },
  careerOutcomes: string[],       // e.g., ["Software Developer", "Data Scientist"]
  annualTuition,                  // cents
  linkedBursaries: string[],
  applicationDeadline,            // if programme-specific
  additionalNotes: string,
  isActive: true,
  updatedAt
}
```

**Data sourcing:**
- Initial seed: manual data capture from university prospectuses (2026/2027)
- Annual update cycle: scrape/manually update from official university websites
- Community contribution: allow schools to flag outdated info
- Long-term: partnerships with universities for direct data feed

**Why:** This data exists scattered across 26+ university websites, each in different formats. Centralizing it and matching it against the student's actual marks is the core value proposition.

---

### 4. Programme Matcher — "What Can I Study?"

The engine that connects a student's academic profile to eligible programmes.

**How it works:**
1. Takes the student's current subjects, levels, and percentages
2. Calculates APS
3. Scans the programme database and returns:
   - **Eligible programmes** — student meets all requirements right now
   - **Close match programmes** — student is 1–2 subjects or a few percentage points short (with specific gap noted)
   - **Not eligible** — hidden by default, but viewable if student wants to explore

**Match result per programme:**
```
{
  programme: "BSc Computer Science",
  university: "University of Cape Town",
  status: 'eligible' | 'close' | 'not_eligible',
  apsRequired: 36,
  apsActual: 34,
  subjectGaps: [
    { subject: "Mathematics", required: 70, actual: 65, gap: 5 }
  ],
  missingSubjects: [],           // subjects the student doesn't take at all
  overallFit: 92,                // percentage match score
}
```

**UI: Programme Explorer** (`/student/careers/explore`)
- Search/filter by: field of study, university, province, qualification type
- Sort by: best match, APS required, tuition cost
- Each result card shows: university logo, programme name, APS match bar, subject gap highlights
- Tap to expand: full requirements, career outcomes, tuition, application dates
- "Save to My List" — student bookmarks programmes they're interested in

**UI: My Matches Dashboard** (`/student/careers`)
- Top stat cards: "You qualify for 47 programmes across 12 universities"
- Saved programmes with eligibility status
- "Improve your chances" section: "Increase Maths to 70% to unlock 8 more programmes"
- Timeline: upcoming application deadlines for saved programmes

**Parent view** (`/parent/careers`)
- Same match results for each child
- Comparison view if multiple children

**Why:** This is the moment a learner goes from "I don't know what I can study" to "I qualify for 47 programmes." That moment changes lives.

---

### 5. One-Click Application

The ultimate convenience — apply to universities directly from Campusly.

**How it works:**
- Student selects a saved programme and taps "Apply"
- Campusly pre-fills the application form with data it already has:
  - Personal info (from Student/User model)
  - Parent/guardian info (from Parent model)
  - Academic record (from Portfolio)
  - Subject choices and marks
  - Extracurriculars and achievements
- For universities with structured application APIs (long-term goal): submit directly
- For universities without APIs (reality for most): generate a pre-filled PDF application form or redirect to the university portal with data pre-copied to clipboard
- Track application status: `draft` → `submitted` → `acknowledged` → `accepted` | `waitlisted` | `rejected`

**Application Tracker** (`/student/careers/applications`)
- List of all applications with status
- Deadline reminders (7 days, 3 days, 1 day before close)
- Document checklist per application (ID copy, transcript, proof of payment, etc.)
- Upload supporting documents (stored against the application)
- Status updates (manual entry initially; auto-tracking if university partnerships develop)

**Data Model: `Application`**
```
Application {
  _id, studentId, schoolId, programmeId, universityId,
  status: 'draft' | 'submitted' | 'acknowledged' | 'accepted' | 'waitlisted' | 'rejected',
  submittedAt,
  applicationReference,           // university's reference number (manual entry)
  documents: [{ name, type, url, uploadedAt }],
  applicationFee: { amount, paid: boolean },
  notes: string,
  responseDate,                   // when the university responded
  responseDetails: string,        // acceptance letter details, conditions, etc.
  createdAt, updatedAt
}
```

**Realistic rollout:**
- Phase 1: Application tracker + pre-filled PDF + deadline reminders (no direct submission)
- Phase 2: Direct API integration with universities that support it (start with CAO for KZN universities)
- Phase 3: Partnerships with university admissions offices for status feed-back

**Why:** Even without direct API submission, the tracker alone is valuable. Most learners apply to 3–5 universities and lose track. A single dashboard showing all applications, deadlines, and status is a game-changer.

---

### 6. Aptitude & Career Assessment

Help learners discover what careers suit their personality, interests, and strengths.

**Aptitude Test**
- Built-in psychometric-style assessment (not a clinical tool — a guidance tool)
- Sections: interests, personality type, problem-solving style, work preferences
- 30–40 minutes to complete
- Results mapped to career clusters:
  - STEM (Science, Technology, Engineering, Mathematics)
  - Health Sciences
  - Business & Commerce
  - Law & Humanities
  - Creative Arts & Design
  - Education
  - Agriculture & Environment
  - Social Sciences
  - Trades & Technical
- Results show top 3 career clusters with explanation of why

**Career Explorer**
- Browse career clusters → see specific careers within each
- Per career: description, typical salary range (SA context), required qualification, demand level (growing/stable/declining)
- Link back to programmes: "To become a Software Developer, you could study BSc Computer Science at these 8 universities"
- Closing the loop: career → programme → requirements → your marks → gap

**Subject Choice Advisor** (Grade 9 feature)
- When a Grade 9 learner needs to choose subjects for Grade 10
- Input: aptitude results + academic performance + career interests
- Output: recommended subject combination with reasoning
- "If you're interested in Engineering, take Mathematics (not Maths Lit), Physical Sciences, and either IT or Technical Drawing"
- Show impact: "This subject combination qualifies you for 120 programmes vs. 45 with Maths Literacy"

**Why:** Subject choice in Grade 9 is the most consequential academic decision a learner makes, and they make it with almost no information. This feature alone justifies the module.

---

### 7. Bursary & Scholarship Finder

**Database of available bursaries:**
- NSFAS (National Student Financial Aid Scheme)
- University-specific bursaries
- Corporate bursaries (Sasol, Old Mutual, Allan Gray Orbis, etc.)
- Government bursaries (Funza Lushaka for teaching, etc.)
- NGO and trust bursaries

**Per bursary:**
- Name, provider, description
- Eligibility criteria (APS, household income, field of study, demographics)
- Application opening/closing dates
- Application URL or process
- Coverage (tuition, accommodation, books, stipend)
- Linked programmes/universities

**Bursary Matcher:**
- Based on student's APS, household income (if captured), field of interest
- "You may qualify for 12 bursaries" with ranked list
- Deadline reminders for saved bursaries

**Why:** Financial barriers are the #1 reason qualified SA learners don't attend university. Surfacing bursaries they didn't know existed directly addresses this.

---

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/careers/portfolio/student/:id` | Full academic portfolio for a student |
| `POST` | `/careers/portfolio/student/:id/snapshot` | Freeze year-end snapshot |
| `GET` | `/careers/portfolio/student/:id/transcript` | Generate PDF transcript |
| `GET` | `/careers/aps/student/:id` | Current APS calculation with breakdown |
| `GET` | `/careers/aps/student/:id/simulate` | What-if APS simulator |
| `GET` | `/careers/universities` | List all universities (paginated, filterable) |
| `GET` | `/careers/universities/:id` | Single university with programmes |
| `GET` | `/careers/programmes` | Search/filter programmes |
| `GET` | `/careers/programmes/:id` | Single programme with full requirements |
| `GET` | `/careers/match/student/:id` | Programme matcher results |
| `POST` | `/careers/applications` | Create application |
| `GET` | `/careers/applications/student/:id` | Student's applications |
| `PATCH` | `/careers/applications/:id` | Update application status/docs |
| `GET` | `/careers/aptitude/questions` | Get aptitude test questions |
| `POST` | `/careers/aptitude/submit` | Submit aptitude test answers |
| `GET` | `/careers/aptitude/student/:id/results` | Get aptitude results |
| `GET` | `/careers/explorer` | Browse careers by cluster |
| `GET` | `/careers/subject-advisor/student/:id` | Subject choice recommendations |
| `GET` | `/careers/bursaries` | Search/filter bursaries |
| `GET` | `/careers/bursaries/match/student/:id` | Bursary matcher |
| `GET` | `/careers/deadlines/student/:id` | Upcoming deadlines (applications + bursaries) |

## Frontend Pages

| Page | Path | Role |
|------|------|------|
| Career Dashboard | `/student/careers` | Student |
| Programme Explorer | `/student/careers/explore` | Student |
| My Applications | `/student/careers/applications` | Student |
| Aptitude Test | `/student/careers/aptitude` | Student |
| Career Explorer | `/student/careers/careers` | Student |
| Subject Advisor | `/student/careers/subjects` | Student (Grade 9) |
| Bursary Finder | `/student/careers/bursaries` | Student |
| Academic Portfolio | `/student/portfolio` | Student |
| Parent Career View | `/parent/careers` | Parent |
| Parent Portfolio View | `/parent/portfolio` | Parent |
| Admin University DB | `/admin/careers/universities` | Admin |
| Admin Programme DB | `/admin/careers/programmes` | Admin |
| Admin Bursary DB | `/admin/careers/bursaries` | Admin |

## Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| `APSScoreCard` | `src/components/careers/APSScoreCard.tsx` | Current APS with subject breakdown |
| `APSSimulator` | `src/components/careers/APSSimulator.tsx` | What-if sliders for each subject |
| `ProgrammeCard` | `src/components/careers/ProgrammeCard.tsx` | Programme match result card |
| `ProgrammeMatchBar` | `src/components/careers/ProgrammeMatchBar.tsx` | Visual APS match indicator |
| `SubjectGapList` | `src/components/careers/SubjectGapList.tsx` | Shows what's missing per programme |
| `ApplicationTracker` | `src/components/careers/ApplicationTracker.tsx` | Application list with status pipeline |
| `DeadlineTimeline` | `src/components/careers/DeadlineTimeline.tsx` | Upcoming deadline visual |
| `AptitudeQuestion` | `src/components/careers/AptitudeQuestion.tsx` | Single aptitude test question |
| `CareerClusterCard` | `src/components/careers/CareerClusterCard.tsx` | Career cluster result card |
| `SubjectAdvisor` | `src/components/careers/SubjectAdvisor.tsx` | Subject choice recommendation view |
| `BursaryCard` | `src/components/careers/BursaryCard.tsx` | Bursary match result card |
| `PortfolioTimeline` | `src/components/careers/PortfolioTimeline.tsx` | Year-by-year academic history |
| `TranscriptDownload` | `src/components/careers/TranscriptDownload.tsx` | PDF transcript generation trigger |

---

## Implementation Priority

1. **APS Calculator + Portfolio** — uses existing data, immediate value, low backend effort
2. **University & Programme Database** — data capture effort is high but it's the foundation
3. **Programme Matcher** — the "wow" feature that makes everything click
4. **Application Tracker** — practical utility even without direct submission
5. **Aptitude Test + Career Explorer** — guidance layer
6. **Subject Choice Advisor** — Grade 9 specific, extremely high impact
7. **Bursary Finder** — financial access layer
8. **One-Click Application** — requires university partnerships, long-term play

---

## Why This Changes Everything

No school management platform in South Africa does this. d6 Connect doesn't. Karri doesn't. ADAM doesn't.

A parent who sees:
- "Your child's APS is 34. They qualify for 47 programmes at 12 universities."
- "If they improve Mathematics from 58% to 65%, they unlock 8 more programmes including BSc Engineering at UP."
- "Application deadline for UCT is 31 July. Click here to apply."
- "They may qualify for 3 bursaries worth up to R120,000/year."

That parent will never leave Campusly. And they'll tell every other parent they know.

**This is the feature that turns Campusly from a school management tool into a life management tool.**

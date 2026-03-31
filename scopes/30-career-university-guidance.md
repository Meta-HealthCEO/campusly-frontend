# 30 — Career & University Guidance Module

## 1. Module Overview

The Career & University Guidance module turns Campusly into a life-planning tool. It aggregates a student's full academic history from Grade 8 to Grade 12, calculates their APS (Admission Point Score) in real time, matches them to university programmes they qualify for, tracks applications, provides aptitude/career assessments, and surfaces bursary/scholarship opportunities.

### Sub-domains

| Sub-domain | Responsibility |
|---|---|
| Student Portfolio | Cumulative academic record across years — marks, achievements, extracurriculars, community service |
| APS Calculator | Real-time APS computation from current marks with what-if simulation |
| University Database | All SA tertiary institutions with application dates, fees, contacts |
| Programme Database | Programmes per university with APS requirements, subject requirements, NBT, career outcomes, tuition |
| Programme Matcher | Engine that compares a student's profile against all programmes and returns eligible/close/ineligible |
| Application Tracker | Track applications across universities — status, documents, deadlines |
| Aptitude Assessment | Psychometric-style career interest/personality assessment mapped to career clusters |
| Career Explorer | Browse careers by cluster with salary, demand, required qualifications, linked programmes |
| Subject Choice Advisor | Grade 9 subject selection guidance based on aptitude + career interest + academic performance |
| Bursary Finder | Database of bursaries/scholarships matched to student profile |

### Role-based access summary

| Capability | student | parent | teacher | school_admin | super_admin |
|---|---|---|---|---|---|
| View own portfolio | read | read (child) | read (class) | read (any) | read (any) |
| APS calculator | read (own) | read (child) | read (class) | read (any) | read (any) |
| Browse universities/programmes | read | read | read | CRUD | CRUD |
| Programme matcher | read (own) | read (child) | read (class) | read (any) | read (any) |
| Applications | CRUD (own) | read (child) | read (class) | read (any) | read (any) |
| Aptitude assessment | write + read (own) | read (child) | read (class) | read (any) | read (any) |
| Career explorer | read | read | read | read | read |
| Subject advisor | read (own) | read (child) | read (class) | read (any) | read (any) |
| Bursaries | read | read | read | CRUD | CRUD |
| University/programme data management | — | — | — | CRUD | CRUD |

---

## 2. Backend API Endpoints

All routes are mounted under `/careers`. Every request requires a valid JWT.

---

### 2.1 Student Portfolio

#### GET /careers/portfolio/student/:studentId

Full academic portfolio for a student. Aggregates data from Academic module (marks per subject per term per year), Achiever module (achievements), Sport module (team membership), and manually-entered extracurriculars/community service.

**Auth:** Required. Student can view own, parent can view child, teacher can view class students, admin can view any.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "student": { "_id": "...", "firstName": "Thabo", "lastName": "Mokoena", "dateOfBirth": "2008-05-14" },
    "academicHistory": [
      {
        "year": 2025,
        "grade": "Grade 10",
        "subjects": [
          {
            "subjectId": "...",
            "name": "Mathematics",
            "level": "core",
            "code": "MATH",
            "terms": [
              { "term": 1, "percentage": 72, "assessmentCount": 5 },
              { "term": 2, "percentage": 68, "assessmentCount": 4 }
            ],
            "finalPercentage": 70,
            "apsPoints": 6
          }
        ],
        "totalAPS": 34,
        "promoted": true,
        "promotionStatus": "promoted"
      }
    ],
    "achievements": [
      { "year": 2025, "title": "Academic Excellence", "category": "academic", "points": 50 }
    ],
    "extracurriculars": [
      { "year": 2025, "activity": "First XV Rugby", "role": "Player", "description": "Selected for first team" }
    ],
    "communityService": [
      { "year": 2025, "organization": "Habitat for Humanity", "hours": 24, "verifiedBy": "Mrs Naidoo" }
    ]
  }
}
```

---

#### POST /careers/portfolio/student/:studentId/snapshot

Freeze a year-end academic snapshot. Creates an immutable record of the student's year-end results. Typically run when promotion is processed.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Request body:**

```json
{
  "year": 2025,
  "grade": "Grade 10"
}
```

**Response 201:**

```json
{
  "success": true,
  "message": "Year-end snapshot created for 2025"
}
```

---

#### POST /careers/portfolio/student/:studentId/extracurricular

Add an extracurricular activity to a student's portfolio.

**Auth:** Required. Student can add own (teacher verification required), teacher can add for class students, admin can add for any.

**Request body:**

```json
{
  "year": 2025,
  "activity": "Debating Society",
  "role": "Captain",
  "description": "Led the team to provincial finals",
  "verifiedBy": "optional — teacher userId"
}
```

---

#### POST /careers/portfolio/student/:studentId/community-service

Add a community service entry.

**Auth:** Required. Student can add own (requires teacher verification), admin can add verified entries directly.

**Request body:**

```json
{
  "year": 2025,
  "organization": "SPCA",
  "hours": 16,
  "description": "Weekend volunteer",
  "verifiedBy": "optional — teacher userId"
}
```

---

#### GET /careers/portfolio/student/:studentId/transcript

Generate a PDF transcript.

**Auth:** Required. Student can generate own, parent for child, admin for any.

**Response:** PDF binary stream with `Content-Type: application/pdf`.

The PDF includes: school branding (logo, name, address), student details, year-by-year subject marks, final percentages, APS per year, achievements, extracurriculars, community service. Signed with school principal name from School settings.

---

### 2.2 APS Calculator

#### GET /careers/aps/student/:studentId

Current APS calculation based on latest marks.

**Auth:** Required. Student (own), parent (child), teacher (class), admin (any).

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalAPS": 34,
    "maxAPS": 42,
    "lifeOrientation": { "percentage": 78, "apsPoints": 6, "note": "Excluded from total (most universities)" },
    "subjects": [
      {
        "subjectId": "...",
        "name": "Mathematics",
        "level": "core",
        "currentPercentage": 72,
        "rating": 6,
        "apsPoints": 6
      },
      {
        "subjectId": "...",
        "name": "English Home Language",
        "level": "home_language",
        "currentPercentage": 65,
        "rating": 5,
        "apsPoints": 5
      }
    ],
    "apsConversionTable": [
      { "min": 80, "max": 100, "rating": 7, "points": 7, "description": "Outstanding" },
      { "min": 70, "max": 79, "rating": 6, "points": 6, "description": "Meritorious" },
      { "min": 60, "max": 69, "rating": 5, "points": 5, "description": "Substantial" },
      { "min": 50, "max": 59, "rating": 4, "points": 4, "description": "Adequate" },
      { "min": 40, "max": 49, "rating": 3, "points": 3, "description": "Moderate" },
      { "min": 30, "max": 39, "rating": 2, "points": 2, "description": "Elementary" },
      { "min": 0, "max": 29, "rating": 1, "points": 1, "description": "Not Achieved" }
    ]
  }
}
```

---

#### POST /careers/aps/student/:studentId/simulate

What-if APS simulator. Student provides hypothetical percentages and sees the impact.

**Auth:** Required. Student (own), parent (child).

**Request body:**

```json
{
  "adjustments": [
    { "subjectId": "...", "hypotheticalPercentage": 75 },
    { "subjectId": "...", "hypotheticalPercentage": 60 }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "currentAPS": 34,
    "simulatedAPS": 36,
    "improvement": 2,
    "subjects": [
      {
        "name": "Mathematics",
        "currentPercentage": 65,
        "hypotheticalPercentage": 75,
        "currentAPS": 5,
        "simulatedAPS": 6,
        "change": "+1"
      }
    ],
    "newProgrammesUnlocked": 8
  }
}
```

---

### 2.3 Universities

#### GET /careers/universities

List all universities. Paginated, filterable.

**Auth:** Required. Any authenticated user.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `type` | `string` | `traditional`, `comprehensive`, `university_of_technology`, `tvet`, `private` |
| `province` | `string` | SA province filter |
| `search` | `string` | Search by name |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 20 |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "name": "University of Cape Town",
        "shortName": "UCT",
        "type": "traditional",
        "province": "Western Cape",
        "city": "Cape Town",
        "logo": "https://...",
        "website": "https://www.uct.ac.za",
        "applicationPortalUrl": "https://applyonline.uct.ac.za",
        "applicationOpenDate": "2026-04-01",
        "applicationCloseDate": "2026-07-31",
        "applicationFee": 10000,
        "programmeCount": 187
      }
    ],
    "total": 26,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

#### GET /careers/universities/:id

Single university with full details.

---

#### POST /careers/universities

Create a university entry.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

---

#### PUT /careers/universities/:id

Update a university.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

---

### 2.4 Programmes

#### GET /careers/programmes

Search and filter programmes across all universities.

**Auth:** Required. Any authenticated user.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `universityId` | `string` | Filter by university |
| `faculty` | `string` | Filter by faculty name |
| `qualificationType` | `string` | `bachelor`, `diploma`, `higher_certificate`, `postgrad_diploma` |
| `maxAPS` | `number` | Show only programmes the student could qualify for (APS <= maxAPS) |
| `field` | `string` | Field of study keyword |
| `search` | `string` | Search by programme name |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 20 |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "universityId": "...",
        "universityName": "University of Cape Town",
        "universityLogo": "https://...",
        "faculty": "Science",
        "department": "Computer Science",
        "name": "Bachelor of Science in Computer Science",
        "qualificationType": "bachelor",
        "duration": "3 years",
        "minimumAPS": 36,
        "subjectRequirements": [
          { "subjectName": "Mathematics", "minimumPercentage": 70, "isCompulsory": true },
          { "subjectName": "Physical Sciences", "minimumPercentage": 50, "isCompulsory": false }
        ],
        "nbtRequired": { "al": true, "ql": true, "mat": true },
        "careerOutcomes": ["Software Developer", "Data Scientist", "Systems Analyst"],
        "annualTuition": 6500000,
        "applicationDeadline": "2026-07-31"
      }
    ],
    "total": 2341,
    "page": 1,
    "limit": 20,
    "totalPages": 118
  }
}
```

---

#### GET /careers/programmes/:id

Single programme with full details and linked bursaries.

---

#### POST /careers/programmes

Create a programme.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Request body:**

```json
{
  "universityId": "string (ObjectId, required)",
  "faculty": "string (required)",
  "department": "string (optional)",
  "name": "string (required)",
  "qualificationType": "'bachelor' | 'diploma' | 'higher_certificate' | 'postgrad_diploma' (required)",
  "duration": "string (required)",
  "minimumAPS": "number (required, 0-42)",
  "subjectRequirements": [
    {
      "subjectName": "string (required)",
      "minimumPercentage": "number (required, 0-100)",
      "isCompulsory": "boolean (required)"
    }
  ],
  "nbtRequired": { "al": "boolean", "ql": "boolean", "mat": "boolean" },
  "nbtMinimumScores": { "al": "number", "ql": "number", "mat": "number" },
  "careerOutcomes": ["string"],
  "annualTuition": "number (cents)",
  "linkedBursaries": ["string"],
  "applicationDeadline": "string (ISO date, optional)",
  "additionalNotes": "string (optional)"
}
```

---

#### PUT /careers/programmes/:id

Update a programme.

---

#### POST /careers/programmes/import

Bulk import programmes from CSV.

**Auth:** Required. Roles: `super_admin`.

**Request body:** `multipart/form-data` with CSV file.

CSV columns: `universityName, faculty, department, programmeName, qualificationType, duration, minimumAPS, subject1Name, subject1Min, subject1Compulsory, subject2Name, subject2Min, subject2Compulsory, ...`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "imported": 145,
    "skipped": 3,
    "errors": [
      { "row": 23, "reason": "University 'UKZM' not found" }
    ]
  }
}
```

---

### 2.5 Programme Matcher

#### GET /careers/match/student/:studentId

Run the programme matcher against the student's current academic profile.

**Auth:** Required. Student (own), parent (child), teacher (class), admin (any).

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | `string` | `eligible`, `close`, `all` (default: `all`) |
| `universityId` | `string` | Filter by university |
| `field` | `string` | Filter by field of study keyword |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 20 |

**Matching logic:**

1. Calculate student's current APS from latest marks.
2. For each programme in the database:
   a. Compare student APS against `minimumAPS`.
   b. Check each compulsory `subjectRequirement` — does the student take that subject, and is their percentage >= minimum?
   c. Check recommended (non-compulsory) subjects similarly.
3. Assign status:
   - `eligible` — APS met AND all compulsory subjects met.
   - `close` — APS within 3 points AND no more than 1 compulsory subject below threshold (by no more than 10%).
   - `not_eligible` — everything else.
4. Calculate `overallFit` as a percentage score (weighted: 50% APS fit, 50% subject fit).
5. Sort by `overallFit` descending.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "studentAPS": 34,
    "summary": {
      "eligible": 47,
      "close": 23,
      "total": 70
    },
    "matches": [
      {
        "programmeId": "...",
        "programmeName": "BSc Computer Science",
        "universityName": "University of Cape Town",
        "universityLogo": "https://...",
        "faculty": "Science",
        "qualificationType": "bachelor",
        "status": "close",
        "apsRequired": 36,
        "apsActual": 34,
        "apsGap": 2,
        "subjectGaps": [
          {
            "subjectName": "Mathematics",
            "required": 70,
            "actual": 65,
            "gap": 5
          }
        ],
        "missingSubjects": [],
        "overallFit": 88,
        "annualTuition": 6500000,
        "applicationDeadline": "2026-07-31"
      }
    ],
    "page": 1,
    "limit": 20,
    "totalPages": 4
  }
}
```

---

### 2.6 Applications

#### POST /careers/applications

Create an application.

**Auth:** Required. Student (own).

**Request body:**

```json
{
  "programmeId": "string (ObjectId, required)",
  "notes": "string (optional)"
}
```

`universityId`, `studentId`, and `schoolId` are derived server-side from the programme and the authenticated user.

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "studentId": "...",
    "programmeId": "...",
    "universityId": "...",
    "status": "draft",
    "documents": [],
    "createdAt": "2026-06-15T10:00:00.000Z"
  }
}
```

---

#### GET /careers/applications/student/:studentId

Student's applications. Paginated.

**Auth:** Required. Student (own), parent (child), teacher (class), admin (any).

**Query parameters:** `status`, `page`, `limit`.

---

#### PATCH /careers/applications/:id

Update application status, add reference number, add notes.

**Auth:** Required. Student (own), admin.

**Request body (partial):**

```json
{
  "status": "submitted",
  "applicationReference": "UCT-2026-12345",
  "notes": "Submitted on portal on 15 June"
}
```

---

#### POST /careers/applications/:id/documents

Upload a supporting document.

**Auth:** Required. Student (own).

**Request body:** `multipart/form-data` with file. Fields: `name` (string), `type` (`id_copy | transcript | proof_of_payment | motivation_letter | other`).

---

#### GET /careers/applications/:id/prefill

Generate pre-filled application data (for copy-paste or PDF generation).

**Auth:** Required. Student (own).

**Response 200:** Returns a structured JSON with all fields a typical university application requires, pre-populated from student data.

---

#### GET /careers/deadlines/student/:studentId

Upcoming deadlines for saved/applied programmes and bursaries.

**Auth:** Required. Student (own), parent (child).

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "type": "application",
      "name": "UCT - BSc Computer Science",
      "deadline": "2026-07-31",
      "daysRemaining": 46,
      "status": "draft",
      "urgent": false
    },
    {
      "type": "bursary",
      "name": "Allan Gray Orbis Fellowship",
      "deadline": "2026-06-30",
      "daysRemaining": 15,
      "status": "not_applied",
      "urgent": true
    }
  ]
}
```

---

### 2.7 Aptitude Assessment

#### GET /careers/aptitude/questions

Get the aptitude assessment questions.

**Auth:** Required. Student.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "name": "Interests",
        "description": "What activities do you enjoy?",
        "questions": [
          {
            "id": "q1",
            "text": "I enjoy solving mathematical problems",
            "type": "likert",
            "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
          }
        ]
      },
      {
        "name": "Personality",
        "description": "How do you approach work and people?"
      },
      {
        "name": "Problem Solving",
        "description": "How do you think through challenges?"
      },
      {
        "name": "Work Preferences",
        "description": "What kind of work environment suits you?"
      }
    ],
    "totalQuestions": 40,
    "estimatedMinutes": 30
  }
}
```

---

#### POST /careers/aptitude/submit

Submit aptitude assessment answers.

**Auth:** Required. Student.

**Request body:**

```json
{
  "answers": [
    { "questionId": "q1", "value": 4 },
    { "questionId": "q2", "value": 2 }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "clusters": [
      { "name": "STEM", "score": 85, "rank": 1, "description": "Strong alignment with science, technology, engineering..." },
      { "name": "Business & Commerce", "score": 72, "rank": 2, "description": "..." },
      { "name": "Health Sciences", "score": 68, "rank": 3, "description": "..." }
    ],
    "personalityType": "Analytical Problem-Solver",
    "suggestedCareers": ["Software Developer", "Data Scientist", "Actuary", "Engineer"],
    "completedAt": "2026-06-10T14:30:00.000Z"
  }
}
```

---

#### GET /careers/aptitude/student/:studentId/results

Retrieve previously completed aptitude results.

---

### 2.8 Career Explorer

#### GET /careers/explorer

Browse careers by cluster.

**Auth:** Required. Any authenticated user.

**Query parameters:** `cluster` (string), `search` (string).

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "name": "Software Developer",
      "cluster": "STEM",
      "description": "Design, build, and maintain software applications...",
      "salaryRange": { "entry": 18000000, "mid": 45000000, "senior": 90000000 },
      "demand": "growing",
      "requiredQualification": "BSc Computer Science, BEng Software Engineering, or Diploma in IT",
      "linkedProgrammeCount": 34,
      "skills": ["Programming", "Problem-solving", "Teamwork"]
    }
  ]
}
```

Salary values are annual, in cents (ZAR).

---

### 2.9 Subject Choice Advisor

#### GET /careers/subject-advisor/student/:studentId

Subject choice recommendations for a Grade 9 student selecting Grade 10 subjects.

**Auth:** Required. Student (own), parent (child), teacher (class).

**Response 200:**

```json
{
  "success": true,
  "data": {
    "aptitudeTopCluster": "STEM",
    "currentPerformance": {
      "mathematics": 72,
      "naturalSciences": 68,
      "technology": 75
    },
    "recommendations": [
      {
        "subjectCombination": ["Mathematics", "Physical Sciences", "Information Technology", "Accounting"],
        "reasoning": "Your strong maths and science performance aligns with your STEM aptitude. This combination qualifies you for 120+ university programmes including engineering, computer science, and actuarial science.",
        "programmesUnlocked": 124,
        "careerPaths": ["Engineer", "Software Developer", "Actuary", "Data Scientist"]
      },
      {
        "subjectCombination": ["Mathematics", "Physical Sciences", "Life Sciences", "Geography"],
        "reasoning": "This broader science combination keeps engineering and health science options open.",
        "programmesUnlocked": 108,
        "careerPaths": ["Doctor", "Engineer", "Environmental Scientist"]
      }
    ],
    "warnings": [
      {
        "subject": "Mathematical Literacy",
        "impact": "Choosing Maths Literacy instead of Mathematics reduces your eligible programmes from 124 to 31 and closes all engineering, actuarial, and most science degrees."
      }
    ]
  }
}
```

---

### 2.10 Bursaries

#### GET /careers/bursaries

List/search bursaries.

**Auth:** Required. Any authenticated user.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `field` | `string` | Field of study |
| `provider` | `string` | Bursary provider name |
| `search` | `string` | Keyword search |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 20 |

---

#### GET /careers/bursaries/:id

Single bursary with full details.

---

#### GET /careers/bursaries/match/student/:studentId

Bursaries the student may qualify for based on APS, field of interest, and any captured demographic/financial data.

**Auth:** Required. Student (own), parent (child).

---

#### POST /careers/bursaries

Create a bursary entry.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Request body:**

```json
{
  "name": "Allan Gray Orbis Fellowship",
  "provider": "Allan Gray",
  "description": "Full bursary for high-achieving students...",
  "eligibilityCriteria": "Minimum APS 35, household income under R350k/year",
  "minimumAPS": 35,
  "fieldOfStudy": ["any"],
  "coverageDetails": "Tuition, accommodation, books, stipend",
  "applicationOpenDate": "2026-03-01",
  "applicationCloseDate": "2026-06-30",
  "applicationUrl": "https://www.allangrayorbis.org/fellowship/apply",
  "linkedUniversities": ["ObjectId"],
  "annualValue": 15000000
}
```

---

#### PUT /careers/bursaries/:id

Update a bursary.

---

#### POST /careers/bursaries/import

Bulk import bursaries from CSV.

**Auth:** Required. Roles: `super_admin`.

---

## 3. Frontend Pages

### 3.1 Student Career Dashboard — `/student/careers`

**File:** `src/app/(dashboard)/student/careers/page.tsx`

Top section: APS score card with breakdown. "You qualify for X programmes at Y universities."

Middle section: Saved programmes with eligibility status. Upcoming deadlines timeline.

Bottom section: Quick links — Explore Programmes, Take Aptitude Test, Find Bursaries.

### 3.2 Programme Explorer — `/student/careers/explore`

**File:** `src/app/(dashboard)/student/careers/explore/page.tsx`

Search/filter interface for all programmes. Filter by field, university, province, qualification type. Each result is a `ProgrammeCard` showing match status, APS comparison, subject gaps. Tap to expand full details. "Save" and "Apply" buttons.

### 3.3 My Applications — `/student/careers/applications`

**File:** `src/app/(dashboard)/student/careers/applications/page.tsx`

Kanban-style board or list view: Draft → Submitted → Acknowledged → Accepted/Waitlisted/Rejected. Per application: university logo, programme name, status badge, deadline, document checklist with upload. "Pre-fill Application" button generates data for copy-paste into university portal.

### 3.4 Aptitude Test — `/student/careers/aptitude`

**File:** `src/app/(dashboard)/student/careers/aptitude/page.tsx`

Multi-section assessment form. Progress bar across sections. Likert scale inputs for each question. Results page with career cluster ranking, personality summary, suggested careers. "Explore careers in [top cluster]" CTA linking to Career Explorer.

### 3.5 Career Explorer — `/student/careers/careers`

**File:** `src/app/(dashboard)/student/careers/careers/page.tsx`

Browse by career cluster (STEM, Health, Business, etc.). Per career: description, salary range, demand indicator, required qualification, linked programmes. "See programmes for this career" button runs a filtered programme search.

### 3.6 Subject Choice Advisor — `/student/careers/subjects`

**File:** `src/app/(dashboard)/student/careers/subjects/page.tsx`

Targeted at Grade 9 students. Shows recommended subject combinations with reasoning. Impact comparison: "Maths → 124 programmes, Maths Lit → 31 programmes." Interactive: student can toggle subjects and see programme count change in real time.

### 3.7 Bursary Finder — `/student/careers/bursaries`

**File:** `src/app/(dashboard)/student/careers/bursaries/page.tsx`

Search/filter bursaries. Matched bursaries highlighted at top. Per bursary: provider, coverage, deadline, eligibility summary, apply link. Save for tracking — saved bursaries appear in deadline timeline.

### 3.8 Academic Portfolio — `/student/portfolio`

**File:** `src/app/(dashboard)/student/portfolio/page.tsx`

Year-by-year academic history timeline. Per year: subjects with marks, APS, promotion status. Achievements, extracurriculars, community service tabs. "Download Transcript" button generates PDF.

### 3.9 Parent Career View — `/parent/careers`

**File:** `src/app/(dashboard)/parent/careers/page.tsx`

Same as student career dashboard but per-child selector. Shows APS, programme matches, application tracker, deadlines. Read-only (parent cannot create applications on behalf of student).

### 3.10 Parent Portfolio View — `/parent/portfolio`

**File:** `src/app/(dashboard)/parent/portfolio/page.tsx`

Same as student portfolio, per-child selector.

### 3.11 Admin University Management — `/admin/careers/universities`

**File:** `src/app/(dashboard)/admin/careers/universities/page.tsx`

CRUD DataTable of universities. Add/edit via dialog form. Import button for bulk CSV.

### 3.12 Admin Programme Management — `/admin/careers/programmes`

**File:** `src/app/(dashboard)/admin/careers/programmes/page.tsx`

CRUD DataTable of programmes, filterable by university. Bulk import from CSV. Data completeness indicator.

### 3.13 Admin Bursary Management — `/admin/careers/bursaries`

**File:** `src/app/(dashboard)/admin/careers/bursaries/page.tsx`

CRUD DataTable of bursaries. Bulk import from CSV.

---

## 4. User Flows

### 4.1 Student Checks Their APS

1. Student navigates to `/student/careers`.
2. APS card shows current score with per-subject breakdown.
3. Student taps "What if I improve?" → simulator opens.
4. Drags Mathematics slider from 65% to 75%.
5. Sees APS change from 34 to 35, "8 new programmes unlocked."

### 4.2 Student Explores Programmes

1. Student navigates to `/student/careers/explore`.
2. Types "computer science" in search.
3. Sees 12 results across 8 universities, sorted by match fit.
4. UCT BSc CompSci shows as "Close Match — Maths needs +5%."
5. UJ BSc IT shows as "Eligible."
6. Student saves both to their list.

### 4.3 Student Applies to a University

1. Student navigates to `/student/careers/applications`.
2. Clicks "Apply" on a saved programme.
3. Application created in `draft` status.
4. Student clicks "Pre-fill Application" → structured data shown for copy-paste.
5. Student goes to university portal, pastes data, submits.
6. Returns to Campusly, updates status to `submitted`, enters reference number.
7. Uploads proof of payment document.

### 4.4 Grade 9 Student Gets Subject Advice

1. Grade 9 student navigates to `/student/careers/subjects`.
2. If aptitude test not completed, prompted to take it first.
3. After aptitude results, sees recommended subject combinations.
4. Combination 1: Maths + Physical Sciences + IT + Accounting → 124 programmes.
5. Warning shown: "Choosing Maths Literacy closes all engineering and most science degrees."
6. Student discusses with parents and career guidance teacher.

### 4.5 Student Takes Aptitude Test

1. Student navigates to `/student/careers/aptitude`.
2. Reads intro: "This takes about 30 minutes. Answer honestly."
3. Completes 4 sections (Interests, Personality, Problem Solving, Work Preferences).
4. Results: Top cluster = STEM (85%), suggested careers = Software Developer, Engineer, Data Scientist.
5. CTA: "Explore STEM careers" → links to Career Explorer filtered to STEM.

### 4.6 Parent Checks Child's Options

1. Parent navigates to `/parent/careers`.
2. Selects child.
3. Sees APS: 34, eligible for 47 programmes.
4. Sees upcoming deadline: UCT closes in 15 days.
5. Sees bursary match: "Your child may qualify for 3 bursaries."

### 4.7 Admin Seeds University Data

1. Admin navigates to `/admin/careers/universities`.
2. Clicks "Import CSV" → uploads universities spreadsheet.
3. 26 universities imported.
4. Navigates to `/admin/careers/programmes`.
5. Clicks "Import CSV" → uploads programmes spreadsheet.
6. 2,300 programmes imported with 3 errors (unknown university names).
7. Fixes errors manually.

---

## 5. Data Models

### 5.1 StudentPortfolio

Mongoose model name: `StudentPortfolio`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | `ObjectId` | auto | — |
| `studentId` | `ObjectId` | Yes | ref: `Student`, unique |
| `schoolId` | `ObjectId` | Yes | ref: `School` |
| `academicHistory` | `AcademicYear[]` | No | Array of year snapshots |
| `extracurriculars` | `Extracurricular[]` | No | — |
| `communityService` | `CommunityService[]` | No | — |
| `updatedAt` | `Date` | auto | — |

**AcademicYear subdoc:**

| Field | Type | Notes |
|---|---|---|
| `year` | `number` | e.g., 2025 |
| `grade` | `string` | e.g., "Grade 10" |
| `subjects` | `SubjectRecord[]` | — |
| `totalAPS` | `number` | Computed from subjects |
| `promoted` | `boolean` | — |
| `promotionStatus` | `string` | `promoted`, `condoned`, `retained` |

**SubjectRecord subdoc:**

| Field | Type | Notes |
|---|---|---|
| `subjectId` | `ObjectId` | ref: `Subject` |
| `name` | `string` | Snapshot |
| `level` | `string` | `core`, `home_language`, `first_additional_language`, `second_additional_language` |
| `code` | `string` | e.g., "MATH" |
| `terms` | `TermResult[]` | — |
| `finalPercentage` | `number` | Year-end average |
| `apsPoints` | `number` | Derived from finalPercentage |

**Extracurricular subdoc:**

| Field | Type | Notes |
|---|---|---|
| `year` | `number` | — |
| `activity` | `string` | — |
| `role` | `string` | — |
| `description` | `string` | — |
| `verifiedBy` | `ObjectId` | ref: `User` (teacher) |

**CommunityService subdoc:**

| Field | Type | Notes |
|---|---|---|
| `year` | `number` | — |
| `organization` | `string` | — |
| `hours` | `number` | — |
| `description` | `string` | — |
| `verifiedBy` | `ObjectId` | ref: `User` (teacher) |

Indexes: `{ studentId }` (unique), `{ schoolId }`.

---

### 5.2 University

Mongoose model name: `University`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `name` | `string` | Yes | — | Full name |
| `shortName` | `string` | Yes | — | e.g., "UCT" |
| `type` | `string` | Yes | — | enum: `traditional`, `comprehensive`, `university_of_technology`, `tvet`, `private` |
| `province` | `string` | Yes | — | SA province |
| `city` | `string` | Yes | — | — |
| `logo` | `string` | No | — | URL |
| `website` | `string` | No | — | URL |
| `applicationPortalUrl` | `string` | No | — | URL |
| `applicationOpenDate` | `Date` | No | — | — |
| `applicationCloseDate` | `Date` | No | — | — |
| `applicationFee` | `number` | No | 0 | In cents |
| `generalRequirements` | `string` | No | — | Free text |
| `campuses` | `Campus[]` | No | `[]` | — |
| `contactEmail` | `string` | No | — | — |
| `contactPhone` | `string` | No | — | — |
| `isActive` | `boolean` | No | `true` | — |
| `isDeleted` | `boolean` | No | `false` | Soft delete |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

Indexes: `{ shortName }` (unique), `{ type, province }`.

---

### 5.3 Programme

Mongoose model name: `Programme`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `universityId` | `ObjectId` | Yes | — | ref: `University` |
| `faculty` | `string` | Yes | — | — |
| `department` | `string` | No | — | — |
| `name` | `string` | Yes | — | Full programme name |
| `qualificationType` | `string` | Yes | — | enum: `bachelor`, `diploma`, `higher_certificate`, `postgrad_diploma` |
| `duration` | `string` | Yes | — | e.g., "3 years" |
| `minimumAPS` | `number` | Yes | — | 0–42 |
| `subjectRequirements` | `SubjectReq[]` | No | `[]` | — |
| `nbtRequired` | `object` | No | `{}` | `{ al: boolean, ql: boolean, mat: boolean }` |
| `nbtMinimumScores` | `object` | No | `{}` | `{ al: number, ql: number, mat: number }` |
| `careerOutcomes` | `string[]` | No | `[]` | — |
| `annualTuition` | `number` | No | — | In cents |
| `linkedBursaries` | `string[]` | No | `[]` | Bursary names or IDs |
| `applicationDeadline` | `Date` | No | — | Programme-specific if different from university |
| `additionalNotes` | `string` | No | — | — |
| `dataVerifiedDate` | `Date` | No | — | Last date requirements were confirmed |
| `isActive` | `boolean` | No | `true` | — |
| `isDeleted` | `boolean` | No | `false` | Soft delete |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

**SubjectReq subdoc:**

| Field | Type | Notes |
|---|---|---|
| `subjectName` | `string` | e.g., "Mathematics" |
| `minimumPercentage` | `number` | 0–100 |
| `isCompulsory` | `boolean` | — |

Indexes: `{ universityId }`, `{ minimumAPS }`, `{ faculty }`.

---

### 5.4 Application

Mongoose model name: `Application`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `studentId` | `ObjectId` | Yes | — | ref: `Student` |
| `schoolId` | `ObjectId` | Yes | — | ref: `School` |
| `programmeId` | `ObjectId` | Yes | — | ref: `Programme` |
| `universityId` | `ObjectId` | Yes | — | ref: `University` |
| `status` | `string` | Yes | `draft` | enum: `draft`, `submitted`, `acknowledged`, `accepted`, `waitlisted`, `rejected` |
| `submittedAt` | `Date` | No | — | — |
| `applicationReference` | `string` | No | — | University's ref number |
| `documents` | `AppDocument[]` | No | `[]` | — |
| `applicationFee` | `object` | No | — | `{ amount: number, paid: boolean }` |
| `notes` | `string` | No | — | — |
| `responseDate` | `Date` | No | — | — |
| `responseDetails` | `string` | No | — | — |
| `isDeleted` | `boolean` | No | `false` | Soft delete |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

**AppDocument subdoc:**

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | — |
| `type` | `string` | `id_copy`, `transcript`, `proof_of_payment`, `motivation_letter`, `other` |
| `url` | `string` | File URL |
| `uploadedAt` | `Date` | — |

Indexes: `{ studentId, programmeId }` (unique), `{ studentId, status }`.

---

### 5.5 AptitudeResult

Mongoose model name: `AptitudeResult`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | `ObjectId` | auto | — |
| `studentId` | `ObjectId` | Yes | ref: `Student`, unique |
| `schoolId` | `ObjectId` | Yes | ref: `School` |
| `answers` | `object[]` | Yes | `[{ questionId, value }]` |
| `clusters` | `ClusterResult[]` | Yes | — |
| `personalityType` | `string` | Yes | — |
| `suggestedCareers` | `string[]` | Yes | — |
| `completedAt` | `Date` | Yes | — |

**ClusterResult subdoc:**

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | e.g., "STEM" |
| `score` | `number` | 0–100 |
| `rank` | `number` | 1–9 |
| `description` | `string` | — |

Indexes: `{ studentId }` (unique).

---

### 5.6 Bursary

Mongoose model name: `Bursary`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `name` | `string` | Yes | — | — |
| `provider` | `string` | Yes | — | Organization name |
| `description` | `string` | No | — | — |
| `eligibilityCriteria` | `string` | No | — | Human-readable summary |
| `minimumAPS` | `number` | No | — | — |
| `fieldOfStudy` | `string[]` | No | `["any"]` | — |
| `coverageDetails` | `string` | No | — | What it covers |
| `applicationOpenDate` | `Date` | No | — | — |
| `applicationCloseDate` | `Date` | No | — | — |
| `applicationUrl` | `string` | No | — | URL |
| `linkedUniversities` | `ObjectId[]` | No | `[]` | ref: `University` |
| `annualValue` | `number` | No | — | In cents |
| `isActive` | `boolean` | No | `true` | — |
| `isDeleted` | `boolean` | No | `false` | Soft delete |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

Indexes: `{ provider }`, `{ minimumAPS }`, `{ applicationCloseDate }`.

---

### 5.7 Frontend Types (`src/types/index.ts`)

```ts
interface StudentPortfolio {
  id: string;
  studentId: string;
  academicHistory: AcademicYear[];
  extracurriculars: Extracurricular[];
  communityService: CommunityServiceEntry[];
}

interface AcademicYear {
  year: number;
  grade: string;
  subjects: SubjectRecord[];
  totalAPS: number;
  promoted: boolean;
  promotionStatus: 'promoted' | 'condoned' | 'retained';
}

interface SubjectRecord {
  subjectId: string;
  name: string;
  level: string;
  code: string;
  terms: { term: number; percentage: number; assessmentCount: number }[];
  finalPercentage: number;
  apsPoints: number;
}

interface APSResult {
  totalAPS: number;
  maxAPS: number;
  lifeOrientation: { percentage: number; apsPoints: number };
  subjects: APSSubject[];
}

interface APSSubject {
  subjectId: string;
  name: string;
  level: string;
  currentPercentage: number;
  rating: number;
  apsPoints: number;
}

interface University {
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
  programmeCount?: number;
}

interface Programme {
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
  careerOutcomes: string[];
  annualTuition?: number;
  applicationDeadline?: string;
}

interface SubjectRequirement {
  subjectName: string;
  minimumPercentage: number;
  isCompulsory: boolean;
}

interface ProgrammeMatch {
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
  subjectGaps: { subjectName: string; required: number; actual: number; gap: number }[];
  missingSubjects: string[];
  overallFit: number;
  annualTuition?: number;
  applicationDeadline?: string;
}

interface CareerApplication {
  id: string;
  studentId: string;
  programmeId: string;
  universityId: string;
  status: 'draft' | 'submitted' | 'acknowledged' | 'accepted' | 'waitlisted' | 'rejected';
  submittedAt?: string;
  applicationReference?: string;
  documents: { name: string; type: string; url: string; uploadedAt: string }[];
  notes?: string;
  createdAt: string;
}

interface AptitudeResult {
  id: string;
  clusters: { name: string; score: number; rank: number; description: string }[];
  personalityType: string;
  suggestedCareers: string[];
  completedAt: string;
}

interface Bursary {
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
  annualValue?: number;
}
```

---

## 6. State Management

### 6.1 Recommended Hook: `useCareers`

**File:** `src/hooks/useCareers.ts`

Centralizes career module API calls and local state. Given the read-heavy nature of this module, consider organizing as multiple hooks:

- `useAPS(studentId)` — fetches and caches APS data
- `useProgrammeMatcher(studentId, filters)` — fetches match results with pagination
- `useApplications(studentId)` — CRUD for applications
- `useAptitude(studentId)` — fetch questions, submit answers, get results
- `useBursaries(filters)` — search/filter bursaries
- `usePortfolio(studentId)` — fetch portfolio data

### 6.2 Page-level state

Most pages are read-heavy with simple filters. Use the standard `useState` + `useEffect` + `apiClient` pattern from scope 00. The APS simulator needs local slider state that triggers re-calculation without API calls (computation can be client-side since the conversion table is static).

---

## 7. Components Needed

### 7.1 Shared Career Components (`src/components/careers/`)

| Component | File | Purpose |
|---|---|---|
| `APSScoreCard` | `APSScoreCard.tsx` | Displays current APS total with per-subject breakdown, color-coded ratings |
| `APSSimulator` | `APSSimulator.tsx` | Per-subject sliders, recalculates APS client-side, shows programmes unlocked delta |
| `ProgrammeCard` | `ProgrammeCard.tsx` | Match result card: university logo, programme name, APS bar, subject gaps, fit percentage |
| `ProgrammeMatchBar` | `ProgrammeMatchBar.tsx` | Horizontal bar: green (actual APS) vs. grey (required APS) with numbers |
| `SubjectGapList` | `SubjectGapList.tsx` | Compact list of subject requirements with met/unmet indicators |
| `ApplicationTracker` | `ApplicationTracker.tsx` | Application status pipeline with status badges and action buttons |
| `ApplicationForm` | `ApplicationForm.tsx` | Create/edit application dialog with document upload |
| `DeadlineTimeline` | `DeadlineTimeline.tsx` | Vertical timeline of upcoming deadlines, sorted by urgency |
| `AptitudeQuestion` | `AptitudeQuestion.tsx` | Likert-scale question renderer |
| `AptitudeResults` | `AptitudeResults.tsx` | Cluster bar chart + career suggestions |
| `CareerClusterCard` | `CareerClusterCard.tsx` | Career cluster with icon, score, description, linked careers |
| `CareerCard` | `CareerCard.tsx` | Single career: name, salary range, demand badge, linked programmes count |
| `SubjectAdvisorResults` | `SubjectAdvisorResults.tsx` | Subject combination cards with programme count comparison |
| `SubjectImpactWarning` | `SubjectImpactWarning.tsx` | Warning banner for high-impact choices (e.g., Maths vs. Maths Lit) |
| `BursaryCard` | `BursaryCard.tsx` | Bursary: provider, coverage, deadline, eligibility, apply link |
| `PortfolioTimeline` | `PortfolioTimeline.tsx` | Year-by-year academic history vertical timeline |
| `TranscriptDownload` | `TranscriptDownload.tsx` | Button + loading state for PDF transcript generation |
| `UniversityCard` | `UniversityCard.tsx` | University logo, name, type, location, application dates |
| `ProgrammeFilter` | `ProgrammeFilter.tsx` | Filter bar: field, university, qualification type, APS range |
| `MatchSummaryStats` | `MatchSummaryStats.tsx` | StatCard row: eligible count, close count, universities count |
| `ChildSelector` | `ChildSelector.tsx` | Parent multi-child dropdown (reuse from existing components if available) |

### 7.2 Existing shared components to reuse

| Component | From | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | All career pages |
| `StatCard` | `src/components/shared/StatCard` | APS summary, match counts |
| `DataTable` | `src/components/shared/DataTable` | Admin university/programme/bursary management |
| `EmptyState` | `src/components/shared/EmptyState` | No results, no applications yet |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `SearchInput` | `src/components/shared/SearchInput` | Programme/bursary search |
| `Badge` | `src/components/ui/badge` | Status badges, subject level badges |
| `Dialog` | `src/components/ui/dialog` | Application form, simulator |
| `Tabs` | `src/components/ui/tabs` | Portfolio sections, explorer categories |
| `BarChartComponent` | `src/components/charts` | Aptitude cluster results |

---

## 8. Integration Notes

### 8.1 Academic Module → APS

APS is calculated from marks in the Academic module. The APS endpoint reads from `GET /academic/marks/student/:studentId` and computes APS from the latest available marks per subject. No marks data is duplicated — APS is computed on read.

### 8.2 Academic Module → Portfolio

The year-end snapshot (`POST /careers/portfolio/student/:id/snapshot`) reads final marks from the Academic module and promotion status from the Promotion sub-domain. This should be triggered when the admin runs the promotion process (scope 08, section 2.13).

### 8.3 Achiever Module → Portfolio

Achievements are pulled from the Achiever module (`GET /achievements/student/:studentId`) and merged into the portfolio response. Not duplicated.

### 8.4 Sport Module → Portfolio

Sport team membership and fixture participation can be surfaced as extracurriculars. Read from Sport module endpoints.

### 8.5 Student Model → Subject Level Mapping

The APS calculator needs to know the *level* of each subject (Home Language, First Additional Language, core). This is derived from the Subject model in the Academic module. The `Subject` model should have a `level` field — if not present, it should be added.

### 8.6 Auth and Student Resolution

The JWT contains `user.id`. To find the student record: `GET /students` and find where `student.userId === user.id`. The `studentId` is then used in all career endpoints.

### 8.7 University Data Seeding

See `todo/30a-university-data-strategy.md` for the full data sourcing strategy. Initial data is imported via `POST /careers/programmes/import` (CSV bulk import). Admin can also manage individually via the CRUD endpoints.

### 8.8 PDF Generation

Transcript PDF generation uses a server-side PDF library (e.g., PDFKit or Puppeteer HTML-to-PDF). The endpoint returns a binary PDF stream. Frontend triggers download via `apiClient.get(..., { responseType: 'blob' })`.

---

## 9. Acceptance Criteria

### Portfolio

- [ ] Student can view their full academic history across all years on the platform.
- [ ] Year-end snapshot can be triggered by admin after promotion is run.
- [ ] Snapshot is immutable once created.
- [ ] Student can add extracurriculars and community service entries.
- [ ] Teacher verification flag is shown on unverified entries.
- [ ] PDF transcript can be generated and downloaded with school branding.
- [ ] Parent can view child's portfolio.

### APS Calculator

- [ ] APS is calculated correctly from current marks using the NSC conversion table.
- [ ] Life Orientation is shown separately and excluded from the total.
- [ ] Best 6 subjects (excluding LO) are used for the total.
- [ ] What-if simulator allows adjusting any subject percentage and shows APS change.
- [ ] Simulator shows how many new programmes are unlocked by the adjustment.

### Programme Matcher

- [ ] Matcher returns eligible, close, and not-eligible programmes based on APS and subject requirements.
- [ ] Close match threshold: APS within 3 points, max 1 compulsory subject short by max 10%.
- [ ] Subject gaps are clearly shown per programme.
- [ ] Results are sortable by match fit, APS required, and tuition.
- [ ] Filters work: field of study, university, province, qualification type.
- [ ] Student can save programmes to their list.

### Applications

- [ ] Student can create an application for any programme.
- [ ] Application tracks status: draft → submitted → acknowledged → accepted/waitlisted/rejected.
- [ ] Student can upload supporting documents.
- [ ] Pre-fill endpoint returns structured data from student's profile.
- [ ] Deadline timeline shows all upcoming deadlines sorted by urgency.
- [ ] Duplicate application for same programme is prevented.

### Aptitude Assessment

- [ ] Student can complete the aptitude assessment in one session.
- [ ] Results show career cluster rankings with descriptions.
- [ ] Suggested careers link to Career Explorer.
- [ ] Results persist and can be re-viewed later.
- [ ] Student can retake the assessment (previous results are overwritten).

### Subject Choice Advisor

- [ ] Available for Grade 9 students.
- [ ] Shows recommended subject combinations with programme count impact.
- [ ] Warns about high-impact choices (Maths vs. Maths Literacy).
- [ ] Integrates aptitude results if available.

### Bursaries

- [ ] Admin can CRUD bursary entries.
- [ ] Bulk CSV import works for bursaries.
- [ ] Bursary matcher returns bursaries the student may qualify for.
- [ ] Saved bursary deadlines appear in the deadline timeline.

### Universities & Programmes

- [ ] Admin can CRUD universities and programmes.
- [ ] Bulk CSV import works for programmes.
- [ ] Programme data includes APS, subject requirements, NBT, tuition, career outcomes.
- [ ] `dataVerifiedDate` is shown on programme cards.
- [ ] Search and filters work across the programme database.

### General

- [ ] All monetary values displayed in rands, stored in cents.
- [ ] All list endpoints return correct pagination metadata.
- [ ] Soft-deleted records never appear in responses.
- [ ] Role-based access is enforced on all endpoints.
- [ ] Parent views show per-child selector for multi-child families.

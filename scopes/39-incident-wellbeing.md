# 39 — Incident & Wellbeing Reporting

## 1. Module Overview

The Incident & Wellbeing module provides a structured system for reporting, investigating, and resolving school incidents (bullying, injuries, property damage, safety concerns), and a complementary wellbeing layer for tracking student mood and administering periodic check-in surveys. It maintains compliance records for Department of Education reporting and enforces strict access controls on confidential counsellor notes.

The module introduces two sub-modules with distinct backends:
- **Incidents** (`/api/incidents/*`) — structured incident lifecycle management
- **Wellbeing** (`/api/wellbeing/*`) — anonymous surveys and aggregate mood tracking

Both are registered as a single feature module (`incident_wellbeing`) gated by `requireModule('incident_wellbeing')`.

### Key Capabilities

| Capability | Description |
|---|---|
| Incident Reporting | Structured form: type, severity, description, location, date/time, witnesses, involved parties |
| Incident Workflow | Reported → Investigating → Resolved / Escalated |
| Follow-up Actions | Tasks with due dates and assignees for each incident |
| Confidential Notes | Counsellor/psychologist notes visible only to counsellor and principal |
| Wellbeing Surveys | Periodic check-in surveys for students (anonymous option) |
| Mood Dashboard | Aggregate mood trends across the school (no individual identification) |
| Parent Notification | Automatic notification when a child is involved in an incident |
| Reports | Incidents by type, trends over time, resolution time |
| Compliance | Full audit trail for Department of Education reporting requirements |

### Role-based Access

| Capability | student | parent | teacher | counsellor | school_admin | super_admin |
|---|---|---|---|---|---|---|
| Report incident | No | No | Yes | Yes | Yes | Yes |
| View incidents (own class) | No | No | Yes | Yes | N/A | N/A |
| View all incidents | No | No | No | Yes | Yes | Yes |
| Manage incident workflow | No | No | No | Yes | Yes | Yes |
| Add follow-up actions | No | No | Yes (own) | Yes | Yes | Yes |
| View confidential notes | No | No | No | Yes (own notes) | Principal only | Yes |
| Create confidential notes | No | No | No | Yes | No | No |
| View wellbeing surveys | No | No | No | Yes | Yes | Yes |
| Complete wellbeing survey | Yes | No | No | No | No | No |
| View mood dashboard | No | No | No | Yes | Yes | Yes |
| View incident reports | No | No | No | Yes | Yes | Yes |
| Receive parent notification | No | Yes (own child) | No | No | No | No |

The **counsellor** is not a separate role — it is a permission flag on the teacher role: `isCounsellor: boolean`. Teachers with this flag get expanded access to all school incidents and the ability to create confidential notes.

---

## 2. Backend API Endpoints

Incident endpoints are mounted at `/api/incidents`. Wellbeing endpoints are mounted at `/api/wellbeing`. Both require `authenticate` + `requireModule('incident_wellbeing')`.

---

### 2.1 Incident Reporting

#### POST /api/incidents

Create a new incident report.

**Auth**: `teacher`, `school_admin`, `super_admin` (teachers with `isCounsellor` also allowed)

**Request body**:

```json
{
  "schoolId": "...",
  "type": "bullying",
  "severity": "high",
  "title": "Physical altercation in playground",
  "description": "Two Grade 9 learners were involved in a physical fight during first break. One learner sustained a minor cut above the left eye.",
  "location": "Main playground — near the tuck shop",
  "incidentDate": "2026-04-02",
  "incidentTime": "10:15",
  "involvedParties": [
    {
      "studentId": "...",
      "role": "perpetrator",
      "description": "Initiated the physical contact"
    },
    {
      "studentId": "...",
      "role": "victim",
      "description": "Sustained minor injury"
    }
  ],
  "witnesses": [
    {
      "type": "student",
      "studentId": "...",
      "name": null
    },
    {
      "type": "staff",
      "staffId": "...",
      "name": null
    },
    {
      "type": "other",
      "studentId": null,
      "name": "Mr. Patel (parent visitor)"
    }
  ],
  "immediateActionTaken": "Learners separated. First aid administered. Parents contacted."
}
```

**Type enum**: `bullying`, `injury`, `property_damage`, `safety_concern`, `substance`, `theft`, `verbal_abuse`, `cyber_bullying`, `other`

**Severity enum**: `low`, `medium`, `high`, `critical`

**Involved party role enum**: `perpetrator`, `victim`, `bystander`, `witness`

**Response 201**:

```json
{
  "success": true,
  "message": "Incident reported successfully",
  "data": {
    "_id": "...",
    "incidentNumber": "INC-2026-00015",
    "status": "reported",
    "type": "bullying",
    "severity": "high",
    "title": "Physical altercation in playground",
    "reportedBy": "...",
    "createdAt": "2026-04-02T10:30:00.000Z"
  }
}
```

Parent notification is automatically queued for parents of all involved students.

---

#### GET /api/incidents

List incidents with filters.

**Auth**: `teacher` (own class incidents), `isCounsellor` teacher (all), `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `status` | string | No | `reported`, `investigating`, `resolved`, `escalated`. Comma-separated. |
| `type` | string | No | Incident type filter. |
| `severity` | string | No | Severity filter. |
| `studentId` | string | No | Filter by involved student. |
| `dateFrom` | string | No | ISO date — incidents on or after. |
| `dateTo` | string | No | ISO date — incidents on or before. |
| `search` | string | No | Search title, description, incident number. |
| `page` | number | No | Defaults to 1. |
| `limit` | number | No | Defaults to 20. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "incidentNumber": "INC-2026-00015",
        "type": "bullying",
        "severity": "high",
        "title": "Physical altercation in playground",
        "status": "investigating",
        "incidentDate": "2026-04-02",
        "involvedPartyCount": 2,
        "reportedBy": { "_id": "...", "firstName": "Mrs.", "lastName": "Naidoo" },
        "assignedTo": { "_id": "...", "firstName": "Mr.", "lastName": "Williams" },
        "createdAt": "2026-04-02T10:30:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

#### GET /api/incidents/:id

Get full incident detail including involved parties, witnesses, follow-up actions, and status history. Confidential notes are excluded unless the requester is a counsellor or principal.

**Auth**: `teacher` (if reporter or assigned), `isCounsellor` teacher, `school_admin`, `super_admin`

#### PUT /api/incidents/:id

Update incident details or status.

**Auth**: `teacher` (if reporter or assigned), `isCounsellor` teacher, `school_admin`, `super_admin`

**Request body**: Partial incident fields. Status transitions:
- `reported` → `investigating`
- `investigating` → `resolved` | `escalated`
- `escalated` → `investigating` | `resolved`

#### DELETE /api/incidents/:id

Soft delete an incident.

**Auth**: `school_admin`, `super_admin`

---

### 2.2 Follow-up Actions

#### GET /api/incidents/:id/actions

List follow-up actions for an incident.

**Auth**: Same as incident detail access.

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "incidentId": "...",
      "description": "Meet with parents of both learners",
      "assignedTo": { "_id": "...", "firstName": "Mrs.", "lastName": "Naidoo" },
      "dueDate": "2026-04-05",
      "status": "pending",
      "completedAt": null,
      "notes": null,
      "createdBy": "..."
    }
  ]
}
```

#### POST /api/incidents/:id/actions

Add a follow-up action.

**Auth**: `teacher` (if reporter or assigned), `isCounsellor` teacher, `school_admin`, `super_admin`

**Request body**:

```json
{
  "description": "Meet with parents of both learners",
  "assignedToUserId": "...",
  "dueDate": "2026-04-05"
}
```

#### PUT /api/incidents/:id/actions/:actionId

Update a follow-up action (mark complete, add notes).

**Request body**:

```json
{
  "status": "completed",
  "completedAt": "2026-04-04T14:00:00.000Z",
  "notes": "Both sets of parents attended. Agreed on mediation next week."
}
```

---

### 2.3 Confidential Notes

#### GET /api/incidents/:id/confidential-notes

Get confidential counsellor notes for an incident.

**Auth**: `isCounsellor` teacher (own notes), `school_admin` with `isSchoolPrincipal`, `super_admin`

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "incidentId": "...",
      "content": "Student A has been experiencing difficulties at home. Referred to social worker.",
      "createdBy": { "_id": "...", "firstName": "Dr.", "lastName": "Moyo" },
      "createdAt": "2026-04-03T11:00:00.000Z",
      "updatedAt": "2026-04-03T11:00:00.000Z"
    }
  ]
}
```

#### POST /api/incidents/:id/confidential-notes

Create a confidential note.

**Auth**: `isCounsellor` teacher ONLY

**Request body**:

```json
{
  "content": "Student A has been experiencing difficulties at home. Referred to social worker."
}
```

#### PUT /api/incidents/:id/confidential-notes/:noteId

Update a confidential note (only the original author can edit).

**Auth**: `isCounsellor` teacher (own notes only)

---

### 2.4 Wellbeing Surveys

#### GET /api/wellbeing/surveys

List available surveys.

**Auth**: `isCounsellor` teacher, `school_admin`, `super_admin`

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Weekly Mood Check-in",
      "description": "How are you feeling this week?",
      "isAnonymous": true,
      "targetGrades": [8, 9, 10, 11, 12],
      "status": "active",
      "startDate": "2026-04-01",
      "endDate": "2026-04-07",
      "responseCount": 142,
      "totalTargeted": 487,
      "completionRate": 29.2
    }
  ]
}
```

#### POST /api/wellbeing/surveys

Create a new wellbeing survey.

**Auth**: `isCounsellor` teacher, `school_admin`, `super_admin`

**Request body**:

```json
{
  "schoolId": "...",
  "title": "Weekly Mood Check-in",
  "description": "How are you feeling this week?",
  "isAnonymous": true,
  "targetGrades": [8, 9, 10, 11, 12],
  "startDate": "2026-04-01",
  "endDate": "2026-04-07",
  "questions": [
    {
      "text": "How would you rate your overall mood this week?",
      "type": "scale",
      "scaleMin": 1,
      "scaleMax": 5,
      "scaleLabels": { "1": "Very sad", "3": "Okay", "5": "Very happy" },
      "required": true
    },
    {
      "text": "What best describes how you're feeling?",
      "type": "multiple_choice",
      "options": ["Happy", "Stressed", "Anxious", "Sad", "Angry", "Neutral", "Excited"],
      "required": true
    },
    {
      "text": "Is there anything you'd like to talk to someone about?",
      "type": "text",
      "required": false
    },
    {
      "text": "Do you feel safe at school?",
      "type": "yes_no",
      "required": true
    }
  ]
}
```

**Question type enum**: `scale`, `multiple_choice`, `text`, `yes_no`

#### PUT /api/wellbeing/surveys/:id

Update a survey (only before it has responses).

**Auth**: `isCounsellor` teacher, `school_admin`, `super_admin`

#### DELETE /api/wellbeing/surveys/:id

Soft delete a survey.

---

### 2.5 Survey Responses

#### POST /api/wellbeing/surveys/:id/respond

Submit a survey response.

**Auth**: `student`

**Request body**:

```json
{
  "answers": [
    { "questionIndex": 0, "value": 3 },
    { "questionIndex": 1, "value": "Stressed" },
    { "questionIndex": 2, "value": "I'm worried about exams" },
    { "questionIndex": 3, "value": true }
  ]
}
```

If the survey is anonymous, the `studentId` is NOT stored on the response. If not anonymous, `studentId` is set from the JWT.

**Response 201**: `{ success: true, message: "Response submitted" }`

#### GET /api/wellbeing/surveys/:id/results

Get aggregate survey results.

**Auth**: `isCounsellor` teacher, `school_admin`, `super_admin`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "surveyId": "...",
    "title": "Weekly Mood Check-in",
    "responseCount": 142,
    "questions": [
      {
        "questionIndex": 0,
        "text": "How would you rate your overall mood this week?",
        "type": "scale",
        "averageScore": 3.4,
        "distribution": { "1": 8, "2": 18, "3": 42, "4": 52, "5": 22 }
      },
      {
        "questionIndex": 1,
        "text": "What best describes how you're feeling?",
        "type": "multiple_choice",
        "distribution": { "Happy": 35, "Stressed": 42, "Anxious": 28, "Sad": 12, "Angry": 5, "Neutral": 15, "Excited": 5 }
      },
      {
        "questionIndex": 2,
        "text": "Is there anything you'd like to talk to someone about?",
        "type": "text",
        "responseCount": 38,
        "responses": null
      },
      {
        "questionIndex": 3,
        "text": "Do you feel safe at school?",
        "type": "yes_no",
        "distribution": { "yes": 128, "no": 14 }
      }
    ]
  }
}
```

Text responses are NOT returned in aggregate results for anonymous surveys. For non-anonymous surveys, text responses are available to counsellors only via a separate endpoint.

---

### 2.6 Mood Dashboard

#### GET /api/wellbeing/mood-dashboard

Returns aggregate mood trends over time for the school.

**Auth**: `isCounsellor` teacher, `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `period` | string | No | `week`, `month`, `term`. Defaults to `month`. |
| `gradeFilter` | number | No | Filter to a specific grade. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "currentAverageMood": 3.4,
    "previousAverageMood": 3.1,
    "changePercent": 9.7,
    "safetyScore": 90.1,
    "trendData": [
      { "date": "2026-03-04", "averageMood": 3.1, "responseCount": 120 },
      { "date": "2026-03-11", "averageMood": 3.2, "responseCount": 135 },
      { "date": "2026-03-18", "averageMood": 3.0, "responseCount": 128 },
      { "date": "2026-03-25", "averageMood": 3.4, "responseCount": 142 }
    ],
    "feelingDistribution": {
      "Happy": 24.6,
      "Stressed": 29.6,
      "Anxious": 19.7,
      "Sad": 8.5,
      "Angry": 3.5,
      "Neutral": 10.6,
      "Excited": 3.5
    },
    "gradeBreakdown": [
      { "grade": 8, "averageMood": 3.6, "responseRate": 72.3 },
      { "grade": 9, "averageMood": 3.2, "responseRate": 65.1 },
      { "grade": 10, "averageMood": 3.1, "responseRate": 58.4 }
    ]
  }
}
```

All data is aggregate — no individual student identification. The `safetyScore` is the percentage of students answering "yes" to "Do you feel safe at school?" in the most recent survey.

---

### 2.7 Incident Reports

#### GET /api/incidents/reports/summary

Incident summary statistics.

**Auth**: `isCounsellor` teacher, `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `dateFrom` | string | No | ISO date. |
| `dateTo` | string | No | ISO date. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "totalIncidents": 47,
    "byType": {
      "bullying": 12,
      "injury": 15,
      "property_damage": 5,
      "safety_concern": 3,
      "substance": 2,
      "theft": 4,
      "verbal_abuse": 3,
      "cyber_bullying": 1,
      "other": 2
    },
    "bySeverity": {
      "low": 18,
      "medium": 20,
      "high": 7,
      "critical": 2
    },
    "byStatus": {
      "reported": 3,
      "investigating": 5,
      "resolved": 35,
      "escalated": 4
    },
    "averageResolutionDays": 4.2,
    "monthlyTrend": [
      { "month": "2026-01", "count": 8 },
      { "month": "2026-02", "count": 12 },
      { "month": "2026-03", "count": 15 },
      { "month": "2026-04", "count": 12 }
    ],
    "topLocations": [
      { "location": "Main playground", "count": 14 },
      { "location": "Classroom", "count": 11 },
      { "location": "Hallway", "count": 8 }
    ]
  }
}
```

---

## 3. Data Models

### Incident

```
Incident {
  schoolId:              ObjectId (ref: 'School', required)
  incidentNumber:        String (required, unique — auto-generated: INC-YYYY-NNNNN)
  type:                  String (enum: ['bullying', 'injury', 'property_damage', 'safety_concern', 'substance', 'theft', 'verbal_abuse', 'cyber_bullying', 'other'], required)
  severity:              String (enum: ['low', 'medium', 'high', 'critical'], required)
  title:                 String (required, trim)
  description:           String (required, trim)
  location:              String (trim)
  incidentDate:          Date (required)
  incidentTime:          String (HH:mm format)
  status:                String (enum: ['reported', 'investigating', 'resolved', 'escalated'], default: 'reported')
  
  involvedParties: [{
    studentId:           ObjectId (ref: 'Student', required)
    role:                String (enum: ['perpetrator', 'victim', 'bystander'], required)
    description:         String
    parentNotified:      Boolean (default: false)
    parentNotifiedAt:    Date
  }]
  
  witnesses: [{
    type:                String (enum: ['student', 'staff', 'other'], required)
    studentId:           ObjectId (ref: 'Student')
    staffId:             ObjectId (ref: 'User')
    name:                String
    statement:           String
  }]
  
  immediateActionTaken:  String
  
  reportedBy:            ObjectId (ref: 'User', required)
  assignedTo:            ObjectId (ref: 'User')
  
  statusHistory: [{
    status:              String (required)
    date:                Date (required, default: Date.now)
    changedBy:           ObjectId (ref: 'User')
    notes:               String
  }]
  
  resolutionSummary:     String
  resolvedAt:            Date
  
  isDeleted:             Boolean (default: false)
  timestamps:            true
}

Indexes:
  - { schoolId: 1, incidentNumber: 1 } unique
  - { schoolId: 1, status: 1, severity: 1 }
  - { schoolId: 1, type: 1, incidentDate: -1 }
  - { schoolId: 1, 'involvedParties.studentId': 1 }
```

### IncidentAction

```
IncidentAction {
  schoolId:       ObjectId (ref: 'School', required)
  incidentId:     ObjectId (ref: 'Incident', required)
  description:    String (required, trim)
  assignedTo:     ObjectId (ref: 'User', required)
  dueDate:        Date (required)
  status:         String (enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending')
  completedAt:    Date
  notes:          String
  createdBy:      ObjectId (ref: 'User', required)
  isDeleted:      Boolean (default: false)
  timestamps:     true
}

Indexes:
  - { incidentId: 1, status: 1 }
  - { assignedTo: 1, status: 1 }
```

### ConfidentialNote

```
ConfidentialNote {
  schoolId:       ObjectId (ref: 'School', required)
  incidentId:     ObjectId (ref: 'Incident', required)
  content:        String (required)
  createdBy:      ObjectId (ref: 'User', required)
  isDeleted:      Boolean (default: false)
  timestamps:     true
}

Indexes:
  - { incidentId: 1, createdBy: 1 }
  - { schoolId: 1 }
```

### WellbeingSurvey

```
WellbeingSurvey {
  schoolId:        ObjectId (ref: 'School', required)
  title:           String (required, trim)
  description:     String (trim)
  isAnonymous:     Boolean (default: true)
  targetGrades:    [Number] (required)
  status:          String (enum: ['draft', 'active', 'closed'], default: 'draft')
  startDate:       Date (required)
  endDate:         Date (required)
  questions: [{
    text:           String (required)
    type:           String (enum: ['scale', 'multiple_choice', 'text', 'yes_no'], required)
    scaleMin:       Number
    scaleMax:       Number
    scaleLabels:    Map (String → String)
    options:        [String]
    required:       Boolean (default: true)
  }]
  createdBy:       ObjectId (ref: 'User', required)
  isDeleted:       Boolean (default: false)
  timestamps:      true
}

Indexes:
  - { schoolId: 1, status: 1, startDate: -1 }
```

### SurveyResponse

```
SurveyResponse {
  schoolId:       ObjectId (ref: 'School', required)
  surveyId:       ObjectId (ref: 'WellbeingSurvey', required)
  studentId:      ObjectId (ref: 'Student') — null if anonymous
  answers: [{
    questionIndex: Number (required)
    value:         Schema.Types.Mixed (required — number, string, or boolean depending on question type)
  }]
  isDeleted:      Boolean (default: false)
  timestamps:     true
}

Indexes:
  - { surveyId: 1, studentId: 1 } unique (sparse — allows multiple null studentId for anonymous)
  - { schoolId: 1, surveyId: 1 }
```

### User Model Extensions

Add to existing User schema:
- `isCounsellor: { type: Boolean, default: false }`

---

## 4. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/admin/incidents` | Incident List | Filterable list of all incidents |
| `/admin/incidents/new` | Report Incident | Incident report form |
| `/admin/incidents/[id]` | Incident Detail | Full detail view with actions, notes, timeline |
| `/admin/incidents/reports` | Incident Reports | Summary stats, charts, trends |
| `/admin/wellbeing` | Wellbeing Dashboard | Mood trends, survey results, aggregate stats |
| `/admin/wellbeing/surveys` | Survey Management | List, create, edit surveys |
| `/admin/wellbeing/surveys/[id]` | Survey Results | Aggregate results for a specific survey |
| `/teacher/incidents` | Teacher Incident List | Incidents reported by or assigned to the teacher |
| `/teacher/incidents/new` | Teacher Report Incident | Same form as admin |
| `/student/wellbeing` | Student Survey | Active survey for the student to complete |

**Nav entries**:
- Admin: `{ label: 'Incidents', href: '/admin/incidents', icon: AlertTriangle }` and `{ label: 'Wellbeing', href: '/admin/wellbeing', icon: Heart }`
- Teacher: `{ label: 'Incidents', href: '/teacher/incidents', icon: AlertTriangle }`
- Student: `{ label: 'Wellbeing', href: '/student/wellbeing', icon: Heart }` (only when active survey exists)

---

## 5. User Flows

### Flow 1: Teacher Reports an Incident

1. Teacher navigates to `/teacher/incidents/new`.
2. Fills in the form: type, severity, title, description, location, date, time.
3. Adds involved parties: searches for students, assigns roles (perpetrator/victim/bystander).
4. Adds witnesses: students, staff, or external names.
5. Describes immediate action taken.
6. Submits → `POST /api/incidents`.
7. Incident is created with status `reported`. Parents of involved students are notified.

### Flow 2: Admin Investigates and Resolves an Incident

1. Admin navigates to `/admin/incidents`.
2. Filters by status `reported` to see new incidents.
3. Clicks an incident → `/admin/incidents/:id`.
4. Reviews details, involved parties, witness statements.
5. Changes status to `investigating` → `PUT /api/incidents/:id`.
6. Adds follow-up actions: "Meet with parents", "Refer to counsellor".
7. Actions are assigned to staff members with due dates.
8. After investigation, changes status to `resolved` with a resolution summary.

### Flow 3: Counsellor Adds Confidential Notes

1. Counsellor (teacher with `isCounsellor: true`) navigates to `/admin/incidents/:id`.
2. Sees an additional "Confidential Notes" section (hidden from other teachers).
3. Adds a note about the student's emotional state and referral to social worker.
4. Note is saved → `POST /api/incidents/:id/confidential-notes`.
5. Only the counsellor and principal can see this note.

### Flow 4: Create and Administer a Wellbeing Survey

1. Counsellor navigates to `/admin/wellbeing/surveys`.
2. Clicks "Create Survey".
3. Fills in title, description, target grades, date range, anonymous toggle.
4. Adds questions: mood scale (1-5), feeling selection, free text, safety yes/no.
5. Submits → `POST /api/wellbeing/surveys`.
6. Survey becomes active on the start date.
7. Students in target grades see the survey at `/student/wellbeing`.

### Flow 5: Student Completes Wellbeing Survey

1. Student logs in and sees "Wellbeing" nav item (active survey available).
2. Navigates to `/student/wellbeing`.
3. Sees the active survey with questions.
4. Rates mood (1-5), selects feeling, optionally writes a note, answers safety question.
5. Submits → `POST /api/wellbeing/surveys/:id/respond`.
6. Confirmation shown. Survey disappears from nav.

### Flow 6: View Mood Dashboard

1. Counsellor navigates to `/admin/wellbeing`.
2. Sees aggregate mood data:
   - Current average mood score with trend arrow.
   - Safety score (% feeling safe).
   - Line chart of mood over time.
   - Pie/bar chart of feeling distribution.
   - Grade-level breakdown table.
3. Can filter by grade or time period.
4. All data is aggregate — no individual identification.

### Flow 7: Parent Receives Incident Notification

1. An incident involving the parent's child is reported.
2. System automatically queues an email/push notification.
3. Parent receives: "Your child [name] was involved in an incident at school. Type: [type]. The school is handling this matter. Contact [phone] for more information."
4. No incident details are shared — only the type and a contact number.

---

## 6. State Management

### useIncidents hook (`src/hooks/useIncidents.ts`)

```ts
interface IncidentState {
  incidents: Incident[];
  selectedIncident: Incident | null;
  total: number;
  loading: boolean;
  error: string | null;
  filters: {
    status: string | null;
    type: string | null;
    severity: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    search: string;
  };
}
```

Methods: `fetchIncidents`, `fetchIncident`, `createIncident`, `updateIncident`, `addAction`, `updateAction`.

### useConfidentialNotes hook (`src/hooks/useConfidentialNotes.ts`)

CRUD for confidential notes. Only used by counsellors and principals.

### useWellbeingSurveys hook (`src/hooks/useWellbeingSurveys.ts`)

Admin/counsellor: CRUD surveys, fetch results.

### useStudentSurvey hook (`src/hooks/useStudentSurvey.ts`)

Student: fetch active survey, submit response.

### useMoodDashboard hook (`src/hooks/useMoodDashboard.ts`)

Fetch aggregate mood data with filters.

### useIncidentReports hook (`src/hooks/useIncidentReports.ts`)

Fetch incident summary statistics.

---

## 7. Components Needed

### Incident components (`src/components/incidents/`)

| Component | Description |
|---|---|
| `IncidentReportForm` | Multi-section form: type, severity, description, parties, witnesses |
| `InvolvedPartySelector` | Search and add students with role assignment |
| `WitnessSelector` | Add student/staff/external witnesses |
| `IncidentList` | Filterable DataTable of incidents |
| `IncidentDetailView` | Full incident view with tabs: Details, Actions, Notes, Timeline |
| `IncidentStatusBadge` | Coloured badge for incident status |
| `SeverityBadge` | Coloured badge for severity level |
| `StatusTimeline` | Vertical timeline of status changes |
| `FollowUpActionList` | List of actions with status, assignee, due date |
| `AddActionDialog` | Dialog to create a follow-up action |
| `ConfidentialNoteSection` | Restricted section for counsellor notes |
| `IncidentReportCards` | Summary stat cards for reports page |
| `IncidentTypePieChart` | Recharts `PieChart` of incidents by type |
| `IncidentTrendChart` | Recharts `LineChart` of incidents over time |
| `ResolutionTimeChart` | Recharts `BarChart` of average resolution days |

### Wellbeing components (`src/components/wellbeing/`)

| Component | Description |
|---|---|
| `SurveyBuilder` | Form to create/edit surveys with question builder |
| `QuestionEditor` | Single question editor with type-specific fields |
| `SurveyForm` | Student-facing survey form |
| `ScaleQuestion` | 1-5 scale input with labels |
| `MultipleChoiceQuestion` | Option buttons |
| `TextQuestion` | Textarea input |
| `YesNoQuestion` | Yes/No toggle |
| `SurveyResultsView` | Aggregate results with charts per question |
| `MoodTrendChart` | Recharts `LineChart` of average mood over time |
| `FeelingDistributionChart` | Recharts `PieChart` or `BarChart` of feelings |
| `GradeMoodTable` | Table of mood scores by grade |
| `MoodScoreCard` | Large stat card showing current mood with trend |
| `SafetyScoreCard` | Stat card showing % feeling safe |

### Shared components reused

- `PageHeader`, `DataTable`, `Badge`, `Dialog`, `LoadingSpinner`, `EmptyState`
- `Select`, `Input`, `Button`, `Textarea`, `Label` from UI primitives
- `StatCard` for dashboard cards
- `Tabs` for incident detail view

---

## 8. Integration Notes

### Counsellor Permission Flag

Add `isCounsellor: { type: Boolean, default: false }` to the User schema. School admins assign this via user management. A teacher with `isCounsellor: true` gets:
- Access to all school incidents (not just their class)
- Ability to create confidential notes
- Access to wellbeing survey management and results
- Access to mood dashboard

### Confidential Notes Middleware

```ts
function requireConfidentialAccess(req, res, next) {
  if (req.user.role === 'super_admin') return next();
  if (req.user.role === 'school_admin' && req.user.isSchoolPrincipal) return next();
  if (req.user.role === 'teacher' && req.user.isCounsellor) return next();
  return res.status(403).json({ success: false, message: 'Confidential access required' });
}
```

### Parent Notification

When an incident is created with involved parties:
1. For each involved student, look up their parent(s) via the `Parent` model.
2. Queue a BullMQ job (`incident-parent-notification`) with parent email and incident type.
3. The notification is minimal: incident type and school contact info. No details about the other child or specific circumstances (privacy protection).
4. Set `involvedParties[].parentNotified = true` and `parentNotifiedAt`.

### Anonymous Survey Handling

When `isAnonymous: true`:
- `SurveyResponse.studentId` is set to `null`.
- A one-time-use token prevents duplicate submissions (stored in Redis for the survey duration).
- Text responses are NOT returned in aggregate results (to prevent identification by writing style).

### Incident Number Generation

Same pattern as admissions: `INC-YYYY-NNNNN` with atomic counter. Use `findOneAndUpdate` with `$inc` on a counter collection.

### Multi-Tenancy

All queries filter by `schoolId`. Confidential notes add an additional layer: even within a school, only counsellors and the principal can access them. Teachers see incidents but NOT confidential notes.

### Department of Education Compliance

The incident model stores a complete audit trail via `statusHistory`. The reports endpoint provides the data needed for DoE quarterly reporting: incident counts by type, severity, resolution status, and timeframes.

---

## 9. Acceptance Criteria

- [ ] Teachers can report incidents with type, severity, description, involved parties, and witnesses
- [ ] Incidents follow the workflow: Reported → Investigating → Resolved / Escalated
- [ ] Invalid status transitions are rejected
- [ ] Incident numbers are auto-generated and unique (INC-YYYY-NNNNN)
- [ ] Follow-up actions can be created with assignees and due dates
- [ ] Follow-up actions can be marked as completed with notes
- [ ] Confidential notes are visible ONLY to counsellors and the principal
- [ ] Regular teachers and admins without `isSchoolPrincipal` cannot see confidential notes
- [ ] Only counsellors can create confidential notes
- [ ] Parents are automatically notified when their child is involved in an incident
- [ ] Parent notifications contain only incident type and contact info (privacy)
- [ ] Wellbeing surveys can be created with multiple question types (scale, multiple choice, text, yes/no)
- [ ] Surveys can be anonymous or identified
- [ ] Students can complete active surveys
- [ ] Anonymous survey responses do not store student identity
- [ ] Survey results show aggregate data only — no individual identification
- [ ] Text responses are excluded from anonymous survey aggregates
- [ ] Mood dashboard shows average mood, safety score, and trends over time
- [ ] Mood data is shown per grade in a breakdown table
- [ ] Incident reports show totals by type, severity, status, and monthly trends
- [ ] Average resolution time is calculated and displayed
- [ ] All incident data maintains a full audit trail (status history)
- [ ] All endpoints filter by `schoolId` — no cross-school data leakage
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types

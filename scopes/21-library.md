# 21 — Library Module

## 1. Module Overview

The Library module provides full digital management of a school's physical book collection. It covers four distinct areas:

1. **Book catalogue** — admin CRUD for the school's book inventory, with availability tracking as copies are issued and returned.
2. **Book loans** — issuance, return, and loss-marking of physical books, with automatic overdue detection via a BullMQ background job (`LibraryService.markOverdueLoans`).
3. **Reading challenges** — time-boxed challenges that staff create and students join, with a target book count and optional reward points.
4. **Reading logs & leaderboard** — students log individual books they have read (with optional pages, rating, and review), and completed logs are aggregated into a per-challenge leaderboard.

**Portal access:**

| Role | Capabilities |
|---|---|
| `school_admin` / `super_admin` | Full CRUD on books, loans (issue/return/mark-lost), challenges; overdue report |
| `teacher` | Issue/return loans, create/update challenges |
| `student` | Browse catalogue, view own loans, join challenges, log reading |
| `parent` | View children's active loans and borrowing history |

The two existing frontend pages (`/student/library` and `/parent/library`) currently use mock data and need to be wired to the real API. No admin library page exists yet.

---

## 2. Backend API Endpoints

All routes are mounted under `/api/library` (inferred from module structure). Every request must include a valid JWT `Authorization: Bearer <token>` header unless noted otherwise.

The base URL prefix for all paths below is `/api/library`.

---

### 2.1 Books

#### `POST /books`

Create a new book record for a school.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Request body:**

```json
{
  "schoolId": "64a1f2e3b4c5d6e7f8a9b0c1",   // string, required — 24-char hex ObjectId
  "title": "Long Walk to Freedom",            // string, required — min length 1
  "author": "Nelson Mandela",                 // string, required — min length 1
  "isbn": "978-0316548182",                   // string, optional
  "category": "Biography",                    // string, required — min length 1
  "copies": 5,                                // integer, required — min 0
  "availableCopies": 5,                       // integer, required — min 0
  "shelfLocation": "Section A, Shelf 2",      // string, optional
  "coverImageUrl": "https://cdn.example.com/covers/book1.jpg" // string, optional
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "64b2...",
    "schoolId": "64a1...",
    "title": "Long Walk to Freedom",
    "author": "Nelson Mandela",
    "isbn": "978-0316548182",
    "category": "Biography",
    "copies": 5,
    "availableCopies": 5,
    "shelfLocation": "Section A, Shelf 2",
    "coverImageUrl": "https://cdn.example.com/covers/book1.jpg",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Book created successfully"
}
```

---

#### `GET /books`

List all books for a school with optional search, category filter, and pagination.

**Auth:** Required. All authenticated roles.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Required if not derivable from token |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: per `PAGINATION_DEFAULTS`, max: `PAGINATION_DEFAULTS.maxLimit`) |
| `search` | string | Searches `title`, `author`, and `isbn` case-insensitively |
| `category` | string | Filter by exact category string |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "64b2...",
        "schoolId": "64a1...",
        "title": "Long Walk to Freedom",
        "author": "Nelson Mandela",
        "isbn": "978-0316548182",
        "category": "Biography",
        "copies": 5,
        "availableCopies": 3,
        "shelfLocation": "Section A, Shelf 2",
        "coverImageUrl": "https://cdn.example.com/covers/book1.jpg",
        "isDeleted": false,
        "createdAt": "2026-03-01T08:00:00.000Z",
        "updatedAt": "2026-03-10T09:30:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Books retrieved successfully"
}
```

---

#### `GET /books/:id`

Retrieve a single book by its ObjectId.

**Auth:** Required. All authenticated roles.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "64b2...",
    "schoolId": "64a1...",
    "title": "Long Walk to Freedom",
    "author": "Nelson Mandela",
    "isbn": "978-0316548182",
    "category": "Biography",
    "copies": 5,
    "availableCopies": 3,
    "shelfLocation": "Section A, Shelf 2",
    "coverImageUrl": "https://cdn.example.com/covers/book1.jpg",
    "isDeleted": false,
    "createdAt": "2026-03-01T08:00:00.000Z",
    "updatedAt": "2026-03-10T09:30:00.000Z"
  },
  "message": "Book retrieved successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Book not found" }`

---

#### `PUT /books/:id`

Update any subset of book fields (partial update — all fields optional via `createBookSchema.partial()`).

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Request body:** Same shape as `POST /books` but every field is optional.

```json
{
  "availableCopies": 2,
  "shelfLocation": "Section A, Shelf 3"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": { /* updated book document */ },
  "message": "Book updated successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Book not found" }`

---

#### `DELETE /books/:id`

Soft-delete a book (`isDeleted: true`). Does not remove the document.

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Book deleted successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Book not found" }`

---

### 2.2 Book Loans

#### `POST /loans/issue`

Issue a book to a student. Decrements `availableCopies` on the book document atomically. Fails if no copies are available.

**Auth:** Required. Roles: `school_admin`, `super_admin`, `teacher`.

**Request body:**

```json
{
  "bookId": "64b2...",      // string, required — 24-char hex ObjectId
  "studentId": "64c3...",   // string, required — 24-char hex ObjectId
  "schoolId": "64a1...",    // string, required — 24-char hex ObjectId
  "dueDate": "2026-04-14T00:00:00.000Z"  // string, required — ISO 8601 datetime
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "64d4...",
    "bookId": "64b2...",
    "studentId": "64c3...",
    "schoolId": "64a1...",
    "issuedBy": "64e5...",
    "issuedDate": "2026-03-31T08:00:00.000Z",
    "dueDate": "2026-04-14T00:00:00.000Z",
    "returnedDate": null,
    "status": "issued",
    "fineAmount": 0,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Book issued successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Book not found" }`
**Error `400`:** `{ "success": false, "error": "No copies available" }`

---

#### `PATCH /loans/:id/return`

Mark an active loan (`issued` or `overdue`) as returned. Increments `availableCopies` on the book.

**Auth:** Required. Roles: `school_admin`, `super_admin`, `teacher`.

**Request body:**

```json
{
  "fineAmount": 15.00   // number, optional — min 0; sets fine if overdue
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "64d4...",
    "status": "returned",
    "returnedDate": "2026-03-31T09:00:00.000Z",
    "fineAmount": 15.00,
    /* ...remaining loan fields */
  },
  "message": "Book returned successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Active loan not found" }` (returned if loan is already returned/lost, or does not exist)

---

#### `PATCH /loans/:id/lost`

Mark an active loan as lost. Sets `fineAmount` and decrements total `copies` on the book (the copy is permanently removed from inventory).

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Request body:**

```json
{
  "fineAmount": 250.00   // number — the replacement cost; defaults to 0 if omitted
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "64d4...",
    "status": "lost",
    "fineAmount": 250.00,
    /* ...remaining loan fields */
  },
  "message": "Book marked as lost"
}
```

**Error `404`:** `{ "success": false, "error": "Active loan not found" }`

---

#### `GET /loans/overdue`

Retrieve all loans that are `issued` status and past their `dueDate`. Results are populated with book title/author, full student document, and issuer name/email.

**Auth:** Required. Roles: `school_admin`, `super_admin`, `teacher`.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Required if not derivable from token |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page |

Note: The background job (`markOverdueLoans`) updates statuses to `overdue` periodically. This endpoint queries for `status: 'issued'` where `dueDate < now`, so it may show loans that have not yet been updated by the job.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "64d4...",
        "bookId": { "_id": "64b2...", "title": "Long Walk to Freedom", "author": "Nelson Mandela" },
        "studentId": { /* full student document */ },
        "issuedBy": { "_id": "64e5...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" },
        "issuedDate": "2026-02-01T08:00:00.000Z",
        "dueDate": "2026-02-15T00:00:00.000Z",
        "status": "issued",
        "fineAmount": 0
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Overdue loans retrieved successfully"
}
```

---

#### `GET /loans/student/:studentId`

Retrieve the complete loan history for a specific student. Results are populated with book `title`, `author`, and `coverImageUrl`.

**Auth:** Required. All authenticated roles.

**Query parameters:** `page`, `limit`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "64d4...",
        "bookId": { "_id": "64b2...", "title": "Long Walk to Freedom", "author": "Nelson Mandela", "coverImageUrl": "https://..." },
        "studentId": "64c3...",
        "schoolId": "64a1...",
        "issuedBy": "64e5...",
        "issuedDate": "2026-03-01T08:00:00.000Z",
        "dueDate": "2026-03-15T00:00:00.000Z",
        "returnedDate": "2026-03-13T10:00:00.000Z",
        "status": "returned",
        "fineAmount": 0
      }
    ],
    "total": 7,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Student loans retrieved successfully"
}
```

---

### 2.3 Reading Challenges

#### `POST /challenges`

Create a new reading challenge for a school.

**Auth:** Required. Roles: `school_admin`, `super_admin`, `teacher`.

**Request body:**

```json
{
  "schoolId": "64a1...",                    // string, required — 24-char hex ObjectId
  "name": "Term 1 Reading Challenge",       // string, required — min length 1
  "targetBooks": 10,                        // integer, required — min 1
  "startDate": "2026-01-13T00:00:00.000Z",  // string, required — ISO 8601 datetime
  "endDate": "2026-03-28T23:59:59.000Z",    // string, required — ISO 8601 datetime
  "rewardPoints": 100                       // integer, optional — min 0; defaults to 0
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "64f6...",
    "schoolId": "64a1...",
    "name": "Term 1 Reading Challenge",
    "targetBooks": 10,
    "startDate": "2026-01-13T00:00:00.000Z",
    "endDate": "2026-03-28T23:59:59.000Z",
    "rewardPoints": 100,
    "participants": [],
    "isDeleted": false,
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-01-10T08:00:00.000Z"
  },
  "message": "Reading challenge created successfully"
}
```

---

#### `GET /challenges`

List all challenges for a school, sorted by `startDate` descending.

**Auth:** Required. All authenticated roles.

**Query parameters:** `schoolId`, `page`, `limit`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "data": [ /* array of challenge documents */ ],
    "total": 4,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Reading challenges retrieved successfully"
}
```

---

#### `GET /challenges/:id`

Retrieve a single reading challenge by ObjectId.

**Auth:** Required. All authenticated roles.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "64f6...",
    "schoolId": "64a1...",
    "name": "Term 1 Reading Challenge",
    "targetBooks": 10,
    "startDate": "2026-01-13T00:00:00.000Z",
    "endDate": "2026-03-28T23:59:59.000Z",
    "rewardPoints": 100,
    "participants": ["64c3...", "64c4..."],
    "isDeleted": false,
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-01-15T11:00:00.000Z"
  },
  "message": "Reading challenge retrieved successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Reading challenge not found" }`

---

#### `PUT /challenges/:id`

Update any subset of challenge fields (all fields optional via `createChallengeSchema.partial()`).

**Auth:** Required. Roles: `school_admin`, `super_admin`, `teacher`.

**Request body:** Same shape as `POST /challenges`, all fields optional.

**Response `200`:**

```json
{
  "success": true,
  "data": { /* updated challenge document */ },
  "message": "Reading challenge updated successfully"
}
```

---

#### `POST /challenges/:id/join`

Add a student to the challenge's `participants` array. Uses `$addToSet` so duplicate joins are ignored.

**Auth:** Required. All authenticated roles.

**Request body:**

```json
{
  "studentId": "64c3..."   // string — the student's ObjectId
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "64f6...",
    "participants": ["64c3..."],
    /* ...remaining challenge fields */
  },
  "message": "Joined reading challenge successfully"
}
```

**Error `404`:** `{ "success": false, "error": "Reading challenge not found" }`

---

#### `DELETE /challenges/:id`

Soft-delete a reading challenge (`isDeleted: true`).

**Auth:** Required. Roles: `school_admin`, `super_admin`.

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Reading challenge deleted successfully"
}
```

---

### 2.4 Reading Logs

#### `POST /reading-logs`

Log a book read by a student, optionally linked to a challenge.

**Auth:** Required. All authenticated roles.

**Request body:**

```json
{
  "studentId": "64c3...",                     // string, required — 24-char hex ObjectId
  "challengeId": "64f6...",                   // string, optional — links log to a challenge
  "bookId": "64b2...",                        // string, required — 24-char hex ObjectId
  "pagesRead": 312,                           // integer, optional — min 0; defaults to 0
  "completedDate": "2026-03-28T00:00:00.000Z",// string, optional — ISO 8601 datetime; if present, counts toward leaderboard
  "rating": 4,                                // integer, optional — min 1, max 5
  "review": "A profound and moving account."  // string, optional
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "64g7...",
    "studentId": "64c3...",
    "challengeId": "64f6...",
    "bookId": "64b2...",
    "pagesRead": 312,
    "completedDate": "2026-03-28T00:00:00.000Z",
    "rating": 4,
    "review": "A profound and moving account.",
    "isDeleted": false,
    "createdAt": "2026-03-28T14:00:00.000Z",
    "updatedAt": "2026-03-28T14:00:00.000Z"
  },
  "message": "Reading log created successfully"
}
```

---

#### `GET /reading-logs/student/:studentId`

Retrieve all reading logs for a student. Results are populated with book `title`/`author` and challenge `name`.

**Auth:** Required. All authenticated roles.

**Query parameters:** `page`, `limit`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "64g7...",
        "studentId": "64c3...",
        "challengeId": { "_id": "64f6...", "name": "Term 1 Reading Challenge" },
        "bookId": { "_id": "64b2...", "title": "Long Walk to Freedom", "author": "Nelson Mandela" },
        "pagesRead": 312,
        "completedDate": "2026-03-28T00:00:00.000Z",
        "rating": 4,
        "review": "A profound and moving account.",
        "createdAt": "2026-03-28T14:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Reading logs retrieved successfully"
}
```

---

### 2.5 Leaderboard

#### `GET /leaderboard/:challengeId`

Retrieve the ranked leaderboard for a reading challenge. Only reading logs with a non-null `completedDate` are counted. Rank is determined first by `booksCompleted` descending, then by `totalPages` descending.

**Auth:** Required. All authenticated roles.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | number | Maximum entries to return (default: 20) |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "studentId": "64c3...",
      "firstName": "Amara",
      "lastName": "Dube",
      "booksCompleted": 8,
      "totalPages": 2450
    },
    {
      "studentId": "64c4...",
      "firstName": "Liam",
      "lastName": "Nkosi",
      "booksCompleted": 6,
      "totalPages": 1880
    }
  ],
  "message": "Leaderboard retrieved successfully"
}
```

Note: The leaderboard is computed via an aggregation pipeline: `$match` on `challengeId` + `completedDate != null`, `$group` by `studentId` summing `booksCompleted` and `totalPages`, `$sort`, `$limit`, then two `$lookup` stages to join `students` → `users` to resolve `firstName`/`lastName`.

---

## 3. Frontend Pages

### 3.1 Student Library — `/student/library`

**File:** `src/app/(dashboard)/student/library/page.tsx`

**Current state:** Client component, wired to mock data (`mockBooks`, `mockBorrowings`, `mockStudents`). Needs API wiring.

**Layout:**

1. `PageHeader` — "Library" / "Browse books and track your borrowings"
2. **Reading Challenge card** — amber icon, progress bar showing `booksReadThisTerm / readingGoal`, motivational text. Currently uses a hardcoded `readingGoal = 10` and derives progress from mock returned borrowings.
3. **Tabs:**
   - `Currently Borrowed` (count badge) — grid of loan cards showing book cover placeholder, title, author, due date, and `borrowed`/`overdue` badge.
   - `Browse Catalogue` — grid of book cards showing cover placeholder, title, author, category badge, shelf location, and available-copies availability badge.

**Gaps to fill:**

- Replace mock data with real API calls: `GET /loans/student/:studentId`, `GET /books`, `GET /challenges`, `GET /leaderboard/:challengeId`.
- Reading challenge progress should reflect real `ReadingChallenge` data and actual reading log counts.
- A third "Reading Logs" or "My Progress" tab should expose `GET /reading-logs/student/:studentId` and surface the `ReadingLogForm` for submitting new entries.
- The challenge leaderboard view should be added.

---

### 3.2 Parent Library — `/parent/library`

**File:** `src/app/(dashboard)/parent/library/page.tsx`

**Current state:** Client component, wired to mock data. Needs API wiring.

**Layout:**

1. `PageHeader` — "Library" / "Track your children's library borrowings and reading history."
2. **Summary stat cards (3):** Currently Borrowed, Overdue Books, Books Returned — aggregated across all children.
3. **Overdue alert banner** — red card shown when any child has overdue books.
4. **Per-child tabs** — one tab per linked child showing:
   - Currently borrowed / overdue book cards with title, author, category, borrowed date, due date, and status badge (red border when overdue).
   - "Reading History" `DataTable` with columns: Title/Author, Category, Borrowed date, Due Date, Returned date, Status.

**Gaps to fill:**

- Replace mock data with real API calls: `GET /loans/student/:studentId` called per child.
- Parent needs their linked children's IDs — typically from `req.user` context (parent's student links) or a dedicated endpoint.
- The `DataTable` `searchKey="book_title"` does not match any column accessor; this needs to be updated to the correct key.

---

### 3.3 Admin Library (missing)

No admin library page exists yet. A new page at `/admin/library` is needed to provide:

- Book catalogue management (add/edit/delete books, search, category filter).
- Loan management (issue loans, return books, mark lost, view overdue report).
- Reading challenge management (create/edit/delete challenges).

---

## 4. User Flows

### 4.1 Add a Book (Admin)

1. Admin navigates to `/admin/library` → Books tab.
2. Clicks "Add Book" — opens a modal/drawer with the `BookForm`.
3. Fills in `title`, `author`, `category`, `copies`, `availableCopies`; optionally `isbn`, `shelfLocation`, `coverImageUrl`.
4. Submits → `POST /api/library/books`.
5. On success: book appears in the catalogue list; available copies shown in the `BookCard`.

### 4.2 Issue a Loan (Admin / Teacher)

1. Staff member opens a student's profile or navigates to `/admin/library` → Loans tab.
2. Searches for the book by title/author/ISBN.
3. Selects the book — verifies `availableCopies > 0` (disabled state if 0).
4. Sets a `dueDate` (date picker).
5. Submits → `POST /api/library/loans/issue`.
6. On success: `availableCopies` on the book decrements; new loan appears with status `issued`.

### 4.3 Return a Book (Admin / Teacher)

1. Staff member finds the active loan (via student view or overdue report).
2. Clicks "Return" — optionally enters a `fineAmount` if the book is overdue.
3. Submits → `PATCH /api/library/loans/:id/return`.
4. On success: loan status becomes `returned`; `returnedDate` populated; `availableCopies` increments on the book.

### 4.4 Mark a Book as Lost (Admin)

1. Admin locates the active loan.
2. Clicks "Mark Lost" — enters the replacement `fineAmount`.
3. Submits → `PATCH /api/library/loans/:id/lost`.
4. On success: loan status becomes `lost`; `copies` on the book decrements (permanent inventory reduction).

### 4.5 Join a Reading Challenge (Student)

1. Student navigates to `/student/library` → Challenges tab (to be built).
2. Views active challenges with name, target books, date range, reward points.
3. Clicks "Join" on a challenge → `POST /api/library/challenges/:id/join` with their `studentId`.
4. On success: student's ID is added to `participants`; UI transitions to "You're enrolled" state.

### 4.6 Log Reading Progress (Student)

1. Student navigates to `/student/library` → Reading Logs tab.
2. Clicks "Log a Book" → `ReadingLogForm` opens.
3. Selects a book from the catalogue (or types a book ID), enters `pagesRead`, optionally selects the challenge this log belongs to, sets `completedDate` if finished, adds `rating` (1–5 stars) and `review`.
4. Submits → `POST /api/library/reading-logs`.
5. On success: log entry appears in reading history; if `completedDate` is set and `challengeId` is provided, the leaderboard rank for that challenge updates.

### 4.7 View the Leaderboard (Student / Parent)

1. Student views a joined challenge detail.
2. Leaderboard section shows → `GET /api/library/leaderboard/:challengeId?limit=20`.
3. Ranked list of students: rank number, name, books completed, total pages.
4. Student's own row is highlighted.

---

## 5. Data Models

### 5.1 Book

```typescript
interface IBook {
  _id: ObjectId;
  schoolId: ObjectId;       // ref: School
  title: string;            // trimmed, required
  author: string;           // trimmed, required
  isbn?: string;            // trimmed, optional
  category: string;         // trimmed, required
  copies: number;           // total physical copies, min 0
  availableCopies: number;  // decrements on issue, increments on return; min 0
  shelfLocation?: string;   // trimmed, optional (e.g. "Section A, Shelf 2")
  coverImageUrl?: string;   // optional URL
  isDeleted: boolean;       // soft-delete flag, default false
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ schoolId, title }`, `{ schoolId, isbn }`, `{ schoolId, category }`

---

### 5.2 BookLoan

```typescript
type BookLoanStatus = 'issued' | 'returned' | 'overdue' | 'lost';

interface IBookLoan {
  _id: ObjectId;
  bookId: ObjectId;         // ref: Book
  studentId: ObjectId;      // ref: Student
  schoolId: ObjectId;       // ref: School
  issuedBy: ObjectId;       // ref: User (staff member who issued)
  issuedDate: Date;         // defaults to new Date() on creation
  dueDate: Date;
  returnedDate?: Date;      // set on return
  status: BookLoanStatus;   // default 'issued'
  fineAmount: number;       // default 0; set on return/lost
  isDeleted: boolean;       // default false
  createdAt: Date;
  updatedAt: Date;
}
```

**Status transitions:**
- `issued` → `returned` (via return endpoint)
- `issued` → `overdue` (via BullMQ background job)
- `issued` | `overdue` → `returned` (via return endpoint)
- `issued` | `overdue` → `lost` (via lost endpoint)

**Indexes:** `{ bookId, studentId, status }`, `{ schoolId, status }`, `{ studentId, status }`, `{ dueDate, status }`

---

### 5.3 ReadingChallenge

```typescript
interface IReadingChallenge {
  _id: ObjectId;
  schoolId: ObjectId;           // ref: School
  name: string;                 // trimmed, required
  targetBooks: number;          // min 1
  startDate: Date;
  endDate: Date;
  rewardPoints: number;         // default 0
  participants: ObjectId[];     // ref: Student[]; uses $addToSet for join
  isDeleted: boolean;           // default false
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ schoolId, endDate: -1 }`

---

### 5.4 ReadingLog

```typescript
interface IReadingLog {
  _id: ObjectId;
  studentId: ObjectId;      // ref: Student, required
  challengeId?: ObjectId;   // ref: ReadingChallenge, optional
  bookId: ObjectId;         // ref: Book, required
  pagesRead: number;        // default 0; used in leaderboard totalPages aggregation
  completedDate?: Date;     // if set, counts this log in the leaderboard
  rating?: number;          // 1–5 inclusive
  review?: string;          // trimmed
  isDeleted: boolean;       // default false
  createdAt: Date;
  updatedAt: Date;
}
```

**Leaderboard logic:** The leaderboard aggregation counts a log as "completed" only when `completedDate != null`. Logs without a `completedDate` represent in-progress reads.

**Indexes:** `{ studentId, bookId }`, `{ challengeId, studentId }`

---

### 5.5 Frontend types (current, `src/types/index.ts`)

These are the local mock-data types currently used in the frontend. They need to be reconciled with the backend shapes during API wiring:

```typescript
interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  location: string;           // maps to backend shelfLocation
}

interface BookBorrowing {
  id: string;
  bookId: string;
  book: LibraryBook;
  studentId: string;
  student: Student;
  borrowedDate: string;       // maps to backend issuedDate
  dueDate: string;
  returnedDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';  // backend also has 'lost'
}
```

Key mapping differences:
- `LibraryBook.location` → `IBook.shelfLocation`
- `LibraryBook.totalCopies` → `IBook.copies`
- `BookBorrowing.borrowedDate` → `IBookLoan.issuedDate`
- `BookBorrowing.status = 'borrowed'` → `IBookLoan.status = 'issued'`
- Frontend `BookBorrowing` does not have `fineAmount` — needs adding
- Frontend `BookBorrowing` does not have `'lost'` status — needs adding

---

## 6. State Management

A `useLibraryStore` (Zustand) should be created at `src/stores/libraryStore.ts`.

### Recommended store shape

```typescript
interface LibraryStore {
  // Books
  books: IBook[];
  booksLoading: boolean;
  booksTotal: number;
  booksPage: number;
  bookSearch: string;
  bookCategory: string;

  // Active loans
  activeLoans: IBookLoan[];
  activeLoansLoading: boolean;

  // Overdue loans (admin/teacher)
  overdueLoans: IBookLoan[];
  overdueLoansLoading: boolean;

  // Reading challenges
  challenges: IReadingChallenge[];
  challengesLoading: boolean;
  selectedChallenge: IReadingChallenge | null;

  // Reading logs
  readingLogs: IReadingLog[];
  readingLogsLoading: boolean;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardChallengeId: string | null;

  // Actions
  fetchBooks: (schoolId: string, params?: BookListParams) => Promise<void>;
  fetchStudentLoans: (studentId: string) => Promise<void>;
  fetchOverdueLoans: (schoolId: string) => Promise<void>;
  issueBook: (payload: IssueBookPayload) => Promise<void>;
  returnBook: (loanId: string, fineAmount?: number) => Promise<void>;
  markLost: (loanId: string, fineAmount: number) => Promise<void>;
  fetchChallenges: (schoolId: string) => Promise<void>;
  joinChallenge: (challengeId: string, studentId: string) => Promise<void>;
  fetchReadingLogs: (studentId: string) => Promise<void>;
  createReadingLog: (payload: CreateReadingLogPayload) => Promise<void>;
  fetchLeaderboard: (challengeId: string, limit?: number) => Promise<void>;
}
```

### Alternative: React Query

Given the query-heavy nature of the module (catalogue browsing with pagination/search, student loan polling), React Query (`useQuery` / `useMutation`) is a suitable alternative or complement to Zustand for the read paths. Mutations (issue, return, lost) pair naturally with `useMutation` + `onSuccess` cache invalidation.

---

## 7. Components Needed

### 7.1 `BookSearch`

**Location:** `src/components/library/BookSearch.tsx`

A controlled search + filter bar for the book catalogue.

**Props:**
```typescript
interface BookSearchProps {
  search: string;
  category: string;
  categories: string[];   // distinct category values from catalogue
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}
```

**Behaviour:** Debounced text input (300 ms) feeding `GET /books?search=...`. Category filter is a `<Select>` with an "All categories" default option. Should display a loading spinner while the debounced query is in flight.

---

### 7.2 `BookCard`

**Location:** `src/components/library/BookCard.tsx`

Displays a single book from the catalogue.

**Props:**
```typescript
interface BookCardProps {
  book: IBook;
  onIssue?: (book: IBook) => void;   // present for admin/teacher roles
}
```

**Displays:** Cover image (or `BookCopy` icon fallback), title, author, category badge, shelf location, availability badge (`N available` green / `All out` destructive).

---

### 7.3 `LoanHistory`

**Location:** `src/components/library/LoanHistory.tsx`

A `DataTable`-wrapped table of a student's loan history.

**Props:**
```typescript
interface LoanHistoryProps {
  loans: IBookLoan[];
  loading?: boolean;
  onReturn?: (loan: IBookLoan) => void;   // admin/teacher only
  onMarkLost?: (loan: IBookLoan) => void; // admin only
}
```

**Columns:** Book title/author (populated), category, issued date, due date, returned date, status badge, actions (Return / Mark Lost buttons, role-gated). Status badges: `issued` → blue, `overdue` → red, `returned` → green, `lost` → gray.

---

### 7.4 `ChallengeCard`

**Location:** `src/components/library/ChallengeCard.tsx`

Displays a reading challenge with enrolment status and progress.

**Props:**
```typescript
interface ChallengeCardProps {
  challenge: IReadingChallenge;
  studentId?: string;           // if provided, shows join button / enrolled state
  booksCompleted?: number;      // student's progress toward targetBooks
  onJoin?: (challengeId: string) => void;
  onViewLeaderboard?: (challengeId: string) => void;
}
```

**Displays:** Challenge name, date range (start → end), target books, reward points badge, progress bar (if `booksCompleted` provided), "Join" / "Enrolled" CTA, "View Leaderboard" link.

---

### 7.5 `ReadingLogForm`

**Location:** `src/components/library/ReadingLogForm.tsx`

A form for submitting a new reading log entry, rendered inside a modal or sheet.

**Props:**
```typescript
interface ReadingLogFormProps {
  studentId: string;
  challenges: IReadingChallenge[];   // enrolled challenges to select from
  onSuccess?: () => void;
}
```

**Fields:**

| Field | Control | Validation |
|---|---|---|
| `bookId` | Book search combobox | Required |
| `challengeId` | Select (optional) | Optional, must be enrolled |
| `pagesRead` | Number input | Optional, min 0 |
| `completedDate` | Date picker | Optional; if set, counts toward leaderboard |
| `rating` | Star picker (1–5) | Optional |
| `review` | Textarea | Optional |

Submits to `POST /api/library/reading-logs`. On success triggers `onSuccess` callback (used to refetch logs and leaderboard).

---

### 7.6 `Leaderboard`

**Location:** `src/components/library/Leaderboard.tsx`

Displays the ranked reading leaderboard for a challenge.

**Props:**
```typescript
interface LeaderboardProps {
  challengeId: string;
  currentStudentId?: string;   // highlights the viewer's row
  limit?: number;              // default 20
}
```

**Displays:** Rank medal icon (gold/silver/bronze for top 3, numbered thereafter), student name, books completed, total pages read. Current student's row highlighted. Fetches from `GET /api/library/leaderboard/:challengeId`.

---

## 8. Integration Notes

### 8.1 Student module dependency

- `BookLoan.studentId` references the `Student` collection (not `User`). The student's `_id` is required for all loan and reading-log queries. The frontend must hold the authenticated user's student ID — this is typically populated on the auth store from the login response or a `/me` endpoint.
- `GET /loans/overdue` populates the full `studentId` document (includes the student's linked `User`). The parent portal likewise needs the student IDs for each linked child.

### 8.2 School scoping

- All list endpoints require `schoolId`, either passed as a query parameter or inferred from `req.user.schoolId` on the token. Authenticated users without `schoolId` on their token must always pass it explicitly.
- The admin and teacher roles operate on the same school's data. The super_admin role may access any school.

### 8.3 Availability invariant

- `availableCopies` must never exceed `copies`. The service does not enforce this — frontend validation on the Add/Edit Book form should ensure `availableCopies <= copies`.
- When a book is marked lost: `copies` decrements but `availableCopies` does not change (the lost copy was already checked out, so `availableCopies` was already decremented at issue time).

### 8.4 Overdue status duality

- The overdue loans endpoint (`GET /loans/overdue`) queries for `status: 'issued'` where `dueDate < now`, not `status: 'overdue'`. This is because the BullMQ job (`markOverdueLoans`) transitions loans to `'overdue'` asynchronously. The frontend should treat both `issued`-past-due-date and `overdue` as visually overdue.
- The return endpoint (`returnBook`) accepts loans with status in `['issued', 'overdue']`, so staff can return a book regardless of whether the job has run.

### 8.5 Leaderboard scope

- Only logs with a non-null `completedDate` count. Students should be informed that setting `completedDate` is required for their reading to appear on the leaderboard.
- The leaderboard is not paginated — a `limit` query param caps results (default 20).

### 8.6 Challenge participants

- `participants` is an array of ObjectIds on the `ReadingChallenge` document. This is used for displaying enrolled count and gating actions in the UI. For large schools this array could grow large; consider querying participant count separately if the challenge detail page shows participant lists.

### 8.7 Frontend type reconciliation

Before wiring the API, the frontend types in `src/types/index.ts` should be updated or extended:

- Rename or alias `LibraryBook.location` → `shelfLocation`
- Add `'lost'` to `BookBorrowing.status` union
- Add `fineAmount: number` to `BookBorrowing`
- Rename `borrowedDate` → `issuedDate` to match the backend field, or apply a mapping layer in the API client
- Add `IReadingChallenge`, `IReadingLog`, and `LeaderboardEntry` types

---

## 9. Acceptance Criteria

### Books

- [ ] Admin can create a book with all required fields; the book appears in `GET /books` results immediately.
- [ ] `availableCopies` is shown correctly on `BookCard`; books with 0 available show "All out" and the issue button is disabled.
- [ ] Admin can edit any book field; changes persist and are reflected in the catalogue.
- [ ] Soft-deleted books do not appear in any list or search result.
- [ ] Search across title, author, and ISBN returns results case-insensitively.
- [ ] Category filter reduces catalogue to matching books only.
- [ ] Pagination controls work; `totalPages` and `total` are displayed.

### Loans

- [ ] Issuing a book decrements `availableCopies` by 1; the updated count is reflected on the `BookCard` without a full page reload.
- [ ] Attempting to issue a book with 0 available copies shows an error and does not create a loan.
- [ ] Returning a book increments `availableCopies` by 1; loan status changes to `returned` with `returnedDate` populated.
- [ ] Marking a book lost decrements `copies` by 1; loan status changes to `lost`; `availableCopies` is unchanged.
- [ ] `GET /loans/student/:studentId` returns complete loan history including populated book title/author/cover.
- [ ] Overdue loans are visually distinguished (red border, destructive badge) in both student and parent portals.
- [ ] The parent portal correctly shows loans across all linked children, with per-child tab navigation.
- [ ] The parent portal overdue alert banner appears only when one or more loans are overdue.

### Reading Challenges

- [ ] Admin/teacher can create a challenge with name, target books, date range, and reward points.
- [ ] Students can see active challenges (within `startDate`/`endDate` range) and join them.
- [ ] Joining a challenge twice does not create duplicate entries (idempotent via `$addToSet`).
- [ ] Challenge progress card on `/student/library` shows accurate `booksCompleted / targetBooks` from real reading logs.
- [ ] Admin can update challenge details; changes are reflected immediately.
- [ ] Soft-deleted challenges do not appear in any list.

### Reading Logs

- [ ] Student can submit a reading log with at minimum `studentId` and `bookId`.
- [ ] Logs with a `completedDate` appear on the challenge leaderboard.
- [ ] Logs without a `completedDate` are stored but do not affect leaderboard ranking.
- [ ] `rating` values outside 1–5 are rejected by the API with a validation error.
- [ ] Student reading log history shows populated book title/author and challenge name.

### Leaderboard

- [ ] Leaderboard ranks students by `booksCompleted` descending, then `totalPages` descending as a tiebreaker.
- [ ] The current student's row is visually highlighted.
- [ ] Top 3 entries display gold/silver/bronze indicators.
- [ ] Leaderboard updates reflect newly submitted logs without requiring a page reload (refetch on `ReadingLogForm` success).
- [ ] `limit` query parameter correctly caps the number of leaderboard entries.

### General

- [ ] All API calls include the `Authorization` header.
- [ ] Loading states are shown during all fetch and mutation operations.
- [ ] Error responses from the API are surfaced to the user via toast notifications.
- [ ] All tables support pagination with explicit page and limit controls.
- [ ] Empty states (`EmptyState` component) are shown when lists have no results.
- [ ] All new TypeScript types are non-`any` and match the backend document shapes.

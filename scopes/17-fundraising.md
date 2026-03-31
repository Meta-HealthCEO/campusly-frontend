# 17 — Fundraising Module

## 1. Module Overview

The Fundraising module enables school administrators to run donation campaigns, manage raffle-based fundraisers, issue Section 18A tax certificates, maintain a public donor wall, and track recurring donations. It is entirely admin-initiated; parents and students interact as donors and raffle-ticket buyers.

**Sub-domains:**

| Sub-domain | Description |
|---|---|
| Campaigns | Create and track fundraising drives with target amounts and date ranges |
| Donations | Record individual donations against a campaign; auto-increments campaign `raisedAmount` |
| Raffles | Sell numbered tickets tied to a campaign; draw winners via Fisher-Yates shuffle |
| Tax Certificates | Generate Section 18A certificates (uniquely numbered) for qualifying donations |
| Donor Wall | Public recognition board per campaign, sorted by donation size |
| Recurring Donations | Scheduled weekly/monthly donations; batch-processed by a `super_admin`-only trigger |

**Role access summary:**

| Role | Campaigns | Donations | Raffles | Tax Certs | Donor Wall | Recurring |
|---|---|---|---|---|---|---|
| `super_admin` | CRUD | Read + Delete | Create + Draw + Read | Create + Read | Add + Read | Full |
| `school_admin` | CRUD | Read + Delete | Create + Draw + Read | Create + Read | Add + Read | Create + List + Cancel |
| All auth'd users | Read | Create + Read | Buy tickets + Read own | Read | Read | Create + Read + Cancel own |

All amounts are stored and transmitted as **integer cents** (e.g. R150.00 = `15000`).

---

## 2. Backend API Endpoints

Base path prefix: `/api/fundraising` (assumed — consult the Express router mount point for the exact prefix).

---

### 2.1 Campaigns

#### POST /campaigns
Create a new fundraising campaign.

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Request body:**

```json
{
  "title": "New Library Fund",
  "description": "Raising funds to expand the school library.",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "targetAmount": 1500000,
  "startDate": "2026-02-01T00:00:00.000Z",
  "endDate": "2026-06-30T23:59:59.000Z",
  "isActive": true
}
```

| Field | Type | Validation |
|---|---|---|
| `title` | string | Required, min length 1 |
| `description` | string | Optional |
| `schoolId` | string | Required, 24-char hex ObjectId |
| `targetAmount` | integer | Required, positive (cents) |
| `startDate` | string | Required, ISO 8601 datetime |
| `endDate` | string | Required, ISO 8601 datetime |
| `isActive` | boolean | Optional, defaults to `true` |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "64c1b2c3d4e5f6a7b8c9d0e2",
    "title": "New Library Fund",
    "description": "Raising funds to expand the school library.",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "targetAmount": 1500000,
    "raisedAmount": 0,
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-06-30T23:59:59.000Z",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-15T08:00:00.000Z"
  },
  "message": "Campaign created successfully"
}
```

---

#### GET /campaigns
List all campaigns for a school, with pagination and optional active filter.

- **Auth:** Required
- **Roles:** All authenticated users

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Optional; falls back to `req.user.schoolId` |
| `page` | number | Optional, default 1 |
| `limit` | number | Optional, default from `paginationHelper` |
| `sort` | string | Optional, default `-createdAt` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "campaigns": [ /* array of Campaign documents */ ],
    "total": 4,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Campaigns retrieved successfully"
}
```

---

#### GET /campaigns/:id
Get a single campaign by ID.

- **Auth:** Required
- **Roles:** All authenticated users

**Response (200):**

```json
{
  "success": true,
  "data": { /* Campaign document */ },
  "message": "Campaign retrieved successfully"
}
```

**Error:** 404 if not found or soft-deleted.

---

#### PUT /campaigns/:id
Update a campaign.

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Request body** (all fields optional):

```json
{
  "title": "New Library Fund 2026",
  "description": "Updated description.",
  "targetAmount": 2000000,
  "startDate": "2026-02-01T00:00:00.000Z",
  "endDate": "2026-07-31T23:59:59.000Z",
  "isActive": false
}
```

**Response (200):** Updated Campaign document.

---

#### DELETE /campaigns/:id
Soft-delete a campaign (`isDeleted: true`).

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Campaign deleted successfully"
}
```

---

#### GET /campaigns/:campaignId/progress
Get campaign progress (raised vs target).

- **Auth:** Required
- **Roles:** All authenticated users

**Response (200):**

```json
{
  "success": true,
  "data": {
    "campaign": { /* Campaign document */ },
    "percentageComplete": 65.67
  },
  "message": "Campaign progress retrieved successfully"
}
```

`percentageComplete` is rounded to 2 decimal places. Returns `0` if `targetAmount` is 0.

---

#### GET /campaigns/:campaignId/donor-wall
Get public donor wall entries for a campaign, sorted by `amount` descending.

- **Auth:** Required
- **Roles:** All authenticated users

**Query parameters:** `page`, `limit`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "entries": [ /* DonorWall documents where isPublic: true */ ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Donor wall retrieved successfully"
}
```

---

### 2.2 Donations

#### POST /donations
Record a donation against a campaign. Automatically increments `campaign.raisedAmount` by `amount`.

- **Auth:** Required
- **Roles:** All authenticated users

**Request body:**

```json
{
  "campaignId": "64c1b2c3d4e5f6a7b8c9d0e2",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "donorName": "Sipho Dlamini",
  "donorEmail": "sipho@example.com",
  "amount": 50000,
  "message": "Happy to support the library!",
  "isAnonymous": false
}
```

| Field | Type | Validation |
|---|---|---|
| `campaignId` | string | Required, 24-char hex ObjectId |
| `schoolId` | string | Required, 24-char hex ObjectId |
| `donorName` | string | Required, min length 1 |
| `donorEmail` | string | Optional, valid email format |
| `amount` | integer | Required, positive (cents) |
| `message` | string | Optional |
| `isAnonymous` | boolean | Optional, defaults to `false` |

**Response (201):** New Donation document.

**Error:** 404 if `campaignId` not found or soft-deleted.

---

#### GET /donations
List donations with optional campaign filter.

- **Auth:** Required
- **Roles:** All authenticated users

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Optional; falls back to `req.user.schoolId` |
| `campaignId` | string | Optional filter by campaign |
| `page` | number | Optional |
| `limit` | number | Optional |

Donations are populated with `campaignId.title`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "donations": [ /* Donation documents with campaignId populated */ ],
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Donations retrieved successfully"
}
```

---

#### GET /donations/:id
Get a single donation, with `campaignId.title` populated.

- **Auth:** Required
- **Roles:** All authenticated users

**Response (200):** Single Donation document.

---

#### DELETE /donations/:id
Soft-delete a donation. Automatically **decrements** `campaign.raisedAmount` by the donation `amount`.

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Donation deleted successfully"
}
```

---

### 2.3 Raffles

#### POST /raffles
Create a raffle linked to a campaign.

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Request body:**

```json
{
  "campaignId": "64c1b2c3d4e5f6a7b8c9d0e2",
  "ticketPrice": 5000,
  "totalTickets": 500,
  "drawDate": "2026-04-10T14:00:00.000Z",
  "prizes": [
    { "place": 1, "description": "Luxury Easter hamper", "value": 250000 },
    { "place": 2, "description": "Chocolate collection", "value": 50000 }
  ]
}
```

| Field | Type | Validation |
|---|---|---|
| `campaignId` | string | Required, 24-char hex ObjectId |
| `ticketPrice` | integer | Required, positive (cents) |
| `totalTickets` | integer | Required, positive |
| `drawDate` | string | Required, ISO 8601 datetime |
| `prizes` | array | Optional; each item: `place` (int+), `description` (string, min 1), `value` (int+) |

**Response (201):** New Raffle document.

**Error:** 404 if `campaignId` not found.

---

#### POST /raffles/buy-tickets
Purchase one or more raffle tickets for a parent/student. Tickets are numbered `RAFFLE-{raffleId-last6}-{00001}` sequentially. `soldTickets` counter increments atomically.

- **Auth:** Required
- **Roles:** All authenticated users

**Request body:**

```json
{
  "raffleId": "64d1b2c3d4e5f6a7b8c9d0e3",
  "parentId": "64e1b2c3d4e5f6a7b8c9d0e4",
  "studentId": "64f1b2c3d4e5f6a7b8c9d0e5",
  "quantity": 3
}
```

| Field | Type | Validation |
|---|---|---|
| `raffleId` | string | Required, 24-char hex ObjectId |
| `parentId` | string | Required, 24-char hex ObjectId |
| `studentId` | string | Required, 24-char hex ObjectId |
| `quantity` | integer | Required, min 1, max 100 |

**Response (201):** Array of newly created RaffleTicket documents.

**Errors:**
- 404 if raffle not found
- 400 if `soldTickets + quantity > totalTickets` ("Not enough tickets available")

---

#### POST /raffles/:id/draw
Draw winners for a raffle using Fisher-Yates shuffle. The number of winners equals `min(prizes.length, soldTickets)`. Each winning ticket is updated with `isWinner: true` and `prizePlace`. Raffle `winnersDrawn` is set to `true`.

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Response (200):** Array of winning RaffleTicket documents.

**Errors:**
- 404 if raffle not found
- 400 if winners already drawn
- 400 if no tickets sold

---

#### GET /raffles/tickets/parent/:parentId
Get all raffle tickets owned by a parent. Optionally filter by raffle.

- **Auth:** Required
- **Roles:** All authenticated users

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `raffleId` | string | Optional filter |

Tickets are populated with the full `raffleId` document.

**Response (200):** Array of RaffleTicket documents (sorted by `purchasedAt` descending).

---

### 2.4 Tax Certificates (Section 18A)

#### POST /tax-certificates
Generate a Section 18A tax certificate for an existing donation. Certificate number format: `S18A-{schoolId-last6}-{YYYYMM}-{0001}` (sequential within prefix per month).

- **Auth:** Required
- **Roles:** `super_admin`, `school_admin`

**Request body:**

```json
{
  "donationId": "64b1b2c3d4e5f6a7b8c9d0e6",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "donorName": "Sipho Dlamini",
  "donorIdNumber": "8001015009087",
  "donorAddress": "12 Oak Street, Sandton, 2196",
  "schoolTaxNumber": "9876543210"
}
```

| Field | Type | Validation |
|---|---|---|
| `donationId` | string | Required, 24-char hex ObjectId |
| `schoolId` | string | Required, 24-char hex ObjectId |
| `donorName` | string | Required, min length 1 |
| `donorIdNumber` | string | Optional |
| `donorAddress` | string | Optional |
| `schoolTaxNumber` | string | Required, min length 1 |

`amount` is taken directly from the Donation record (not from the request).

**Response (201):** New TaxCertificate document.

**Errors:**
- 404 if `donationId` not found
- 400 if a certificate already exists for this donation

---

#### GET /tax-certificates
List tax certificates for a school, with optional donor name search.

- **Auth:** Required
- **Roles:** All authenticated users

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Optional; falls back to `req.user.schoolId` |
| `donorName` | string | Optional; case-insensitive partial match |
| `page` | number | Optional |
| `limit` | number | Optional |

Sorted by `dateIssued` descending. Populated with `donationId`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "certificates": [ /* TaxCertificate documents */ ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Tax certificates retrieved successfully"
}
```

---

#### GET /tax-certificates/:id
Get a single tax certificate (populated with `donationId`).

- **Auth:** Required
- **Roles:** All authenticated users

**Response (200):** Single TaxCertificate document.

---

### 2.5 Donor Wall

#### POST /donor-wall
Add an entry to the donor wall for a campaign. Validates that both `campaignId` and `donationId` exist.

- **Auth:** Required
- **Roles:** All authenticated users

**Request body:**

```json
{
  "campaignId": "64c1b2c3d4e5f6a7b8c9d0e2",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "donorName": "Zanele Mbeki",
  "amount": 25000,
  "message": "Keep up the great work!",
  "isPublic": true,
  "donationId": "64b1b2c3d4e5f6a7b8c9d0e6"
}
```

| Field | Type | Validation |
|---|---|---|
| `campaignId` | string | Required, 24-char hex ObjectId |
| `schoolId` | string | Required, 24-char hex ObjectId |
| `donorName` | string | Required, min length 1 |
| `amount` | integer | Required, positive (cents) |
| `message` | string | Optional |
| `isPublic` | boolean | Optional, defaults to `true` |
| `donationId` | string | Required, 24-char hex ObjectId |

**Response (201):** New DonorWall document.

---

### 2.6 Recurring Donations

#### POST /recurring-donations
Set up a scheduled recurring donation.

- **Auth:** Required
- **Roles:** All authenticated users

**Request body:**

```json
{
  "campaignId": "64c1b2c3d4e5f6a7b8c9d0e2",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "donorName": "James Botha",
  "donorEmail": "james@example.com",
  "amount": 10000,
  "frequency": "monthly",
  "nextChargeDate": "2026-04-01T00:00:00.000Z"
}
```

| Field | Type | Validation |
|---|---|---|
| `campaignId` | string | Required, 24-char hex ObjectId |
| `schoolId` | string | Required, 24-char hex ObjectId |
| `donorName` | string | Required, min length 1 |
| `donorEmail` | string | Required, valid email |
| `amount` | integer | Required, positive (cents) |
| `frequency` | enum | Required: `"monthly"` or `"weekly"` |
| `nextChargeDate` | string | Required, ISO 8601 datetime |

**Response (201):** New RecurringDonation document.

**Error:** 404 if `campaignId` not found.

---

#### GET /recurring-donations
List recurring donations.

- **Auth:** Required
- **Roles:** All authenticated users

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Optional; falls back to `req.user.schoolId` |
| `campaignId` | string | Optional filter |
| `isActive` | string | Optional: `"true"` or `"false"` |
| `page` | number | Optional |
| `limit` | number | Optional |

Populated with `campaignId.title`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "recurringDonations": [ /* RecurringDonation documents */ ],
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Recurring donations retrieved successfully"
}
```

---

#### GET /recurring-donations/:id
Get a single recurring donation (populated with `campaignId.title`).

- **Auth:** Required
- **Roles:** All authenticated users

**Response (200):** Single RecurringDonation document.

---

#### PATCH /recurring-donations/:id/cancel
Cancel an active recurring donation (`isActive: false`). Fails if the donation is already inactive.

- **Auth:** Required
- **Roles:** All authenticated users

**Response (200):** Updated RecurringDonation document.

**Error:** 404 if not found or already inactive.

---

#### POST /recurring-donations/process
Batch-process all due recurring donations. For each due record:
1. Verifies the linked campaign is still active.
2. Creates a Donation record (message: `"Recurring {frequency} donation"`).
3. Increments `campaign.raisedAmount`.
4. Advances `nextChargeDate` (+7 days for weekly, +1 month for monthly).
5. Updates `lastChargedDate` and increments `totalCharged`.
6. If campaign is gone/inactive, the recurring donation is deactivated and counted as failed.

- **Auth:** Required
- **Roles:** `super_admin` only

**Response (200):**

```json
{
  "success": true,
  "data": {
    "processed": 5,
    "failed": 1,
    "donations": [ /* Donation documents created in this run */ ]
  },
  "message": "Recurring donations processed successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Admin Fundraising Page
**Path:** `/admin/fundraising`
**File:** `src/app/(dashboard)/admin/fundraising/page.tsx`

Single-page management hub using a three-tab layout:

**Summary stat cards (top row):**
- Active Campaigns (count of `status === 'active'`)
- Total Raised (sum of `raisedAmount` across all campaigns, formatted as currency)
- Total Donors (sum of `donorCount` across all campaigns)
- Campaigns (total count with completed sub-label)

**Tab 1 — Campaigns:**
- Grid of CampaignCards (2-column on sm+)
- Each card shows: title, type badge, status badge, description, raised/target amounts, progress bar, donor count, date range
- "New Campaign" button in PageHeader opens a dialog form

**Tab 2 — Donations:**
- DataTable with columns: Donor, Campaign, Amount, Date, Tax Cert action button
- Searchable by `donorName`
- "Tax Cert" button per row triggers Section 18A certificate generation

**Tab 3 — Raffles:**
- DataTable with columns: Raffle name, Ticket Price, Tickets Sold, Revenue, Draw Date, Status/Winner, Draw Winner action
- "Draw Winner" button visible only for raffles with `status === 'selling'`

**Create Campaign dialog fields:**
- Campaign Name (text input)
- Description (textarea)
- Target Amount in Rands (number input; must be converted to cents on submit)
- Campaign Type (select: General | Raffle | Walkathon)
- Start Date (date input)
- End Date (date input)

**Current state:** Page uses mock data (`mockCampaigns`, `mockDonations`, `mockRaffles`). API wiring is not yet implemented.

---

## 4. User Flows

### 4.1 Create Campaign
1. Admin clicks "New Campaign" in the page header.
2. Dialog opens with form fields: name, description, target amount (Rands), campaign type, start date, end date.
3. On submit: convert target amount from Rands to cents (`amount * 100`), POST to `/campaigns` with `schoolId` from auth context.
4. On success: close dialog, toast "Campaign created!", refetch campaigns list.

### 4.2 Record a Donation
1. Admin opens the Donations tab or a dedicated donation form.
2. Selects the campaign from a dropdown (populated from `/campaigns`).
3. Enters donor name, optional email, amount (Rands), optional message, anonymous toggle.
4. Submit: convert amount to cents, POST to `/donations`.
5. On success: `campaign.raisedAmount` auto-updates server-side; refetch campaign progress.
6. Optionally: immediately prompt admin to add the donor to the Donor Wall.

### 4.3 Track Campaign Progress
1. Admin views the Campaigns tab — each card shows a `<Progress>` bar with percentage.
2. For live percentage, call GET `/campaigns/:campaignId/progress` to get server-computed `percentageComplete`.
3. Bar fills proportionally to `raisedAmount / targetAmount * 100`, capped at 100%.

### 4.4 Run a Raffle
1. Admin creates a raffle via POST `/raffles`, linking it to a campaign and defining prizes.
2. Parents purchase tickets via POST `/raffles/buy-tickets` (linked to their `parentId` and `studentId`).
3. On draw date, admin clicks "Draw Winner" — POST `/raffles/:id/draw`.
4. Winners array is returned; admin records and notifies winners.
5. Raffle `winnersDrawn` is set to `true`; "Draw Winner" button disappears.

### 4.5 Generate a Tax Certificate
1. Admin locates a donation in the Donations tab.
2. Clicks "Tax Cert" button — this opens a form requesting `donorIdNumber`, `donorAddress`, and `schoolTaxNumber`.
3. Submit: POST to `/tax-certificates`.
4. Certificate is created with auto-generated number (`S18A-{suffix}-{YYYYMM}-{seq}`).
5. Admin can retrieve it via GET `/tax-certificates/:id` for printing or PDF export.

### 4.6 Close a Campaign
1. Admin opens campaign detail / edit dialog.
2. Sets `isActive: false` via PUT `/campaigns/:id`.
3. Any active recurring donations linked to this campaign are automatically deactivated when the next `/recurring-donations/process` run occurs.

### 4.7 Manage Recurring Donations
1. Donor (or admin on their behalf) sets up a recurring donation via POST `/recurring-donations`, specifying `frequency` and `nextChargeDate`.
2. A scheduled job (cron or manual trigger) calls POST `/recurring-donations/process` as `super_admin`.
3. All overdue recurring donations are processed; new Donation documents are created and campaign amounts updated.
4. If a donor wishes to cancel, PATCH `/recurring-donations/:id/cancel`.

### 4.8 View Donor Wall
1. Any authenticated user can view the public donor wall for a campaign via GET `/campaigns/:campaignId/donor-wall`.
2. Entries are filtered to `isPublic: true` and sorted by `amount` descending.
3. Anonymous donations should not be added to the donor wall, or `donorName` should be set to "Anonymous" if added.

---

## 5. Data Models

### 5.1 Campaign

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `title` | string | Yes | — | Trimmed |
| `description` | string | No | — | |
| `schoolId` | ObjectId | Yes | — | Ref: `School` |
| `targetAmount` | number (int) | Yes | — | Cents |
| `raisedAmount` | number (int) | No | `0` | Auto-managed via donations |
| `startDate` | Date | Yes | — | |
| `endDate` | Date | Yes | — | |
| `isActive` | boolean | No | `true` | |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ schoolId, isActive }`, `{ schoolId, startDate: -1 }`

---

### 5.2 Donation

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `campaignId` | ObjectId | Yes | — | Ref: `Campaign` |
| `schoolId` | ObjectId | Yes | — | Ref: `School` |
| `donorName` | string | Yes | — | Trimmed |
| `donorEmail` | string | No | — | Trimmed |
| `amount` | number (int) | Yes | — | Cents |
| `message` | string | No | — | |
| `isAnonymous` | boolean | No | `false` | |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ campaignId, createdAt: -1 }`, `{ schoolId, createdAt: -1 }`

**Side effects:** Creating a donation increments `Campaign.raisedAmount` by `amount`. Deleting a donation decrements `Campaign.raisedAmount` by `amount`.

---

### 5.3 Raffle

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `campaignId` | ObjectId | Yes | — | Ref: `Campaign` |
| `ticketPrice` | number (int) | Yes | — | Cents |
| `totalTickets` | number (int) | Yes | — | |
| `soldTickets` | number (int) | No | `0` | Auto-managed |
| `drawDate` | Date | Yes | — | |
| `prizes` | IRafflePrize[] | No | `[]` | Embedded subdocuments |
| `winnersDrawn` | boolean | No | `false` | |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Index:** `{ campaignId }`

#### IRafflePrize (embedded, no `_id`)

| Field | Type | Required |
|---|---|---|
| `place` | number (int+) | Yes |
| `description` | string | Yes |
| `value` | number (int+) | Yes (cents) |

---

### 5.4 RaffleTicket

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `raffleId` | ObjectId | Yes | — | Ref: `Raffle` |
| `parentId` | ObjectId | Yes | — | Ref: `Parent` |
| `studentId` | ObjectId | Yes | — | Ref: `Student` |
| `ticketNumber` | string | Yes | — | Format: `RAFFLE-{raffleId-last6}-{00001}` |
| `purchasedAt` | Date | No | `new Date()` | |
| `isWinner` | boolean | No | `false` | Set during draw |
| `prizePlace` | number | No | — | Set during draw |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ raffleId, ticketNumber }` (unique), `{ parentId }`

---

### 5.5 TaxCertificate

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `donationId` | ObjectId | Yes | — | Ref: `Donation`; one cert per donation |
| `schoolId` | ObjectId | Yes | — | Ref: `School` |
| `certificateNumber` | string | Yes | — | Unique; format: `S18A-{schoolId-last6}-{YYYYMM}-{0001}` |
| `donorName` | string | Yes | — | Trimmed |
| `donorIdNumber` | string | No | — | SA ID / passport |
| `donorAddress` | string | No | — | |
| `amount` | number (int) | Yes | — | Copied from Donation (cents) |
| `dateIssued` | Date | Yes | — | Server-set at creation time |
| `schoolTaxNumber` | string | Yes | — | SARS income tax number |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ certificateNumber }` (unique), `{ donationId }`

---

### 5.6 DonorWall

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `campaignId` | ObjectId | Yes | — | Ref: `Campaign` |
| `schoolId` | ObjectId | Yes | — | Ref: `School` |
| `donorName` | string | Yes | — | Trimmed |
| `amount` | number (int) | Yes | — | Cents |
| `message` | string | No | — | |
| `isPublic` | boolean | No | `true` | Only public entries are listed |
| `donationId` | ObjectId | Yes | — | Ref: `Donation` |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Index:** `{ campaignId, isPublic }`

---

### 5.7 RecurringDonation

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `campaignId` | ObjectId | Yes | — | Ref: `Campaign` |
| `schoolId` | ObjectId | Yes | — | Ref: `School` |
| `donorName` | string | Yes | — | Trimmed |
| `donorEmail` | string | Yes | — | Trimmed |
| `amount` | number (int) | Yes | — | Cents, charged each cycle |
| `frequency` | enum | Yes | — | `"monthly"` or `"weekly"` |
| `isActive` | boolean | No | `true` | |
| `nextChargeDate` | Date | Yes | — | Advances after each successful charge |
| `lastChargedDate` | Date | No | — | Set after each successful charge |
| `totalCharged` | number (int) | No | `0` | Cumulative cents charged |
| `isDeleted` | boolean | No | `false` | Soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ schoolId, isActive }`, `{ nextChargeDate }`

---

## 6. State Management

The fundraising module requires a dedicated Zustand store (or React Query integration). The following outlines the recommended store shape:

```ts
interface FundraisingStore {
  // Campaigns
  campaigns: Campaign[];
  campaignsLoading: boolean;
  campaignsPagination: PaginationMeta;
  fetchCampaigns: (query?: ListCampaignsQuery) => Promise<void>;
  createCampaign: (data: CreateCampaignInput) => Promise<Campaign>;
  updateCampaign: (id: string, data: UpdateCampaignInput) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
  getCampaignProgress: (id: string) => Promise<CampaignProgress>;

  // Donations
  donations: Donation[];
  donationsLoading: boolean;
  donationsPagination: PaginationMeta;
  fetchDonations: (query?: ListDonationsQuery) => Promise<void>;
  recordDonation: (data: CreateDonationInput) => Promise<Donation>;
  deleteDonation: (id: string) => Promise<void>;

  // Raffles
  raffles: Raffle[];
  rafflesLoading: boolean;
  createRaffle: (data: CreateRaffleInput) => Promise<Raffle>;
  buyTickets: (data: BuyRaffleTicketsInput) => Promise<RaffleTicket[]>;
  drawWinners: (raffleId: string) => Promise<RaffleTicket[]>;
  fetchTicketsByParent: (parentId: string, raffleId?: string) => Promise<RaffleTicket[]>;

  // Tax Certificates
  taxCertificates: TaxCertificate[];
  taxCertificatesLoading: boolean;
  taxCertificatesPagination: PaginationMeta;
  fetchTaxCertificates: (query?: ListTaxCertsQuery) => Promise<void>;
  generateTaxCertificate: (data: GenerateTaxCertificateInput) => Promise<TaxCertificate>;

  // Donor Wall
  donorWallEntries: DonorWall[];
  donorWallLoading: boolean;
  fetchDonorWall: (campaignId: string, query?: PaginationQuery) => Promise<void>;
  addDonorWallEntry: (data: AddDonorWallInput) => Promise<DonorWall>;

  // Recurring Donations
  recurringDonations: RecurringDonation[];
  recurringLoading: boolean;
  fetchRecurringDonations: (query?: ListRecurringQuery) => Promise<void>;
  createRecurringDonation: (data: CreateRecurringDonationInput) => Promise<RecurringDonation>;
  cancelRecurringDonation: (id: string) => Promise<RecurringDonation>;
  processRecurringDonations: () => Promise<ProcessResult>;

  // UI state
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  createCampaignDialogOpen: boolean;
  setCreateCampaignDialogOpen: (open: boolean) => void;
}
```

**Key state patterns:**
- Optimistic updates on campaign `raisedAmount` after recording a donation (or invalidate and refetch).
- After `drawWinners`, update the local raffle record's `winnersDrawn` flag without a full refetch.
- The `selectedCampaignId` drives filtering: donation list, donor wall, and raffle list should all filter to the selected campaign.

---

## 7. Components Needed

### 7.1 Page-level Components

| Component | Location | Purpose |
|---|---|---|
| `FundraisingPage` | `admin/fundraising/page.tsx` | Top-level page; hosts stat cards and tabs |

### 7.2 Campaign Components

| Component | Props | Purpose |
|---|---|---|
| `CampaignCard` | `campaign: Campaign` | Card with title, type/status badges, description, raised/target, progress bar, donor count, date range |
| `CreateCampaignDialog` | `open`, `onOpenChange`, `onSuccess` | Form dialog for creating a new campaign; converts Rands to cents on submit |
| `EditCampaignDialog` | `campaign`, `open`, `onOpenChange`, `onSuccess` | Pre-filled form for updating a campaign |
| `CampaignProgressBar` | `raisedAmount`, `targetAmount` | Wrapper around `<Progress>` with label showing % and amounts |
| `CampaignStatusBadge` | `status: 'active' | 'completed' | 'upcoming'` | Colour-coded badge |
| `CampaignTypeBadge` | `type: 'general' | 'raffle' | 'walkathon'` | Colour-coded badge |

### 7.3 Donation Components

| Component | Props | Purpose |
|---|---|---|
| `DonationForm` | `campaignId?`, `onSuccess` | Form to record a one-off donation (donor name, email, amount, message, anonymous toggle) |
| `DonationsTable` | `campaignId?` | DataTable of donations, searchable, with Tax Cert action button per row |
| `RecordDonationDialog` | `open`, `onOpenChange`, `campaignId?` | Wraps `DonationForm` in a Dialog |
| `AnonymousBadge` | `isAnonymous` | Renders "Anonymous" label when applicable |

### 7.4 Raffle Components

| Component | Props | Purpose |
|---|---|---|
| `RafflesTable` | `campaignId?` | DataTable of raffles with sold/total tickets, revenue, draw date, status, and Draw Winner button |
| `CreateRaffleDialog` | `campaignId`, `open`, `onOpenChange`, `onSuccess` | Form dialog: ticket price, total tickets, draw date, prizes array |
| `PrizeList` | `prizes: IRafflePrize[]` | Editable list of prize entries in CreateRaffleDialog |
| `BuyTicketsDialog` | `raffle`, `open`, `onOpenChange` | Quantity selector for parents to purchase tickets |
| `DrawWinnersButton` | `raffleId`, `disabled` | Triggers draw with confirmation; shows results |
| `TicketNumberBadge` | `ticketNumber` | Displays formatted ticket number |

### 7.5 Tax Certificate Components

| Component | Props | Purpose |
|---|---|---|
| `TaxCertificateForm` | `donationId`, `schoolId`, `donorName`, `onSuccess` | Form for `donorIdNumber`, `donorAddress`, `schoolTaxNumber`; calls POST `/tax-certificates` |
| `TaxCertificateDialog` | `donation`, `open`, `onOpenChange` | Wraps `TaxCertificateForm` in a Dialog |
| `TaxCertificatesTable` | — | DataTable of certificates with cert number, donor, amount, date; printable link |
| `CertificateNumberDisplay` | `certificateNumber` | Formats and displays the `S18A-...` number |

### 7.6 Donor Wall Components

| Component | Props | Purpose |
|---|---|---|
| `DonorWall` | `campaignId` | Paginated list of public donor wall entries, sorted by amount |
| `DonorWallEntry` | `entry: DonorWall` | Single entry row: donor name, amount, optional message |
| `AddToDonorWallDialog` | `donation`, `campaignId`, `open`, `onOpenChange` | Allows admin to add a donor wall entry after recording a donation |

### 7.7 Recurring Donation Components

| Component | Props | Purpose |
|---|---|---|
| `RecurringDonationsTable` | `campaignId?` | DataTable: donor, amount, frequency, next charge date, status, cancel button |
| `CreateRecurringDonationDialog` | `campaignId`, `open`, `onOpenChange` | Form: donor name, email, amount, frequency select, next charge date |
| `CancelRecurringButton` | `recurringId` | Confirm-and-cancel button |
| `ProcessRecurringButton` | — | Super-admin-only button to trigger batch processing |

### 7.8 Shared/Utility Components (re-use existing)

- `PageHeader` — title + description + action slot
- `StatCard` — metric card (icon, value, title, description)
- `DataTable` — sortable, searchable table
- `Progress` — shadcn/ui progress bar
- `Badge` — status and type badges
- `Dialog` / `DialogTrigger` / `DialogContent` — all forms should use existing dialog primitives
- `formatCurrency` / `formatDate` — utilities from `@/lib/utils`

---

## 8. Integration Notes

### 8.1 Wallet Integration
- The backend does not currently deduct from a parent's Wallet balance when a donation or raffle ticket purchase is made. The Donation model stores a `donorName` and optional `donorEmail` but has no `walletTransactionId` reference.
- If wallet payment for donations/tickets is required in future, a `walletTransactionId` field should be added to `Donation` and `RaffleTicket`, and the Wallet service's `debit` method should be called within the same transaction.
- For now, all monetary flows are **recorded-only** — no actual payment processing occurs in this module.

### 8.2 Parent Portal Integration
- Parents are referenced in `RaffleTicket.parentId` and `RaffleTicket.studentId`.
- GET `/raffles/tickets/parent/:parentId` is available for the parent portal to show a parent's ticket history.
- A parent-facing fundraising page should list active campaigns and allow ticket purchases.
- Recurring donations reference `donorEmail` only, not a `parentId` — there is no direct link from a parent account to their recurring donations in the current model.

### 8.3 Notification Integration
- The backend has no notification triggers in the Fundraising module at present.
- Recommended notification events to wire up:
  - Campaign goes live → notify parents
  - Donation recorded → email receipt to `donorEmail` if provided
  - Raffle winners drawn → notify winning parents
  - Recurring donation processed → email receipt
  - Tax certificate generated → email certificate to donor
- These should be implemented by calling the Notification service from within the Fundraising service after the primary operation succeeds.

### 8.4 School Context
- `schoolId` is passed explicitly in request bodies for campaign/donation/raffle creation.
- For list endpoints, `schoolId` falls back to `req.user.schoolId` — ensure the auth middleware sets `req.user.schoolId` correctly for all roles.
- The `TaxCertificate.schoolTaxNumber` must be populated from the school's profile (School module) and pre-filled in the tax cert form.

### 8.5 Amount Convention
- All amounts throughout the module are stored as **integer cents**.
- The frontend must multiply user-entered Rand values by 100 before sending to the API.
- All display should use `formatCurrency(amountInCents)` from `@/lib/utils`.
- The `createCampaignSchema` and `createDonationSchema` both enforce `z.number().int().positive()` — non-integer values will be rejected.

### 8.6 Soft Deletes
- All models use `isDeleted: false` as the active-record flag.
- All service queries include `isDeleted: false` in filters.
- No hard-delete endpoints exist; DELETE routes perform soft deletes only.
- Deleting a Donation also decrements `Campaign.raisedAmount` — this must remain atomic in future refactors.

---

## 9. Acceptance Criteria

### 9.1 Campaigns
- [ ] Admin can create a campaign with all required fields; `raisedAmount` starts at 0.
- [ ] Campaign list is scoped to the admin's school by default.
- [ ] Progress bar on CampaignCard reflects live `raisedAmount / targetAmount`.
- [ ] Admin can update campaign title, description, target, dates, and `isActive` status.
- [ ] Deleting a campaign soft-deletes it; it no longer appears in the list.
- [ ] Campaigns with `isActive: false` are visually distinguished (status badge).

### 9.2 Donations
- [ ] Recording a donation increments the linked campaign's `raisedAmount` immediately.
- [ ] Deleting a donation decrements the campaign's `raisedAmount` by the exact amount.
- [ ] Anonymous donations display "Anonymous" in the donor column.
- [ ] Donations table is filterable by campaign and searchable by donor name.
- [ ] Donation list is paginated and sorted newest-first.

### 9.3 Raffles
- [ ] Admin can create a raffle with ticket price, total tickets, draw date, and prizes.
- [ ] Ticket purchase enforces the `soldTickets + quantity <= totalTickets` cap.
- [ ] Ticket numbers are generated in the format `RAFFLE-{raffleId-last6}-{00001}`.
- [ ] Draw Winners button is hidden once `winnersDrawn` is `true`.
- [ ] Draw uses Fisher-Yates shuffle; one winner per prize place.
- [ ] Parents can view their own tickets via the parent portal endpoint.

### 9.4 Tax Certificates
- [ ] Only one certificate can be issued per donation (400 error on duplicate).
- [ ] Certificate number follows the `S18A-{suffix}-{YYYYMM}-{seq}` format.
- [ ] `amount` on the certificate equals the donation's `amount` (cannot be overridden by input).
- [ ] Certificates are retrievable by school and searchable by donor name.
- [ ] Certificate detail includes the full donation record (populated).

### 9.5 Donor Wall
- [ ] Only entries with `isPublic: true` are returned by the list endpoint.
- [ ] Entries are sorted by `amount` descending.
- [ ] Both `campaignId` and `donationId` must exist before an entry can be added.
- [ ] Donor wall is viewable per campaign.

### 9.6 Recurring Donations
- [ ] Recurring donation requires a valid `frequency` of `"monthly"` or `"weekly"`.
- [ ] `donorEmail` is required (unlike one-off donations where it is optional).
- [ ] Cancelling sets `isActive: false`; the record is not deleted.
- [ ] Process endpoint only accessible to `super_admin`.
- [ ] Processing advances `nextChargeDate` correctly: +7 days (weekly), +1 calendar month (monthly).
- [ ] If a campaign is inactive or deleted during processing, the recurring donation is deactivated and counted as failed (not as a processed donation).
- [ ] `totalCharged` is correctly accumulated across all processing runs.

### 9.7 Frontend
- [ ] Campaign cards render progress bars with correct percentage values.
- [ ] Create Campaign dialog converts Rand input to cents before API call.
- [ ] "Tax Cert" button opens a form that POSTs to `/tax-certificates` (not a mock toast).
- [ ] "Draw Winner" button POSTs to `/raffles/:id/draw` and updates table state.
- [ ] All currency values displayed using `formatCurrency` utility.
- [ ] All date values displayed using `formatDate` utility.
- [ ] Empty states shown when no campaigns, donations, or raffles exist.
- [ ] Loading spinners shown during all async API calls.
- [ ] Error toasts shown on API failure with the server's error message.

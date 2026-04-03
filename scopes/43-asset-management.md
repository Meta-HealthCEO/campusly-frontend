# 43 — Asset & Device Management

## 1. Module Overview

The Asset & Device Management module provides a complete asset register for schools, tracking all physical assets from procurement to disposal. South African schools manage a diverse asset base: IT equipment (laptops, tablets, projectors), furniture, laboratory equipment, sports equipment, musical instruments, library resources, and vehicles. This module provides lifecycle management, assignment tracking, maintenance scheduling, depreciation calculation, and insurance tracking.

### Core Capabilities

| Capability | Description |
|---|---|
| Asset Register | Full inventory with categories, locations, and metadata |
| Asset Categories | Hierarchical grouping: IT Equipment, Furniture, Lab Equipment, etc. |
| Asset Lifecycle | Procurement → In Service → Under Repair → Disposed |
| Location Tracking | Buildings, floors, rooms, departments |
| Assignment | Assign assets to rooms, teachers, departments, or classes |
| Check-Out/Check-In | Temporary assignment for portable assets (laptops, projectors) |
| Maintenance | Scheduled and ad-hoc maintenance with history tracking |
| Depreciation | Straight-line depreciation for financial reporting |
| QR Codes | Generate QR labels for physical asset tagging |
| Loss/Damage Reporting | Incident recording with responsible party tracking |
| Insurance | Policy details, coverage, and expiry tracking per asset group |
| Reports | Asset value, replacement schedule, maintenance costs |

### Roles and Access

| Role | Access |
|---|---|
| `school_admin` | Full read/write — register assets, manage maintenance, run reports |
| `super_admin` | Full access across all schools |
| `teacher` | View assigned assets, check-out/check-in portable assets, report damage |
| `staff` | View assigned assets, report damage |

All collections use soft-delete (`isDeleted: boolean`). All monetary values are stored as **integers in cents** (ZAR).

---

## 2. Backend API Endpoints

All routes are mounted under `/api/assets`. Authentication is required on every route via the `authenticate` middleware.

---

### 2.1 Asset Categories

#### POST /api/assets/categories

Create an asset category.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "name": "IT Equipment",
  "code": "IT",
  "parentId": null,
  "description": "Computers, tablets, projectors, and networking equipment",
  "depreciationRate": 33.33,
  "usefulLifeYears": 3
}
```

**Validation:** `createAssetCategorySchema` (Zod)
- `name`: required, min 1 char
- `code`: required, min 1 char, unique within school
- `parentId`: optional, ObjectId — for subcategories
- `depreciationRate`: optional, number 0-100 (annual % for straight-line)
- `usefulLifeYears`: optional, positive integer

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664b2g3h4i5j6k7l8m9n0o1p",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "name": "IT Equipment",
    "code": "IT",
    "parentId": null,
    "description": "Computers, tablets, projectors, and networking equipment",
    "depreciationRate": 33.33,
    "usefulLifeYears": 3,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Asset category created successfully"
}
```

---

#### GET /api/assets/categories

List all asset categories for the school with subcategories nested.

**Auth:** `school_admin`, `super_admin`, `teacher`, `staff`

**Query params:** `schoolId`

---

#### PUT /api/assets/categories/:id

Update a category.

**Auth:** `school_admin`, `super_admin`

---

#### DELETE /api/assets/categories/:id

Soft-delete a category. Fails if assets are linked to it.

**Auth:** `school_admin`, `super_admin`

---

#### POST /api/assets/categories/seed

Seed default asset categories for a school.

**Auth:** `school_admin`, `super_admin`

**Request body:** `{ "schoolId": "..." }`

**Default categories:**
| Code | Name | Depreciation Rate | Useful Life |
|---|---|---|---|
| IT | IT Equipment | 33.33% | 3 years |
| IT-LAPTOP | Laptops | 33.33% | 3 years |
| IT-TABLET | Tablets | 33.33% | 3 years |
| IT-PROJ | Projectors | 20% | 5 years |
| IT-NET | Networking | 20% | 5 years |
| FURN | Furniture | 10% | 10 years |
| FURN-DESK | Desks & Chairs | 10% | 10 years |
| FURN-STORE | Storage & Shelving | 10% | 10 years |
| LAB | Laboratory Equipment | 20% | 5 years |
| SPORT | Sports Equipment | 25% | 4 years |
| MUSIC | Musical Instruments | 10% | 10 years |
| VEHICLE | Vehicles | 20% | 5 years |
| KITCHEN | Kitchen Equipment | 20% | 5 years |
| AV | Audio Visual | 20% | 5 years |
| OTHER | Other Assets | 20% | 5 years |

---

### 2.2 Locations

#### POST /api/assets/locations

Create a location (building, room, or area).

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "name": "Block A — Room 102",
  "type": "room",
  "building": "Block A",
  "floor": "1",
  "department": "Science",
  "description": "Physical Science laboratory"
}
```

**Validation:** `createLocationSchema` (Zod)
- `name`: required, min 1 char
- `type`: required, enum: `building` | `room` | `hall` | `field` | `storage` | `office` | `other`
- `building`: optional
- `floor`: optional
- `department`: optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664c3h4i...",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "name": "Block A — Room 102",
    "type": "room",
    "building": "Block A",
    "floor": "1",
    "department": "Science",
    "description": "Physical Science laboratory",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Location created successfully"
}
```

---

#### GET /api/assets/locations

List all locations.

**Auth:** Any authenticated user

**Query params:** `schoolId`, `type`, `building`, `department`

---

#### PUT /api/assets/locations/:id

Update a location.

---

#### DELETE /api/assets/locations/:id

Soft-delete a location.

---

### 2.3 Assets

#### POST /api/assets

Register a new asset.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "categoryId": "664b2g3h4i5j6k7l8m9n0o1p",
  "name": "Dell Latitude 5540 Laptop",
  "assetTag": "CAMP-IT-2026-001",
  "serialNumber": "DLLT5540-ABC123",
  "make": "Dell",
  "model": "Latitude 5540",
  "description": "15-inch laptop, i7, 16GB RAM, 512GB SSD",
  "purchaseDate": "2026-03-15",
  "purchasePrice": 1899900,
  "warrantyExpiry": "2029-03-15",
  "vendor": "Tarsus Distribution",
  "invoiceReference": "INV-TAR-2026-0088",
  "locationId": "664c3h4i...",
  "status": "in_service",
  "condition": "new",
  "isPortable": true,
  "imageUrl": null,
  "notes": "Allocated to Mathematics HOD"
}
```

**Validation:** `createAssetSchema` (Zod)
- `categoryId`: required, ObjectId
- `name`: required, min 1 char
- `assetTag`: required, unique within school
- `serialNumber`: optional, unique within school if provided
- `make`: optional
- `model`: optional
- `purchaseDate`: optional, ISO date
- `purchasePrice`: optional, positive integer (cents)
- `warrantyExpiry`: optional, ISO date
- `vendor`: optional
- `invoiceReference`: optional
- `locationId`: optional, ObjectId
- `status`: required, enum: `procured` | `in_service` | `under_repair` | `disposed` | `lost` | `stolen`
- `condition`: optional, enum: `new` | `good` | `fair` | `poor` | `damaged`
- `isPortable`: optional, boolean, default `false`
- `imageUrl`: optional
- `notes`: optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664d4i5j6k7l8m9n0o1p2q3r",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "categoryId": { "_id": "664b2g3h...", "name": "Laptops", "code": "IT-LAPTOP" },
    "name": "Dell Latitude 5540 Laptop",
    "assetTag": "CAMP-IT-2026-001",
    "serialNumber": "DLLT5540-ABC123",
    "make": "Dell",
    "model": "Latitude 5540",
    "description": "15-inch laptop, i7, 16GB RAM, 512GB SSD",
    "purchaseDate": "2026-03-15T00:00:00.000Z",
    "purchasePrice": 1899900,
    "currentValue": 1899900,
    "warrantyExpiry": "2029-03-15T00:00:00.000Z",
    "vendor": "Tarsus Distribution",
    "invoiceReference": "INV-TAR-2026-0088",
    "locationId": { "_id": "664c3h4i...", "name": "Block A — Room 102" },
    "status": "in_service",
    "condition": "new",
    "isPortable": true,
    "assignedTo": null,
    "assignedToType": null,
    "imageUrl": null,
    "notes": "Allocated to Mathematics HOD",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Asset registered successfully"
}
```

---

#### GET /api/assets

List all assets with filters and pagination.

**Auth:** `school_admin`, `super_admin`, `teacher` (sees assigned only), `staff` (sees assigned only)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Falls back to `req.user.schoolId` |
| `categoryId` | string | Filter by category |
| `locationId` | string | Filter by location |
| `status` | string | Filter by status |
| `condition` | string | Filter by condition |
| `isPortable` | boolean | Filter portable assets |
| `assignedTo` | string | Filter by assigned user/department |
| `search` | string | Search asset name, tag, serial number |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assets": [ /* array of asset objects with populated category and location */ ],
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  },
  "message": "Assets retrieved successfully"
}
```

---

#### GET /api/assets/:id

Get a single asset with full history.

---

#### PUT /api/assets/:id

Update an asset.

**Auth:** `school_admin`, `super_admin`

---

#### DELETE /api/assets/:id

Soft-delete an asset.

**Auth:** `school_admin`, `super_admin`

---

### 2.4 Asset Assignment

#### POST /api/assets/:id/assign

Assign an asset to a user, department, room, or class.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "assignedTo": "664a1f2e3b4c5d6e7f8a9b0e",
  "assignedToType": "user",
  "notes": "Issued to Mr. Nkosi for classroom use"
}
```

**Validation:**
- `assignedTo`: required, ObjectId
- `assignedToType`: required, enum: `user` | `department` | `location` | `class`
- `notes`: optional

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "664d4i5j...",
    "assignedTo": { "_id": "664a1f2e...", "firstName": "Thabo", "lastName": "Nkosi" },
    "assignedToType": "user",
    "assignmentHistory": [
      {
        "assignedTo": "664a1f2e...",
        "assignedToType": "user",
        "assignedBy": "664a1f2e3b4c5d6e7f8a9b0d",
        "assignedAt": "2026-04-02T08:00:00.000Z",
        "notes": "Issued to Mr. Nkosi for classroom use"
      }
    ]
  },
  "message": "Asset assigned successfully"
}
```

---

#### POST /api/assets/:id/unassign

Remove the current assignment.

**Auth:** `school_admin`, `super_admin`

---

### 2.5 Check-Out / Check-In

#### POST /api/assets/:id/check-out

Check out a portable asset for temporary use.

**Auth:** `school_admin`, `super_admin`, `teacher`

**Request body:**
```json
{
  "borrowerId": "664a1f2e3b4c5d6e7f8a9b0e",
  "purpose": "Grade 10 Science practical demonstration",
  "expectedReturnDate": "2026-04-05",
  "notes": "Projector needed for Block B Hall"
}
```

**Validation:**
- `borrowerId`: required, ObjectId
- `purpose`: required, min 1 char
- `expectedReturnDate`: required, ISO date (must be in the future)
- `notes`: optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664e5j6k...",
    "assetId": "664d4i5j...",
    "borrowerId": { "_id": "664a1f2e...", "firstName": "Thabo", "lastName": "Nkosi" },
    "checkedOutBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "checkedOutAt": "2026-04-02T08:00:00.000Z",
    "purpose": "Grade 10 Science practical demonstration",
    "expectedReturnDate": "2026-04-05T00:00:00.000Z",
    "checkedInAt": null,
    "checkedInBy": null,
    "conditionOut": "good",
    "conditionIn": null,
    "status": "checked_out",
    "notes": "Projector needed for Block B Hall"
  },
  "message": "Asset checked out successfully"
}
```

**Constraint:** A portable asset can only have one active check-out at a time. Attempting to check out an already checked-out asset returns 400.

---

#### POST /api/assets/:id/check-in

Return a checked-out asset.

**Auth:** `school_admin`, `super_admin`, `teacher`

**Request body:**
```json
{
  "conditionIn": "good",
  "notes": "Returned in good condition"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "664e5j6k...",
    "status": "returned",
    "checkedInAt": "2026-04-05T14:00:00.000Z",
    "checkedInBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "conditionIn": "good"
  },
  "message": "Asset checked in successfully"
}
```

---

#### GET /api/assets/check-outs

List all active and past check-outs.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `status` (`checked_out` | `returned` | `overdue`), `assetId`, `borrowerId`, `page`, `limit`

---

### 2.6 Maintenance

#### POST /api/assets/:id/maintenance

Schedule or record a maintenance event.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "type": "repair",
  "description": "Replace cracked screen",
  "vendor": "iRepair SA",
  "cost": 450000,
  "scheduledDate": "2026-04-10",
  "completedDate": null,
  "status": "scheduled",
  "notes": "Screen cracked during transport"
}
```

**Validation:** `createMaintenanceSchema` (Zod)
- `type`: required, enum: `repair` | `service` | `upgrade` | `inspection`
- `description`: required, min 1 char
- `vendor`: optional
- `cost`: optional, positive integer (cents)
- `scheduledDate`: optional, ISO date
- `completedDate`: optional, ISO date
- `status`: required, enum: `scheduled` | `in_progress` | `completed` | `cancelled`
- `notes`: optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664f6k7l...",
    "assetId": "664d4i5j...",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "type": "repair",
    "description": "Replace cracked screen",
    "vendor": "iRepair SA",
    "cost": 450000,
    "scheduledDate": "2026-04-10T00:00:00.000Z",
    "completedDate": null,
    "status": "scheduled",
    "createdBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "notes": "Screen cracked during transport"
  },
  "message": "Maintenance record created successfully"
}
```

---

#### GET /api/assets/:id/maintenance

Get maintenance history for an asset.

---

#### PUT /api/assets/maintenance/:id

Update a maintenance record (status, cost, completion date).

---

#### GET /api/assets/maintenance/upcoming

List all upcoming scheduled maintenance across all assets.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `days` (number of days ahead, default 30)

---

### 2.7 Loss/Damage Reports

#### POST /api/assets/:id/incidents

Report a loss, damage, or theft incident.

**Auth:** `school_admin`, `super_admin`, `teacher`, `staff`

**Request body:**
```json
{
  "type": "damage",
  "description": "Laptop dropped — screen cracked and keyboard damaged",
  "date": "2026-04-01",
  "responsiblePartyId": "664a1f2e3b4c5d6e7f8a9b0e",
  "estimatedCost": 450000,
  "images": []
}
```

**Validation:**
- `type`: required, enum: `damage` | `loss` | `theft` | `vandalism`
- `description`: required, min 1 char
- `date`: required, ISO date
- `responsiblePartyId`: optional, ObjectId
- `estimatedCost`: optional, positive integer (cents)
- `images`: optional, array of URL strings

---

#### GET /api/assets/incidents

List all incidents.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `type`, `assetId`, `status` (`reported` | `investigating` | `resolved`), `page`, `limit`

---

#### PUT /api/assets/incidents/:id

Update an incident (status, resolution, actual cost).

**Auth:** `school_admin`, `super_admin`

---

### 2.8 QR Code Generation

#### GET /api/assets/:id/qr-code

Generate a QR code for the asset label.

**Auth:** `school_admin`, `super_admin`

**Response:** PNG image containing a QR code that encodes the asset's detail URL: `https://{domain}/admin/assets/{assetId}`.

---

#### POST /api/assets/qr-codes/batch

Generate QR codes for multiple assets (PDF sheet for printing).

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "assetIds": ["664d4i5j...", "664d4i5k...", "664d4i5l..."]
}
```

**Response:** PDF file with QR code labels (multiple per page, includes asset tag and name below each code).

---

### 2.9 Depreciation

#### GET /api/assets/depreciation

Calculate current book values for all assets.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `categoryId`, `asOfDate` (ISO date, default today)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "asOfDate": "2026-04-02",
    "totalPurchaseValue": 425000000,
    "totalCurrentValue": 312500000,
    "totalDepreciation": 112500000,
    "byCategory": [
      {
        "categoryName": "IT Equipment",
        "categoryCode": "IT",
        "assetCount": 45,
        "purchaseValue": 180000000,
        "currentValue": 108000000,
        "depreciation": 72000000,
        "depreciationRate": 33.33
      }
    ],
    "assets": [
      {
        "assetId": "664d4i5j...",
        "name": "Dell Latitude 5540 Laptop",
        "assetTag": "CAMP-IT-2026-001",
        "purchaseDate": "2026-03-15",
        "purchasePrice": 1899900,
        "currentValue": 1899900,
        "annualDepreciation": 633234,
        "usefulLifeRemaining": 3
      }
    ]
  }
}
```

Depreciation is calculated using the straight-line method: `annualDepreciation = purchasePrice / usefulLifeYears`. Current value = `purchasePrice - (annualDepreciation * yearsInService)`, floored at 0.

---

### 2.10 Insurance

#### POST /api/assets/insurance

Create or update an insurance policy for an asset group.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "policyNumber": "POL-INS-2026-001",
  "insurer": "Old Mutual Insurance",
  "categoryId": "664b2g3h...",
  "coverageAmount": 500000000,
  "premium": 2500000,
  "premiumFrequency": "monthly",
  "startDate": "2026-01-01",
  "expiryDate": "2026-12-31",
  "excess": 250000,
  "notes": "Covers all IT equipment including accidental damage"
}
```

---

#### GET /api/assets/insurance

List all insurance policies.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`

---

#### GET /api/assets/insurance/expiring

List policies expiring within N days.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `days` (default 60)

---

### 2.11 Reports

#### GET /api/assets/reports/summary

Asset register summary.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalAssets": 156,
    "totalValue": 425000000,
    "byStatus": {
      "in_service": 140,
      "under_repair": 5,
      "disposed": 8,
      "lost": 2,
      "stolen": 1
    },
    "byCategory": [
      { "category": "IT Equipment", "count": 45, "value": 180000000 },
      { "category": "Furniture", "count": 80, "value": 120000000 }
    ],
    "recentAcquisitions": 12,
    "maintenanceDue": 8,
    "overdueCheckouts": 3,
    "insuranceExpiringSoon": 1
  }
}
```

---

#### GET /api/assets/reports/replacement

Assets due for replacement based on useful life.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `withinMonths` (default 12)

---

#### GET /api/assets/reports/maintenance-costs

Maintenance cost summary per category/asset.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`, `categoryId`

---

## 3. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/admin/assets` | Asset Dashboard | Summary cards, alerts (overdue checkouts, expiring insurance, maintenance due) |
| `/admin/assets/register` | Asset Register | Full asset list with filters, search, and CRUD |
| `/admin/assets/register/[id]` | Asset Detail | Single asset: info, assignment, check-out history, maintenance, depreciation |
| `/admin/assets/categories` | Categories | Manage asset categories with depreciation settings |
| `/admin/assets/locations` | Locations | Manage buildings, rooms, and areas |
| `/admin/assets/check-outs` | Check-Outs | Active and past check-outs, overdue tracking |
| `/admin/assets/maintenance` | Maintenance | Scheduled and completed maintenance across all assets |
| `/admin/assets/incidents` | Incidents | Loss/damage reports |
| `/admin/assets/insurance` | Insurance | Policy management and expiry tracking |
| `/admin/assets/reports` | Reports | Depreciation, replacement schedule, maintenance costs, asset value |
| `/admin/assets/qr` | QR Labels | Batch QR code generation and printing |

The admin nav entry is `{ label: 'Assets', href: '/admin/assets', icon: Package }` — placed under an Operations or General section of the admin sidebar.

---

## 4. User Flows

### 4.1 Register a New Asset
1. Admin navigates to `/admin/assets/register` → clicks **Add Asset**.
2. Dialog opens with fields: Category (select from tree), Name, Asset Tag (auto-suggested or manual), Serial Number, Make, Model, Description.
3. Fills in purchase details: Date, Price, Vendor, Invoice Ref, Warranty Expiry.
4. Selects Location from dropdown.
5. Sets Status (typically `in_service` for new items) and Condition (`new`).
6. Toggles `isPortable` if the asset can be checked out.
7. Submits → `POST /api/assets`.
8. On success: toast "Asset registered successfully", asset appears in the register.

### 4.2 Assign an Asset
1. Admin opens an asset's detail page → clicks **Assign**.
2. Dialog shows: Assignment Type (User / Department / Location / Class), and a search/select for the target.
3. Adds optional notes.
4. Submits → `POST /api/assets/:id/assign`.
5. Asset detail page updates to show current assignment.

### 4.3 Check Out a Portable Asset
1. Teacher or admin navigates to the check-out page or the asset detail.
2. Clicks **Check Out** on a portable, available asset.
3. Fills in: Borrower (self or another user), Purpose, Expected Return Date.
4. Submits → `POST /api/assets/:id/check-out`.
5. Asset status is reflected as "Checked Out" in the register.

### 4.4 Check In a Returned Asset
1. Admin navigates to `/admin/assets/check-outs` → finds the active check-out.
2. Clicks **Check In**.
3. Enters condition upon return and optional notes.
4. Submits → `POST /api/assets/:id/check-in`.
5. Check-out record is closed. Asset becomes available again.

### 4.5 Schedule Maintenance
1. Admin opens an asset's detail page → clicks **Schedule Maintenance**.
2. Fills in: Type (repair/service/upgrade/inspection), Description, Vendor, Estimated Cost, Scheduled Date.
3. Submits → `POST /api/assets/:id/maintenance`.
4. Asset status can optionally be changed to `under_repair`.
5. When maintenance is complete, admin updates the record with completion date and actual cost.

### 4.6 Report Loss or Damage
1. Teacher or admin opens the asset detail → clicks **Report Incident**.
2. Selects incident type (damage/loss/theft/vandalism).
3. Fills in: Description, Date, Responsible Party (optional), Estimated Cost.
4. Submits → `POST /api/assets/:id/incidents`.
5. Incident appears in the incidents list. Admin investigates and updates status.

### 4.7 Generate QR Code Labels
1. Admin navigates to `/admin/assets/qr`.
2. Selects assets from the register (checkbox selection or filter by category/location).
3. Clicks **Generate QR Labels**.
4. `POST /api/assets/qr-codes/batch` → PDF download.
5. Admin prints the PDF and applies labels to physical assets.

### 4.8 View Depreciation Report
1. Admin navigates to `/admin/assets/reports`.
2. Selects the Depreciation tab.
3. Page loads `GET /api/assets/depreciation`.
4. Table shows each asset with purchase value, current value, and annual depreciation.
5. Summary cards show total portfolio value and accumulated depreciation.
6. Chart shows value distribution by category.

---

## 5. Data Models

### 5.1 AssetCategory
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `name` | string | yes | Trimmed |
| `code` | string | yes | Unique within school |
| `parentId` | ObjectId → AssetCategory | no | For subcategories |
| `description` | string | no | |
| `depreciationRate` | number | no | Annual % (e.g., 33.33 for 3-year life) |
| `usefulLifeYears` | number | no | Positive integer |
| `isActive` | boolean | no | Default `true` |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, code }` (unique), `{ schoolId, parentId }`

---

### 5.2 AssetLocation
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `name` | string | yes | |
| `type` | enum | yes | `building` | `room` | `hall` | `field` | `storage` | `office` | `other` |
| `building` | string | no | Building name/number |
| `floor` | string | no | |
| `department` | string | no | |
| `description` | string | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, type }`, `{ schoolId, building }`

---

### 5.3 Asset
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `categoryId` | ObjectId → AssetCategory | yes | Populated in responses |
| `name` | string | yes | |
| `assetTag` | string | yes | Unique within school — e.g., `CAMP-IT-2026-001` |
| `serialNumber` | string | no | Unique within school if provided |
| `make` | string | no | Manufacturer |
| `model` | string | no | |
| `description` | string | no | |
| `purchaseDate` | Date | no | |
| `purchasePrice` | number | no | In cents |
| `warrantyExpiry` | Date | no | |
| `vendor` | string | no | Supplier |
| `invoiceReference` | string | no | |
| `locationId` | ObjectId → AssetLocation | no | Current location |
| `status` | enum | yes | `procured` | `in_service` | `under_repair` | `disposed` | `lost` | `stolen` |
| `condition` | enum | no | `new` | `good` | `fair` | `poor` | `damaged` |
| `isPortable` | boolean | no | Default `false` |
| `assignedTo` | ObjectId | no | User, Department, or Class |
| `assignedToType` | enum | no | `user` | `department` | `location` | `class` |
| `assignmentHistory` | array | no | `[{ assignedTo, assignedToType, assignedBy, assignedAt, unassignedAt, notes }]` |
| `imageUrl` | string | no | |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, assetTag }` (unique), `{ schoolId, serialNumber }` (unique sparse), `{ schoolId, categoryId }`, `{ schoolId, status }`, `{ schoolId, locationId }`, `{ schoolId, assignedTo }`

---

### 5.4 AssetCheckOut
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `assetId` | ObjectId → Asset | yes | |
| `schoolId` | ObjectId → School | yes | |
| `borrowerId` | ObjectId → User | yes | Who has the asset |
| `checkedOutBy` | ObjectId → User | yes | Who processed the check-out |
| `checkedOutAt` | Date | yes | |
| `expectedReturnDate` | Date | yes | |
| `checkedInAt` | Date | no | Set on return |
| `checkedInBy` | ObjectId → User | no | |
| `conditionOut` | enum | no | Asset condition at check-out |
| `conditionIn` | enum | no | Asset condition at return |
| `purpose` | string | yes | |
| `status` | enum | yes | `checked_out` | `returned` | `overdue` |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ assetId, status }`, `{ schoolId, status }`, `{ borrowerId, status }`, `{ expectedReturnDate }`

---

### 5.5 AssetMaintenance
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `assetId` | ObjectId → Asset | yes | |
| `schoolId` | ObjectId → School | yes | |
| `type` | enum | yes | `repair` | `service` | `upgrade` | `inspection` |
| `description` | string | yes | |
| `vendor` | string | no | |
| `cost` | number | no | In cents |
| `scheduledDate` | Date | no | |
| `completedDate` | Date | no | |
| `status` | enum | yes | `scheduled` | `in_progress` | `completed` | `cancelled` |
| `createdBy` | ObjectId → User | yes | |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ assetId, status }`, `{ schoolId, scheduledDate }`, `{ schoolId, status }`

---

### 5.6 AssetIncident
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `assetId` | ObjectId → Asset | yes | |
| `schoolId` | ObjectId → School | yes | |
| `type` | enum | yes | `damage` | `loss` | `theft` | `vandalism` |
| `description` | string | yes | |
| `date` | Date | yes | When the incident occurred |
| `reportedBy` | ObjectId → User | yes | |
| `responsiblePartyId` | ObjectId → User | no | |
| `estimatedCost` | number | no | In cents |
| `actualCost` | number | no | In cents — set during resolution |
| `images` | string[] | no | URLs to uploaded images |
| `status` | enum | yes | `reported` | `investigating` | `resolved` |
| `resolution` | string | no | How the incident was resolved |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, type }`, `{ assetId }`, `{ schoolId, status }`

---

### 5.7 AssetInsurance
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `policyNumber` | string | yes | |
| `insurer` | string | yes | |
| `categoryId` | ObjectId → AssetCategory | no | Which asset group is covered |
| `coverageAmount` | number | yes | In cents |
| `premium` | number | yes | In cents |
| `premiumFrequency` | enum | yes | `monthly` | `quarterly` | `annual` |
| `startDate` | Date | yes | |
| `expiryDate` | Date | yes | |
| `excess` | number | no | In cents |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, expiryDate }`, `{ schoolId, categoryId }`

---

## 6. State Management

### 6.1 Hook: `useAssets`
Located at `src/hooks/useAssets.ts`. CRUD for assets with filtering and pagination.

```ts
interface AssetsState {
  assets: Asset[];
  total: number;
  loading: boolean;
  fetchAssets: (filters?: AssetFilters) => Promise<void>;
  fetchAsset: (id: string) => Promise<Asset>;
  createAsset: (data: CreateAssetPayload) => Promise<Asset>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  assignAsset: (id: string, data: AssignPayload) => Promise<void>;
  unassignAsset: (id: string) => Promise<void>;
}
```

### 6.2 Hook: `useAssetCategories`
Located at `src/hooks/useAssetCategories.ts`. Category management.

```ts
interface AssetCategoriesState {
  categories: AssetCategory[];
  flatCategories: AssetCategory[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  createCategory: (data: CreateCategoryPayload) => Promise<AssetCategory>;
  updateCategory: (id: string, data: Partial<AssetCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  seedCategories: () => Promise<void>;
}
```

### 6.3 Hook: `useAssetLocations`
Located at `src/hooks/useAssetLocations.ts`. Location management.

### 6.4 Hook: `useAssetCheckOuts`
Located at `src/hooks/useAssetCheckOuts.ts`. Check-out/check-in management.

```ts
interface AssetCheckOutsState {
  checkOuts: AssetCheckOut[];
  loading: boolean;
  fetchCheckOuts: (filters?: CheckOutFilters) => Promise<void>;
  checkOut: (assetId: string, data: CheckOutPayload) => Promise<void>;
  checkIn: (assetId: string, data: CheckInPayload) => Promise<void>;
}
```

### 6.5 Hook: `useAssetMaintenance`
Located at `src/hooks/useAssetMaintenance.ts`. Maintenance scheduling and history.

### 6.6 Hook: `useAssetReports`
Located at `src/hooks/useAssetReports.ts`. Reports and depreciation data.

```ts
interface AssetReportsState {
  summary: AssetSummary | null;
  depreciation: DepreciationReport | null;
  replacementDue: Asset[];
  maintenanceCosts: MaintenanceCostReport | null;
  loading: boolean;
  fetchSummary: () => Promise<void>;
  fetchDepreciation: (asOfDate?: string) => Promise<void>;
  fetchReplacementDue: (withinMonths?: number) => Promise<void>;
  fetchMaintenanceCosts: (year: number) => Promise<void>;
  generateQrCode: (assetId: string) => Promise<string>;
  generateBatchQrCodes: (assetIds: string[]) => Promise<void>;
}
```

---

## 7. Components Needed

### 7.1 Page Components

| Component | File | Description |
|---|---|---|
| `AssetDashboardPage` | `src/app/(dashboard)/admin/assets/page.tsx` | Summary cards, alerts, quick actions |
| `AssetRegisterPage` | `src/app/(dashboard)/admin/assets/register/page.tsx` | Full asset list with CRUD |
| `AssetDetailPage` | `src/app/(dashboard)/admin/assets/register/[id]/page.tsx` | Single asset detail |
| `AssetCategoriesPage` | `src/app/(dashboard)/admin/assets/categories/page.tsx` | Category management |
| `AssetLocationsPage` | `src/app/(dashboard)/admin/assets/locations/page.tsx` | Location management |
| `CheckOutsPage` | `src/app/(dashboard)/admin/assets/check-outs/page.tsx` | Check-out tracking |
| `MaintenancePage` | `src/app/(dashboard)/admin/assets/maintenance/page.tsx` | Maintenance schedule |
| `IncidentsPage` | `src/app/(dashboard)/admin/assets/incidents/page.tsx` | Loss/damage reports |
| `InsurancePage` | `src/app/(dashboard)/admin/assets/insurance/page.tsx` | Insurance policies |
| `AssetReportsPage` | `src/app/(dashboard)/admin/assets/reports/page.tsx` | Depreciation, replacement, costs |
| `QrLabelsPage` | `src/app/(dashboard)/admin/assets/qr/page.tsx` | QR code batch generation |

### 7.2 Module Components (in `src/components/assets/`)

| Component | Props / Responsibilities |
|---|---|
| `AssetSummaryCards` | StatCards: Total Assets, Total Value, Under Repair, Overdue Check-Outs |
| `AssetAlertBanner` | Overdue check-outs, expiring insurance, due maintenance warnings |
| `AssetList` | DataTable with columns: Asset Tag, Name, Category, Location, Status, Condition, Assigned To, Value, Actions |
| `AssetFormDialog` | Dialog to create/edit an asset. Fields: Category, Name, Tag, Serial, Make, Model, Purchase details, Location, Status, Condition, Portable toggle. |
| `AssetDetailCard` | Card showing full asset info with tabs: Info, Assignments, Check-Outs, Maintenance, Incidents. |
| `AssignmentDialog` | Dialog to assign an asset: Type select, target search/select, notes. |
| `CheckOutDialog` | Dialog for check-out: Borrower, Purpose, Expected Return Date. |
| `CheckInDialog` | Dialog for check-in: Condition on return, notes. |
| `CheckOutList` | DataTable of check-outs. Columns: Asset, Borrower, Checked Out, Due Date, Status, Actions. Overdue rows highlighted in destructive. |
| `MaintenanceList` | DataTable of maintenance events. Columns: Asset, Type, Description, Vendor, Cost, Date, Status. |
| `MaintenanceFormDialog` | Dialog to schedule/record maintenance. |
| `IncidentList` | DataTable of incidents. Columns: Asset, Type, Date, Reported By, Cost, Status. |
| `IncidentFormDialog` | Dialog to report an incident. |
| `InsuranceList` | DataTable of insurance policies. Columns: Policy #, Insurer, Category, Coverage, Premium, Expiry, Status. |
| `InsuranceFormDialog` | Dialog to create/edit insurance policy. |
| `DepreciationTable` | Table showing assets with purchase value, current value, annual depreciation. Summary row at top. |
| `DepreciationChart` | Recharts bar chart of asset value by category (purchase vs current). |
| `ReplacementScheduleTable` | Table of assets approaching end of useful life. |
| `MaintenanceCostChart` | Recharts bar chart of maintenance costs by category. |
| `CategoryTree` | Hierarchical display of asset categories with depreciation info. |
| `CategoryFormDialog` | Dialog to create/edit a category. |
| `LocationList` | DataTable of locations. |
| `LocationFormDialog` | Dialog to create/edit a location. |
| `QrCodePreview` | Display a single QR code for an asset. |
| `QrBatchSelector` | Multi-select asset picker for batch QR generation. |

### 7.3 Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | Page titles and action buttons |
| `StatCard` | `src/components/shared/StatCard` | Dashboard summary cards |
| `DataTable` | `src/components/shared/DataTable` | All list views |
| `EmptyState` | `src/components/shared/EmptyState` | No assets, no check-outs, etc. |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All form dialogs |
| `Badge` | `src/components/ui/badge` | Status badges |
| `Select` | `src/components/ui/select` | Category, location, status filters |
| `Input` / `Label` / `Textarea` | `src/components/ui/` | Form fields |
| `Button` | `src/components/ui/button` | All CTAs |
| `Tabs` | `src/components/ui/tabs` | Asset detail tabs, report tabs |
| `Card` | `src/components/ui/card` | Asset detail sections |

---

## 8. Integration Notes

### 8.1 Staff Module
Asset assignment to users references the User model. The user search/select should query `GET /api/staff` for staff assignment or `GET /api/students` for student device assignments (e.g., 1-to-1 laptop programmes).

### 8.2 Budget Module Integration
Maintenance costs and asset purchases can be linked to budget expenses. When a maintenance event is completed with a cost, the admin can optionally create a corresponding expense in the Budget module (Scope 41) under the appropriate category.

### 8.3 Incident Module
The `AssetIncident` collection is standalone but could integrate with a future discipline or incident module. For now, incidents are self-contained within the assets module.

### 8.4 Depreciation Calculation
Depreciation uses the straight-line method:
- `annualDepreciation = purchasePrice / usefulLifeYears`
- `currentValue = purchasePrice - (annualDepreciation * yearsInService)`
- `currentValue` is floored at 0 (no negative values)
- `yearsInService` is calculated from `purchaseDate` to `asOfDate`
- The depreciation rate and useful life come from the asset's category

### 8.5 QR Code Content
QR codes encode the asset detail URL: `{NEXT_PUBLIC_APP_URL}/admin/assets/register/{assetId}`. Scanning a QR code with a phone opens the asset detail page. The QR label also includes the asset tag and name as human-readable text below the code.

### 8.6 Asset Tag Generation
Asset tags follow the format: `{PREFIX}-{CATEGORY_CODE}-{YEAR}-{SEQUENCE}`. Example: `CAMP-IT-2026-001`. The frontend can auto-suggest the next available tag by fetching the last tag in the same category/year. The admin can override with a custom tag.

### 8.7 Check-Out Overdue Detection
A scheduled job (BullMQ) or on-demand query marks check-outs as `overdue` when `expectedReturnDate < today` and `status === 'checked_out'`. The dashboard alert banner shows the count of overdue items.

### 8.8 Monetary Values
All monetary values (purchasePrice, maintenanceCost, insuranceCoverage, etc.) are stored as integers in cents. Frontend formats with `formatCurrency()`.

### 8.9 Batch Operations
The asset register supports bulk actions: select multiple assets → bulk assign, bulk change status, bulk generate QR codes. The frontend sends arrays of asset IDs to batch endpoints.

---

## 9. Acceptance Criteria

### Asset Register
- [ ] Admin can register assets with full metadata (name, tag, serial, make, model, purchase details)
- [ ] Asset tags are unique within a school
- [ ] Serial numbers are unique within a school (when provided)
- [ ] Asset list supports filtering by category, location, status, condition, and search
- [ ] Asset detail page shows complete asset information with tabs for related data

### Categories and Locations
- [ ] Admin can create asset categories with depreciation rate and useful life
- [ ] Categories support parent/child hierarchy
- [ ] Admin can seed default categories
- [ ] Admin can create locations (building, room, area)
- [ ] Locations display with type, building, and department

### Assignment
- [ ] Admin can assign assets to users, departments, locations, or classes
- [ ] Assignment history is maintained with timestamps and notes
- [ ] Admin can unassign an asset

### Check-Out / Check-In
- [ ] Teachers and admins can check out portable assets with purpose and return date
- [ ] An already checked-out asset cannot be checked out again (400 error)
- [ ] Admin can check in returned assets with condition assessment
- [ ] Overdue check-outs are highlighted with destructive styling
- [ ] Check-out list shows active, returned, and overdue items

### Maintenance
- [ ] Admin can schedule maintenance events (repair, service, upgrade, inspection)
- [ ] Maintenance history is visible per asset
- [ ] Upcoming maintenance (next 30 days) is listed on the dashboard
- [ ] Maintenance records can be updated with completion date and actual cost

### Incidents
- [ ] Any authenticated user can report loss, damage, theft, or vandalism
- [ ] Incidents show status progression: reported → investigating → resolved
- [ ] Admin can update incident status and resolution

### QR Codes
- [ ] Admin can generate a QR code for an individual asset
- [ ] Admin can generate batch QR labels as a printable PDF
- [ ] QR codes encode the asset detail URL with human-readable tag/name

### Depreciation
- [ ] Depreciation report shows purchase value, current value, and annual depreciation per asset
- [ ] Summary shows total portfolio value and accumulated depreciation
- [ ] Chart shows value distribution by category
- [ ] Straight-line depreciation is calculated correctly

### Insurance
- [ ] Admin can create insurance policies per asset category
- [ ] Expiring policies (within 60 days) are flagged on the dashboard
- [ ] Insurance details include policy number, coverage, premium, excess

### Reports
- [ ] Summary report shows total assets, value, status distribution, and category breakdown
- [ ] Replacement schedule shows assets approaching end of useful life
- [ ] Maintenance cost report shows spending by category

### General
- [ ] All monetary values display in Rands formatted from cents
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types

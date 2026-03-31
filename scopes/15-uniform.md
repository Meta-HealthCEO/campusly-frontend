# 15 — Uniform Module

## 1. Module Overview

The Uniform module is a multi-faceted school uniform management system covering four distinct sub-domains:

1. **Catalog management** — Admin creates and maintains a catalog of uniform items (shirts, pants, blazers, etc.) with stock levels, sizing, and pricing.
2. **Order processing** — Parents or admins place orders for uniform items on behalf of students. Orders move through a defined lifecycle from pending to collected.
3. **Second-hand marketplace** — Parents can list used uniform items for sale, and other parents can browse and reserve them. The school facilitates the exchange.
4. **Size guides** — Each catalog item can have a size guide with a chart image and detailed measurements (chest, waist, length per size).
5. **Pre-orders** — Items that are out of stock can be pre-ordered against a future available date, with a status pipeline from `pre_order` through to `collected`.
6. **Low-stock alerting** — A dedicated endpoint surfaces items whose current stock is at or below their configured `lowStockThreshold`.

All monetary values are stored and transmitted as integers in cents (South African context).

The frontend admin page lives at `/admin/uniform`. There is currently no `page.tsx` in that directory — it needs to be built. The parent-facing uniform shop (catalog browse, order placement, second-hand marketplace) has no dedicated route in constants yet; it would be added under `/parent/uniform` or similar when scoped.

Base API path (inferred from backend module conventions): `/uniform`

---

## 2. Backend API Endpoints

All endpoints require `Authorization: Bearer <accessToken>` (JWT). Role restrictions noted per endpoint.

---

### 2.1 Uniform Item Endpoints

#### `POST /uniform/items`

Create a new uniform catalog item.

**Auth:** `super_admin`, `school_admin`

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | `string` | Yes | min 1 char |
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `description` | `string` | No | — |
| `category` | `string` | Yes | enum: `shirt`, `pants`, `skirt`, `blazer`, `tie`, `shoes`, `sports`, `other` |
| `sizes` | `string[]` | No | array of size strings |
| `price` | `number` | Yes | positive integer (cents) |
| `stock` | `number` | No | non-negative integer, default `0` |
| `image` | `string` | No | valid URL |
| `isAvailable` | `boolean` | No | default `true` |
| `lowStockThreshold` | `number` | No | non-negative integer, default `5` |
| `sizeGuideUrl` | `string` | No | valid URL |

**Example request:**
```json
{
  "name": "White School Shirt",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "description": "Long-sleeve white shirt with school badge",
  "category": "shirt",
  "sizes": ["XS", "S", "M", "L", "XL"],
  "price": 18000,
  "stock": 50,
  "isAvailable": true,
  "lowStockThreshold": 10
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
    "name": "White School Shirt",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "description": "Long-sleeve white shirt with school badge",
    "category": "shirt",
    "sizes": ["XS", "S", "M", "L", "XL"],
    "price": 18000,
    "stock": 50,
    "image": null,
    "isAvailable": true,
    "lowStockThreshold": 10,
    "sizeGuideUrl": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Uniform item created successfully"
}
```

---

#### `GET /uniform/items`

List catalog items with optional filters and pagination.

**Auth:** any authenticated user

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | `string` | Filter by school (falls back to `req.user.schoolId`) |
| `category` | `string` | Filter by category |
| `page` | `number` | Page number (default `1`) |
| `limit` | `number` | Items per page |

**Example request:**
```
GET /uniform/items?schoolId=64a1b2c3d4e5f6a7b8c9d0e1&category=shirt&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [ /* IUniformItem[] */ ],
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  },
  "message": "Uniform items retrieved successfully"
}
```

---

#### `GET /uniform/items/:id`

Get a single catalog item by ID.

**Auth:** any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": { /* IUniformItem */ },
  "message": "Uniform item retrieved successfully"
}
```

**Error (404):** `Uniform item not found`

---

#### `PUT /uniform/items/:id`

Update a catalog item. All fields optional.

**Auth:** `super_admin`, `school_admin`

**Request body:** Same fields as create, all optional. `schoolId` cannot be changed (not in update schema).

**Example request:**
```json
{
  "stock": 35,
  "price": 19000,
  "isAvailable": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated IUniformItem */ },
  "message": "Uniform item updated successfully"
}
```

---

#### `DELETE /uniform/items/:id`

Soft-delete a catalog item (`isDeleted: true`).

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Uniform item deleted successfully"
}
```

---

### 2.2 Uniform Order Endpoints

#### `POST /uniform/orders`

Place a uniform order for a student.

**Auth:** any authenticated user (`orderedBy` is set from `req.user.id`)

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | `string` | Yes | 24-char hex ObjectId |
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `items` | `OrderItem[]` | Yes | min 1 element |
| `items[].uniformItemId` | `string` | Yes | 24-char hex ObjectId |
| `items[].size` | `string` | Yes | min 1 char |
| `items[].quantity` | `number` | Yes | positive integer |
| `items[].unitPrice` | `number` | Yes | non-negative integer (cents) |
| `items[].totalPrice` | `number` | Yes | non-negative integer (cents) |
| `totalAmount` | `number` | Yes | non-negative integer (cents) |

**Example request:**
```json
{
  "studentId": "64c3d4e5f6a7b8c9d0e1f2a3",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "items": [
    {
      "uniformItemId": "64b2c3d4e5f6a7b8c9d0e1f2",
      "size": "M",
      "quantity": 2,
      "unitPrice": 18000,
      "totalPrice": 36000
    }
  ],
  "totalAmount": 36000
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64d4e5f6a7b8c9d0e1f2a3b4",
    "studentId": "64c3d4e5f6a7b8c9d0e1f2a3",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "items": [
      {
        "uniformItemId": "64b2c3d4e5f6a7b8c9d0e1f2",
        "size": "M",
        "quantity": 2,
        "unitPrice": 18000,
        "totalPrice": 36000
      }
    ],
    "totalAmount": 36000,
    "status": "pending",
    "orderedBy": "64e5f6a7b8c9d0e1f2a3b4c5",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:10:00.000Z",
    "updatedAt": "2026-03-31T08:10:00.000Z"
  },
  "message": "Uniform order created successfully"
}
```

---

#### `GET /uniform/orders`

List orders with filters.

**Auth:** any authenticated user

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | `string` | Filter by school |
| `studentId` | `string` | Filter by student |
| `status` | `string` | Filter by order status |
| `page` | `number` | — |
| `limit` | `number` | — |

**Response (200):** Paginated list. Orders populated with `studentId` and `orderedBy` (firstName, lastName, email).

```json
{
  "success": true,
  "data": {
    "orders": [ /* IUniformOrder[] populated */ ],
    "total": 18,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "message": "Uniform orders retrieved successfully"
}
```

---

#### `GET /uniform/orders/:id`

Get a single order by ID. Populated with student and orderedBy.

**Auth:** any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": { /* IUniformOrder populated */ },
  "message": "Uniform order retrieved successfully"
}
```

---

#### `PATCH /uniform/orders/:id/status`

Update the status of an order.

**Auth:** `super_admin`, `school_admin`

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `status` | `string` | enum: `pending`, `processing`, `confirmed`, `ready`, `collected`, `cancelled` |

**Example request:**
```json
{ "status": "ready" }
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated IUniformOrder populated */ },
  "message": "Uniform order status updated successfully"
}
```

Note: When status transitions to `ready`, a notification dispatch is pending implementation (TODO comment in service).

---

#### `DELETE /uniform/orders/:id`

Soft-delete an order.

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Uniform order deleted successfully"
}
```

---

### 2.3 Second-Hand Marketplace Endpoints

#### `POST /uniform/second-hand`

Create a second-hand listing.

**Auth:** any authenticated user (typically parent)

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `parentId` | `string` | Yes | 24-char hex ObjectId |
| `itemName` | `string` | Yes | min 1 char |
| `size` | `string` | Yes | min 1 char |
| `condition` | `string` | Yes | enum: `new`, `like_new`, `good`, `fair` |
| `price` | `number` | Yes | positive integer (cents) |
| `photos` | `string[]` | No | array of URLs |
| `description` | `string` | No | — |

**Example request:**
```json
{
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "parentId": "64f5a6b7c8d9e0f1a2b3c4d5",
  "itemName": "Grey School Blazer",
  "size": "12",
  "condition": "good",
  "price": 25000,
  "description": "Worn one year, still in great condition"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64e5f6a7b8c9d0e1f2a3b4c5",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "parentId": "64f5a6b7c8d9e0f1a2b3c4d5",
    "itemName": "Grey School Blazer",
    "size": "12",
    "condition": "good",
    "price": 25000,
    "photos": [],
    "description": "Worn one year, still in great condition",
    "status": "available",
    "buyerId": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T09:00:00.000Z",
    "updatedAt": "2026-03-31T09:00:00.000Z"
  },
  "message": "Second hand listing created successfully"
}
```

---

#### `GET /uniform/second-hand`

List second-hand listings. Defaults to `status: available`.

**Auth:** any authenticated user

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | `string` | Filter by school |
| `condition` | `string` | Filter by condition |
| `status` | `string` | Override default `available` filter |
| `page` | `number` | — |
| `limit` | `number` | — |

**Response (200):** Paginated list, `parentId` populated.

```json
{
  "success": true,
  "data": {
    "listings": [ /* ISecondHandListing[] populated */ ],
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": "Second hand listings retrieved successfully"
}
```

---

#### `GET /uniform/second-hand/my-listings/:parentId`

Get all listings for a specific parent.

**Auth:** any authenticated user

**Path param:** `parentId` — ObjectId of the parent

**Query parameters:** `page`, `limit`

**Response (200):** Same paginated structure with `listings` array.

---

#### `GET /uniform/second-hand/:id`

Get a single listing. Populated with `parentId` and `buyerId`.

**Auth:** any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": { /* ISecondHandListing populated */ },
  "message": "Second hand listing retrieved successfully"
}
```

---

#### `PATCH /uniform/second-hand/:id/reserve`

Reserve a listing for a buyer. Only works if listing is currently `available`.

**Auth:** any authenticated user

**Request body:**

| Field | Type | Required |
|---|---|---|
| `buyerId` | `string` | Yes (ObjectId) |

**Example request:**
```json
{ "buyerId": "64a9b0c1d2e3f4a5b6c7d8e9" }
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated listing with status: "reserved" */ },
  "message": "Listing reserved successfully"
}
```

**Error (404):** `Listing not found or not available` (if already reserved or sold)

---

#### `PATCH /uniform/second-hand/:id/sold`

Mark a listing as sold.

**Auth:** `super_admin`, `school_admin`, `parent`

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated listing with status: "sold" */ },
  "message": "Listing marked as sold successfully"
}
```

---

### 2.4 Size Guide Endpoints

Size guides are keyed by `uniformItemId`. Each item can have at most one size guide (unique index on `uniformItemId`).

#### `POST /uniform/items/:itemId/size-guide`

Create a size guide for a catalog item.

**Auth:** `super_admin`, `school_admin`

**Path param:** `itemId` — ObjectId of the uniform item (merged into body server-side)

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `uniformItemId` | `string` | Yes (from path) | 24-char hex ObjectId |
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `sizeChartImageUrl` | `string` | Yes | valid URL |
| `measurements` | `Measurement[]` | No | array |
| `measurements[].size` | `string` | Yes | min 1 char |
| `measurements[].chest` | `string` | Yes | min 1 char |
| `measurements[].waist` | `string` | Yes | min 1 char |
| `measurements[].length` | `string` | Yes | min 1 char |
| `notes` | `string` | No | — |

**Example request:**
```json
{
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "sizeChartImageUrl": "https://cdn.school.com/uniforms/shirt-sizechart.png",
  "measurements": [
    { "size": "XS", "chest": "76-81cm", "waist": "61-66cm", "length": "60cm" },
    { "size": "S",  "chest": "81-86cm", "waist": "66-71cm", "length": "63cm" },
    { "size": "M",  "chest": "86-91cm", "waist": "71-76cm", "length": "66cm" }
  ],
  "notes": "Measure over a light shirt for best fit"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64f6a7b8c9d0e1f2a3b4c5d6",
    "uniformItemId": "64b2c3d4e5f6a7b8c9d0e1f2",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "sizeChartImageUrl": "https://cdn.school.com/uniforms/shirt-sizechart.png",
    "measurements": [
      { "size": "XS", "chest": "76-81cm", "waist": "61-66cm", "length": "60cm" },
      { "size": "S",  "chest": "81-86cm", "waist": "66-71cm", "length": "63cm" },
      { "size": "M",  "chest": "86-91cm", "waist": "71-76cm", "length": "66cm" }
    ],
    "notes": "Measure over a light shirt for best fit",
    "isDeleted": false,
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  },
  "message": "Size guide created successfully"
}
```

---

#### `GET /uniform/items/:itemId/size-guide`

Get the size guide for a catalog item.

**Auth:** any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": { /* ISizeGuide */ },
  "message": "Size guide retrieved successfully"
}
```

**Error (404):** `Size guide not found for this item`

---

#### `PUT /uniform/items/:itemId/size-guide`

Update the size guide for a catalog item.

**Auth:** `super_admin`, `school_admin`

**Request body:** All fields optional: `sizeChartImageUrl`, `measurements`, `notes`.

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated ISizeGuide */ },
  "message": "Size guide updated successfully"
}
```

---

#### `DELETE /uniform/items/:itemId/size-guide`

Soft-delete a size guide.

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Size guide deleted successfully"
}
```

---

### 2.5 Pre-Order Endpoints

#### `POST /uniform/pre-orders`

Create a pre-order for an out-of-stock item.

**Auth:** any authenticated user (`orderedBy` set from `req.user.id`)

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `uniformItemId` | `string` | Yes | 24-char hex ObjectId |
| `studentId` | `string` | Yes | 24-char hex ObjectId |
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `size` | `string` | Yes | min 1 char |
| `quantity` | `number` | Yes | positive integer |
| `availableDate` | `string` / `Date` | Yes | coerced to Date |
| `notes` | `string` | No | — |

**Example request:**
```json
{
  "uniformItemId": "64b2c3d4e5f6a7b8c9d0e1f2",
  "studentId": "64c3d4e5f6a7b8c9d0e1f2a3",
  "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "size": "L",
  "quantity": 1,
  "availableDate": "2026-05-01T00:00:00.000Z",
  "notes": "Required for winter term"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64g7h8i9j0k1l2m3n4o5p6q7",
    "uniformItemId": "64b2c3d4e5f6a7b8c9d0e1f2",
    "studentId": "64c3d4e5f6a7b8c9d0e1f2a3",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "size": "L",
    "quantity": 1,
    "status": "pre_order",
    "availableDate": "2026-05-01T00:00:00.000Z",
    "orderedBy": "64e5f6a7b8c9d0e1f2a3b4c5",
    "notes": "Required for winter term",
    "isDeleted": false,
    "createdAt": "2026-03-31T11:00:00.000Z",
    "updatedAt": "2026-03-31T11:00:00.000Z"
  },
  "message": "Pre-order created successfully"
}
```

---

#### `GET /uniform/pre-orders`

List pre-orders with filters.

**Auth:** any authenticated user

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `schoolId` | `string` | Filter by school |
| `status` | `string` | Filter by pre-order status |
| `uniformItemId` | `string` | Filter by item |
| `page` | `number` | — |
| `limit` | `number` | — |

**Response (200):** Paginated list. Fields `uniformItemId`, `studentId`, and `orderedBy` (firstName, lastName, email) are populated.

```json
{
  "success": true,
  "data": {
    "preOrders": [ /* IPreOrder[] populated */ ],
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": "Pre-orders retrieved successfully"
}
```

---

#### `GET /uniform/pre-orders/:id`

Get a single pre-order. Populated with `uniformItemId`, `studentId`, `orderedBy`.

**Auth:** any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": { /* IPreOrder populated */ },
  "message": "Pre-order retrieved successfully"
}
```

---

#### `PATCH /uniform/pre-orders/:id/status`

Update the status of a pre-order.

**Auth:** `super_admin`, `school_admin`

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `status` | `string` | enum: `pre_order`, `available`, `ready`, `collected` |

**Example request:**
```json
{ "status": "available" }
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated IPreOrder populated */ },
  "message": "Pre-order status updated successfully"
}
```

---

#### `DELETE /uniform/pre-orders/:id`

Soft-delete a pre-order.

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Pre-order deleted successfully"
}
```

---

### 2.6 Low-Stock Endpoint

#### `GET /uniform/low-stock`

Retrieve all catalog items where `stock <= lowStockThreshold`.

**Auth:** `super_admin`, `school_admin`

**Query parameters:** `schoolId`, `page`, `limit`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [ /* IUniformItem[] */ ],
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": "Low stock items retrieved successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Admin — `/admin/uniform`

**File:** `src/app/(dashboard)/admin/uniform/page.tsx` (to be created)

**Purpose:** Central uniform management hub for admins. Covers catalog management, order processing, pre-orders, second-hand marketplace overview, and low-stock alerts.

**Tabs / sections:**
- **Catalog** — View all items, add/edit/delete items, manage availability and stock.
- **Orders** — View all orders, filter by status, advance order lifecycle.
- **Pre-Orders** — View items on pre-order, update their status as stock arrives.
- **Second-Hand** — View all marketplace listings, moderate, mark sold.
- **Low Stock** — View items at or below threshold, prompt restocking action.

### 3.2 Parent — `/parent/uniform` (future scope)

Not yet in routes or nav constants. When built:
- Browse catalog with size guide access.
- Place orders for linked students.
- Browse and reserve second-hand listings.
- Create second-hand listings for items to sell.
- View own order history and pre-orders.

---

## 4. User Flows

### 4.1 Add Item to Catalog (Admin)

1. Admin navigates to `/admin/uniform` → Catalog tab.
2. Clicks "Add Item" — opens a dialog/modal.
3. Fills in: name, category, sizes (comma-separated or tag input), price (in Rands, converted to cents before POST), stock count, low-stock threshold, image URL, description.
4. Submits → `POST /uniform/items`.
5. On success: toast "Item added successfully", item appears in catalog table.
6. Optionally: admin clicks the item row and navigates to a detail view where they can `POST /uniform/items/:id/size-guide` to attach measurement data.

### 4.2 Parent Places an Order

1. Parent browses `/parent/uniform` → Catalog tab.
2. Selects an item, chooses size and quantity. Can open size guide modal to check measurements.
3. Adds to cart (client-side state) or proceeds directly to checkout.
4. Review summary shows line items and totalAmount.
5. Submits → `POST /uniform/orders` (with `studentId` pre-populated from linked student, `unitPrice` and `totalPrice` from catalog data).
6. Order confirmation shown. Parent can track order status from their order history.

### 4.3 Admin Processes an Order

1. Admin navigates to `/admin/uniform` → Orders tab.
2. Filters by status `pending` to see new orders.
3. Reviews order items and student details.
4. Advances status: `pending` → `processing` → `confirmed` → `ready` → `collected`, via `PATCH /uniform/orders/:id/status`.
5. When status becomes `ready`, a notification is dispatched to the parent (pending implementation in backend).
6. Parent or admin marks the order as `collected` once the student picks up the items.

### 4.4 Record a Second-Hand Listing (Parent)

1. Parent navigates to second-hand marketplace section in `/parent/uniform`.
2. Clicks "List an Item".
3. Fills in: item name, size, condition (new / like_new / good / fair), asking price, photos (URLs), description.
4. Submits → `POST /uniform/second-hand` with their `parentId` and `schoolId`.
5. Listing appears in the marketplace with `status: available`.
6. Another parent reserves it → `PATCH /uniform/second-hand/:id/reserve` with their `buyerId`.
7. After exchange, seller or admin marks it sold → `PATCH /uniform/second-hand/:id/sold`.

### 4.5 Pre-Order an Out-of-Stock Item (Parent)

1. Parent views an item in the catalog that has `stock: 0` or `isAvailable: false`.
2. Clicks "Pre-Order" → opens pre-order form.
3. Selects size, quantity, and the `availableDate` is shown from the item or entered by admin.
4. Submits → `POST /uniform/pre-orders`.
5. Admin updates pre-order status as stock arrives: `pre_order` → `available` → `ready` → `collected`.

---

## 5. Data Models

### 5.1 UniformItem

```ts
interface IUniformItem {
  _id: string;
  name: string;                  // required
  schoolId: ObjectId;            // ref: School, required
  description?: string;
  category: UniformCategory;     // required — 'shirt'|'pants'|'skirt'|'blazer'|'tie'|'shoes'|'sports'|'other'
  sizes: string[];               // default []
  price: number;                 // integer cents, required
  stock: number;                 // default 0
  image?: string;                // URL
  isAvailable: boolean;          // default true
  lowStockThreshold: number;     // default 5
  sizeGuideUrl?: string;         // URL
  isDeleted: boolean;            // default false
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ schoolId, category }`, `{ schoolId, isAvailable }`

### 5.2 UniformOrder

```ts
interface IUniformOrderItem {
  uniformItemId: ObjectId;       // ref: UniformItem, required
  size: string;                  // required
  quantity: number;              // required
  unitPrice: number;             // integer cents
  totalPrice: number;            // integer cents
}

interface IUniformOrder {
  _id: string;
  studentId: ObjectId;           // ref: Student, required
  schoolId: ObjectId;            // ref: School, required
  items: IUniformOrderItem[];    // required, min 1
  totalAmount: number;           // integer cents
  status: UniformOrderStatus;    // 'pending'|'processing'|'confirmed'|'ready'|'collected'|'cancelled', default 'pending'
  orderedBy: ObjectId;           // ref: User, set from req.user.id
  isDeleted: boolean;            // default false
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ schoolId, createdAt }`, `{ studentId, createdAt }`, `{ schoolId, status }`

### 5.3 SecondHandListing

```ts
interface ISecondHandListing {
  _id: string;
  schoolId: ObjectId;            // ref: School, required
  parentId: ObjectId;            // ref: Parent, required
  itemName: string;              // required
  size: string;                  // required
  condition: SecondHandCondition; // 'new'|'like_new'|'good'|'fair', required
  price: number;                 // positive integer cents
  photos: string[];              // default []
  description?: string;
  status: SecondHandStatus;      // 'available'|'reserved'|'sold', default 'available'
  buyerId?: ObjectId;            // ref: Parent — set on reserve
  isDeleted: boolean;            // default false
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ schoolId, status }`, `{ parentId }`

### 5.4 SizeGuide

```ts
interface ISizeGuideMeasurement {
  size: string;    // required
  chest: string;   // required (string to allow ranges like "76-81cm")
  waist: string;   // required
  length: string;  // required
}

interface ISizeGuide {
  _id: string;
  uniformItemId: ObjectId;       // ref: UniformItem, required, unique
  schoolId: ObjectId;            // ref: School, required
  sizeChartImageUrl: string;     // required URL
  measurements: ISizeGuideMeasurement[];  // default []
  notes?: string;
  isDeleted: boolean;            // default false
  createdAt: Date;
  updatedAt: Date;
}
```

Index: `{ uniformItemId }` (unique)

### 5.5 PreOrder

```ts
interface IPreOrder {
  _id: string;
  uniformItemId: ObjectId;       // ref: UniformItem, required
  studentId: ObjectId;           // ref: Student, required
  schoolId: ObjectId;            // ref: School, required
  size: string;                  // required
  quantity: number;              // positive integer, required
  status: PreOrderStatus;        // 'pre_order'|'available'|'ready'|'collected', default 'pre_order'
  availableDate: Date;           // required
  orderedBy: ObjectId;           // ref: User, set from req.user.id
  notes?: string;
  isDeleted: boolean;            // default false
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ schoolId, status }`, `{ uniformItemId }`

---

## 6. State Management

There is currently no Zustand/React Query uniform store. The pattern established in `tuckshop/page.tsx` uses `useEffect` with `apiClient` directly in the page component. The recommended approach for this module given its scale is to use either:

- **React Query** (`useQuery`, `useMutation`) — preferred for cache invalidation after mutations (e.g. after updating an order status, the order list should auto-refresh).
- **Local `useState` + `useEffect`** — acceptable for simpler single-resource pages.

### Proposed uniform store shape (if Zustand is used):

```ts
interface UniformStore {
  // Catalog
  items: IUniformItem[];
  itemsLoading: boolean;
  fetchItems: (query?: ListItemQuery) => Promise<void>;
  createItem: (data: CreateUniformItemInput) => Promise<void>;
  updateItem: (id: string, data: UpdateUniformItemInput) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Orders
  orders: IUniformOrder[];
  ordersLoading: boolean;
  fetchOrders: (query?: ListOrderQuery) => Promise<void>;
  createOrder: (data: CreateUniformOrderInput) => Promise<void>;
  updateOrderStatus: (id: string, status: UniformOrderStatus) => Promise<void>;

  // Second-hand
  listings: ISecondHandListing[];
  listingsLoading: boolean;
  fetchListings: (query?: ListListingQuery) => Promise<void>;
  createListing: (data: CreateSecondHandListingInput) => Promise<void>;
  reserveListing: (id: string, buyerId: string) => Promise<void>;
  markSold: (id: string) => Promise<void>;

  // Pre-orders
  preOrders: IPreOrder[];
  preOrdersLoading: boolean;
  fetchPreOrders: (query?: ListPreOrderQuery) => Promise<void>;
  createPreOrder: (data: CreatePreOrderInput) => Promise<void>;
  updatePreOrderStatus: (id: string, status: PreOrderStatus) => Promise<void>;

  // Low stock
  lowStockItems: IUniformItem[];
  fetchLowStockItems: () => Promise<void>;
}
```

### API call helpers:

```ts
// All calls go through apiClient at baseURL = process.env.NEXT_PUBLIC_API_URL
const api = {
  listItems:          (q) => apiClient.get('/uniform/items', { params: q }),
  createItem:         (d) => apiClient.post('/uniform/items', d),
  updateItem:         (id, d) => apiClient.put(`/uniform/items/${id}`, d),
  deleteItem:         (id) => apiClient.delete(`/uniform/items/${id}`),
  listOrders:         (q) => apiClient.get('/uniform/orders', { params: q }),
  createOrder:        (d) => apiClient.post('/uniform/orders', d),
  updateOrderStatus:  (id, s) => apiClient.patch(`/uniform/orders/${id}/status`, { status: s }),
  listListings:       (q) => apiClient.get('/uniform/second-hand', { params: q }),
  createListing:      (d) => apiClient.post('/uniform/second-hand', d),
  reserveListing:     (id, buyerId) => apiClient.patch(`/uniform/second-hand/${id}/reserve`, { buyerId }),
  markSold:           (id) => apiClient.patch(`/uniform/second-hand/${id}/sold`),
  getSizeGuide:       (itemId) => apiClient.get(`/uniform/items/${itemId}/size-guide`),
  createSizeGuide:    (itemId, d) => apiClient.post(`/uniform/items/${itemId}/size-guide`, d),
  updateSizeGuide:    (itemId, d) => apiClient.put(`/uniform/items/${itemId}/size-guide`, d),
  listPreOrders:      (q) => apiClient.get('/uniform/pre-orders', { params: q }),
  createPreOrder:     (d) => apiClient.post('/uniform/pre-orders', d),
  updatePreOrderStatus: (id, s) => apiClient.patch(`/uniform/pre-orders/${id}/status`, { status: s }),
  getLowStock:        (q) => apiClient.get('/uniform/low-stock', { params: q }),
};
```

---

## 7. Components Needed

### 7.1 Page-level

| Component | Location | Description |
|---|---|---|
| `AdminUniformPage` | `admin/uniform/page.tsx` | Main page with tabs and stats header |

### 7.2 Catalog

| Component | Description |
|---|---|
| `UniformCatalogTab` | Tab content — lists catalog items in a `DataTable` with search, category filter |
| `UniformItemForm` | Dialog form for create/edit — name, category, sizes, price, stock, threshold, image URL |
| `UniformItemRow` | Row actions — edit, toggle availability, delete, view size guide |
| `SizeGuideModal` | View-only modal showing `sizeChartImageUrl` and measurement table |
| `SizeGuideForm` | Admin form to create/update size guide for an item |
| `LowStockBanner` | Alert banner or stat card showing count of low-stock items; clicking opens Low Stock tab |

### 7.3 Orders

| Component | Description |
|---|---|
| `UniformOrdersTab` | Tab content — order list with status filter tabs (`pending`, `processing`, etc.) |
| `OrderStatusBadge` | Colored badge for each order status |
| `OrderDetailModal` | Shows full order: student info, line items, totals, status timeline, action buttons |
| `OrderStatusStepper` | Visual stepper showing order lifecycle (`pending` → `processing` → `confirmed` → `ready` → `collected`) |
| `CreateOrderForm` | Form for admin to place an order on behalf of a parent/student |

### 7.4 Second-Hand Marketplace

| Component | Description |
|---|---|
| `SecondHandTab` | Tab content — filterable listing grid/table, moderation actions |
| `SecondHandListingCard` | Card view showing item photo, name, size, condition badge, price, seller info |
| `ConditionBadge` | Badge component for `new`, `like_new`, `good`, `fair` |
| `CreateListingForm` | Dialog form for parent to create a listing |
| `ListingStatusActions` | Reserve / Mark Sold buttons with confirmation |

### 7.5 Pre-Orders

| Component | Description |
|---|---|
| `PreOrdersTab` | Tab content — list of pre-orders with status filter |
| `PreOrderStatusBadge` | Badge for `pre_order`, `available`, `ready`, `collected` |
| `CreatePreOrderForm` | Form fields: item selector, size, quantity, availableDate, notes |
| `PreOrderDetailModal` | Shows student, item, size, quantity, expected date, status history |

### 7.6 Shared / Utilities

| Component | Description |
|---|---|
| `UniformStatCards` | Row of stat cards: total items, active orders, second-hand listings, low-stock count |
| `PriceInput` | Input that accepts Rands (float) and converts to cents integer for API calls |
| `SizePicker` | Multi-select or tag input for size variants when creating a catalog item |

---

## 8. Integration Notes

### 8.1 Wallet (Payment)

The Uniform module currently does not deduct from the digital wallet on order creation. `totalAmount` is stored on the order but the backend `createOrder` service does not call a payment service. Integration points to plan:

- When `POST /uniform/orders` is called, the frontend should check the parent's wallet balance first (via `GET /wallet/balance`).
- On order confirmation, a wallet deduction transaction should be created against the parent's account.
- If payment fails, the order should not be created (or should be created in a `payment_failed` status — this needs a backend change).
- This mirrors the pattern used in the Tuckshop and Fees modules.

### 8.2 Parent

- The `parentId` field on `SecondHandListing` links directly to the Parent model.
- `orderedBy` on `UniformOrder` is a User ID. The parent's user ID is set automatically from the JWT on order creation.
- Parent-facing pages need to pre-populate `studentId` from the parent's linked children (fetched via `GET /students?parentId=...`).
- The parent nav in `PARENT_NAV` (constants.ts) does not yet have a uniform entry. A `PARENT_UNIFORM` route and nav item must be added to `src/lib/constants.ts` when the parent page is built.

### 8.3 Student

- `studentId` on `UniformOrder` and `PreOrder` references the Student model.
- The student is not an actor in this module (they cannot place orders themselves), but their profile data (name, grade) is populated on order responses via `populate('studentId')`.

### 8.4 Notifications (Pending)

The service has a TODO comment in `updateOrderStatus` for dispatching a push notification/email/SMS when order status transitions to `ready`. The frontend should be built anticipating that notification support will be added, and order status badges should clearly indicate when an order is ready for collection.

### 8.5 Stock Management

The backend does not automatically decrement `stock` when an order is created — the `createOrder` service does not call `updateItem`. Stock management is currently manual: admins must update `stock` via `PUT /uniform/items/:id`. This should be flagged as a known gap. Recommendation: add a stock-decrement step in the `createOrder` service on the backend, and surface the current stock count prominently in the order form so admins can see availability before confirming.

### 8.6 Authentication and Authorization Summary

| Action | Roles Allowed |
|---|---|
| Create / update / delete catalog item | `super_admin`, `school_admin` |
| List / view catalog items | Any authenticated user |
| Create order | Any authenticated user |
| List / view orders | Any authenticated user |
| Update order status / delete order | `super_admin`, `school_admin` |
| Create second-hand listing | Any authenticated user |
| List / view / reserve second-hand | Any authenticated user |
| Mark second-hand sold | `super_admin`, `school_admin`, `parent` |
| Create / update / delete size guide | `super_admin`, `school_admin` |
| View size guide | Any authenticated user |
| Create pre-order | Any authenticated user |
| Update pre-order status / delete | `super_admin`, `school_admin` |
| View low-stock items | `super_admin`, `school_admin` |

---

## 9. Acceptance Criteria

### Catalog Management

- [ ] Admin can create a uniform item with all required and optional fields; item appears in the catalog table on success.
- [ ] Admin can filter catalog by category.
- [ ] Admin can edit any catalog item field (name, price, stock, availability, threshold).
- [ ] Admin can soft-delete a catalog item; it no longer appears in the catalog.
- [ ] Admin can attach a size guide (image URL + measurement table) to any catalog item.
- [ ] Admin can update an existing size guide.
- [ ] The low-stock section surfaces all items where `stock <= lowStockThreshold`; the count matches the badge/stat card.

### Order Processing

- [ ] An order can be placed with at least one line item; `totalAmount` equals the sum of all `totalPrice` values.
- [ ] New orders appear with status `pending` in the admin orders view.
- [ ] Admin can advance an order through each status step in sequence.
- [ ] Order list can be filtered by status.
- [ ] Order detail shows student name, all line items with sizes and quantities, and the `orderedBy` user's name.
- [ ] Deleting an order soft-deletes it and removes it from the active orders list.

### Second-Hand Marketplace

- [ ] A parent can create a listing; it appears in the marketplace with status `available`.
- [ ] A listing can be reserved; its status changes to `reserved` and no second reservation is accepted.
- [ ] A reserved listing can be marked as sold; status changes to `sold`.
- [ ] Parent can view all their own listings via `GET /uniform/second-hand/my-listings/:parentId`.
- [ ] Admin can view all listings and moderate (mark sold, delete).

### Size Guides

- [ ] A size guide can be created for any catalog item; a second creation attempt returns an appropriate error (unique index violation).
- [ ] Size guide measurements render as a readable table in the UI.
- [ ] Size guide can be updated without recreating it.

### Pre-Orders

- [ ] A pre-order can be created for any item (including items currently in stock — no restriction at API level).
- [ ] Pre-order list can be filtered by status and by `uniformItemId`.
- [ ] Admin can advance pre-order status: `pre_order` → `available` → `ready` → `collected`.
- [ ] Deleting a pre-order soft-deletes it.

### General

- [ ] All monetary values display in South African Rands (divide cents by 100, format as `R xxx.xx`).
- [ ] All list endpoints return correct `total`, `page`, `totalPages` values.
- [ ] Attempting to access a deleted item/order/listing/pre-order by ID returns a 404 with the appropriate error message.
- [ ] All admin-only endpoints reject requests from non-admin roles with a 403.
- [ ] Token refresh is handled transparently by `apiClient`; users are not asked to log in mid-session.

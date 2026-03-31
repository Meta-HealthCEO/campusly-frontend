# 07 — TuckShop Module

## 1. Module Overview

The TuckShop module manages a school's canteen or tuck shop. It provides two functional areas:

1. **Menu management** — admins create, update, and delete menu items with pricing (stored in cents), category, allergen information, dietary flags, nutritional data, and stock tracking.
2. **Order processing** — staff (admins and teachers) place orders on behalf of students, debiting payment from a wallet, a linked NFC wristband, or recording cash. Stock is decremented atomically within a MongoDB transaction. The service also cross-references the student's medical allergy profile and blocks orders that would expose the student to a known allergen unless an explicit `allergenOverride` flag is set.

A sales reporting endpoint aggregates order totals for a given day, broken down by payment method.

The module has no student-facing ordering page in the current frontend. The student portal references `GET /tuck-shop/menu` from within the **Wallet** page to display available items, but there is no dedicated tuck-shop route under `src/app/(dashboard)/tuckshop/`. That page needs to be built.

Base API path (all routes): `/tuck-shop`

---

## 2. Backend API Endpoints

All endpoints require a valid JWT (`authenticate` middleware). Role-restricted endpoints additionally require `authorize(...)`.

### 2.1 Create Menu Item

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/tuck-shop/menu` |
| Auth | Required |
| Roles | `school_admin`, `super_admin` |

**Request body** (validated by `createMenuItemSchema`):

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | `string` | Yes | min length 1 |
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `description` | `string` | No | — |
| `price` | `integer` | Yes | positive integer, in cents |
| `category` | `string` | Yes | enum: `snack \| drink \| meal \| stationery \| other` |
| `image` | `string` | No | valid URL |
| `stock` | `integer` | No | `-1` (unlimited) or `>= 0`; defaults to `0` |
| `allergens` | `string[]` | No | array of: `nuts \| dairy \| gluten \| eggs \| soy \| fish \| shellfish` |
| `allergenWarnings` | `string[]` | No | free-text warning strings |
| `isHalal` | `boolean` | No | defaults `false` |
| `isKosher` | `boolean` | No | defaults `false` |
| `nutritionalInfo` | `object` | No | see nutritional sub-schema below |
| `isDailySpecial` | `boolean` | No | defaults `false` |
| `stockAlertThreshold` | `integer` | No | `>= 0`; defaults `10` |

Nutritional info sub-object (all fields optional, `>= 0`):

```
{ calories, protein, carbs, fat, sugar }
```

**Response** `201 Created`:

```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Cheese Roll",
    "schoolId": "663f0a1b2c3d4e5f6a7b8c9d",
    "description": "Freshly baked cheese roll",
    "price": 1500,
    "category": "snack",
    "image": "https://cdn.example.com/cheese-roll.jpg",
    "isAvailable": true,
    "stock": 50,
    "allergens": ["dairy", "gluten"],
    "allergenWarnings": ["May contain traces of nuts"],
    "isHalal": true,
    "isKosher": false,
    "nutritionalInfo": { "calories": 280, "protein": 9, "carbs": 34, "fat": 11 },
    "isDailySpecial": false,
    "stockAlertThreshold": 10,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

---

### 2.2 List Menu Items

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/tuck-shop/menu` |
| Auth | Required |
| Roles | Any authenticated user |

**Query parameters**:

| Param | Type | Description |
|---|---|---|
| `schoolId` | `string` | Filter by school ObjectId |
| `category` | `string` | Filter by category enum value |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: platform default, capped at `maxLimit`) |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Menu items retrieved successfully",
  "data": {
    "items": [ /* array of MenuItem documents */ ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

Items are sorted by `createdAt` descending. Soft-deleted items (`isDeleted: true`) are excluded.

---

### 2.3 Get Single Menu Item

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/tuck-shop/menu/:id` |
| Auth | Required |
| Roles | Any authenticated user |

**Path params**: `id` — MenuItem ObjectId.

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Menu item retrieved successfully",
  "data": { /* full MenuItem document */ }
}
```

Returns `404` if not found or soft-deleted.

---

### 2.4 Update Menu Item

| Field | Value |
|---|---|
| Method | `PUT` |
| Path | `/tuck-shop/menu/:id` |
| Auth | Required |
| Roles | `school_admin`, `super_admin` |

**Request body**: Partial `createMenuItemSchema` — any combination of the fields from 2.1. All fields are optional.

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Menu item updated successfully",
  "data": { /* updated MenuItem document */ }
}
```

Returns `404` if not found or soft-deleted.

---

### 2.5 Delete Menu Item

| Field | Value |
|---|---|
| Method | `DELETE` |
| Path | `/tuck-shop/menu/:id` |
| Auth | Required |
| Roles | `school_admin`, `super_admin` |

Performs a **soft delete** by setting `isDeleted: true`.

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Menu item deleted successfully",
  "data": undefined
}
```

Returns `404` if not found or already soft-deleted.

---

### 2.6 Update Stock

| Field | Value |
|---|---|
| Method | `PATCH` |
| Path | `/tuck-shop/menu/:id/stock` |
| Auth | Required |
| Roles | `school_admin`, `super_admin` |

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `stock` | `number` | Yes | Absolute quantity to set. Use `-1` for unlimited. |

This is an **absolute set**, not an increment. Returns `400` if `stock` is missing or not a number.

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": { /* updated MenuItem document */ }
}
```

---

### 2.7 Place Order

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/tuck-shop/orders` |
| Auth | Required |
| Roles | `school_admin`, `super_admin`, `teacher` |

**Request body** (validated by `placeOrderSchema`):

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `studentId` | `string` | Yes | 24-char hex ObjectId |
| `items` | `object[]` | Yes | min 1 item |
| `items[].menuItemId` | `string` | Yes | 24-char hex ObjectId |
| `items[].quantity` | `integer` | Yes | positive integer |
| `paymentMethod` | `string` | Yes | enum: `wallet \| wristband \| cash` |
| `wristbandId` | `string` | No | Required when `paymentMethod === "wristband"` |
| `allergenOverride` | `boolean` | No | Set `true` to bypass allergen safety check |

**Business logic executed within a MongoDB transaction**:

1. Validates all menu items exist and are not soft-deleted.
2. If `allergenOverride` is falsy, checks student's `medicalProfile.allergies` against each item's `allergens` array and throws `400` on a match.
3. For each item, checks `isAvailable` and that `stock >= quantity` (skip when `stock === -1`). Decrements stock atomically.
4. Calculates `totalAmount` as the sum of `menuItem.price * quantity` for all items.
5. For `wallet` payment: looks up the student's active wallet, verifies `balance >= totalAmount`, deducts balance, creates a `WalletTransaction` of type `PURCHASE`.
6. For `wristband` payment: resolves the wristband to its linked wallet and applies the same deduction and transaction creation.
7. For `cash` payment: no wallet interaction; no `walletTransactionId` is stored.
8. Creates the `TuckShopOrder` document and commits the transaction.

`processedBy` is set from `req.user.id` (the authenticated staff member).

**Response** `201 Created`:

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "_id": "664b2c3d4e5f6a7b8c9d0e1f",
    "schoolId": "663f0a1b2c3d4e5f6a7b8c9d",
    "studentId": "663f1b2c3d4e5f6a7b8c9d0e",
    "items": [
      {
        "menuItemId": "664a1b2c3d4e5f6a7b8c9d0e",
        "name": "Cheese Roll",
        "quantity": 2,
        "unitPrice": 1500,
        "totalPrice": 3000
      }
    ],
    "totalAmount": 3000,
    "paymentMethod": "wallet",
    "walletTransactionId": "664c3d4e5f6a7b8c9d0e1f2a",
    "processedBy": "663e0a1b2c3d4e5f6a7b8c9d",
    "isDeleted": false,
    "createdAt": "2026-03-31T10:15:00.000Z",
    "updatedAt": "2026-03-31T10:15:00.000Z"
  }
}
```

---

### 2.8 Get Single Order

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/tuck-shop/orders/:id` |
| Auth | Required |
| Roles | Any authenticated user |

Response populates `studentId` (full Student document) and `processedBy` (firstName, lastName, email).

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "_id": "664b2c3d4e5f6a7b8c9d0e1f",
    "studentId": { "_id": "...", "firstName": "Liam", "lastName": "Smith", ... },
    "items": [ ... ],
    "totalAmount": 3000,
    "paymentMethod": "wallet",
    "processedBy": { "_id": "...", "firstName": "Jane", "lastName": "Doe", "email": "jane@school.edu" },
    "createdAt": "2026-03-31T10:15:00.000Z"
  }
}
```

---

### 2.9 Get Student Order History

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/tuck-shop/orders/student/:studentId` |
| Auth | Required |
| Roles | Any authenticated user |

**Query parameters**: `page`, `limit` (same pagination as 2.2).

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Student orders retrieved successfully",
  "data": {
    "orders": [ /* array of TuckShopOrder documents */ ],
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

Orders are sorted by `createdAt` descending.

---

### 2.10 Get Daily Sales

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/tuck-shop/sales/daily` |
| Auth | Required |
| Roles | `school_admin`, `super_admin` |

**Query parameters**:

| Param | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | `string` | Conditional | Required if not present on `req.user.schoolId` |
| `date` | `string` | Yes | ISO date string, e.g. `"2026-03-31"` |

Returns `400` if `schoolId` or `date` is missing.

The endpoint runs a MongoDB aggregation grouping orders by `paymentMethod` for the UTC day window.

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Daily sales retrieved successfully",
  "data": {
    "totalSales": 125000,
    "orderCount": 47,
    "byPaymentMethod": [
      { "paymentMethod": "wallet",    "totalSales": 85000,  "orderCount": 32 },
      { "paymentMethod": "wristband", "totalSales": 30000,  "orderCount": 11 },
      { "paymentMethod": "cash",      "totalSales": 10000,  "orderCount": 4  }
    ]
  }
}
```

All monetary values are in cents.

---

## 3. Frontend Pages

### 3.1 Admin Page — `/admin/tuckshop`

**File**: `src/app/(dashboard)/admin/tuckshop/page.tsx`

**Status**: Exists. Read-only view with two tabs.

**Tab: Menu Items**
- Renders a `DataTable` of all menu items fetched from `GET /tuck-shop/menu`.
- Columns: Name, Category, Price (formatted currency), Allergens (badge per allergen), Available (coloured badge).
- Supports text search by item name.
- Missing: create/edit/delete actions, stock management, form dialogs.

**Tab: Daily Sales**
- Fetches `GET /tuck-shop/sales/daily` (currently with no `date` or `schoolId` query param — this will return a `400`; needs to be fixed).
- Displays three `StatCard` components: Total Revenue (7 days), Total Transactions, Avg. Transaction.
- Renders a `BarChartComponent` of daily revenue over the returned data.
- Renders a "Daily Breakdown" list showing per-day revenue, transaction count, and average transaction.
- Note: the page maps `day.totalRevenue` and `day.totalTransactions` from the API response, but the actual API returns `totalSales` and `orderCount` per payment method — the frontend aggregation logic needs aligning with the real response shape.

### 3.2 Student/Staff Tuckshop Ordering Page — Not Yet Built

There is currently no route at `/tuckshop` or `/student/tuckshop`. The student wallet page (`src/app/(dashboard)/student/wallet/page.tsx`) fetches `GET /tuck-shop/menu` as a secondary call to display available items, but does not allow ordering.

A dedicated ordering interface needs to be built. Based on the backend, this page would be used by staff (admin/teacher) to process orders on behalf of students at a tuck-shop terminal. The recommended route is `/admin/tuckshop/orders/new` or a shared `/(dashboard)/tuckshop/order` route.

---

## 4. User Flows

### 4.1 Admin Adds a Menu Item

1. Admin navigates to `/admin/tuckshop`, selects the "Menu Items" tab.
2. Clicks "Add Item" (button to be built).
3. A modal/dialog opens with `MenuItemForm`.
4. Admin fills in: name, category, price (in rands — UI converts to cents), description, image URL, stock count, allergens, dietary flags, nutritional info.
5. Form submits `POST /tuck-shop/menu` with the school's `schoolId` injected from auth context.
6. On `201` response the new item is appended to the table and the modal closes.

### 4.2 Admin Updates a Menu Item

1. Admin clicks an edit action on a table row.
2. `MenuItemForm` opens pre-populated with existing values.
3. Admin modifies fields and submits.
4. Frontend calls `PUT /tuck-shop/menu/:id`.
5. Table row updates in place.

### 4.3 Admin Adjusts Stock

1. Admin clicks a "Stock" action on a table row (or inline stock edit field).
2. A prompt or inline editor accepts a new stock quantity (`-1` for unlimited, or a non-negative integer).
3. Frontend calls `PATCH /tuck-shop/menu/:id/stock` with `{ stock: <number> }`.
4. Table row reflects updated stock.

### 4.4 Staff Places an Order (POS Flow)

1. Staff navigates to the ordering interface.
2. Staff searches for and selects a student (lookup against student list).
3. The `MenuGrid` renders available items fetched from `GET /tuck-shop/menu`.
4. Staff taps/clicks items to add them to the `Cart`, adjusting quantities.
5. Staff selects a payment method: Wallet, Wristband, or Cash.
   - If Wristband, a text input for `wristbandId` appears.
6. Staff clicks "Place Order".
7. If a student allergen conflict is detected by the server, a confirmation dialog is shown asking staff to set `allergenOverride: true` (parent pre-authorization).
8. Frontend calls `POST /tuck-shop/orders`.
9. On `201` response, a success toast is shown, the cart is cleared, and the student's wallet balance (if visible) is refreshed.

### 4.5 Admin Views Daily Sales Report

1. Admin navigates to `/admin/tuckshop`, selects the "Daily Sales" tab.
2. A date picker defaults to today.
3. Frontend calls `GET /tuck-shop/sales/daily?schoolId=<id>&date=<ISO date>`.
4. Stats cards show `totalSales` (formatted currency) and `orderCount`.
5. A breakdown list shows sales by payment method.

### 4.6 Viewing a Student's Order History

1. Admin or teacher navigates to a student's detail page (or a dedicated order history view).
2. Frontend calls `GET /tuck-shop/orders/student/:studentId`.
3. A paginated list of past orders is shown, each expandable to show item breakdown and payment method.

---

## 5. Data Models

### 5.1 MenuItem

Mongoose model name: `MenuItem`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `name` | `string` | Yes | — | trimmed |
| `schoolId` | `ObjectId` | Yes | — | ref: `School` |
| `description` | `string` | No | — | — |
| `price` | `number` | Yes | — | stored in cents (positive integer) |
| `category` | `string` | Yes | — | enum: `snack \| drink \| meal \| stationery \| other` |
| `image` | `string` | No | — | URL |
| `isAvailable` | `boolean` | No | `true` | — |
| `stock` | `number` | No | `0` | `-1` = unlimited |
| `allergens` | `string[]` | No | `[]` | enum values: `nuts \| dairy \| gluten \| eggs \| soy \| fish \| shellfish` |
| `allergenWarnings` | `string[]` | No | `[]` | free-text warnings |
| `isHalal` | `boolean` | No | `false` | — |
| `isKosher` | `boolean` | No | `false` | — |
| `nutritionalInfo` | `object` | No | `{}` | sub-doc: `{ calories, protein, carbs, fat, sugar }` (all optional numbers `>= 0`) |
| `isDailySpecial` | `boolean` | No | `false` | — |
| `stockAlertThreshold` | `number` | No | `10` | alert when stock falls below this |
| `isDeleted` | `boolean` | No | `false` | soft delete flag |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

Indexes: `{ schoolId, category }`, `{ schoolId, isAvailable }`.

### 5.2 TuckShopOrder

Mongoose model name: `TuckShopOrder`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `schoolId` | `ObjectId` | Yes | — | ref: `School` |
| `studentId` | `ObjectId` | Yes | — | ref: `Student` |
| `items` | `IOrderItem[]` | Yes | — | embedded array (no `_id` per item) |
| `totalAmount` | `number` | Yes | — | in cents; computed server-side |
| `paymentMethod` | `string` | Yes | — | enum: `wallet \| wristband \| cash` |
| `walletTransactionId` | `ObjectId` | No | — | ref: `WalletTransaction`; absent for cash |
| `processedBy` | `ObjectId` | Yes | — | ref: `User` (the staff member) |
| `isDeleted` | `boolean` | No | `false` | soft delete flag |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

Indexes: `{ schoolId, createdAt: -1 }`, `{ studentId, createdAt: -1 }`.

### 5.3 OrderItem (embedded sub-document)

| Field | Type | Required | Notes |
|---|---|---|---|
| `menuItemId` | `ObjectId` | Yes | ref: `MenuItem` |
| `name` | `string` | Yes | snapshot of name at time of order |
| `quantity` | `number` | Yes | — |
| `unitPrice` | `number` | Yes | snapshot of price in cents at time of order |
| `totalPrice` | `number` | Yes | `unitPrice * quantity` |

### 5.4 Frontend Types (`src/types/index.ts`)

```ts
interface TuckshopItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;       // cents
  image?: string;
  allergens: string[];
  isAvailable: boolean;
  stockCount?: number;
}

interface TuckshopOrder {
  id: string;
  studentId: string;
  student: Student;
  items: TuckshopOrderItem[];
  totalAmount: number;         // cents
  walletTransactionId: string;
  servedBy: string;
  createdAt: string;
}

interface TuckshopOrderItem {
  id: string;
  itemId: string;
  item: TuckshopItem;
  quantity: number;
  price: number;               // cents
}
```

Note: the frontend types do not yet include `isHalal`, `isKosher`, `nutritionalInfo`, `isDailySpecial`, `stockAlertThreshold`, or `allergenWarnings`. These fields should be added to `TuckshopItem` when the full management UI is built.

---

## 6. State Management

### 6.1 TuckShop Cart Store

A Zustand store is needed for the point-of-sale cart. It does not yet exist.

**Recommended file**: `src/stores/useTuckShopStore.ts`

**State shape**:

```ts
interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;   // cents
  quantity: number;
  totalPrice: number;  // cents
}

interface TuckShopStore {
  // Cart state
  cartItems: CartItem[];
  selectedStudentId: string | null;
  paymentMethod: 'wallet' | 'wristband' | 'cash';
  wristbandId: string;

  // Actions
  addToCart: (item: TuckshopItem) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setStudent: (studentId: string | null) => void;
  setPaymentMethod: (method: 'wallet' | 'wristband' | 'cash') => void;
  setWristbandId: (id: string) => void;

  // Derived
  cartTotal: () => number;   // sum of all CartItem.totalPrice
  itemCount: () => number;   // sum of all CartItem.quantity
}
```

### 6.2 Existing Auth Store

The existing `src/stores/useAuthStore.ts` provides `user.id` (used as `processedBy`) and `user.schoolId` (injected into API calls for `schoolId`).

### 6.3 Admin Page Local State

The admin tuckshop page currently manages `menuItems`, `dailySales`, and `loading` via `useState`. When form dialogs and CRUD actions are added, additional local state will be needed for the selected item, dialog open/close, and form dirty state, or these can be extracted into a lightweight server-state pattern using a shared fetch hook.

---

## 7. Components Needed

### 7.1 Already Present (used by admin page)

| Component | Path | Purpose |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | Page title + description |
| `StatCard` | `src/components/shared/StatCard` | Metric summary card |
| `DataTable` | `src/components/shared/DataTable` | Sortable/searchable table |
| `BarChartComponent` | `src/components/charts` | Bar chart for sales data |
| `Badge` | `src/components/ui/badge` | Allergen + availability badges |
| `Tabs / TabsList / TabsTrigger / TabsContent` | `src/components/ui/tabs` | Menu/Sales tab switcher |

### 7.2 To Build

**`MenuItemForm`** (`src/components/tuckshop/MenuItemForm.tsx`)
- Form dialog for create and edit.
- Fields: name, category (select), price (rands, converted to cents on submit), description, image URL, stock, allergens (multi-select checkboxes), allergenWarnings, isHalal, isKosher, isDailySpecial, stockAlertThreshold, nutritionalInfo fields.
- Uses react-hook-form + zod validation mirroring `createMenuItemSchema`.

**`StockEditor`** (`src/components/tuckshop/StockEditor.tsx`)
- Inline number input or popover for quick stock updates.
- Submits `PATCH /tuck-shop/menu/:id/stock`.
- Displays a warning indicator when stock falls below `stockAlertThreshold`.

**`MenuGrid`** (`src/components/tuckshop/MenuGrid.tsx`)
- Card grid of available menu items for the POS ordering view.
- Each card: image thumbnail, name, price, category, allergen badges, dietary icons (Halal/Kosher), daily special highlight.
- Clicking a card adds the item to the cart.
- Supports filtering by category tab.

**`Cart`** (`src/components/tuckshop/Cart.tsx`)
- Side panel or bottom drawer showing `CartItem[]` from the store.
- Per-item: name, unit price, quantity stepper (+/−), line total, remove button.
- Footer: cart total, payment method selector, wristband ID input (conditional), "Place Order" button.
- Disabled when `selectedStudentId` is null.

**`StudentSelector`** (`src/components/tuckshop/StudentSelector.tsx`)
- Combobox/search input to find and select a student by name or ID.
- Displays selected student's name and (if wallet payment) their current wallet balance.

**`AllergenWarningDialog`** (`src/components/tuckshop/AllergenWarningDialog.tsx`)
- Confirmation dialog shown when the server returns a `400` allergen conflict error.
- Displays the allergen name and affected item.
- "Proceed with Override" button re-submits the order with `allergenOverride: true`.

**`OrderHistoryTable`** (`src/components/tuckshop/OrderHistoryTable.tsx`)
- Paginated table of `TuckShopOrder` records.
- Columns: Date/Time, Student, Items (count), Total, Payment Method, Processed By.
- Row expand: full item breakdown.

**`DailySalesReport`** (`src/components/tuckshop/DailySalesReport.tsx`)
- Encapsulates the sales tab content from the admin page.
- Date picker input that triggers re-fetch of `GET /tuck-shop/sales/daily`.
- Payment method breakdown chart/table using the real response shape (`totalSales`, `orderCount`, `byPaymentMethod`).

---

## 8. Integration Notes

### 8.1 Wallet Integration

The TuckShop service (`service.ts`) directly imports from `../Wallet/model.js` and operates on `Wallet` and `WalletTransaction` documents within the same MongoDB transaction. When `paymentMethod` is `wallet` or `wristband`:

- The student's `Wallet` document is locked within the transaction session.
- `wallet.balance` is decremented by `totalAmount` (both in cents).
- A `WalletTransaction` is created with `type: TransactionType.PURCHASE` and a description of `"Tuck shop purchase - N item(s)"` (or `"Tuck shop purchase via wristband - N item(s)"`).
- The `walletTransactionId` on the order links back to this transaction for reconciliation.

Frontend implication: after placing an order via wallet, the student's displayed wallet balance must be refreshed. The student wallet page (`/student/wallet`) fetches balance independently and will need a reload trigger or a shared wallet balance store.

### 8.2 Wristband Integration

The `Wristband` model is resolved by `wristbandId` (the physical ID on the band, not the MongoDB `_id`). The wristband must be active (`isActive: true`, `isDeleted: false`) and linked to an active wallet via `wristband.studentId`. The deduction flows through the linked student's wallet identically to direct wallet payment.

### 8.3 Student Medical Profile

The allergen check reads `student.medicalProfile.allergies` (an array of strings from the `Student` model). The check is case-insensitive. If the student model does not have allergies populated, the check is silently skipped. The `allergenOverride` flag must be a conscious staff action and should be surfaced as a visible warning in the UI, not a silent retry.

### 8.4 Stock Convention

A `stock` value of `-1` means unlimited — the service checks `if (menuItem.stock !== -1)` before decrementing. The UI must represent this as "Unlimited" rather than displaying `-1` to users.

### 8.5 Price Convention

All monetary values throughout the system (backend and frontend) are stored and transmitted in **cents** (integer). The frontend `formatCurrency` utility handles display conversion (cents to rands). The admin create/edit form should accept input in rands (e.g. "15.00") and multiply by 100 before submitting.

### 8.6 API Client Base Path

The frontend uses `apiClient` from `src/lib/api-client`. All TuckShop endpoints are under the `/tuck-shop` prefix, matching the backend router mount point.

### 8.7 Known Issues in Current Admin Page

1. `GET /tuck-shop/sales/daily` is called without `date` or `schoolId` query params — the server will return `400 Bad Request`. The page needs a date picker and must inject `schoolId` from the auth context.
2. The daily sales data shape expected by the page (`day.totalRevenue`, `day.totalTransactions`, `day.averageTransaction`, `day.date`) does not match the actual API response shape (`totalSales`, `orderCount`, `byPaymentMethod` — a single day summary, not an array of days). The API returns data for one day at a time, not a 7-day rolling window. Either the endpoint needs extending or the frontend loop needs removal.

---

## 9. Acceptance Criteria

### Menu Management

- [ ] Admin can create a new menu item with all fields (name, category, price, description, image, stock, allergens, dietary flags, nutritional info, daily special flag, alert threshold).
- [ ] Admin cannot create a menu item with a non-positive price, negative stock (other than -1), or an invalid allergen enum value — form and server both reject.
- [ ] Admin can edit any field on an existing menu item.
- [ ] Admin can soft-delete a menu item; deleted items no longer appear in any list response.
- [ ] Admin can set stock to an absolute value via the stock update endpoint; stock `-1` is displayed as "Unlimited" in the UI.
- [ ] Menu items with `isAvailable: false` are excluded from the POS ordering grid but visible (with a disabled state) in the admin management table.

### Ordering

- [ ] Staff can select a student, add items to cart, and place an order with payment method `wallet`.
- [ ] Staff can place an order with payment method `wristband` by entering the wristband's physical ID.
- [ ] Staff can place an order with payment method `cash` (no wallet interaction required).
- [ ] Placing a wallet or wristband order with insufficient balance returns a clear error; the order is not created and no stock is decremented.
- [ ] Placing an order for an item with allergens that match the student's medical profile returns a `400` error; the UI displays the allergen conflict and offers a staff override.
- [ ] Placing an order with `allergenOverride: true` succeeds regardless of allergen match.
- [ ] Placing an order for an unavailable item returns a `400` error.
- [ ] Placing an order for an item with insufficient stock returns a `400` error.
- [ ] Stock is decremented correctly after a successful order (unlimited stock items are unaffected).
- [ ] The cart is cleared after a successful order submission.
- [ ] The student's wallet balance display is refreshed after a successful wallet/wristband order.

### Sales Reporting

- [ ] Admin can select a date and view the daily sales summary for that date.
- [ ] The summary shows `totalSales` (formatted currency), `orderCount`, and a breakdown by payment method.
- [ ] Passing no `date` or no `schoolId` returns a `400` with a descriptive error message.
- [ ] A date with no orders returns `{ totalSales: 0, orderCount: 0, byPaymentMethod: [] }`.

### Order History

- [ ] Staff can view a paginated list of all orders for a specific student.
- [ ] Each order shows date, items with quantities and prices, total amount, and payment method.
- [ ] Single order retrieval includes populated student and processedBy fields.

### General

- [ ] All monetary values are displayed in rands (formatted) and submitted/stored in cents.
- [ ] All list endpoints return correct pagination metadata (`total`, `page`, `limit`, `totalPages`).
- [ ] Soft-deleted records never appear in any list or single-fetch response.
- [ ] Non-admin/teacher users cannot place orders (server returns `403`).
- [ ] Non-admin users cannot create, update, delete menu items, adjust stock, or access the daily sales endpoint (server returns `403`).

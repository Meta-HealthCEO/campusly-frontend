# 07 — Tuckshop — Phase 2: The Tuckshop Store

## Current State (Phase 1)
- Admin menu management (CRUD, stock, allergens, dietary flags, nutritional info)
- Staff POS ordering on behalf of students (wallet/wristband/cash)
- Allergen safety checks against student medical profile
- Daily sales reporting
- Student order history
- No parent or student self-service ordering

## Vision
Turn the tuckshop from a counter-only POS into a **full online shop** where parents can browse the menu, build a weekly meal plan for their child, pay upfront from their wallet, and have orders pre-packed and ready for collection at break time. The child walks up, gives their name or taps their wristband, and picks up a labelled bag. No queuing, no cash, no forgotten lunch money.

---

## Phase 2 Features

### 1. Parent Tuckshop Store (`/parent/tuckshop`)

A proper e-commerce-style shopping experience for parents.

**Browse & Shop**
- Grid of menu items with images, prices, allergen badges, dietary icons (halal/kosher)
- Filter by category (snack, drink, meal, stationery)
- Search by name
- Items flagged with child's allergens are visually marked with a warning (not hidden — parent can still override)
- Daily specials highlighted at the top
- "Out of stock" items shown but disabled

**Add to Cart**
- Parent selects which child (if multi-child family) the order is for
- Add items, adjust quantities
- Running total visible in cart sidebar/drawer
- Cart persists across page navigation (Zustand store with localStorage)

**Weekly Meal Planner**
- Parent picks items for each day of the week (Mon–Fri)
- Calendar-style grid: each day is a column, parent drags/clicks items into each day
- OR simplified version: parent builds a daily order and assigns it to specific days
- "Copy Monday to all days" shortcut for repetitive orders
- Total for the week shown at bottom
- Can edit/remove items per day before checkout

**Checkout**
- Review order summary: items per day, total per day, weekly total
- Payment from wallet balance (show current balance, warn if insufficient)
- Confirm and pay — wallet is debited for the full week upfront
- Order confirmation screen with order number and daily breakdown
- Confirmation also sent as push/in-app notification

**Order Management**
- "My Orders" tab showing upcoming and past orders
- Status per daily order: `scheduled` → `preparing` → `ready` → `collected` → `cancelled`
- Parent can cancel a future day's order (before a configurable cutoff, e.g., 8pm the night before)
- Cancelled order amount credited back to wallet
- Parent can modify a future day's order (cancel + re-order)

---

### 2. Tuckshop Kitchen Dashboard (`/admin/tuckshop/kitchen`)

The backend view for tuckshop staff to prepare and fulfill pre-orders.

**Daily Prep View**
- Select date (defaults to today)
- List of all pre-orders for that day grouped by collection period (e.g., first break, second break)
- Each order shows: student name, grade/class, items, allergen warnings, special notes
- Aggregate view: "Today we need 45 cheese rolls, 30 juices, 12 sandwiches" — total quantities per item across all orders
- Print prep list (simple print-friendly layout)

**Order Fulfillment**
- Check off each order as packed
- Mark as "ready for collection"
- Student or staff scans wristband/gives name → mark as "collected"
- Orders not collected by end of day auto-marked as "uncollected" (admin decides: waste or credit)

**Cutoff Management**
- Admin sets daily order cutoff time (e.g., orders for tomorrow must be placed by 8pm tonight)
- Orders placed after cutoff go to the next available day
- Cutoff time displayed prominently on parent store

---

### 3. Student Quick Order (`/student/tuckshop`)

Simpler version for students (especially older students with their own devices).

- Browse menu, add to cart, pay with own wallet
- Single-day ordering only (no weekly planner — that's a parent feature)
- Same allergen warnings
- Order for today (if before cutoff) or tomorrow
- "My Orders" showing status of current orders
- **Why:** High school students manage their own lunch. They shouldn't need a parent to order for them

---

### 4. Low Stock & Demand Forecasting

**Stock Alerts**
- When stock drops below `stockAlertThreshold`, admin gets in-app notification
- Daily stock report: items that will run out based on pre-orders vs. current stock
- **Why:** Pre-orders let the tuckshop know exactly what's needed tomorrow. Stock alerts prevent shortfalls

**Demand Summary**
- Pre-orders for tomorrow/this week aggregated by item
- "You have 50 cheese rolls ordered for tomorrow but only 30 in stock" — actionable warning
- **Why:** This is the magic of pre-ordering. The tuckshop can prep exactly what's needed, reducing waste and stockouts

---

### 5. Calorie Counter & Nutritional Awareness

The menu item model already stores `nutritionalInfo: { calories, protein, carbs, fat, sugar }`. This feature surfaces that data throughout the entire ordering experience so parents make informed choices — not as an afterthought, but as a core part of how they shop.

#### 5a. Live Calorie Counter in Cart

As the parent adds items to the cart (daily or weekly), a **live nutrition bar** updates in real time:

- **Per-day calorie total** shown prominently: "Monday: 1,240 kcal"
- Color-coded against age-appropriate daily guidelines:
  - Green: within recommended range
  - Amber: approaching upper limit
  - Red: exceeding recommended intake
- Macro breakdown bar (protein / carbs / fat) as a stacked horizontal bar
- Sugar tracker with a simple "X of Y grams" indicator
- Tooltip on each item in cart showing its individual nutritional contribution

**Age-based guidelines** (configurable per school, sensible defaults):
| Age Group | Daily Calories | Protein | Carbs | Fat | Sugar |
|-----------|---------------|---------|-------|-----|-------|
| 6–8 years | 1,200–1,400 | 19g | 130g | 25–35% | 25g |
| 9–13 years | 1,400–2,200 | 34g | 130g | 25–35% | 25g |
| 14–18 years | 2,000–3,200 | 46–52g | 130g | 25–35% | 25g |

The system determines the child's age group from their date of birth on the Student record and applies the appropriate guideline automatically.

**Why:** Parents see "this lunch is 800 calories and 40g of sugar" BEFORE they confirm. That changes behavior without lecturing anyone.

#### 5b. Nutritional Labels on Menu Items

Every menu item in the store grid shows:
- Calorie count as a badge on the item card (e.g., "280 kcal")
- Tap to expand: full macro breakdown (protein, carbs, fat, sugar) in a clean format
- Dietary icons already exist (halal, kosher) — add visual indicators for: high-protein, low-sugar, high-fibre if data supports it
- Items missing nutritional data show "Nutrition info not available" (not hidden — encourages admin to fill it in)

**Why:** Nutritional info shouldn't be buried in a separate dashboard. It should be visible at the moment of decision — when the parent is choosing between a cheese roll and a fruit salad.

#### 5c. Smart Meal Suggestions

When a parent's daily selection is nutritionally imbalanced, offer gentle suggestions:
- "This lunch is high in sugar. Add a fruit or yoghurt to balance it out?" with one-tap add
- "Low on protein today. A boiled egg or cheese snack would round it out" 
- NOT preachy or blocking — just a small info card below the cart
- Suggestions sourced from available menu items that would improve the macro balance

**Why:** Parents aren't dietitians. A nudge toward balance is more helpful than raw numbers alone.

#### 5d. Parent Nutritional Dashboard (`/parent/tuckshop/nutrition`)

A dedicated view showing what your child has been eating over time:

**Weekly View**
- Day-by-day breakdown of what was ordered
- Daily calorie total with guideline comparison
- Macro split per day (stacked bar chart)
- Sugar intake trend line
- Allergen exposure log

**Monthly Trends**
- Average daily calories over 4 weeks (line chart)
- Most ordered items (top 5 by frequency)
- Macro balance over time — is the diet getting better or worse?
- Comparison against recommended guidelines (shaded range on chart)

**Per-Item Insights**
- "Your child orders Cheese Rolls 4x per week (1,120 kcal / week from this item alone)"
- Highlight repeat high-sugar or high-calorie items

**Why:** The dashboard turns data into awareness. A parent who sees "average 45g sugar/day" will start choosing differently. No lecture needed — the data speaks.

#### 5e. Admin: Nutritional Data Management

- When creating/editing menu items, nutritional fields are **prominently displayed** (not collapsed in an "advanced" section)
- Completeness indicator on admin menu list: green checkmark if nutritional data is filled, amber warning if missing
- Bulk nutritional data import: admin uploads CSV with item names + nutritional values (for schools using a catering service that provides this data)
- "Nutritional Data Coverage" stat on admin dashboard: "72% of menu items have complete nutritional info"

**Why:** The calorie counter is only as good as the data behind it. Making data entry visible and trackable ensures admins actually fill it in.

#### 5f. Nutritional Data on Receipts/Order Confirmations

When a parent confirms an order, the confirmation screen and any emailed receipt includes:
- Per-day nutritional summary (total calories, protein, carbs, fat, sugar)
- Simple traffic light indicator (green/amber/red) per day
- Weekly average if it's a weekly order

**Why:** Reinforces awareness at the confirmation moment. Parents who see the numbers repeatedly start internalizing them.

---

## New Data Requirements

### Backend: New Models/Endpoints Needed

**PreOrder Model**
```
PreOrder {
  _id, schoolId, studentId, parentId,
  weekStartDate,          // Monday of the order week
  days: [{
    date,                 // specific day
    items: [{ menuItemId, name, quantity, unitPrice, totalPrice, nutritionalInfo }],
    dayTotal,             // cents
    status: 'scheduled' | 'preparing' | 'ready' | 'collected' | 'cancelled' | 'uncollected',
    collectionPeriod: 'first_break' | 'second_break' | 'lunch',
    packedBy,             // staff userId who packed it
    collectedAt,          // timestamp
  }],
  weeklyTotal,            // cents
  walletTransactionId,    // payment ref
  paymentStatus: 'paid' | 'partially_refunded' | 'refunded',
  createdAt, updatedAt
}
```

**New Endpoints**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tuck-shop/menu/available` | Menu items available for pre-order (in stock, not deleted) |
| `POST` | `/tuck-shop/pre-orders` | Parent creates a weekly pre-order |
| `GET` | `/tuck-shop/pre-orders/my` | Parent's pre-orders (upcoming + past) |
| `GET` | `/tuck-shop/pre-orders/daily?date=` | Kitchen: all pre-orders for a date |
| `GET` | `/tuck-shop/pre-orders/daily/summary?date=` | Kitchen: aggregated item quantities for a date |
| `PATCH` | `/tuck-shop/pre-orders/:id/days/:date/cancel` | Parent cancels a single day |
| `PATCH` | `/tuck-shop/pre-orders/:id/days/:date/status` | Staff updates day status (preparing/ready/collected) |
| `GET` | `/tuck-shop/pre-orders/student/:id/nutrition?from=&to=` | Nutritional summary for a student |
| `GET` | `/tuck-shop/pre-orders/student/:id/nutrition/weekly?week=` | Weekly day-by-day nutrition breakdown |
| `GET` | `/tuck-shop/pre-orders/student/:id/nutrition/trends?months=` | Monthly nutrition trend data |
| `GET` | `/tuck-shop/nutrition/guidelines` | Age-group nutritional guidelines |
| `PUT` | `/tuck-shop/nutrition/guidelines` | Admin customizes school's nutritional guidelines |
| `GET` | `/tuck-shop/menu/nutrition-coverage` | Admin: % of items with complete nutritional data |
| `GET` | `/tuck-shop/settings` | Get tuckshop settings (cutoff time, collection periods) |
| `PUT` | `/tuck-shop/settings` | Admin updates tuckshop settings |

**TuckshopSettings Model**
```
TuckshopSettings {
  schoolId,
  orderCutoffTime: '20:00',       // time after which orders go to next day
  collectionPeriods: ['first_break', 'second_break'],
  allowStudentOrdering: true,
  allowSameDayOrdering: true,      // can students/parents order for today?
  sameDayCutoffTime: '07:30',     // if same-day allowed, must be before this time
  maxDaysAhead: 7,                 // how far ahead can you order
  cancellationCutoffHours: 12,     // hours before the day that cancellation is allowed
}
```

---

## Frontend Components Needed

| Component | Path | Purpose |
|-----------|------|---------|
| `MenuShopGrid` | `src/components/tuckshop/MenuShopGrid.tsx` | E-commerce style item grid with add-to-cart |
| `ShopCart` | `src/components/tuckshop/ShopCart.tsx` | Cart drawer with daily breakdown |
| `WeeklyPlanner` | `src/components/tuckshop/WeeklyPlanner.tsx` | Mon–Fri grid for assigning items to days |
| `DayColumn` | `src/components/tuckshop/DayColumn.tsx` | Single day column in weekly planner |
| `OrderCheckout` | `src/components/tuckshop/OrderCheckout.tsx` | Review + confirm + pay screen |
| `MyOrders` | `src/components/tuckshop/MyOrders.tsx` | Parent/student order list with status |
| `OrderStatusBadge` | `src/components/tuckshop/OrderStatusBadge.tsx` | Color-coded status badge |
| `KitchenPrepList` | `src/components/tuckshop/KitchenPrepList.tsx` | Kitchen daily prep view |
| `KitchenItemSummary` | `src/components/tuckshop/KitchenItemSummary.tsx` | Aggregated item totals |
| `OrderFulfillment` | `src/components/tuckshop/OrderFulfillment.tsx` | Check-off packed/collected flow |
| `NutritionSummary` | `src/components/tuckshop/NutritionSummary.tsx` | Weekly nutrition breakdown for parents |
| `CalorieCounter` | `src/components/tuckshop/CalorieCounter.tsx` | Live calorie/macro bar that updates as items are added to cart |
| `NutritionLabel` | `src/components/tuckshop/NutritionLabel.tsx` | Expandable nutrition facts panel on each menu item card |
| `MacroBar` | `src/components/tuckshop/MacroBar.tsx` | Stacked horizontal bar showing protein/carbs/fat split |
| `NutritionGuideline` | `src/components/tuckshop/NutritionGuideline.tsx` | Green/amber/red indicator against age-appropriate daily target |
| `MealSuggestion` | `src/components/tuckshop/MealSuggestion.tsx` | Gentle suggestion card when daily selection is imbalanced |
| `NutritionTrends` | `src/components/tuckshop/NutritionTrends.tsx` | Monthly trend charts for the parent nutrition dashboard |
| `NutritionCoverage` | `src/components/tuckshop/NutritionCoverage.tsx` | Admin widget showing % of items with nutritional data filled |
| `ChildSelector` | `src/components/tuckshop/ChildSelector.tsx` | Pick which child to order for |
| `CutoffBanner` | `src/components/tuckshop/CutoffBanner.tsx` | "Orders close at 8pm" countdown banner |

## Zustand Store

**`usePreOrderStore`** (`src/stores/usePreOrderStore.ts`)
```
{
  selectedChildId: string | null,
  weekStartDate: string,
  days: Record<string, CartItem[]>,   // keyed by ISO date
  
  addItemToDay(date, item),
  removeItemFromDay(date, menuItemId),
  updateQuantity(date, menuItemId, qty),
  copyDayToAll(sourceDate),
  clearDay(date),
  clearAll(),
  setChild(childId),
  setWeek(weekStartDate),
  
  dayTotal(date): number,
  weeklyTotal(): number,
  itemCount(): number,
  
  // Nutrition tracking (computed from item nutritionalInfo)
  dayNutrition(date): { calories, protein, carbs, fat, sugar },
  weeklyNutrition(): { calories, protein, carbs, fat, sugar },
  isOverGuideline(date, childAge): 'green' | 'amber' | 'red',
}
```

---

## User Flows

### Parent Orders for the Week
1. Parent opens `/parent/tuckshop`
2. Selects child (if multiple children)
3. Sees this week's menu with images, prices, allergen info
4. Taps "Plan the Week" → enters weekly planner view
5. For Monday: browses items, taps to add cheese roll + juice
6. For Tuesday: adds sandwich + fruit
7. Uses "Copy Monday to Wednesday" for same order
8. Reviews weekly summary: 5 days, R185 total
9. Taps "Pay & Confirm" → wallet debited R185
10. Gets confirmation: "Orders placed for 10–14 March"
11. Each morning, tuckshop staff sees the prep list

### Tuckshop Staff Prepares Orders
1. Staff opens `/admin/tuckshop/kitchen`
2. Sees today's date, total orders: 87
3. Views aggregate: "45 cheese rolls, 30 juices, 12 sandwiches needed"
4. Preps items, then switches to individual order view
5. Packs each order, checks it off as "ready"
6. At break time, students collect — staff marks "collected" on scan/name

### Parent Cancels Thursday's Order
1. Parent opens "My Orders"
2. Sees Thursday is still `scheduled` (it's Tuesday evening, within cutoff)
3. Taps "Cancel Thursday" → confirms
4. Thursday items cancelled, wallet credited for that day's total
5. Weekly order status shows "4/5 days active, 1 cancelled"

---

## Why This Matters
- **Parents**: Order from your phone on Sunday night, your child is fed all week. No cash, no forgotten lunch money, no queuing
- **Students**: Walk up at break, grab your labelled bag, done in 30 seconds
- **Tuckshop staff**: Know exactly what to prepare. No guessing, no waste, no rush
- **School admin**: Higher tuckshop revenue (convenience drives spending), less cash handling, full audit trail
- **This is the feature that makes parents tell other parents about Campusly**

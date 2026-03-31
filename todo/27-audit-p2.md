# 27 — Audit — Phase 2

## Current State
Tamper-evident activity log framework with middleware. Not yet wired into module routers.

## Phase 2 Enhancements

### 1. Wire Audit Middleware Into All Modules
- This is completion, not a new feature — the framework exists but isn't active
- Priority modules: Auth (logins), Fees (payments), Students (enrollment changes)
- **Why:** An audit system that doesn't audit anything is just code. This needs to be turned on

### 2. Admin Audit Viewer
- Searchable, filterable log viewer in the admin dashboard
- Filter by user, action type, entity, date range
- **Why:** When something goes wrong ("who deleted that student?"), admins need answers fast

### 3. Compliance Export
- One-click CSV export of audit logs for a date range
- Include field-level changes where available
- **Why:** Schools must comply with POPIA (SA data protection). An exportable audit trail is a compliance requirement, not a nice-to-have

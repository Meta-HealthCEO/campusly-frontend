# 25 — Announcement — Phase 2

## Current State
Targeted announcements with priority, scheduling, read receipts, draft/publish states.

## Phase 2 Enhancements

### 1. Push on Publish
- When an announcement is published, trigger a notification to all targeted users
- Urgent announcements trigger an immediate push notification
- **Why:** Announcements that sit unread in a portal are useless. Push makes them seen

### 2. Scheduled Auto-Publish
- Background job that publishes announcements at their scheduled date/time
- Currently requires manual publish even when a schedule date is set
- **Why:** The scheduling feature is half-built. Completing it makes it actually useful

### 3. Announcement Read Analytics
- Dashboard showing: total recipients, read count, read rate, time-to-read distribution
- Highlight which grades/classes have low read rates
- **Why:** Helps admin understand if communications are reaching people and adjust strategy

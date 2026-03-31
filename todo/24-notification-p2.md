# 24 — Notification — Phase 2

## Current State
Multi-channel notifications (email, SMS, push, in-app), preferences, unread counts. Email/SMS/push queued but not dispatched.

## Phase 2 Enhancements

### 1. Actually Deliver Email/SMS/Push
- Wire up email (SendGrid/SES), SMS (Twilio/BulkSMS), and browser push
- This is the single biggest gap across the entire platform — dozens of modules trigger notifications that go nowhere
- **Why:** Without delivery, notifications are just database entries. The platform feels dead to users

### 2. Notification Preferences Page
- User can toggle each channel (email, SMS, push, in-app) per notification type
- Quiet hours / do-not-disturb schedule
- **Why:** Users who get spammed disable everything. Granular control keeps them engaged

### 3. Notification Grouping
- Group related notifications: "3 new homework assignments" instead of 3 separate pushes
- Digest mode: batch notifications into a daily summary email
- **Why:** Notification fatigue is real. Smart grouping keeps the signal-to-noise ratio high

### 4. Browser Push Setup
- Service worker registration, permission prompt, subscription management
- **Why:** Push notifications are the only way to re-engage users who aren't in the app. Critical for parent engagement

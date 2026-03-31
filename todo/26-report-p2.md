# 26 — Report — Phase 2

## Current State
Read-only analytics aggregating Academic, Attendance, Fee, TuckShop, Homework, Event data. Dashboard stats and basic charts.

## Phase 2 Enhancements

### 1. PDF/CSV Export for All Reports
- Every report screen gets a "Download PDF" and "Export CSV" button
- PDF with school branding for formal reports (to present to governing body)
- CSV for admin data analysis in Excel
- **Why:** Reports that can't leave the screen are only half useful. Principals present to boards. Bursars reconcile in Excel

### 2. Teacher Class Report
- Per-class breakdown: attendance, academic performance, homework completion
- Teacher sees their classes only
- **Why:** Teachers need class-level data to adjust teaching strategy. Currently they have no report view at all

### 3. Scheduled Report Emails
- Admin configures weekly/monthly auto-email of key reports (fee collection, attendance, etc.)
- **Why:** Principals want a Monday morning email with last week's numbers. Not everyone logs into a dashboard

### 4. Custom Date Range Filtering
- All reports support from/to date selection
- Preset ranges: this week, this month, this term, this year
- **Why:** "Show me attendance for Term 1 only" is a basic requirement that makes every report 10x more useful

# TODO 41 — Module Completeness Gaps (Finishing Touches)

> **Priority:** MEDIUM-HIGH — These are the "last mile" items that make each existing module feel complete and polished.

## Context
Deep audit of all 32 backend modules and 95+ frontend pages revealed these gaps in existing modules that aren't covered by other todo files. These are usability, completeness, and integration gaps.

---

## 1. Auth Module Gaps
- [ ] Reset password page (`/reset-password`) — exists but needs proper API wiring and testing
- [ ] Session management page — view active sessions, revoke others
- [ ] Password strength meter on registration/change password
- [ ] Account lockout after failed attempts (backend exists, frontend indicator missing)

## 2. Student Module Gaps
- [ ] Student edit form — update student details (page exists but not fully wired)
- [ ] Student delete/archive flow with confirmation and cascade warnings
- [ ] Student photo upload — profile photos on cards and lists
- [ ] Student medical profile — emergency contact quick-view on class lists
- [ ] Student transfer workflow — transfer between classes, grades, schools
- [ ] Sibling detection — auto-link siblings by parent email match

## 3. Staff Module Gaps
- [ ] Staff profile page — view/edit own profile
- [ ] Staff deactivation workflow with handover (reassign classes, subjects)
- [ ] Staff qualifications and certifications tracking
- [ ] Teacher subject specialisation badges visible to parents
- [ ] Substitute teacher pool management

## 4. Academic Module Gaps
- [ ] Timetable clash detection — warn when same teacher assigned to two classes at same time
- [ ] Automatic class allocation based on subject choices (Grade 10+ FET)
- [ ] Subject choice form for students entering FET phase
- [ ] Report card PDF generation — currently data exists but no PDF renderer
- [ ] LURITS export — endpoint exists but needs data mapping verification
- [ ] Grade promotion wizard — batch promote/retain students at year end
- [ ] Exam timetable clash detection

## 5. Homework Module Gaps
- [ ] Homework attachment downloads (files stored but download may not work)
- [ ] Late submission policy configuration (per school: accept late, reject, mark penalty)
- [ ] Homework analytics — submission rate per class, average marks, late percentage
- [ ] Parent homework visibility — parents see what's assigned and submission status
- [ ] Re-submission tracking — show revision history

## 6. Attendance Module Gaps
- [ ] Attendance heatmap visualisation (day of week × time of day)
- [ ] Chronic absence auto-detection — flag students below 80% attendance
- [ ] Late arrival pattern tracking — identify habitually late students
- [ ] Medical certificate upload for excused absences
- [ ] Attendance SMS to parent within 30 minutes of unmarked absence

## 7. Library Module Gaps
- [ ] Barcode/ISBN scanning for quick book lookup
- [ ] Overdue fine auto-calculation and integration with fees module
- [ ] Book reservation/waitlist system
- [ ] Reading level recommendations based on student grade
- [ ] Library usage analytics dashboard

## 8. Transport Module Gaps
- [ ] Route map visualisation (Google Maps integration or static map)
- [ ] Route capacity indicator — seats available vs assigned
- [ ] Driver contact information (emergency use)
- [ ] Transport fee auto-linking to fees module
- [ ] ETA notifications for parents (requires GPS integration — future)

## 9. Tuckshop Module Gaps
- [ ] Menu item photo upload — visual menu for students/parents
- [ ] Category-based menu browsing (snacks, drinks, meals)
- [ ] Stock auto-reorder alerts when below threshold
- [ ] Nutritional information display on menu items
- [ ] Daily specials highlighting
- [ ] Parent pre-order capability (order today, pick up tomorrow)

## 10. Events Module Gaps
- [ ] Event photo gallery — upload photos post-event
- [ ] Event feedback/rating system — parents rate events
- [ ] iCal export for adding to personal calendar
- [ ] Waitlist with auto-notification when spots open
- [ ] Event volunteer sign-up

## 11. Consent Module Gaps
- [ ] PDF export of signed consent forms (compliance requirement)
- [ ] Consent completion dashboard — which parents haven't signed yet
- [ ] Auto-reminder to non-respondents (3 days, 1 day before deadline)
- [ ] Bulk consent creation for recurring events

## 12. Fundraising Module Gaps
- [ ] Campaign progress bar visualisation on public page
- [ ] Social media sharing links for campaigns
- [ ] Donor wall privacy settings (anonymous donations)
- [ ] Campaign expiry and auto-close

## 13. Lost & Found Module Gaps
- [ ] Photo upload for found items
- [ ] Name label search integration (search by student name on label)
- [ ] Monthly lost item hotspot report (where are items being lost?)
- [ ] Auto-archive after configurable period (e.g., 30 days unclaimed)

## 14. Aftercare Module Gaps
- [ ] Late pickup escalation — auto-SMS at 15min, 30min, 45min
- [ ] Photo verification for authorised pickup
- [ ] Activity calendar view for parents
- [ ] Aftercare fee auto-generation linked to attendance

## 15. Achiever Module Gaps
- [ ] Badge design upload — custom achievement badges
- [ ] Achievement notification to student and parent
- [ ] Weekly house point digest
- [ ] Streak tracking (consecutive days of good behaviour, etc.)
- [ ] Leaderboard by class/grade (not just house)

## 16. Uniform Module Gaps
- [ ] Size recommendation based on student age/grade
- [ ] Second-hand item photo upload
- [ ] Order status email/WhatsApp notifications
- [ ] Uniform requirement list per grade (what to buy)

## 17. Learning Module Gaps
- [ ] Study material organisation into folders/collections
- [ ] Quiz timer mode (countdown during quiz)
- [ ] Quiz retry mode with different question order
- [ ] Content recommendation engine based on quiz results
- [ ] Video content support (YouTube embed or upload)

## 18. Communication Module Gaps
- [ ] Message scheduling — compose now, send later
- [ ] Message read receipt dashboard
- [ ] Template variable auto-population (student name, class, etc.)
- [ ] Emergency broadcast mode with delivery confirmation
- [ ] Multi-language message support (EN, AF, ZU, XH)

## 19. SuperAdmin Module Gaps
- [ ] Platform MRR/ARR dashboard
- [ ] School health score (engagement metrics)
- [ ] Automated onboarding checklist for new schools
- [ ] Feature usage analytics per school (which modules are actually used)
- [ ] Churn prediction based on engagement patterns

## 20. Reports Module Gaps
- [ ] PDF export for all report types (currently data tables only)
- [ ] Scheduled report emails (weekly/monthly to headmaster)
- [ ] Custom date range filtering across all reports
- [ ] Year-over-year comparison views
- [ ] Report favourites/bookmarks

## 21. Audit Module Gaps
- [ ] POPIA compliance export (CSV format for data officer)
- [ ] Sensitive data access logging (who viewed medical records, financial data)
- [ ] Audit retention policy configuration
- [ ] Automated compliance checklist

## 22. Migration Module Gaps
- [ ] Duplicate detection before import (match by ID number, email, admission number)
- [ ] Incremental/delta import support
- [ ] Import rollback capability
- [ ] Post-migration validation report

## 23. Cross-Module Integration Gaps
- [ ] Student 360 view — single page showing all data across modules (exists in workbench, needs student/parent version)
- [ ] Unified search — search students, staff, parents across all modules from top bar
- [ ] Dashboard customisation — drag-and-drop widgets per role
- [ ] Export anything — CSV/PDF export button on every data table
- [ ] Print view — optimised print CSS for reports, report cards, invoices
- [ ] Breadcrumb navigation — auto-derived from route segments
- [ ] Global keyboard shortcuts — Ctrl+K for search, etc.

---

## Prioritisation Guide

### Do First (High Impact, Quick Wins)
1. Report card PDF generation
2. Student photo upload
3. Homework parent visibility
4. Attendance chronic absence alerts
5. Consent PDF export
6. Export buttons on all data tables

### Do Second (High Impact, Medium Effort)
1. Student 360 view for parents
2. Timetable clash detection
3. Library fine → fees integration
4. Transport fee → fees integration
5. Aftercare fee → attendance integration
6. POPIA compliance export

### Do Third (Polish & Completeness)
1. Event photo gallery
2. Badge design upload
3. Menu item photos
4. Size recommendations
5. Dashboard widgets customisation

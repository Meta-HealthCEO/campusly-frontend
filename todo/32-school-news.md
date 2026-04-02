# 32 — School News & Achievements Portal

## Overview
An AI-driven news website/feed for showcasing school achievements, events, and milestones. Acts as the public-facing "brag board" for the school — parents, students, and the community can see what's happening.

## Core Features

### 1. AI-Generated Articles
- Auto-generate news articles from school data (sports results, academic achievements, event completions)
- AI writes engaging, publication-ready copy from raw data inputs
- Teacher/admin reviews and approves before publishing
- **Why:** Schools have the data but not the time or writing resources to turn achievements into stories. AI closes that gap

### 2. Achievement Feed
- Aggregates achievements from across modules (Achiever, Sports, Academic, Events, Fundraising)
- Per-student achievement timeline visible to parents
- School-wide feed for community visibility
- **Why:** Achievements are scattered across modules. A unified feed makes them discoverable and celebratory

### 3. Public School News Page
- Public-facing page (no login required) — shareable link per school
- School branding, logo, colours
- SEO-friendly for Google indexing
- Responsive design for mobile sharing (WhatsApp, Facebook)
- **Why:** Parents share school achievements on social media. A clean public page makes the school look professional and drives word-of-mouth

### 4. AI Content Tools
- AI headline generation and tone adjustment (formal, celebratory, casual)
- Auto-summarise long event recaps into social-media-length posts
- AI-suggested images/illustrations based on article content (future: integrate image gen)
- **Why:** Different channels need different tones. A newsletter needs formal copy; a WhatsApp share needs a punchy one-liner

### 5. Categories & Filtering
- Categories: Academic, Sports, Arts, Community, Events, Fundraising, General
- Filter by term, class, student, category
- Featured/pinned articles
- **Why:** A flat feed gets noisy fast. Categories let parents find what matters to them

### 6. Notifications & Distribution
- Push notification to parents when their child is featured
- Optional email digest (weekly school news roundup)
- Integration with announcement module for cross-posting
- **Why:** Publishing without distribution means nobody sees it. Targeted notifications ensure the right people see the right achievements

### 7. Media Gallery
- Photo and video uploads attached to articles
- Gallery view for events (sports day, prize giving, etc.)
- Parental consent check before publishing student photos (integrates with Consent module)
- **Why:** Visual content drives engagement. Parents want to see photos, not just read text

## Data Sources (Auto-Pull)
| Source Module | Data |
|---|---|
| Achiever | Awards, badges, recognition |
| Sports | Match results, team standings, individual records |
| Academic | Top performers, class averages, exam results (anonymised) |
| Events | Event summaries, attendance |
| Fundraising | Campaign milestones, totals raised |
| Attendance | Perfect attendance recognition |

## Access Control
- **Admin/Principal:** Full CRUD, publish/unpublish, manage categories
- **Teacher:** Draft articles, submit for approval
- **Parent/Student:** Read-only public feed, personal achievement timeline
- **Public:** Read-only school news page (no login)

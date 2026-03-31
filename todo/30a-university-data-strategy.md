# 30a — University Data: How We Get It

## The Challenge

We need structured data for ~26 public universities, ~50 TVET colleges, and ~20+ private institutions. Per institution we need programmes (hundreds per university), each with APS requirements, subject requirements, fees, deadlines. This data changes annually.

No single API or dataset exists. Here's how we build it.

---

## Strategy: Layered Approach (cheapest → richest)

### Layer 1: Government Open Data (FREE — start here)

**DHET (Department of Higher Education and Training)**
- Publishes the HEMIS (Higher Education Management Information System) dataset annually
- Contains: every registered programme at every public university, qualification type, NQF level, CESM codes
- Available at: https://www.dhet.gov.za or via data.gov.za
- Format: CSV/Excel downloads
- What it gives us: the full list of institutions + programmes + qualification types
- What it doesn't give us: APS requirements, subject requirements, tuition fees

**SAQA (South African Qualifications Authority)**
- National Learners' Records Database
- Every accredited qualification in SA is registered with SAQA
- Searchable at: https://regqs.saqa.org.za/
- Contains: NQF level, credits, accreditation status, provider
- Can be scraped (structured HTML pages with consistent format)

**CHE (Council on Higher Education)**
- Programme accreditation database
- Confirms which programmes are currently accredited at which institutions

**Action:** Download HEMIS data → seed the University and Programme tables with names, types, faculties, qualification types. This gives us the skeleton — every programme that exists, at every institution, for free.

---

### Layer 2: University Prospectuses (MANUAL — high effort, high value)

Every university publishes an annual prospectus (PDF or web) with:
- Programme descriptions
- Admission requirements (APS + subjects)
- Application dates and fees
- Tuition fees

**Approach:**
- Hire 2-3 data capturers for a 4-6 week project
- Each capturer works through assigned universities
- Standardized Google Sheet template:
  | University | Faculty | Programme | Qual Type | Min APS | Subject 1 | Min % | Subject 2 | Min % | ... | NBT Required | Tuition | Deadline |
- Data is then imported into the database via the Migration module pattern (CSV → validate → import)

**Cost estimate:** 3 people × 6 weeks × ~R200/hour part-time = ~R30-50k
**Coverage:** All 26 public universities, top 10 private institutions

**This is the most realistic path for year 1.** The data doesn't change dramatically year-to-year — most programmes keep the same requirements. Annual update is a 2-week refresh, not a full redo.

---

### Layer 3: Web Scraping (AUTOMATED — supplements manual)

Most university websites have structured programme pages. Examples:

- **UCT:** https://www.uct.ac.za/study/undergraduate — each programme on its own page with consistent HTML structure
- **Wits:** https://www.wits.ac.za/undergraduate/ — similar structure
- **UP:** https://www.up.ac.za/programmes — filterable programme listing
- **UJ:** https://www.uj.ac.za/studyatUJ/ — programme pages per faculty
- **Stellenbosch:** https://www.sun.ac.za/english/faculty/ — per-faculty programme listings

**Approach:**
- Build scrapers per university (each site has different structure)
- Run annually before application season (April-May)
- Output: structured JSON per programme
- Human review before import (scraping catches 80%, human fixes the rest)

**Tools:** Playwright/Puppeteer for JS-rendered pages, Cheerio for static HTML

**Realistic assessment:**
- ~10 universities have well-structured sites that are scrapable
- ~10 have messy sites where manual is faster
- ~6 are PDF-only prospectuses (can't scrape, must manually capture or use AI to extract from PDF)

**AI-assisted PDF extraction:**
- For universities that only publish PDF prospectuses
- Feed PDF to Claude/GPT with a structured extraction prompt
- Output: JSON with programme requirements
- Human review required (AI extraction is ~90% accurate for structured tables)

---

### Layer 4: Crowdsource from Schools (FREE — supplement + keep fresh)

Once the base data is captured, use the Campusly school network to keep it current:

- **Flag outdated info:** Any user can flag "this requirement seems wrong" on a programme
- **Teacher contributions:** Career guidance teachers at schools can submit corrections
- **Student feedback:** After applying, students confirm whether stated requirements matched reality
- **Admin review queue:** Flagged items go to a review queue, admin approves/rejects changes

This doesn't replace the base data — it keeps it alive between annual refreshes.

---

### Layer 5: University Partnerships (LONG-TERM — the dream)

**Direct data feed from universities.**

- Approach admissions offices with a value proposition: "We have X thousand Grade 11-12 learners on our platform. We can send you qualified applicants directly."
- Start with 2-3 universities (UJ, NWU, and CPUT are typically progressive with tech)
- Simple API or annual CSV exchange of programme requirements
- In return: Campusly features their programmes prominently, drives applications

**CAO (Central Applications Office):**
- Handles applications for KZN universities (UKZN, DUT, MUT, UNIZULU)
- Has structured programme data for all member institutions
- Potential API partner
- Worth approaching early — one partnership = 4 universities covered

**This is a 12-18 month play**, not a launch feature. But once one university signs on, others follow.

---

## Recommended Execution Plan

| Phase | Timeline | Action | Coverage |
|-------|----------|--------|----------|
| **Seed** | Week 1-2 | Download HEMIS data, seed all institutions + programme names | 100% of names, 0% requirements |
| **Core capture** | Week 3-8 | Manual data capture from prospectuses (top 15 universities) | 15 universities, full requirements |
| **Expand** | Week 9-12 | Complete remaining universities + top TVET colleges | All 26 public + 10 private |
| **Automate** | Month 4-5 | Build scrapers for top 10 university websites | Auto-refresh for 10 universities |
| **AI extract** | Month 4-5 | PDF extraction for PDF-only prospectuses | Remaining universities |
| **Crowdsource** | Month 6+ | Enable user flagging and teacher contributions | Ongoing freshness |
| **Partnerships** | Month 8+ | Approach 3 universities + CAO | Direct data feed |

---

## Annual Maintenance Cycle

University requirements typically update in **March-April** for the following year's intake.

1. **April:** Run scrapers on automated universities
2. **April-May:** Data capturers update remaining universities from new prospectuses
3. **May:** AI extraction on updated PDF prospectuses
4. **June:** Human review of all changes
5. **June:** Push update to production before application season opens (most open July-September)
6. **Year-round:** Process crowdsourced flags

**Estimated annual maintenance cost:** ~R10-15k (2 weeks of data capture work)

---

## Data Quality Rules

- Every programme MUST have: university, name, qualification type, minimum APS
- Subject requirements are STRONGLY encouraged but not blocking (some programmes only specify APS)
- Tuition fees are marked with the year they were captured (fees change annually)
- Application deadlines are mandatory for programmes with known dates
- Any field not confirmed is marked `unverified` — shown to users with a disclaimer
- Last-updated timestamp displayed on every programme card: "Requirements verified March 2026"

---

## What We DON'T Need to Get Perfect on Day 1

- **Every private institution** — start with public universities where 80% of students apply
- **Postgraduate programmes** — start with undergraduate only
- **Every bursary** — start with NSFAS + the top 20 corporate bursaries
- **Application API integration** — start with tracker + pre-filled PDF, no direct submission
- **Real-time application status** — manual status entry by student is fine for v1

The database doesn't need to be perfect to be useful. A student who sees "You qualify for BSc Computer Science at UCT (APS 36 required, you have 38)" — even if 5% of programmes are missing — that's infinitely better than what they have today, which is nothing.

---

## Cost Summary

| Item | Once-off | Annual |
|------|----------|--------|
| Initial data capture (3 people × 6 weeks) | R30-50k | — |
| Scraper development | R0 (we build it) | — |
| Annual data refresh | — | R10-15k |
| AI PDF extraction (API costs) | ~R500 | ~R500 |
| University partnership outreach | Time only | Time only |
| **Total** | **~R30-50k** | **~R10-15k** |

For context: if this feature helps Campusly onboard even 5 new schools, it pays for itself in month 1.

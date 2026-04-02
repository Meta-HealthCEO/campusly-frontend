# 33 — Sports Performance & Stats Hub

## Overview
A comprehensive sports performance management system — the stats hub for sports kids, coaches, and parents. Covers everything from player statistics and team selection through to fitness tracking, injury management, and rehabilitation.

## Core Features

### 1. Player Stats Hub
- Per-player dashboard: appearances, goals/tries/points, assists, clean sheets, personal bests
- Multi-sport support — configurable stat fields per sport (rugby: tackles, cricket: batting avg, athletics: PBs)
- Season-over-season comparison graphs
- Leaderboards per team, per sport, per age group
- Shareable player profile card (parents can share on social media)
- **Why:** Stats drive motivation. Kids want to see their numbers, parents want to brag, coaches need data for selection

### 2. Team Selection
- Coach builds team sheets from squad roster
- Selection history — track who was selected for each fixture
- Fair-play tracking — flag players who haven't been selected in X matches
- Selection criteria notes (private, coach-only)
- Auto-notify parents when their child is selected/not selected for a fixture
- **Why:** Team selection is one of the most politically charged parts of school sport. A transparent, data-backed system reduces complaints

### 3. Fitness & Performance Testing
- Record fitness test results: beep test, sprint times, agility, strength benchmarks
- Track progress over terms/seasons
- Age-group benchmarks and percentile rankings
- AI-generated fitness reports per student
- **Why:** Fitness testing happens every term but the data lives on paper clipboards. Digitising it unlocks trend analysis

### 4. Injury Register & Rehab Tracking
- Log injuries: type, severity, date, sport, how it happened
- Injury status: active, rehab, cleared to play
- Rehab programme: exercises, milestones, expected return date
- Coach/teacher cannot select injured player until cleared
- Medical clearance workflow (physio/doctor signs off)
- Injury history per player — flag recurring injuries
- **Why:** Schools have a duty of care. An injured kid returning too early is a liability and a safety risk. This protects kids and protects the school

### 5. Training & Practice Management
- Schedule training sessions per team
- Attendance tracking for training (separate from match attendance)
- Training programme builder: drills, duration, objectives
- Track training load — flag overtraining risk
- **Why:** Coaches need to know who's pitching up to practice, not just to matches. Training attendance influences selection

### 6. AI Performance Analytics
- AI analyses stats over time — identifies trends, strengths, weaknesses
- Predictive insights: "Player X's sprint times are declining — possible fatigue or growth spurt"
- Per-team performance reports for coaches
- Per-student reports for parents (termly)
- Injury risk prediction based on training load + injury history
- **Why:** Raw stats are just numbers. AI turns them into coaching insights

### 7. Scouting & Talent Identification
- Tag standout performers across age groups
- AI-flagged talent based on stat thresholds and improvement trajectories
- Exportable scouting reports for provincial/regional trials
- **Why:** Schools miss talent because nobody's tracking the U12 kid who's quietly outperforming U14s. Data catches what human bias misses

### 8. Parent & Student Portal
- Parents see their child's stats, fitness results, injury status, selection history
- Students see their own dashboard with goals and progress
- No access to other students' data (privacy)
- **Why:** Parents want visibility without having to ask the coach. Students want ownership of their progress

## Sport-Specific Stat Templates
| Sport | Key Stats |
|---|---|
| Rugby | Tries, tackles, conversions, penalties, yellow/red cards, appearances |
| Cricket | Runs, batting avg, wickets, bowling avg, catches, overs bowled |
| Soccer | Goals, assists, clean sheets, yellow/red cards, appearances |
| Hockey | Goals, assists, green/yellow/red cards, appearances |
| Netball | Goals scored, interceptions, centre passes, appearances |
| Athletics | Event PBs (100m, 200m, long jump, etc.), placements, improvements |
| Swimming | Event PBs (50m free, 100m breast, etc.), placements, improvements |
| Tennis | Wins, losses, sets won/lost, tournament results |
| Cross Country | Times, placements, course PBs |

## Access Control
- **Coach/Teacher:** Full CRUD on stats, injuries, training, team selection
- **Admin/Principal:** Read all, manage sport config, view school-wide reports
- **Parent:** Read-only for their child — stats, fitness, injuries, selection
- **Student:** Read-only personal dashboard
- **Physio/Medical:** Injury register CRUD, clearance workflow

## Integration Points
- **Achiever module:** Sports awards auto-feed into achievement system
- **School News (32):** Match results and milestones auto-generate news articles
- **AI Tools (29):** AI analytics engine powers performance insights
- **Notifications:** Selection alerts, injury updates, fixture reminders
- **Consent:** Photo/video consent checks for public-facing content

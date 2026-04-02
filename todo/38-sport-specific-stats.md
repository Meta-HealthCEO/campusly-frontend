# TODO 38 — Sport-Specific Statistics & Player Cards

> **Priority:** HIGH — This is the core differentiator. Generic goal-counting isn't enough. Cricket needs scorecards, rugby needs try stats, swimming needs times. And every player gets a FIFA FUT-style card.

## Context
The sports module has basic teams/fixtures/results/standings/MVP voting. But it treats ALL sports the same (just "goals scored"). To bridge amateur school sports to professional pathways, we need sport-specific stat recording, player profiles with career stats, and shareable player cards.

---

## 1. Sport-Specific Stat Recording

### 1a. Cricket
**Match Scorecard:**
- Batting: runs, balls faced, 4s, 6s, strike rate, how out (bowled, caught, LBW, run out, stumped, not out)
- Bowling: overs, maidens, runs conceded, wickets, economy rate, extras
- Fielding: catches, run outs, stumpings
- Match type: T20, limited overs (specify overs), test/declaration

**Career Stats:**
- Total runs, batting average, highest score, 50s, 100s
- Total wickets, bowling average, best bowling figures, 5-wicket hauls
- Total catches
- Batting/bowling averages per season

**Scorecard UI:**
- Tab per innings
- Batting table: batsman name, how out, bowler, runs, balls, 4s, 6s, SR
- Bowling table: bowler, overs, maidens, runs, wickets, economy
- Fall of wickets timeline
- Extras breakdown (wides, no balls, byes, leg byes)

### 1b. Rugby
**Match Stats:**
- Tries (scorer + minute), conversions, penalty goals, drop goals
- Tackles made, tackles missed, tackle success rate
- Carries, metres gained
- Lineout wins/losses
- Scrum wins/losses
- Turnovers won
- Cards: yellow, red (player + minute + reason)
- Points: calculated from tries (5), conversions (2), penalties (3), drop goals (3)

**Career Stats:**
- Tries, total points, appearances
- Average tackles per match, tackle success rate
- Cards count
- Position-specific stats

### 1c. Swimming
**Event Results:**
- Stroke: freestyle, backstroke, breaststroke, butterfly, IM
- Distance: 25m, 50m, 100m, 200m, 400m, 800m, 1500m
- Time: minutes:seconds.milliseconds
- Split times per lap
- Personal best tracking
- FINA points calculation (if applicable)

**Career Stats:**
- Personal bests per event
- PB progression over time (graph)
- Season bests
- Medal count (gold/silver/bronze)
- Event count per stroke

### 1d. Athletics
**Track Events:**
- Event: 100m, 200m, 400m, 800m, 1500m, 3000m, 5000m, hurdles, relay
- Time: seconds.milliseconds
- Wind reading (+/- m/s) for sprints
- Heat/final placement
- Personal best tracking

**Field Events:**
- Event: long jump, high jump, triple jump, shot put, discus, javelin, pole vault
- Distance/height in metres
- Attempt tracking (3 or 6 attempts)
- Best attempt marked
- Personal best tracking

**Combined Events:**
- Heptathlon, decathlon point calculation

**Career Stats:**
- PBs per event, progression charts, medal count

### 1e. Hockey
**Match Stats:**
- Goals (scorer + minute + assist)
- Penalty corners won/conceded
- Penalty corner conversions
- Green/yellow/red cards
- Shots on goal
- Saves (goalkeeper)

### 1f. Netball
**Match Stats:**
- Goals scored (GA and GS)
- Goal attempts and success rate
- Centre passes
- Interceptions
- Rebounds
- Penalties conceded
- Position played per quarter

### 1g. Soccer/Football
**Match Stats:**
- Goals (scorer + minute + assist)
- Shots on target, shots off target
- Corners won
- Fouls committed/won
- Yellow/red cards
- Saves (goalkeeper)
- Clean sheets

### 1h. Tennis
**Match Stats:**
- Set scores (e.g., 6-4, 3-6, 7-5)
- Aces, double faults
- First serve percentage
- Break points won/saved
- Winners, unforced errors
- Match type: singles, doubles

### 1i. Cross Country / Road Running
**Event Results:**
- Distance, time, pace per km
- Course name
- Placement
- PB tracking

### 1j. Water Polo
**Match Stats:**
- Goals, assists, steals, exclusions
- Saves (goalkeeper)

---

## 2. Player Profile / Athlete Card (FIFA FUT Style)

### 2a. Player Card Design
Each student-athlete gets a card per sport with:
- **Photo** (from student profile)
- **Name, age, grade**
- **Position** (sport-specific)
- **Overall Rating** (0-99, calculated from stats)
- **Key Stats** (6 attributes displayed as hexagon radar chart):
  - Cricket: Batting, Bowling, Fielding, Fitness, Consistency, Match Impact
  - Rugby: Attack, Defence, Kicking, Strength, Speed, Game Sense
  - Swimming: Speed, Endurance, Technique, Starts, Turns, Consistency
  - Soccer: Pace, Shooting, Passing, Dribbling, Defence, Physical
  - Athletics: Speed, Endurance, Power, Technique, Consistency, Mental
- **Card Tier**: Bronze (<50), Silver (50-69), Gold (70-84), Elite (85-99)
- **Card colour theme** per tier (like FIFA: bronze/silver/gold/TOTW)

### 2b. Rating Calculation Engine
- Algorithm per sport that converts raw stats to 0-99 ratings
- Weighted by: recent form (60%), career average (30%), big-match performance (10%)
- Auto-recalculated after each match/event
- Adjusts for age group (a Grade 8 scoring 3 tries is weighted differently to Grade 12)

### 2c. Card Gallery
- `/student/sports/card` — Student views their cards per sport
- `/admin/sport/player-cards` — Admin views all player cards
- Shareable link: public card page (privacy settings respected)
- Download as image (PNG) for sharing on social media
- Print-ready for physical card production (school merchandise opportunity)

### 2d. Card History
- Card rating history over seasons
- "Form arrow" showing trend (up/down/stable)
- Season highlights auto-populated from best performances
- "Team of the Week" / "Team of the Season" selections

---

## 3. Performance Trends & Analytics

### 3a. Individual Performance Dashboard
- Per-student, per-sport performance page
- Line charts: rating over time, key stats over time
- Bar charts: stats per season, comparison across seasons
- Personal bests timeline
- Recent form indicator (last 5 matches)

### 3b. Team Analytics
- Team performance over season
- Win/draw/loss record with trend
- Scoring patterns (when do we score? when do we concede?)
- Player contribution breakdown
- Best performing lineup analysis

### 3c. Comparison Tool
- Compare two players side-by-side
- Radar chart overlay
- Stat-by-stat comparison table
- "Who's better at...?" quick answers

---

## 4. Coaching Match Day Interface

### 4a. Live Stat Entry
- Mobile-optimised interface for coaches on match day
- Quick-tap buttons for common events (goal, try, wicket, card)
- Timer with match clock
- Auto-saves as events are recorded
- Works offline (sync when connected)

### 4b. Post-Match Report
- Auto-generated match report from stats
- Player ratings auto-calculated
- Man of the Match suggestion based on stats
- Exportable as PDF

---

## Data Models

```typescript
interface SportConfig {
  code: 'cricket' | 'rugby' | 'swimming' | 'athletics' | 'hockey' | 'netball' | 'soccer' | 'tennis' | 'cross_country' | 'water_polo';
  name: string;
  statFields: StatFieldDefinition[];
  ratingAttributes: string[]; // 6 attributes for radar chart
  ratingWeights: Record<string, number>;
  positions: string[];
}

interface StatFieldDefinition {
  key: string;
  label: string;
  type: 'number' | 'time' | 'distance' | 'select';
  options?: string[];
  unit?: string;
}

interface MatchStats {
  fixtureId: string;
  sportCode: string;
  schoolId: string;
  teamId: string;
  playerStats: PlayerMatchStats[];
  teamStats: Record<string, number>;
  scorecard?: CricketScorecard; // sport-specific nested object
  createdBy: string;
}

interface PlayerMatchStats {
  studentId: string;
  position?: string;
  stats: Record<string, number | string>;
  rating?: number; // 0-99 post-match rating
  manOfMatch?: boolean;
}

interface PlayerCard {
  studentId: string;
  sportCode: string;
  schoolId: string;
  seasonId: string;
  overallRating: number;
  attributes: Record<string, number>; // 6 key stats, each 0-99
  tier: 'bronze' | 'silver' | 'gold' | 'elite';
  position: string;
  appearances: number;
  keyStats: Record<string, number>; // career stats summary
  personalBests: Record<string, number | string>;
  formTrend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

interface PersonalBest {
  studentId: string;
  sportCode: string;
  event: string; // e.g., "100m freestyle", "long jump"
  value: number;
  unit: string;
  date: Date;
  fixtureId?: string;
  previousBest?: number;
}

interface CricketScorecard {
  innings: CricketInnings[];
  tossWonBy: 'home' | 'away';
  tossDecision: 'bat' | 'bowl';
  matchType: 't20' | 'limited_overs' | 'declaration';
  oversLimit?: number;
  result: string;
}

interface CricketInnings {
  battingTeam: string;
  batsmen: CricketBatsmanEntry[];
  bowlers: CricketBowlerEntry[];
  fallOfWickets: { wicket: number; score: number; batsmanName: string; over: number }[];
  extras: { wides: number; noBalls: number; byes: number; legByes: number };
  total: { runs: number; wickets: number; overs: number };
}
```

## API Endpoints
- `POST /api/sports/match-stats` — Record match stats
- `GET /api/sports/match-stats/:fixtureId` — Get match stats
- `GET /api/sports/player/:studentId/stats` — Get player career stats
- `GET /api/sports/player/:studentId/card` — Get player card
- `GET /api/sports/player/:studentId/personal-bests` — Get PBs
- `GET /api/sports/player/:studentId/performance-trend` — Get trends
- `GET /api/sports/team/:teamId/analytics` — Get team analytics
- `GET /api/sports/compare` — Compare players
- `POST /api/sports/live-stats` — Live stat entry (mobile)
- `GET /api/sports/sport-config/:code` — Get sport configuration

## Frontend Pages
- Enhanced `/admin/sport` with stats recording per fixture
- `/admin/sport/player/:studentId` — Player profile with stats & card
- `/student/sports/card` — Student views their player cards
- `/student/sports/stats` — Student views their performance stats
- `/parent/sports` — Parent views child's sports profile & cards
- Coach mobile view for live stat entry

## Revenue Model
- Basic sport stats: included in sports module
- Player cards & analytics: **premium bolt-on** (R100-200/month per school)
- Card printing service: R15-25 per physical card (merch opportunity)
- Scouting/export features: premium tier only

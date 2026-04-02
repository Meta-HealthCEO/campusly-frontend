# TODO 40 — AI Sports Performance Analytics & Coaching Intelligence

> **Priority:** HIGH — This bridges school sports to professional pathways. AI analyses what humans miss, identifies talent early, and prevents injuries.

## Context
Todo #33 covers the raw stats infrastructure and #38 covers sport-specific stat recording. This todo adds the AI layer on top — turning raw data into actionable intelligence for coaches, parents, and scouts.

---

## 1. AI Performance Analysis (Per Player)

### 1a. Trend Detection
- AI analyses player stats over time
- Detects: improvement trajectory, plateau, decline
- Generates natural language insights: "Thabo's batting average has improved 23% since February. His weakness against spin bowling is resolving — last 3 innings against spin: 34, 42, 28."
- Context-aware: considers age group, opposition strength, conditions

### 1b. Strengths & Weaknesses Profile
- AI generates SWOT analysis per player per sport
- Updated after each match/event
- Specific and actionable: "Strong in the set piece (lineout win rate 85%) but tackle completion drops in the last 20 minutes (67% vs 82% in first half) — conditioning focus needed"
- Feeds into player card attribute ratings

### 1c. Development Recommendations
- AI generates personalised training focus areas
- "Based on Sarah's 100m backstroke splits, her turn technique is costing 0.8 seconds — recommend 3x weekly turn drills"
- Priority ranked: highest impact improvements first
- Updated monthly or after major events

---

## 2. AI Coaching Assistant

### 2a. Match Preparation
- AI analyses opposition (if data available from shared fixtures)
- Team selection suggestions based on form + fitness + matchup
- Tactical recommendations: "Against St John's strong scrum, consider a wider game plan — our backs have 15% more line breaks than forwards this season"

### 2b. Post-Match Analysis
- Auto-generated match report from stats
- Key moments identification
- Player performance ratings with justification
- What went well / what to improve
- Comparison to season averages

### 2c. Training Load Management
- Track training frequency and intensity per player
- AI flags overtraining risk: "James has played 6 matches in 3 weeks with zero rest — injury risk elevated"
- Recommend rest days or reduced load
- Age-appropriate guidelines (don't overtrain growing bodies)

---

## 3. AI Injury Risk & Prevention

### 3a. Risk Scoring
- AI model considers: training load, match frequency, previous injuries, growth phase, sport type
- Risk score per player: low/medium/high/critical
- Dashboard with risk heatmap across squad
- Alert coaches when players enter high-risk zone

### 3b. Return-to-Play AI
- After injury recording, AI suggests recovery timeline
- Based on: injury type, severity, age, sport requirements
- Milestone tracking: light exercise → training → contact → match
- Clear-to-play recommendation (coach + medical sign-off required)

### 3c. Growth Phase Awareness
- Track student height/weight over time (from medical profile)
- AI identifies growth spurts (higher injury risk)
- Adjusts training recommendations during growth phases
- Especially important for: stress fractures, Osgood-Schlatter, Sever's disease

---

## 4. AI Talent Identification & Scouting

### 4a. Talent Flagging
- AI identifies standout performers relative to age group
- Considers: raw stats, improvement rate, consistency, big-match performance
- "Flag" system: local talent, provincial potential, national potential
- Automatic flagging when thresholds are met

### 4b. Scouting Report Generator
- AI generates professional-style scouting report per player
- Includes: player profile, key stats, strengths/weaknesses, potential ceiling, comparable players
- Exportable as PDF
- Can be shared with provincial coaches, academies, scouts

### 4c. Recruitment Profile
- Student-athlete profile page optimised for recruitment
- Academic results + sports stats + achievements combined
- Career highlights reel (if video clips attached)
- Contact school to express interest (inquiry form)
- Privacy controlled: student/parent must opt in

---

## 5. AI Team Analytics

### 5a. Performance Patterns
- When does the team perform best? (home/away, time of day, after rest)
- Scoring patterns: first half vs second half
- Defensive vulnerability windows
- Set piece effectiveness

### 5b. Optimal Lineup Prediction
- Based on historical data: which combinations perform best?
- Position-specific performance: who plays best at 10 vs 12?
- Impact substitution patterns
- Fatigue-adjusted recommendations

### 5c. Season Projection
- Based on current form: projected final standings
- Key fixtures identification: "must-win" games
- Points/runs/times needed to achieve goals

---

## 6. AI for Parents (Sports Context)

### 6a. Progress Reports
- Monthly AI-generated sports progress report per child
- Plain language: "Emma has been selected for 8 out of 10 netball matches this term. Her shooting accuracy has improved from 62% to 71%. The coach has been playing her at Goal Attack, and her interception rate suggests she could develop into a strong Goal Defence too."
- Includes: card update, rating changes, PB updates

### 6b. What Parents Can Do
- AI suggests home activities to support sports development
- "For swimming improvement: encourage 2x weekly recreational swimming. Focus on streamlining off the wall — this is where time gains are easiest."
- Age-appropriate, realistic, supportive tone

---

## Data Models

```typescript
interface AIPerformanceReport {
  studentId: string;
  sportCode: string;
  schoolId: string;
  reportType: 'match_analysis' | 'trend_report' | 'development_plan' | 'scouting_report' | 'parent_report';
  content: string; // AI-generated natural language report
  insights: AIInsight[];
  generatedAt: Date;
  dataRange: { from: Date; to: Date };
}

interface AIInsight {
  category: 'strength' | 'weakness' | 'trend' | 'risk' | 'recommendation' | 'talent_flag';
  title: string;
  description: string;
  confidence: number; // 0-1
  dataPoints: string[]; // references to supporting stats
  priority: 'low' | 'medium' | 'high';
}

interface InjuryRiskScore {
  studentId: string;
  sportCode: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: { factor: string; contribution: number; description: string }[];
  recommendations: string[];
  calculatedAt: Date;
}

interface TalentFlag {
  studentId: string;
  sportCode: string;
  level: 'school' | 'district' | 'provincial' | 'national';
  flaggedAt: Date;
  reasoning: string;
  supportingStats: Record<string, number>;
  reviewedBy?: string;
  status: 'flagged' | 'confirmed' | 'dismissed';
}
```

## API Endpoints
- `GET /api/ai-sports/player/:studentId/analysis` — Get AI performance analysis
- `GET /api/ai-sports/player/:studentId/development-plan` — Get development recommendations
- `GET /api/ai-sports/player/:studentId/injury-risk` — Get injury risk score
- `GET /api/ai-sports/player/:studentId/scouting-report` — Generate scouting report
- `GET /api/ai-sports/team/:teamId/analysis` — Team performance analysis
- `GET /api/ai-sports/team/:teamId/optimal-lineup` — Lineup recommendation
- `GET /api/ai-sports/talent-flags` — Get talent-flagged players
- `POST /api/ai-sports/talent-flags/:id/review` — Review talent flag
- `GET /api/ai-sports/match/:fixtureId/report` — Post-match AI report
- `GET /api/ai-sports/parent-report/:studentId` — Parent sports report

## Frontend Pages
- `/admin/sport/analytics` — AI sports analytics dashboard
- `/admin/sport/player/:id/ai-insights` — Per-player AI analysis
- `/admin/sport/talent` — Talent identification board
- `/admin/sport/injury-risk` — Squad injury risk dashboard
- Enhanced player card page with AI insights
- `/parent/sports/insights` — Parent AI sports reports

## Revenue Model
- AI sports analytics: **premium bolt-on** (R300-500/month per school)
- Scouting report export: R50 per report (or included in premium)
- Talent ID dashboard: premium tier only
- Parent AI reports: included in premium sports tier

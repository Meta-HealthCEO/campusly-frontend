# TODO 35 — AI Student Tutor & Subject Mentorship

> **Priority:** CRITICAL — This is the feature that puts Campusly in a different league. Every student gets a personal AI tutor available 24/7.

## Context
Campusly has AI paper generation and grading for teachers, but ZERO student-facing AI. South African students — especially in under-resourced schools — desperately need accessible tutoring. This module gives every student an AI mentor that knows their curriculum (CAPS), their grades, their weak areas, and can explain concepts at their level.

---

## 1. AI Tutor Chat Interface (Student-Facing)

### 1a. Subject-Specific Chat
- Student selects a subject from their enrolled subjects
- Opens a chat interface (like ChatGPT but curriculum-aware)
- AI knows: the student's grade level, their recent marks, CAPS curriculum topics
- Persistent chat history per subject (can pick up where they left off)
- Suggested prompts: "Explain photosynthesis", "Help me with quadratic equations", "What's the difference between mitosis and meiosis?"

### 1b. Homework Help Mode
- Student can reference a specific homework assignment
- AI reads the homework question and provides guided hints (NOT answers)
- Socratic method: asks leading questions to guide understanding
- Step-by-step problem solving with explanations at each step
- Teacher configurable: allow/restrict AI help per assignment

### 1c. Concept Explainer
- Student highlights a topic from their curriculum
- AI explains at multiple levels: simple → intermediate → advanced
- Visual aids: generates diagrams, examples, analogies
- "Explain like I'm 10" mode for younger students
- Links to relevant study materials in the Learning module

### 1d. Conversation Guardrails
- Stays on-topic (academic subjects only)
- Age-appropriate language
- No direct answers to active assessments (configurable by teacher)
- Usage limits per day (configurable per school tier)
- Teacher can review chat transcripts for quality assurance

---

## 2. AI Exam Prep & Practice

### 2a. Weak Area Analysis
- AI analyses student's marks across assessments
- Identifies weak topics per subject
- Generates a personalised study plan: "Focus on algebra (you scored 45%) before revising geometry (you scored 72%)"
- Priority ranking: topics most likely to appear in upcoming exams

### 2b. Practice Question Generator
- Generate practice questions aligned to CAPS per topic
- Difficulty adjusts based on student performance
- Instant grading with detailed explanations
- Track improvement over time: "You've improved from 40% to 65% on fractions this week"

### 2c. Mock Exam Mode
- Generate full mock exam papers for any subject
- Timed mode with countdown
- Auto-grade with detailed feedback per question
- Compare to class average (anonymised)
- Exam technique tips: time management, mark allocation, keyword spotting

---

## 3. AI Subject Mentorship (Personalised Learning Paths)

### 3a. Learning Path Engine
- Based on curriculum map + student performance
- Creates personalised learning path per subject
- Adaptive: adjusts difficulty and pacing based on quiz results
- Milestones and progress badges
- "You've mastered 7/12 topics in Mathematics this term"

### 3b. Daily Learning Nudges
- Push notification: "You have 15 minutes? Try these 5 algebra questions"
- Spaced repetition for retention
- Streak tracking: "You've studied 5 days in a row!"
- Weekly summary to student + parent

### 3c. Study Group AI
- Multiple students can ask the AI the same topic
- AI generates collaborative exercises
- Discussion prompts for peer learning

---

## 4. AI for Teachers (Enhanced)

### 4a. Report Comment Generator
- AI drafts personalised report comments per student
- Based on: marks, attendance, behaviour, achievements
- Teacher reviews and edits before publishing
- Tone options: encouraging, direct, formal
- "Thabo has shown consistent improvement in Mathematics this term, moving from 52% to 68%. His participation in class discussions has been excellent. To maintain this trajectory, regular practice with algebraic expressions would be beneficial."

### 4b. Lesson Plan AI Assistant
- Teacher describes topic and duration
- AI generates complete lesson plan: objectives, activities, resources, assessment, differentiation
- CAPS-aligned with curriculum reference codes
- Includes engagement strategies for different learning styles
- Export to lesson plan template

### 4c. Differentiated Instruction Suggestions
- AI analyses class marks distribution
- Suggests: extension activities for top performers, remedial approaches for struggling students
- Group formation recommendations based on ability levels
- Alternative assessment strategies for diverse learners

### 4d. Parent Communication Drafts
- AI drafts messages to parents about: academic concerns, positive progress, meeting requests
- Professional tone with specific evidence from student data
- Multi-language support (English, Afrikaans, Zulu, Xhosa — key SA languages)

---

## 5. AI for Parents

### 5a. Progress Interpreter
- Parent asks: "How is my child doing in Maths?"
- AI responds with plain-language summary: marks, trends, comparison to grade average, specific areas to focus on
- Actionable recommendations: "Practice times tables for 10 minutes daily"
- Available in parent portal as chat interface

### 5b. Report Card Explainer
- Parent uploads/views report card
- AI explains each subject result in simple terms
- Highlights strengths and areas for improvement
- Suggests home activities to support learning

### 5c. Homework Helper for Parents
- Parent can ask: "How do I help my child with this homework?"
- AI provides parent-friendly explanation of the topic
- Teaching strategies parents can use at home
- NOT the answers — the approach

---

## 6. AI for Headmasters & Grade Heads

### 6a. School Performance Insights
- "Show me which subjects are underperforming this term"
- AI analyses across all grades and subjects
- Identifies systemic issues: "Grade 9 Science pass rate dropped 12% — correlated with teacher change in Term 2"
- Suggests interventions

### 6b. At-Risk Student Identification
- AI flags students with declining performance trajectory
- Considers: marks trend, attendance pattern, behaviour incidents
- Risk score per student with contributing factors
- Recommended actions per risk level

### 6c. Strategic Recommendations
- End-of-term AI summary for leadership
- Resource allocation suggestions
- Teacher effectiveness patterns (data-driven, not surveillance)

---

## Data Models

```typescript
interface TutorConversation {
  studentId: string;
  schoolId: string;
  subjectId: string;
  messages: TutorMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface TutorMessage {
  role: 'student' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed?: number;
}

interface LearningPath {
  studentId: string;
  subjectId: string;
  topics: LearningPathTopic[];
  currentTopicIndex: number;
  overallProgress: number;
}

interface LearningPathTopic {
  topicId: string;
  name: string;
  status: 'locked' | 'available' | 'in_progress' | 'mastered';
  masteryScore: number;
  practiceAttempts: number;
}

interface AIUsageQuota {
  schoolId: string;
  tier: 'basic' | 'standard' | 'premium';
  monthlyTokenLimit: number;
  tokensUsed: number;
  resetDate: Date;
}
```

## API Endpoints
- `POST /api/ai-tutor/chat` — Send message to AI tutor
- `GET /api/ai-tutor/conversations` — List student's conversations
- `GET /api/ai-tutor/conversations/:id` — Get conversation history
- `POST /api/ai-tutor/practice` — Generate practice questions
- `POST /api/ai-tutor/mock-exam` — Generate mock exam
- `GET /api/ai-tutor/weak-areas/:studentId` — Get weak area analysis
- `GET /api/ai-tutor/learning-path/:studentId/:subjectId` — Get learning path
- `POST /api/ai-tutor/report-comments` — Generate report comments
- `POST /api/ai-tutor/lesson-plan` — Generate lesson plan
- `GET /api/ai-tutor/at-risk` — Get at-risk students
- `GET /api/ai-tutor/school-insights` — Get school performance insights
- `POST /api/ai-tutor/parent-chat` — Parent AI chat
- `GET /api/ai-tutor/usage` — Get usage stats and quota

## Frontend Pages
- `/student/ai-tutor` — Main tutor chat (subject selector + chat interface)
- `/student/ai-tutor/practice` — Practice questions & mock exams
- `/student/ai-tutor/learning-path` — Personalised learning path
- `/teacher/ai-tools/report-comments` — Report comment generator
- `/teacher/ai-tools/lesson-planner` — AI lesson plan generator
- `/parent/ai-assistant` — Parent AI chat interface
- `/admin/ai-insights` — School-wide AI analytics for leadership

## Revenue Model
- **Free tier:** 20 AI tutor messages/day per student
- **Standard tier:** 100 messages/day + practice questions
- **Premium tier:** Unlimited + mock exams + learning paths + parent AI
- Per-school pricing based on enrollment size

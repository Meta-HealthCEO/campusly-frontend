# AI Tutor

## Concept
An AI-powered tutoring tool for learners that helps them understand their academic performance and prepare for assessments.

## Core Features

### 1. Test Result Analysis
- Student selects a completed test/assessment
- AI reviews their answers and identifies weak areas
- Provides clear, step-by-step explanations for incorrect answers
- Highlights patterns (e.g., "You struggle with fractions" or "Tense agreement is a recurring issue")

### 2. Test Preparation
- Student selects a subject and upcoming test/topic
- AI accesses the syllabus for that subject and grade level
- Generates a practice test tailored to the syllabus content
- Adjusts difficulty based on past performance

### 3. Practice Test Flow
- AI generates questions aligned to syllabus outcomes
- Student completes the test within the app
- AI grades it immediately
- Walk-through mode: AI explains each answer logically, building from what the student already understands

### 4. Guided Explanations
- Breaks down solutions step-by-step
- Uses simple language appropriate to the student's grade level
- Offers alternative explanations if the student doesn't understand
- Provides related examples to reinforce the concept

## Data Dependencies
- Syllabus per subject per grade (curriculum data)
- Student marks/assessment history (`/api/academic/marks/student/:id`)
- Subject list (`/api/academic/subjects`)
- Grade levels (`/api/academic/grades`)

## UX Ideas
- Chat-style interface for the walk-through experience
- Progress indicators showing improvement over time
- "Quiz me" quick-start button on the student dashboard
- Topic tags so students can drill into specific areas

## Open Questions
- Where does syllabus content come from? Manual upload by teachers, or a curriculum API?
- Should teachers be able to review AI-generated tests before students take them?
- Rate limiting / usage caps per student?
- Which AI model powers this — external API or self-hosted?

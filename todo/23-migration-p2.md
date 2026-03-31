# 23 — Migration — Phase 2

## Current State
Multi-step import pipeline with field mapping, validation, preview, and job history.

## Phase 2 Enhancements

### 1. Duplicate Detection
- Before import, check for existing students/parents/staff by ID number, email, or admission number
- Show conflicts and let admin choose: skip, overwrite, or merge
- **Why:** Running an import twice currently creates duplicates. This is the most critical missing piece

### 2. Incremental Import
- Delta imports that only add/update changed records
- Diff report showing what will change before committing
- **Why:** Schools don't do a single big migration. They sync periodically from their old system during transition

### 3. Rollback
- Undo a completed import (soft-delete all records created by that job)
- **Why:** Bad data in = panic. The ability to roll back a botched import in one click is essential for admin confidence

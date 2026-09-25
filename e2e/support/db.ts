/**
 * Test-only access to the dev database (never production): the launch
 * walkthrough needs a verification link (only its hash is stored, so the
 * helper stores the hash of a token it makes, exactly as the backend does)
 * and a teacher whose free AI allowance is used up.
 */
import { createHash, randomBytes } from 'node:crypto';
import { MongoClient, ObjectId as ObjectIdCtor, type Db, type ObjectId } from 'mongodb';
import { assertLocalUrl } from './local';

const DEV_URI = 'mongodb://127.0.0.1:27047/campusly-dev?directConnection=true';
const LINK_TTL_MS = 24 * 60 * 60 * 1000;

function uri(): string {
  const value = process.env.E2E_MONGODB_URI ?? DEV_URI;
  assertLocalUrl(value, 'E2E_MONGODB_URI');
  return value;
}

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(uri());
  await client.connect();
  try {
    return await fn(client.db());
  } finally {
    await client.close();
  }
}

async function userByEmail(db: Db, email: string): Promise<{ _id: ObjectId; schoolId: ObjectId }> {
  const user = await db.collection('users').findOne({ email: email.toLowerCase(), isDeleted: false });
  if (!user) throw new Error(`No user ${email}`);
  return { _id: user._id as ObjectId, schoolId: user.schoolId as ObjectId };
}

/** A fresh, working /verify-email link for this user: the same token/hash/expiry the backend writes when it emails one. */
export async function issueVerifyLink(email: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await withDb(async (db) => {
    const user = await userByEmail(db, email);
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { emailVerifyToken: createHash('sha256').update(token).digest('hex'), emailVerifyExpires: new Date(Date.now() + LINK_TTL_MS) } },
    );
  });
  return `/verify-email?token=${token}`;
}

/** Records AI actions for this teacher this month, as if they had spent them. */
export async function spendAIActions(email: string, count: number): Promise<void> {
  await withDb(async (db) => {
    const user = await userByEmail(db, email);
    const now = new Date();
    await db.collection('aiusages').insertMany(Array.from({ length: count }, () => ({
      schoolId: user.schoolId, userId: user._id, action: 'paper', meta: { e2e: true }, createdAt: now, updatedAt: now,
    })));
  });
}

async function teacherAndGroup(db: Db, teacherEmail: string, groupName: string) {
  const teacher = await userByEmail(db, teacherEmail);
  const group = await db.collection('classes').findOne({ schoolId: teacher.schoolId, name: groupName, isDeleted: false });
  if (!group) throw new Error(`No group ${groupName}`);
  return { teacher, group };
}

/** A second teaching group for this teacher (same grade as their first), with its join code. */
export async function addGroup(teacherEmail: string, name: string): Promise<{ id: string; code: string }> {
  return withDb(async (db) => {
    const teacher = await userByEmail(db, teacherEmail);
    const first = await db.collection('classes').findOne({ schoolId: teacher.schoolId, isDeleted: false });
    if (!first) throw new Error('The teacher has no group yet');
    const code = randomBytes(3).toString('hex').toUpperCase();
    const now = new Date();
    const { insertedId } = await db.collection('classes').insertOne({
      schoolId: teacher.schoolId, name, gradeId: first.gradeId, teacherId: teacher._id, capacity: 40, classroomCode: code,
      isHomeroom: false, isDeleted: false, createdAt: now, updatedAt: now,
    });
    return { id: String(insertedId), code };
  });
}

/** A one-item lesson (unit) already released to a group, in the shape of the backend demo seeder (seed-course-unit.ts). */
export async function seedReleasedUnit(teacherEmail: string, groupName: string): Promise<string> {
  const title = 'Telling the time';
  await withDb(async (db) => {
    const { teacher, group } = await teacherAndGroup(db, teacherEmail, groupName);
    const now = new Date();
    const subjectId = new ObjectIdCtor();
    const resource = await db.collection('contentresources').insertOne({
      schoolId: teacher.schoolId, curriculumNodeId: new ObjectIdCtor(), type: 'study_notes', format: 'static', title: 'Reading a clock',
      blocks: [{ blockId: randomBytes(6).toString('hex'), type: 'text', order: 0, content: 'The short hand shows the hour; the long hand shows the minutes.' }],
      source: 'system', gradeId: group.gradeId, subjectId, term: 1, status: 'approved', createdBy: teacher._id, estimatedMinutes: 5,
      tags: ['class_unit'], isDeleted: false, createdAt: now, updatedAt: now,
    });
    const course = await db.collection('courses').insertOne({
      schoolId: teacher.schoolId, title, slug: `telling-the-time-${randomBytes(3).toString('hex')}`, description: '', coverImageUrl: '', subjectId,
      tags: [], createdBy: teacher._id, status: 'published', publishedBy: teacher._id, publishedAt: now, reviewNotes: '', passMarkPercent: 60,
      certificateEnabled: false, kind: 'class_unit', outlineStatus: 'approved', aiGenerated: false, sequential: true, copiedFrom: null, isDeleted: false,
      scope: { gradeId: group.gradeId, subjectId, termNumber: 1, topicNodeIds: [], classIds: [group._id], builtForClassId: group._id },
      generation: { status: 'done', total: 1, done: 1, failed: 0, message: 'All 1 items are ready.' }, createdAt: now, updatedAt: now,
    });
    const mod = await db.collection('coursemodules').insertOne({
      schoolId: teacher.schoolId, courseId: course.insertedId, title: 'Reading a clock', orderIndex: 0, objectives: [], isDeleted: false, createdAt: now, updatedAt: now,
    });
    await db.collection('courselessons').insertOne({
      schoolId: teacher.schoolId, courseId: course.insertedId, moduleId: mod.insertedId, orderIndex: 0, title: 'Reading a clock', type: 'content',
      contentResourceId: resource.insertedId, quizQuestionIds: [], passMarkPercent: 70, itemKind: 'notes', minutes: 5, objectives: [], capsRef: '',
      brief: '', genStatus: 'ready', genError: '', isGraded: false, isRequiredToAdvance: false, isDeleted: false, createdAt: now, updatedAt: now,
    });
  });
  return title;
}

/** A finalised online test assigned to a group, open now, due in three days. */
export async function seedDigitalTest(teacherEmail: string, groupName: string): Promise<string> {
  const title = 'Time check';
  await withDb(async (db) => {
    const { teacher, group } = await teacherAndGroup(db, teacherEmail, groupName);
    const now = new Date();
    await db.collection('assessmentpapers').insertOne({
      schoolId: teacher.schoolId, title, subjectId: new ObjectIdCtor(), gradeId: group.gradeId, topicIds: [], term: 1, year: now.getFullYear(),
      paperType: 'class_test', totalMarks: 1, duration: 10, instructions: '', capsCompliance: null, status: 'finalised', aiGenerated: false,
      difficulty: 'easy', version: 1, createdBy: teacher._id, isDeleted: false, createdAt: now, updatedAt: now,
      sections: [{ title: 'Section A', instructions: '', order: 0, questions: [{ questionId: null, questionText: 'How many minutes are in one hour?', options: [], marks: 1, position: 0, modelAnswer: '60', markingGuideline: 'One mark for 60.', diagram: null }] }],
      assignments: [{ _id: new ObjectIdCtor(), classId: group._id, mode: 'digital', releaseAt: null, dueAt: new Date(now.getTime() + 3 * 86_400_000), assignedBy: teacher._id, assignedAt: now }],
    });
  });
  return title;
}

/** The title of the homework this teacher set most recently. */
export async function homeworkTitle(teacherEmail: string): Promise<string> {
  return withDb(async (db) => {
    const teacher = await userByEmail(db, teacherEmail);
    const hw = await db.collection('homeworks').find({ schoolId: teacher.schoolId, isDeleted: false }).sort({ createdAt: -1 }).limit(1).next();
    if (!hw) throw new Error('No homework yet');
    return String(hw.title);
  });
}

/** A join code of the dev sign-in panel's standalone teacher (Lindiwe), for signing up a gate learner. */
export async function devStandaloneClassCode(): Promise<string> {
  return withDb(async (db) => {
    const teacher = await db.collection('users').findOne({ isStandaloneTeacher: true, firstName: 'Lindiwe', isDeleted: false });
    if (!teacher) throw new Error('No dev standalone teacher: seed the dev database first');
    const group = await db.collection('classes').findOne({ schoolId: teacher.schoolId, isDeleted: false, classroomCode: { $exists: true } });
    if (!group) throw new Error('The dev standalone teacher has no group');
    return String(group.classroomCode);
  });
}

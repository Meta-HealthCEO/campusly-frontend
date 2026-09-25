/**
 * Test-only access to the dev database (never production): the launch
 * walkthrough needs a verification link (only its hash is stored, so the
 * helper stores the hash of a token it makes, exactly as the backend does)
 * and a teacher whose free AI allowance is used up.
 */
import { createHash, randomBytes } from 'node:crypto';
import { MongoClient, type Db, type ObjectId } from 'mongodb';
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

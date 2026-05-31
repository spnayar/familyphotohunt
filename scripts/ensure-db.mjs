import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const schemaDir = path.join(projectRoot, 'prisma');

/**
 * Prisma resolves SQLite paths relative to prisma/schema.prisma, not the project root.
 * file:../data/dev.db → /app/data/dev.db (Railway volume)
 * file:./data/dev.db  → /app/prisma/data/dev.db (ephemeral — wiped every deploy)
 */
export const CANONICAL_DATABASE_URL = 'file:../data/dev.db';

function getDatabaseUrl() {
  return process.env.DATABASE_URL || CANONICAL_DATABASE_URL;
}

function resolveDatabaseFilePath(databaseUrl) {
  const raw = databaseUrl.replace(/^file:/, '');
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.resolve(schemaDir, raw);
}

function assertProductionDatabaseConfig(url) {
  if (process.env.NODE_ENV !== 'production') {
    if (url === 'file:./data/dev.db') {
      console.warn(
        '[db] WARNING: DATABASE_URL=file:./data/dev.db points at prisma/data/dev.db (not the volume). Use file:../data/dev.db'
      );
    }
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      '[db] FATAL: DATABASE_URL is not set. In Railway Variables, set DATABASE_URL=file:../data/dev.db'
    );
    process.exit(1);
  }

  if (url === 'file:./data/dev.db') {
    console.error(
      '[db] FATAL: DATABASE_URL=file:./data/dev.db resolves to prisma/data/dev.db inside the container (wiped on every deploy). Set DATABASE_URL=file:../data/dev.db instead.'
    );
    process.exit(1);
  }

  if (!url.includes('data/dev.db')) {
    console.error(
      `[db] FATAL: DATABASE_URL must point at data/dev.db on the /app/data volume. Use file:../data/dev.db. Got: ${url}`
    );
    process.exit(1);
  }
}

async function getRecordCounts(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    const [users, contests] = await Promise.all([
      prisma.user.count(),
      prisma.contest.count(),
    ]);
    return { users, contests };
  } finally {
    await prisma.$disconnect();
  }
}

function backupDatabase(dataDb, backupDb) {
  if (!fs.existsSync(dataDb)) {
    return;
  }
  fs.copyFileSync(dataDb, backupDb);
  const sizeKb = Math.round(fs.statSync(backupDb).size / 1024);
  console.log(`[db] Backup saved: ${backupDb} (${sizeKb} KB)`);
}

function restoreDatabaseFromBackup(dataDb, backupDb) {
  if (!fs.existsSync(backupDb)) {
    console.error('[db] No backup file found to restore.');
    return;
  }
  fs.copyFileSync(backupDb, dataDb);
  console.log('[db] Restored database from backup.');
}

function assertCountsDidNotDrop(before, after, dataDb, backupDb) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (before.users > 0 && after.users === 0) {
    console.error(
      `[db] FATAL: User count dropped from ${before.users} to 0 after schema sync.`
    );
    restoreDatabaseFromBackup(dataDb, backupDb);
    process.exit(1);
  }

  if (before.contests > 0 && after.contests === 0) {
    console.error(
      `[db] FATAL: Contest count dropped from ${before.contests} to 0 after schema sync.`
    );
    restoreDatabaseFromBackup(dataDb, backupDb);
    process.exit(1);
  }
}

function runDbPush(databaseUrl) {
  execSync('npx prisma db push --schema=prisma/schema.prisma --skip-generate', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function logDatabaseStats(databaseUrl, dataDb, label = 'Records') {
  if (fs.existsSync(dataDb)) {
    const sizeKb = Math.round(fs.statSync(dataDb).size / 1024);
    console.log(`[db] Database file: ${dataDb} (${sizeKb} KB)`);
  } else {
    console.log(`[db] Database file will be created at: ${dataDb}`);
  }

  const { users, contests } = await getRecordCounts(databaseUrl);
  console.log(`[db] ${label}: ${users} users, ${contests} contests`);

  if (process.env.NODE_ENV === 'production' && users === 0 && contests === 0) {
    console.warn(
      '[db] WARNING: Database is empty. OK for a brand-new site; otherwise verify the Railway volume at /app/data is mounted and DATABASE_URL=file:../data/dev.db'
    );
  }

  return { users, contests };
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  assertProductionDatabaseConfig(databaseUrl);

  const dataDb = resolveDatabaseFilePath(databaseUrl);
  const dataDir = path.dirname(dataDb);
  const backupDb = path.join(dataDir, 'dev.db.backup');

  console.log(`[db] Using DATABASE_URL=${databaseUrl}`);
  console.log(`[db] Resolved database path: ${dataDb}`);

  fs.mkdirSync(dataDir, { recursive: true });

  const hadExistingDb = fs.existsSync(dataDb);
  const before = hadExistingDb
    ? await getRecordCounts(databaseUrl)
    : { users: 0, contests: 0 };

  if (process.env.NODE_ENV === 'production' && hadExistingDb) {
    backupDatabase(dataDb, backupDb);
    await logDatabaseStats(databaseUrl, dataDb, 'Before schema sync');
  }

  runDbPush(databaseUrl);

  const after = await logDatabaseStats(databaseUrl, dataDb, 'After schema sync');
  assertCountsDidNotDrop(before, after, dataDb, backupDb);
}

main().catch((error) => {
  console.error('[db] Startup failed:', error);
  process.exit(1);
});

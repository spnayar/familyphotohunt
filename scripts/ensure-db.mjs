import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dataDb = path.join(dataDir, 'dev.db');
const legacyDb = path.join(projectRoot, 'prisma', 'dev.db');

/** Single canonical path — must match Railway volume mount /app/data */
export const CANONICAL_DATABASE_URL = 'file:./data/dev.db';

function getDatabaseUrl() {
  return process.env.DATABASE_URL || CANONICAL_DATABASE_URL;
}

function assertProductionDatabaseConfig(url) {
  if (process.env.NODE_ENV !== 'production') {
    if (url && !url.includes('data/dev.db')) {
      console.warn(
        `[db] WARNING: DATABASE_URL=${url} should be file:./data/dev.db so local dev matches production. Update your .env file.`
      );
    }
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      '[db] FATAL: DATABASE_URL is not set. In Railway Variables, set DATABASE_URL=file:./data/dev.db'
    );
    process.exit(1);
  }

  if (!url.includes('data/dev.db')) {
    console.error(
      `[db] FATAL: DATABASE_URL must be file:./data/dev.db (persisted on the /app/data volume). Got: ${url}`
    );
    process.exit(1);
  }
}

function migrateLegacyDatabaseIfNeeded() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(legacyDb)) {
    return;
  }

  const shouldCopy =
    !fs.existsSync(dataDb) ||
    fs.statSync(dataDb).size === 0 ||
    fs.statSync(legacyDb).size > fs.statSync(dataDb).size;

  if (shouldCopy) {
    fs.copyFileSync(legacyDb, dataDb);
    console.log('[db] Copied legacy prisma/dev.db → data/dev.db');
  }
}

function runDbPush(databaseUrl) {
  execSync('npx prisma db push --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function logDatabaseStats(databaseUrl) {
  if (fs.existsSync(dataDb)) {
    const sizeKb = Math.round(fs.statSync(dataDb).size / 1024);
    console.log(`[db] Database file: ${dataDb} (${sizeKb} KB)`);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    const [users, contests] = await Promise.all([
      prisma.user.count(),
      prisma.contest.count(),
    ]);
    console.log(`[db] Records: ${users} users, ${contests} contests`);

    if (process.env.NODE_ENV === 'production' && users === 0 && contests === 0) {
      console.warn(
        '[db] WARNING: Database is empty. OK for a brand-new site; otherwise verify the Railway volume at /app/data is mounted and DATABASE_URL=file:./data/dev.db'
      );
    }
  } catch (error) {
    console.error('[db] Could not read database stats:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  assertProductionDatabaseConfig(databaseUrl);

  console.log(`[db] Using DATABASE_URL=${databaseUrl}`);
  migrateLegacyDatabaseIfNeeded();
  runDbPush(databaseUrl);
  await logDatabaseStats(databaseUrl);
}

main().catch((error) => {
  console.error('[db] Startup failed:', error);
  process.exit(1);
});

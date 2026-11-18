import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const ROOT_DIR = process.cwd();
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

// Baseline FK topological order matching prisma/schema.prisma (21 tables)
const KNOWN_TABLE_ORDER: readonly string[] = [
  'users',
  'players',
  'courts',
  'closed_slots',
  'bookings',
  'coaches',
  'training_courses',
  'training_registrations',
  'member_applications',
  'news_posts',
  'app_config',
  'google_sheets_sync_logs',
  'products',
  'orders',
  'order_items',
  'guest_sessions',
  'tournaments',
  'tournament_teams',
  'tournament_officials',
  'tournament_players',
  'tournament_matches',
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const CLOUD_HOST_HINTS = ['supabase', 'neon.tech', 'render.com', 'amazonaws', 'pooler', 'azure', 'gcp'];

interface BackupEnvelope {
  metadata?: {
    createdAt: string;
    sourceHost: string;
    tableCount: number;
    totalRows: number;
  };
  tables: Record<string, any[]>;
}

function getArgValue(prefix: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function isLocalDbUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function assertSafeLocalTarget(localUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(localUrl);
  } catch {
    throw new Error('LOCAL_DATABASE_URL is not a valid PostgreSQL URL.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(host) || CLOUD_HOST_HINTS.some((hint) => host.includes(hint))) {
    throw new Error(
      `Safety abort: LOCAL_DATABASE_URL host ("${host}") must be localhost / 127.0.0.1 / ::1 to prevent overwriting a remote/production database.`
    );
  }

  const dbName = parsed.pathname.replace(/^\/+/, '');
  if (!dbName || dbName === 'postgres' || dbName === 'template0' || dbName === 'template1') {
    throw new Error(
      `Safety abort: LOCAL_DATABASE_URL points to system database "${dbName || '(empty)'}". Please specify a dedicated database name such as "/dva_volleyball".`
    );
  }

  return parsed;
}

function createPgPool(connectionString: string): Pool {
  const sslDisabled = connectionString.includes('sslmode=disable');
  const useSsl = !sslDisabled && !isLocalDbUrl(connectionString);
  return new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

function formatTimestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

/** Discover public tables and sort parents before children using FK metadata + baseline priority. */
async function getOrderedPublicTables(pool: Pool): Promise<string[]> {
  const tablesRes = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
     ORDER BY tablename`
  );
  const allTables = tablesRes.rows.map((r) => r.tablename);
  const tableSet = new Set(allTables);

  const fkRes = await pool.query<{ child_table: string; parent_table: string }>(
    `SELECT
       c.relname AS child_table,
       p.relname AS parent_table
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace cn ON cn.oid = c.relnamespace
     JOIN pg_class p ON p.oid = con.confrelid
     JOIN pg_namespace pn ON pn.oid = p.relnamespace
     WHERE con.contype = 'f'
       AND cn.nspname = 'public'
       AND pn.nspname = 'public'
       AND c.relname <> p.relname`
  );

  const knownRank = new Map<string, number>();
  KNOWN_TABLE_ORDER.forEach((name, idx) => knownRank.set(name, idx));

  const prioritySort = (a: string, b: string) => {
    const ra = knownRank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = knownRank.get(b) ?? Number.MAX_SAFE_INTEGER;
    return ra !== rb ? ra - rb : a.localeCompare(b);
  };

  // Kahn topological sort preserving KNOWN_TABLE_ORDER whenever in-degree ties occur
  const childrenOf = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  for (const t of allTables) {
    childrenOf.set(t, new Set());
    inDegree.set(t, 0);
  }

  for (const edge of fkRes.rows) {
    if (!tableSet.has(edge.child_table) || !tableSet.has(edge.parent_table)) continue;
    const children = childrenOf.get(edge.parent_table)!;
    if (!children.has(edge.child_table)) {
      children.add(edge.child_table);
      inDegree.set(edge.child_table, (inDegree.get(edge.child_table) ?? 0) + 1);
    }
  }

  const queue = allTables.filter((t) => (inDegree.get(t) ?? 0) === 0).sort(prioritySort);
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    ordered.push(current);
    for (const child of childrenOf.get(current) ?? []) {
      const nextDeg = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, nextDeg);
      if (nextDeg === 0) {
        queue.push(child);
        queue.sort(prioritySort);
      }
    }
  }

  // Fallback for any remaining tables in case of cycles
  if (ordered.length < allTables.length) {
    for (const t of allTables.sort(prioritySort)) {
      if (!ordered.includes(t)) ordered.push(t);
    }
  }

  return ordered;
}

async function exportSnapshotFromSource(sourceUrl: string): Promise<{
  tables: Record<string, any[]>;
  orderedTables: string[];
  latestPath: string;
  archivePath: string;
  totalRows: number;
}> {
  const pool = createPgPool(sourceUrl);
  try {
    const orderedTables = await getOrderedPublicTables(pool);
    const tables: Record<string, any[]> = {};
    let totalRows = 0;

    console.log(`\n📦 Exporting ${orderedTables.length} tables from source PostgreSQL...`);
    for (const table of orderedTables) {
      const res = await pool.query(`SELECT * FROM "${table}"`);
      tables[table] = res.rows;
      totalRows += res.rows.length;
      console.log(`   - ${table}: ${res.rows.length} rows`);
    }

    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const now = new Date();
    const parsedSource = new URL(sourceUrl);
    const payload: BackupEnvelope = {
      metadata: {
        createdAt: now.toISOString(),
        sourceHost: parsedSource.hostname,
        tableCount: orderedTables.length,
        totalRows,
      },
      tables,
    };

    const archivePath = path.join(BACKUPS_DIR, `dva_supabase_${formatTimestampForFilename(now)}.json`);
    const latestPath = path.join(BACKUPS_DIR, 'dva_supabase_latest.json');
    const serialized = JSON.stringify(payload, null, 2);

    fs.writeFileSync(archivePath, serialized, 'utf-8');
    fs.writeFileSync(latestPath, serialized, 'utf-8');

    console.log(`\n✅ Backup complete: ${totalRows} rows across ${orderedTables.length} tables.`);
    console.log(`   Archive: ${archivePath}`);
    console.log(`   Latest:  ${latestPath}`);

    return { tables, orderedTables, latestPath, archivePath, totalRows };
  } finally {
    await pool.end();
  }
}

function loadSnapshotFromFile(filePath: string): Record<string, any[]> {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(ROOT_DIR, filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup file not found: ${resolved}`);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  // Supports both { metadata, tables: { users: [...] } } and flat { users: [...] } snapshots
  const tablesObj = raw?.tables && typeof raw.tables === 'object' && !Array.isArray(raw.tables)
    ? raw.tables
    : raw;

  if (!tablesObj || typeof tablesObj !== 'object' || Array.isArray(tablesObj)) {
    throw new Error(`Invalid backup JSON format in ${resolved}`);
  }
  return tablesObj as Record<string, any[]>;
}

async function ensureLocalDatabaseExists(localUrl: string, parsedLocal: URL): Promise<void> {
  const dbName = parsedLocal.pathname.replace(/^\/+/, '');
  const testPool = createPgPool(localUrl);
  try {
    await testPool.query('SELECT 1');
    return;
  } catch (err: any) {
    if (err?.code !== '3D000') {
      throw err;
    }
  } finally {
    await testPool.end();
  }

  // Database does not exist yet on local PostgreSQL -> create it via maintenance 'postgres' DB
  const maintenanceUrl = new URL(localUrl);
  maintenanceUrl.pathname = '/postgres';
  const adminPool = createPgPool(maintenanceUrl.toString());
  try {
    console.log(`🛠️  Local database "${dbName}" does not exist yet — creating it on ${parsedLocal.hostname}:${parsedLocal.port || 5432}...`);
    const escapedDbName = dbName.replace(/"/g, '""');
    await adminPool.query(`CREATE DATABASE "${escapedDbName}"`);
    console.log(`✅ Created local database "${dbName}".`);
  } finally {
    await adminPool.end();
  }
}

function pushPrismaSchemaToLocal(localUrl: string): void {
  console.log('\n🔄 Pushing Prisma schema (21 tables, 15 enums) to local PostgreSQL...');
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(npxBin, ['prisma', 'db', 'push'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: localUrl,
      DIRECT_URL: localUrl,
    },
  });
}

async function syncSnapshotToLocalDb(localUrl: string, snapshotTables: Record<string, any[]>): Promise<void> {
  const parsedLocal = assertSafeLocalTarget(localUrl);
  await ensureLocalDatabaseExists(localUrl, parsedLocal);
  pushPrismaSchemaToLocal(localUrl);

  const dstPool = createPgPool(localUrl);
  try {
    const orderedTables = await getOrderedPublicTables(dstPool);

    const colsMetaRes = await dstPool.query<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );

    const colsByTable = new Map<string, Array<{ name: string; dataType: string }>>();
    for (const row of colsMetaRes.rows) {
      const list = colsByTable.get(row.table_name) || [];
      list.push({ name: row.column_name, dataType: row.data_type });
      colsByTable.set(row.table_name, list);
    }

    const client = await dstPool.connect();
    try {
      await client.query('BEGIN');

      if (orderedTables.length > 0) {
        const truncateTargets = orderedTables.map((t) => `"${t}"`).join(', ');
        await client.query(`TRUNCATE TABLE ${truncateTargets} RESTART IDENTITY CASCADE`);
      }

      console.log('\n📥 Mirroring rows into local PostgreSQL...');
      for (const table of orderedTables) {
        const rows = snapshotTables[table] || [];
        if (rows.length === 0) continue;

        const targetCols = colsByTable.get(table) || [];
        // Intersect snapshot keys with target columns to handle optional schema drift gracefully
        const sampleRow = rows[0] || {};
        const colsToInsert = targetCols.filter((c) => Object.prototype.hasOwnProperty.call(sampleRow, c.name));
        if (colsToInsert.length === 0) continue;

        const colNamesSql = colsToInsert.map((c) => `"${c.name}"`).join(', ');
        const placeholdersSql = colsToInsert.map((_, idx) => `$${idx + 1}`).join(', ');
        const insertSql = `INSERT INTO "${table}" (${colNamesSql}) VALUES (${placeholdersSql})`;

        for (const row of rows) {
          const values = colsToInsert.map((col) => {
            const val = row[col.name];
            if (val === null || val === undefined) return null;
            if (col.dataType === 'json' || col.dataType === 'jsonb') {
              return JSON.stringify(val);
            }
            return val;
          });
          await client.query(insertSql, values);
        }
        console.log(`   ✓ ${table}: ${rows.length} rows`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Strict 1:1 verification
    let verifiedTotal = 0;
    console.log('\n🔎 Verifying local PostgreSQL row counts:');
    for (const table of orderedTables) {
      const expected = (snapshotTables[table] || []).length;
      const res = await dstPool.query<{ cnt: number }>(`SELECT count(*)::int AS cnt FROM "${table}"`);
      const actual = res.rows[0]?.cnt ?? 0;
      verifiedTotal += actual;
      if (expected !== actual) {
        throw new Error(`Verification mismatch on "${table}": expected=${expected}, local=${actual}`);
      }
    }
    console.log(`✅ Local PostgreSQL verified: ${verifiedTotal} total rows across ${orderedTables.length} tables.`);
  } finally {
    await dstPool.end();
  }
}

async function main(): Promise<void> {
  const syncLocal = hasFlag('--sync-local');
  const fromFile = getArgValue('--from-file=');
  const sourceUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim();
  const localUrl = (process.env.LOCAL_DATABASE_URL || '').trim();

  if (syncLocal && !localUrl) {
    console.error('\n❌ Thiếu biến LOCAL_DATABASE_URL trong file .env!');
    console.error('Hãy thêm dòng sau vào file .env ở máy local (thay <MAT_KHAU> và tên DB pgAdmin 4 của bạn):');
    console.error('LOCAL_DATABASE_URL="postgresql://postgres:<MAT_KHAU>@localhost:5432/dva_volleyball"\n');
    process.exit(1);
  }

  let snapshotTables: Record<string, any[]>;

  if (fromFile) {
    console.log(`📂 Loading snapshot from file: ${fromFile}`);
    snapshotTables = loadSnapshotFromFile(fromFile);
  } else {
    if (!sourceUrl) {
      throw new Error('DATABASE_URL (or DIRECT_URL) is missing in .env.');
    }
    const exported = await exportSnapshotFromSource(sourceUrl);
    snapshotTables = exported.tables;
  }

  if (syncLocal) {
    await syncSnapshotToLocalDb(localUrl, snapshotTables);
  }
}

main().catch((err: any) => {
  console.error('\n❌ Database backup/sync failed:', err?.message || err);
  process.exit(1);
});

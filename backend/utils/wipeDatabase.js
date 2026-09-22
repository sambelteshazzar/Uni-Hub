/**
 * One-off full database wipe (all tables, all rows).
 *
 * Removes test/sample data from whichever database the env config points at:
 *   - Turso (libSQL) when TURSO_URL + TURSO_AUTH_TOKEN are set
 *   - local SQLite (backend/data/jertscart.db) otherwise
 *
 * Usage:
 *   cd backend
 *   node utils/wipeDatabase.js           # DRY RUN: show target + row counts, changes nothing
 *   node utils/wipeDatabase.js --wipe    # back up every row to data/db-backup-<ts>.json,
 *                                        # then delete all rows in FK-safe order
 *
 * Safety: the --wipe flag is required; a full JSON backup is written before
 * any DELETE runs; deletes run in a transaction (BEGIN/COMMIT) so a failure
 * rolls back. The admin account is NOT special-cased — after wiping, restart
 * the backend to have it re-created from ADMIN_EMAIL/ADMIN_PASSWORD.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { connectDatabase, getDb, getTursoClient, isTurso } = require('../config/database');

/**
 * Normalize the two driver APIs (async @libsql/client for Turso, synchronous
 * better-sqlite3 for local SQLite) into one: { execute(sql) -> Promise<{rows}> }.
 */
function toAsyncClient (raw, turso) {
  if (turso) {
    return { execute: sql => raw.execute(sql) };
  }
  return {
    execute: sql => {
      const stmt = raw.prepare(sql);
      // stmt.reader is true only for statements that return rows
      // (SELECT, data-returning PRAGMAs). Set/DDL statements return none.
      if (stmt.reader) {
        return Promise.resolve({ rows: stmt.all() });
      }
      stmt.run();
      return Promise.resolve({ rows: [] });
    },
  };
}

function sqlListTables (client) {
  return client
    .execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .then(r => r.rows.map(row => row.name));
}

function sqlCount (client, table) {
  return client
    .execute(`SELECT COUNT(*) AS n FROM "${table}"`)
    .then(r => Number(r.rows[0].n));
}

/**
 * PRAGMA foreign_key_list returns the tables each table references. To delete
 * safely regardless of session-level PRAGMA state, delete children before
 * parents (topological order on the references graph).
 */
async function fkSafeOrder (client, tables) {
  const deps = new Map(tables.map(t => [t, []]));
  for (const table of tables) {
    const fk = await client.execute(`PRAGMA foreign_key_list("${table}")`);
    for (const row of fk.rows) {
      if (row.table && deps.has(row.table)) {
        deps.get(table).push(row.table);
      }
    }
  }
  const order = [];
  const resolved = new Set();
  let progress = true;
  while (progress) {
    progress = false;
    for (const table of tables) {
      if (resolved.has(table)) {
        continue;
      }
      const blocked = deps.get(table).some(d => !resolved.has(d));
      if (!blocked) {
        order.push(table);
        resolved.add(table);
        progress = true;
      }
    }
  }
  // Any table left over is in a circular FK group (shouldn't happen here);
  // append it so we fail loudly rather than silently skip data.
  for (const table of tables) {
    if (!resolved.has(table)) {
      order.push(table);
    }
  }
  return order;
}

async function backupAllRows (client, tables, outPath) {
  const backup = {};
  for (const table of tables) {
    const result = await client.execute(`SELECT * FROM "${table}"`);
    backup[table] = result.rows;
  }
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));
  return backup;
}

async function main () {
  dotenv.config();
  const wipe = process.argv.includes('--wipe');

  await connectDatabase();
  const raw = isTurso() ? getTursoClient() : getDb();
  if (!raw) {
    console.error('Database client not initialized.');
    process.exit(1);
  }
  const client = toAsyncClient(raw, isTurso());

  const target = isTurso()
    ? `Turso: ${(process.env.TURSO_URL || '').replace(/\/\/.*@/, '//***@')}`
    : `local SQLite: ${process.env.SQLITE_PATH || 'backend/data/jertscart.db'}`;
  console.log(`Target database: ${target}`);
  if (isTurso()) {
    console.log('NOTE: this is the PRODUCTION database (Turso).');
  }

  const tables = await sqlListTables(client);
  const counts = {};
  for (const table of tables) {
    counts[table] = await sqlCount(client, table);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  console.log('\nRow counts:');
  for (const table of tables) {
    if (counts[table] > 0) {
      console.log(`  ${table}: ${counts[table]}`);
    }
  }
  console.log(`\nTotal: ${total} rows across ${tables.length} tables`);

  if (!wipe) {
    console.log('\nDry run — nothing deleted. Re-run with --wipe to delete (writes a JSON backup first).');
    process.exit(0);
  }

  if (total === 0) {
    console.log('Database is already empty — nothing to do.');
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(__dirname, '..', 'data', `db-backup-${stamp}.json`);
  console.log(`\nWriting backup to ${path.relative(process.cwd(), backupPath)} ...`);
  await backupAllRows(client, tables, backupPath);
  console.log('Backup written.');

  const order = await fkSafeOrder(client, tables);
  console.log(`Deleting rows from ${tables.length} tables (FK-safe order) ...`);
  await client.execute('PRAGMA foreign_keys = OFF');
  await client.execute('BEGIN');
  try {
    for (const table of order) {
      await client.execute(`DELETE FROM "${table}"`);
    }
    await client.execute('COMMIT');
  } catch (err) {
    try {
      await client.execute('ROLLBACK');
    } catch (_e) {
      /* ignore */
    }
    throw err;
  }
  await client.execute('PRAGMA foreign_keys = ON');

  let remaining = 0;
  for (const table of tables) {
    remaining += await sqlCount(client, table);
  }
  if (remaining > 0) {
    console.error(`❌ Wipe incomplete — ${remaining} rows remain. Restore from ${backupPath} if needed.`);
    process.exit(1);
  }

  try {
    await client.execute('VACUUM');
  } catch (_e) {
    /* VACUUM not supported on all deployments — non-fatal */
  }

  console.log('✅ Database wiped. All tables are empty.');
  console.log('   Backup kept at: ' + backupPath);
  console.log('   Restart the backend to re-create the admin from ADMIN_EMAIL/ADMIN_PASSWORD.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Wipe failed:', err.message || err);
  process.exit(1);
});

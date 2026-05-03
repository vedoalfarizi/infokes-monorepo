/**
 * migrate.ts — Database migration runner
 *
 * Reads all SQL files matching `NNN_*.sql` from the migrations directory,
 * applies any that have not yet been recorded in the `schema_migrations`
 * tracking table, and records each successful run.
 *
 * Usage:
 *   bun run src/migrate.ts
 *
 * Environment variables (same as the main app, loaded from .env):
 *   DATABASE_URL  — full postgres connection string, OR
 *   DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS — individual vars
 */

import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Resolve the migrations directory relative to this file
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations')

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
const connectionString =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASS ?? 'postgres'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'file_explorer'}`

const pool = new pg.Pool({ connectionString })

// ---------------------------------------------------------------------------
// Bootstrap: ensure the tracking table exists
// ---------------------------------------------------------------------------
async function bootstrap(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

// ---------------------------------------------------------------------------
// Discover migration files: NNN_*.sql, sorted ascending
// ---------------------------------------------------------------------------
function discoverMigrations(): string[] {
  const entries = fs.readdirSync(MIGRATIONS_DIR)
  return entries
    .filter((f) => /^\d+.*\.sql$/.test(f) && f !== 'seed.sql')
    .sort()
}

// ---------------------------------------------------------------------------
// Fetch already-applied versions from the tracking table
// ---------------------------------------------------------------------------
async function appliedVersions(client: pg.PoolClient): Promise<Set<string>> {
  const result = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  )
  return new Set(result.rows.map((r) => r.version))
}

// ---------------------------------------------------------------------------
// Run a single migration file inside a transaction
// ---------------------------------------------------------------------------
async function applyMigration(client: pg.PoolClient, file: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, file)
  const sql = fs.readFileSync(filePath, 'utf8')

  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      [file]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const client = await pool.connect()
  try {
    console.log('→ Ensuring schema_migrations table exists...')
    await bootstrap(client)

    const files = discoverMigrations()
    const applied = await appliedVersions(client)

    const pending = files.filter((f) => !applied.has(f))

    if (pending.length === 0) {
      console.log(`✓ Nothing to migrate — all ${files.length} migration(s) already applied.`)
      return
    }

    console.log(`→ Found ${pending.length} pending migration(s) out of ${files.length} total.\n`)

    for (const file of pending) {
      process.stdout.write(`  → apply  ${file} ... `)
      await applyMigration(client, file)
      console.log('✓')
    }

    const skipped = files.length - pending.length
    console.log(`\n✓ Migrations complete — applied: ${pending.length}, skipped: ${skipped}.`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('✗ Migration failed:', err.message)
  process.exit(1)
})

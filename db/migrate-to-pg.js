'use strict';

// One-off data migration: copies all rows from the legacy SQLite database into
// the Supabase/PostgreSQL schema. Safe to re-run (ON CONFLICT (id) DO NOTHING).
//
// Usage (locally or inside the Railway container that holds the volume):
//   DATABASE_URL=postgres://... SQLITE_PATH=./data/sigap.db node db/migrate-to-pg.js
//
// SQLITE_PATH defaults to the same location the old app used.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { pool, init, SCHEMA } = require('./pg');

const DEFAULT_SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'sigap.db');

// Insert order respects foreign keys (users first).
const TABLES = [
  'users',
  'surat_masuk',
  'surat_keluar',
  'anggota',
  'dokumentasi',
  'transaksi',
  'daftar_program',
  'hasil_program',
  'surat_masuk_panitia',
  'surat_keluar_panitia',
  'transaksi_panitia'
];

async function targetColumns(table) {
  const res = await pool.query(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    [SCHEMA, table]
  );
  return res.rows.map((r) => r.column_name);
}

function sqliteHasTable(sqlite, table) {
  return !!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

// Copies rows from the SQLite file into Postgres. Assumes the schema already
// exists (caller runs init first). Does NOT close the pool.
async function migrate(sqlitePath = DEFAULT_SQLITE_PATH) {
  if (!fs.existsSync(sqlitePath)) {
    console.log('Migrasi dilewati: file SQLite tidak ditemukan di', sqlitePath);
    return 0;
  }
  console.log('Migrasi data dari SQLite:', sqlitePath);
  const sqlite = new Database(sqlitePath, { readonly: true });

  let grandTotal = 0;
  for (const table of TABLES) {
    if (!sqliteHasTable(sqlite, table)) {
      console.log(`- ${table}: (tidak ada di SQLite, dilewati)`);
      continue;
    }
    const srcCols = sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    const dstCols = await targetColumns(table);
    const cols = srcCols.filter((c) => dstCols.includes(c));
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();

    let inserted = 0;
    for (const row of rows) {
      const values = cols.map((c) => row[c]);
      const placeholders = cols.map((_, i) => '$' + (i + 1)).join(', ');
      const res = await pool.query(
        `INSERT INTO ${SCHEMA}.${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
        values
      );
      inserted += res.rowCount;
    }

    // Realign the id sequence so new inserts don't collide with migrated ids.
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('${SCHEMA}.${table}', 'id'),
              COALESCE((SELECT MAX(id) FROM ${SCHEMA}.${table}), 1), true)`
    );

    grandTotal += inserted;
    console.log(`- ${table}: ${inserted}/${rows.length} baris dipindahkan`);
  }

  sqlite.close();
  console.log(`Migrasi selesai. Total ${grandTotal} baris dipindahkan ke Supabase.`);
  return grandTotal;
}

if (require.main === module) {
  (async () => {
    await init();
    await migrate();
    await pool.end();
    process.exit(0);
  })().catch((err) => {
    console.error('Migrasi gagal:', err);
    process.exit(1);
  });
}

module.exports = { migrate };

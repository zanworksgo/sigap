'use strict';

// PostgreSQL (Supabase) data layer. Replaces the former better-sqlite3 engine.
// Provides async get/all/run helpers plus a small SQL translator so existing
// SQLite-flavoured queries keep working with minimal edits at the call sites.
const { Pool } = require('pg');
const BIDANG = require('../config/bidang');

const SCHEMA = process.env.PG_SCHEMA || 'sigap';

const BASE_ROLES = ['Admin', 'Ketua Umum', 'Sekretaris', 'Humas', 'Bendahara'];
const ALL_ROLES = [...BASE_ROLES, ...BIDANG.map((b) => b.role).filter((r) => !BASE_ROLES.includes(r))];
const ROLE_CHECK = ALL_ROLES.map((r) => `'${String(r).replace(/'/g, "''")}'`).join(',');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 5),
  ssl: { rejectUnauthorized: false }
});

// Fallback: ensure each new connection resolves unqualified names in our schema.
// (The durable fix is the ALTER ROLE ... SET search_path applied in init().)
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${SCHEMA}, public`).catch(() => {});
});

// Translate the SQLite dialect used across the app into PostgreSQL.
function translate(sql) {
  let text = sql;
  text = text.replace(
    /datetime\('now',\s*'localtime'\)/gi,
    "to_char(now() AT TIME ZONE 'Asia/Makassar','YYYY-MM-DD HH24:MI:SS')"
  );
  text = text.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "to_char(($1)::timestamp,'YYYY-MM')");
  text = text.replace(/strftime\('%m',\s*([^)]+)\)/gi, "to_char(($1)::timestamp,'MM')");
  text = text.replace(/strftime\('%Y',\s*([^)]+)\)/gi, "to_char(($1)::timestamp,'YYYY')");
  // SQLite LIKE is case-insensitive; ILIKE preserves that behaviour in Postgres.
  text = text.replace(/\bLIKE\b/gi, 'ILIKE');
  // Positional params: ? -> $1, $2, ...
  let i = 0;
  text = text.replace(/\?/g, () => '$' + ++i);
  return text;
}

async function all(sql, params = []) {
  const res = await pool.query(translate(sql), params);
  return res.rows;
}

async function get(sql, params = []) {
  const res = await pool.query(translate(sql), params);
  return res.rows[0];
}

async function run(sql, params = []) {
  const res = await pool.query(translate(sql), params);
  return { changes: res.rowCount, rows: res.rows };
}

const TIMESTAMP_DEFAULT = "to_char(now() AT TIME ZONE 'Asia/Makassar','YYYY-MM-DD HH24:MI:SS')";

async function init() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS ${SCHEMA};
    SET search_path TO ${SCHEMA}, public;

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN (${ROLE_CHECK})),
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Nonaktif')),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
    );

    CREATE TABLE IF NOT EXISTS surat_masuk (
      id SERIAL PRIMARY KEY,
      nomor_surat TEXT NOT NULL,
      tanggal_masuk TEXT NOT NULL,
      asal_surat TEXT NOT NULL,
      perihal TEXT NOT NULL,
      penerima TEXT NOT NULL,
      file_path TEXT,
      file_original TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS surat_keluar (
      id SERIAL PRIMARY KEY,
      nomor_surat TEXT NOT NULL,
      perihal TEXT NOT NULL,
      ditujukan TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      file_path TEXT,
      file_original TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS anggota (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      tempat_lahir TEXT,
      tanggal_lahir TEXT,
      kelas TEXT NOT NULL,
      alamat TEXT NOT NULL,
      no_hp TEXT NOT NULL,
      angkatan TEXT,
      nra TEXT,
      jabatan TEXT NOT NULL,
      foto_path TEXT,
      foto_original TEXT,
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Alumni','Keluar')),
      keluar_bukti_path TEXT,
      keluar_bukti_original TEXT,
      catatan TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dokumentasi (
      id SERIAL PRIMARY KEY,
      nama_kegiatan TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      link TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id SERIAL PRIMARY KEY,
      jenis TEXT NOT NULL CHECK (jenis IN ('Pemasukan','Pengeluaran')),
      tanggal TEXT NOT NULL,
      uraian TEXT NOT NULL,
      kategori TEXT,
      nominal BIGINT NOT NULL DEFAULT 0,
      keterangan TEXT,
      bukti_path TEXT,
      bukti_original TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS daftar_program (
      id SERIAL PRIMARY KEY,
      bidang TEXT NOT NULL,
      nama_program TEXT NOT NULL,
      target TEXT,
      status TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','proses','tinjauan','selesai')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS hasil_program (
      id SERIAL PRIMARY KEY,
      bidang TEXT NOT NULL,
      nama_kegiatan TEXT NOT NULL,
      tanggal_mulai TEXT NOT NULL,
      tanggal_selesai TEXT,
      target TEXT,
      hasil TEXT,
      penanggung_jawab TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS surat_masuk_panitia (
      id SERIAL PRIMARY KEY,
      kepanitiaan TEXT NOT NULL,
      nomor_surat TEXT NOT NULL,
      tanggal_masuk TEXT NOT NULL,
      asal_surat TEXT NOT NULL,
      perihal TEXT NOT NULL,
      penerima TEXT NOT NULL,
      file_path TEXT,
      file_original TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS surat_keluar_panitia (
      id SERIAL PRIMARY KEY,
      kepanitiaan TEXT NOT NULL,
      nomor_surat TEXT NOT NULL,
      perihal TEXT NOT NULL,
      ditujukan TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      file_path TEXT,
      file_original TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transaksi_panitia (
      id SERIAL PRIMARY KEY,
      kepanitiaan TEXT NOT NULL,
      jenis TEXT NOT NULL CHECK (jenis IN ('Alokasi','Pemasukan','Pengeluaran','Pengembalian')),
      tanggal TEXT NOT NULL,
      uraian TEXT,
      kategori TEXT,
      nominal BIGINT NOT NULL DEFAULT 0,
      keterangan TEXT,
      bukti_path TEXT,
      bukti_original TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_surat_keluar_nomor_active
      ON surat_keluar(nomor_surat) WHERE deleted_at IS NULL;
  `);

  // Durable, pooler-independent search_path so unqualified table names always
  // resolve to our schema (the connection `options` param is not honoured by
  // some Supabase pooler modes).
  try {
    await pool.query(`ALTER ROLE CURRENT_USER SET search_path TO ${SCHEMA}, public`);
  } catch (e) {
    console.warn('Catatan: gagal ALTER ROLE search_path (pakai fallback on-connect):', e.message);
  }
}

module.exports = { pool, init, all, get, run, translate, SCHEMA, ALL_ROLES };

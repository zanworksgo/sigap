'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const BIDANG = require('../config/bidang');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'sigap.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Valid user roles: the fixed base roles plus any bidang-specific roles.
const BASE_ROLES = ['Admin', 'Ketua Umum', 'Sekretaris', 'Humas', 'Bendahara'];
const ALL_ROLES = [...BASE_ROLES, ...BIDANG.map((b) => b.role).filter((r) => !BASE_ROLES.includes(r))];
const ROLE_CHECK = ALL_ROLES.map((r) => `'${r}'`).join(',');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN (${ROLE_CHECK})),
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Nonaktif')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS surat_masuk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_surat TEXT NOT NULL,
      tanggal_masuk TEXT NOT NULL,
      asal_surat TEXT NOT NULL,
      perihal TEXT NOT NULL,
      penerima TEXT NOT NULL,
      file_path TEXT,
      file_original TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS surat_keluar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_surat TEXT NOT NULL UNIQUE,
      perihal TEXT NOT NULL,
      ditujukan TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      file_path TEXT,
      file_original TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS anggota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS dokumentasi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_kegiatan TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      link TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis TEXT NOT NULL CHECK (jenis IN ('Pemasukan','Pengeluaran')),
      tanggal TEXT NOT NULL,
      uraian TEXT NOT NULL,
      kategori TEXT,
      nominal INTEGER NOT NULL DEFAULT 0,
      keterangan TEXT,
      bukti_path TEXT,
      bukti_original TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daftar_program (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bidang TEXT NOT NULL,
      nama_program TEXT NOT NULL,
      target TEXT,
      status TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','proses','tinjauan','selesai')),
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS hasil_program (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bidang TEXT NOT NULL,
      nama_kegiatan TEXT NOT NULL,
      tanggal_mulai TEXT NOT NULL,
      tanggal_selesai TEXT,
      target TEXT,
      hasil TEXT,
      penanggung_jawab TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  migrate();
}

// Lightweight schema migrations for databases created before a change.
function migrate() {
  migrateUserRoles();
  migrateProgramTables();
  migrateAnggota();

  // Optional per-member note added after the anggota rebuild.
  const anggotaCols = db.prepare('PRAGMA table_info(anggota)').all();
  if (anggotaCols.length && !anggotaCols.some((c) => c.name === 'catatan')) {
    db.exec('ALTER TABLE anggota ADD COLUMN catatan TEXT');
  }

  const cols = db.prepare('PRAGMA table_info(surat_masuk)').all();
  // SQLite cannot DROP a UNIQUE column, so rebuild the table without `indeks`.
  if (cols.some((c) => c.name === 'indeks')) {
    const rebuild = db.transaction(() => {
      db.exec(`
        CREATE TABLE surat_masuk_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nomor_surat TEXT NOT NULL,
          tanggal_masuk TEXT NOT NULL,
          asal_surat TEXT NOT NULL,
          perihal TEXT NOT NULL,
          penerima TEXT NOT NULL,
          file_path TEXT,
          file_original TEXT,
          created_by INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          deleted_at TEXT,
          FOREIGN KEY (created_by) REFERENCES users(id)
        );
        INSERT INTO surat_masuk_new
          (id, nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, created_by, created_at, updated_at, deleted_at)
        SELECT id, nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, created_by, created_at, updated_at, deleted_at
        FROM surat_masuk;
        DROP TABLE surat_masuk;
        ALTER TABLE surat_masuk_new RENAME TO surat_masuk;
      `);
    });
    rebuild();
  }
}

// Expand the users.role CHECK constraint whenever a new role (e.g. a new bidang)
// is introduced. SQLite cannot ALTER a CHECK, so rebuild the table when a role
// is missing. Foreign keys are toggled off during the swap because child tables
// reference users(id); ids are preserved so existing references stay valid.
function migrateUserRoles() {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!row || !row.sql) return;
  const missingRole = ALL_ROLES.some((r) => !row.sql.includes(`'${r}'`));
  if (!missingRole) return;

  db.pragma('foreign_keys = OFF');
  const rebuild = db.transaction(() => {
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN (${ROLE_CHECK})),
        status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Nonaktif')),
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      INSERT INTO users_new (id, nama, username, email, password, role, status, created_at, updated_at)
      SELECT id, nama, username, email, password, role, status, created_at, updated_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
  });
  rebuild();
  db.pragma('foreign_keys = ON');
}

// Move data from legacy SDM-specific / combined tables into the generic
// daftar_program and hasil_program tables (tagged with bidang='sdm'), then
// drop the obsolete tables.
function migrateProgramTables() {
  const exists = (name) => !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
  const hasCombined = exists('program_sdm');
  const hasDaftarOld = exists('daftar_program_sdm');
  const hasHasilOld = exists('hasil_program_sdm');
  if (!hasCombined && !hasDaftarOld && !hasHasilOld) return;

  const move = db.transaction(() => {
    if (hasCombined) {
      db.exec(`
        INSERT INTO hasil_program
          (bidang, nama_kegiatan, tanggal_mulai, tanggal_selesai, target, hasil, penanggung_jawab, created_by, created_at, updated_at, deleted_at)
        SELECT 'sdm', nama_kegiatan, tanggal_mulai, tanggal_selesai, target, hasil, NULL, created_by, created_at, updated_at, deleted_at
        FROM program_sdm;
        DROP TABLE program_sdm;
      `);
    }
    if (hasDaftarOld) {
      db.exec(`
        INSERT INTO daftar_program
          (bidang, nama_program, target, status, created_by, created_at, updated_at, deleted_at)
        SELECT 'sdm', nama_program, target, status, created_by, created_at, updated_at, deleted_at
        FROM daftar_program_sdm;
        DROP TABLE daftar_program_sdm;
      `);
    }
    if (hasHasilOld) {
      db.exec(`
        INSERT INTO hasil_program
          (bidang, nama_kegiatan, tanggal_mulai, tanggal_selesai, target, hasil, penanggung_jawab, created_by, created_at, updated_at, deleted_at)
        SELECT 'sdm', nama_kegiatan, tanggal_mulai, tanggal_selesai, target, hasil, penanggung_jawab, created_by, created_at, updated_at, deleted_at
        FROM hasil_program_sdm;
        DROP TABLE hasil_program_sdm;
      `);
    }
  });
  move();
}

// Rebuild anggota when created before NRA/foto/dynamic-jabatan support. Old
// single-value kelas/jabatan strings are converted into JSON arrays.
function migrateAnggota() {
  const cols = db.prepare('PRAGMA table_info(anggota)').all();
  if (cols.length === 0 || cols.some((c) => c.name === 'nra')) return;

  const oldRows = db.prepare('SELECT * FROM anggota').all();
  const rebuild = db.transaction(() => {
    db.exec(`
      CREATE TABLE anggota_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        deleted_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);

    const toJsonList = (v) => JSON.stringify(v && String(v).trim() ? [String(v).trim()] : []);
    const insert = db.prepare(
      `INSERT INTO anggota_new
        (id, nama, tempat_lahir, tanggal_lahir, kelas, alamat, no_hp, angkatan, nra, jabatan, foto_path, foto_original, status, keluar_bukti_path, keluar_bukti_original, catatan, created_by, created_at, updated_at, deleted_at)
       VALUES (@id, @nama, @tempat_lahir, @tanggal_lahir, @kelas, @alamat, @no_hp, @angkatan, NULL, @jabatan, NULL, NULL, @status, NULL, NULL, NULL, @created_by, @created_at, @updated_at, @deleted_at)`
    );
    for (const r of oldRows) {
      insert.run({
        id: r.id,
        nama: r.nama,
        tempat_lahir: r.tempat_lahir,
        tanggal_lahir: r.tanggal_lahir,
        kelas: toJsonList(r.kelas),
        alamat: r.alamat,
        no_hp: r.no_hp,
        angkatan: r.angkatan,
        jabatan: toJsonList(r.jabatan),
        status: r.status === 'Alumni' ? 'Alumni' : 'Aktif',
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at
      });
    }

    db.exec('DROP TABLE anggota; ALTER TABLE anggota_new RENAME TO anggota;');
  });
  rebuild();
}

module.exports = { db, init };

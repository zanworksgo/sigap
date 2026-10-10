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

// Destination columns per table (must match db/pg.js schema). Used instead of
// information_schema so column detection never depends on connection state.
const TABLE_COLUMNS = {
    users: ['id', 'nama', 'username', 'email', 'password', 'role', 'status', 'created_at', 'updated_at'],
    surat_masuk: ['id', 'nomor_surat', 'tanggal_masuk', 'asal_surat', 'perihal', 'penerima', 'file_path', 'file_original', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    surat_keluar: ['id', 'nomor_surat', 'perihal', 'ditujukan', 'tanggal', 'file_path', 'file_original', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    anggota: ['id', 'nama', 'tempat_lahir', 'tanggal_lahir', 'kelas', 'alamat', 'no_hp', 'angkatan', 'nra', 'jabatan', 'foto_path', 'foto_original', 'status', 'keluar_bukti_path', 'keluar_bukti_original', 'catatan', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    dokumentasi: ['id', 'nama_kegiatan', 'tanggal', 'link', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    transaksi: ['id', 'jenis', 'tanggal', 'uraian', 'kategori', 'nominal', 'keterangan', 'bukti_path', 'bukti_original', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    daftar_program: ['id', 'bidang', 'nama_program', 'target', 'status', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    hasil_program: ['id', 'bidang', 'nama_kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'target', 'hasil', 'penanggung_jawab', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    surat_masuk_panitia: ['id', 'kepanitiaan', 'nomor_surat', 'tanggal_masuk', 'asal_surat', 'perihal', 'penerima', 'file_path', 'file_original', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    surat_keluar_panitia: ['id', 'kepanitiaan', 'nomor_surat', 'perihal', 'ditujukan', 'tanggal', 'file_path', 'file_original', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
    transaksi_panitia: ['id', 'kepanitiaan', 'jenis', 'tanggal', 'uraian', 'kategori', 'nominal', 'keterangan', 'bukti_path', 'bukti_original', 'created_by', 'created_at', 'updated_at', 'deleted_at']
};

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
        const dstCols = TABLE_COLUMNS[table] || [];
        const cols = dstCols.filter((c) => srcCols.includes(c));
        const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();

        if (cols.length === 0) {
            console.log(`- ${table}: DILEWATI (kolom tidak cocok). src=[${srcCols}] dst=[${dstCols}]`);
            continue;
        }

        let inserted = 0;
        for (const row of rows) {
            const values = cols.map((c) => row[c]);
            const placeholders = cols.map((_, i) => '$' + (i + 1)).join(', ');
            const sql = `INSERT INTO ${SCHEMA}.${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
            try {
                const res = await pool.query(sql, values);
                inserted += res.rowCount;
            } catch (e) {
                console.error(`GAGAL insert ke ${table}:`, e.message, '\nSQL:', sql);
                throw e;
            }
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

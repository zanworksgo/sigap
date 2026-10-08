'use strict';

// One-off migration: pulls every uploaded file from the currently-live app
// (which still serves from the Railway volume) and uploads it into Supabase
// Storage. Run this BEFORE deploying the Storage-based code to the new host.
//
// Requires in .env: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   APP_URL (default https://sigap.pasmansa.or.id), APP_LOGIN_ID (default admin),
//   APP_LOGIN_PASS (the admin password).
require('dotenv').config();
const { all, pool } = require('./pg');
const { uploadBuffer } = require('./storage');

const APP_URL = (process.env.APP_URL || 'https://sigap.pasmansa.or.id').replace(/\/$/, '');
const LOGIN_ID = process.env.APP_LOGIN_ID || 'admin';
const LOGIN_PASS = process.env.APP_LOGIN_PASS || '';

// Columns that hold a storage key, per table.
const FILE_COLUMNS = {
  surat_masuk: ['file_path'],
  surat_keluar: ['file_path'],
  anggota: ['foto_path', 'keluar_bukti_path'],
  transaksi: ['bukti_path'],
  surat_masuk_panitia: ['file_path'],
  surat_keluar_panitia: ['file_path'],
  transaksi_panitia: ['bukti_path']
};

async function login() {
  const body = new URLSearchParams({ identifier: LOGIN_ID, password: LOGIN_PASS });
  const res = await fetch(`${APP_URL}/login`, {
    method: 'POST',
    body,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`Login gagal (HTTP ${res.status}). Cek APP_LOGIN_PASS.`);
  return setCookie.split(';')[0]; // connect.sid=...
}

async function collectKeys() {
  const keys = new Set();
  for (const [table, cols] of Object.entries(FILE_COLUMNS)) {
    const colList = cols.join(', ');
    let rows = [];
    try {
      rows = await all(`SELECT ${colList} FROM ${table}`);
    } catch (e) {
      console.log(`- ${table}: dilewati (${e.message})`);
      continue;
    }
    for (const r of rows) {
      for (const c of cols) {
        if (r[c]) keys.add(r[c]);
      }
    }
  }
  return [...keys];
}

async function main() {
  if (!LOGIN_PASS) throw new Error('APP_LOGIN_PASS belum di-set di .env');
  console.log('Login ke', APP_URL, 'sebagai', LOGIN_ID);
  const cookie = await login();

  const keys = await collectKeys();
  console.log(`Menemukan ${keys.length} file untuk dipindahkan.`);

  let ok = 0;
  let fail = 0;
  for (const key of keys) {
    try {
      const res = await fetch(`${APP_URL}/file/${key}`, { headers: { Cookie: cookie } });
      if (!res.ok) { console.log(`  SKIP ${key} (HTTP ${res.status})`); fail++; continue; }
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await res.arrayBuffer());
      await uploadBuffer(key, buffer, contentType);
      ok++;
      if (ok % 10 === 0) console.log(`  ...${ok} terpindah`);
    } catch (e) {
      console.log(`  GAGAL ${key}: ${e.message}`);
      fail++;
    }
  }

  console.log(`Selesai. Berhasil: ${ok}, gagal/lewat: ${fail}, total: ${keys.length}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Migrasi file gagal:', err);
  process.exit(1);
});

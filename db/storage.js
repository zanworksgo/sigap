'use strict';

// Supabase Storage layer for uploaded files (PDF/images). Keeps a private bucket
// and serves content through the app so existing per-module access control still
// applies. Object keys mirror the previous on-disk layout, e.g. "anggota/<file>"
// or "surat-masuk-panitia/<slug>/<file>".
const { createClient } = require('@supabase/supabase-js');

// supabase-js initialises a realtime client that needs a global WebSocket.
// Node < 22 has none, so polyfill with `ws` (we only use Storage here).
if (!globalThis.WebSocket) {
  try { globalThis.WebSocket = require('ws'); } catch { /* optional */ }
}

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const BUCKET = (process.env.SUPABASE_BUCKET || 'uploads').trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('PERINGATAN: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set; upload file tidak akan berfungsi.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Create the (private) bucket once if it doesn't exist yet.
async function initStorage() {
  try {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (!data) {
      await supabase.storage.createBucket(BUCKET, { public: false });
      console.log(`Bucket Storage "${BUCKET}" dibuat.`);
    }
  } catch (e) {
    // createBucket throws if it already exists; ignore that case.
    if (!/already exists/i.test(e.message || '')) {
      console.warn('initStorage:', e.message);
    }
  }
}

async function uploadBuffer(key, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType: contentType || 'application/octet-stream', upsert: true });
  if (error) throw error;
  return key;
}

// Returns a Node Buffer for the object, or null if it does not exist.
async function downloadBuffer(key) {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function removeObject(key) {
  if (!key) return;
  const clean = key.replace(/^uploads[\\/]/, '');
  await supabase.storage.from(BUCKET).remove([clean]).catch(() => {});
}

module.exports = { supabase, BUCKET, initStorage, uploadBuffer, downloadBuffer, removeObject };

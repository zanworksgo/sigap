'use strict';

const express = require('express');
const path = require('path');
const { downloadBuffer } = require('../db/storage');
const { canAccess } = require('../config/permissions');

const router = express.Router();

// Map upload subfolder -> module required to view the file.
const CATEGORY_MODULE = {
  'surat-masuk': 'surat_masuk',
  'surat-keluar': 'surat_keluar',
  'sertifikat': 'sertifikat',
  'pemasukan': 'pemasukan',
  'pengeluaran': 'pengeluaran',
  'anggota': 'anggota'
};

// Committee archives are stored one level deeper: <category>/<slug>/<filename>.
const PANITIA_CATEGORY = {
  'surat-masuk-panitia': 'surat_panitia',
  'surat-keluar-panitia': 'surat_panitia'
};

const MIME = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

function isUnsafeSegment(s) {
  return !s || s.includes('/') || s.includes('\\') || s.includes('..');
}

// Stream an object from Supabase Storage with the right headers.
async function sendObject(req, res, key, filename) {
  const buf = await downloadBuffer(key);
  if (!buf) return res.status(404).send('File tidak ditemukan.');
  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  const disp = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disp}; filename="${filename}"`);
  res.send(buf);
}

// Serve a committee-archive file: /file/<category>/<slug>/<filename>.
router.get('/:category/:slug/:filename', async (req, res) => {
  const { category, slug, filename } = req.params;
  const mod = PANITIA_CATEGORY[category];
  if (!mod) return res.status(404).send('File tidak ditemukan.');

  if (!canAccess(req.session.user.role, mod)) {
    return res.status(403).send('Anda tidak memiliki akses ke file ini.');
  }

  if (isUnsafeSegment(slug) || isUnsafeSegment(filename)) {
    return res.status(400).send('Nama file tidak valid.');
  }

  await sendObject(req, res, `${category}/${slug}/${filename}`, filename);
});

// Serve an uploaded file only if the user's role may access its module.
// disposition=attachment forces a download; otherwise inline preview.
router.get('/:category/:filename', async (req, res) => {
  const { category, filename } = req.params;
  const mod = CATEGORY_MODULE[category];
  if (!mod) return res.status(404).send('File tidak ditemukan.');

  if (!canAccess(req.session.user.role, mod)) {
    return res.status(403).send('Anda tidak memiliki akses ke file ini.');
  }

  // Prevent path traversal: only allow a bare filename.
  if (isUnsafeSegment(filename)) {
    return res.status(400).send('Nama file tidak valid.');
  }

  await sendObject(req, res, `${category}/${filename}`, filename);
});

module.exports = router;

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { UPLOAD_ROOT } = require('../middleware/upload');
const { canAccess } = require('../config/permissions');

const router = express.Router();

// Map upload subfolder -> module required to view the file. The first path
// segment is the category; files may live in a nested folder (e.g. per
// kepanitiaan): keuangan-panitia/<slug>/<filename>.
const CATEGORY_MODULE = {
  'surat-masuk': 'surat_masuk',
  'surat-keluar': 'surat_keluar',
  'pemasukan': 'pemasukan',
  'pengeluaran': 'pengeluaran',
  'anggota': 'anggota',
  'surat-masuk-panitia': 'surat_panitia',
  'surat-keluar-panitia': 'surat_panitia',
  'keuangan-panitia': 'keuangan_panitia'
};

// Serve an uploaded file only if the user's role may access its module.
// disposition=attachment forces a download; otherwise inline preview.
router.get('/*', (req, res) => {
  const rel = req.params[0] || '';

  // Prevent path traversal before touching the filesystem.
  if (rel.includes('..') || rel.includes('\\')) {
    return res.status(400).send('Nama file tidak valid.');
  }

  const parts = rel.split('/').filter(Boolean);
  if (parts.length < 2) return res.status(404).send('File tidak ditemukan.');

  const category = parts[0];
  const mod = CATEGORY_MODULE[category];
  if (!mod) return res.status(404).send('File tidak ditemukan.');

  if (!canAccess(req.session.user.role, mod)) {
    return res.status(403).send('Anda tidak memiliki akses ke file ini.');
  }

  const filename = parts[parts.length - 1];
  const full = path.join(UPLOAD_ROOT, ...parts);
  if (!full.startsWith(UPLOAD_ROOT) || !fs.existsSync(full)) {
    return res.status(404).send('File tidak ditemukan.');
  }

  const MIME = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  if (req.query.download === '1') {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  }
  fs.createReadStream(full).pipe(res);
});

module.exports = router;

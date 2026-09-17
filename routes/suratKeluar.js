'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('surat-keluar');

router.use(requireAccess('surat_keluar'));

function buildList(req) {
  const q = (req.query.q || '').trim();
  const bulan = (req.query.bulan || '').trim();
  const tahun = (req.query.tahun || '').trim();

  let sql = 'SELECT * FROM surat_keluar WHERE deleted_at IS NULL';
  const params = [];
  if (q) {
    sql += ' AND (nomor_surat LIKE ? OR perihal LIKE ? OR ditujukan LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (bulan) {
    sql += " AND strftime('%m', tanggal) = ?";
    params.push(String(bulan).padStart(2, '0'));
  }
  if (tahun) {
    sql += " AND strftime('%Y', tanggal) = ?";
    params.push(tahun);
  }
  sql += ' ORDER BY tanggal ASC, id ASC';
  return { rows: db.prepare(sql).all(...params), filters: { q, bulan, tahun } };
}

router.get('/', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('surat-keluar/index', {
    title: 'Surat Keluar',
    rows,
    filters,
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('surat-keluar/print', {
    title: 'Cetak Data Surat Keluar',
    layout: false,
    rows,
    filters
  });
});

router.get('/:id/detail', (req, res) => {
  const row = db.prepare('SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(row);
});

router.post('/', requireWrite('surat_keluar'), upload.single('file'), (req, res) => {
  const nomor_surat = (req.body.nomor_surat || '').trim();
  const perihal = (req.body.perihal || '').trim();
  const ditujukan = (req.body.ditujukan || '').trim();
  const tanggal = (req.body.tanggal || '').trim();

  if (!nomor_surat || !perihal || !ditujukan || !tanggal) {
    if (req.file) removeFile('surat-keluar/' + req.file.filename);
    return res.redirect('/surat-keluar?type=error&msg=' + encodeURIComponent('Semua field wajib diisi.'));
  }

  const dup = db.prepare('SELECT id FROM surat_keluar WHERE nomor_surat = ? AND deleted_at IS NULL').get(nomor_surat);
  if (dup) {
    if (req.file) removeFile('surat-keluar/' + req.file.filename);
    return res.redirect('/surat-keluar?type=error&msg=' + encodeURIComponent('Nomor surat sudah terdaftar.'));
  }

  const file_path = req.file ? 'surat-keluar/' + req.file.filename : null;
  const file_original = req.file ? req.file.originalname : null;

  db.prepare(
    `INSERT INTO surat_keluar (nomor_surat, perihal, ditujukan, tanggal, file_path, file_original, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(nomor_surat, perihal, ditujukan, tanggal, file_path, file_original, req.session.user.id);

  res.redirect('/surat-keluar?msg=' + encodeURIComponent('Surat keluar berhasil ditambahkan.'));
});

router.post('/:id/edit', requireWrite('surat_keluar'), upload.single('file'), (req, res) => {
  const row = db.prepare('SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) {
    if (req.file) removeFile('surat-keluar/' + req.file.filename);
    return res.redirect('/surat-keluar?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
  }

  const nomor_surat = (req.body.nomor_surat || '').trim();
  const perihal = (req.body.perihal || '').trim();
  const ditujukan = (req.body.ditujukan || '').trim();
  const tanggal = (req.body.tanggal || '').trim();

  if (!nomor_surat || !perihal || !ditujukan || !tanggal) {
    if (req.file) removeFile('surat-keluar/' + req.file.filename);
    return res.redirect('/surat-keluar?type=error&msg=' + encodeURIComponent('Semua field wajib diisi.'));
  }

  const dup = db.prepare('SELECT id FROM surat_keluar WHERE nomor_surat = ? AND id <> ? AND deleted_at IS NULL').get(nomor_surat, row.id);
  if (dup) {
    if (req.file) removeFile('surat-keluar/' + req.file.filename);
    return res.redirect('/surat-keluar?type=error&msg=' + encodeURIComponent('Nomor surat sudah terdaftar.'));
  }

  let file_path = row.file_path;
  let file_original = row.file_original;
  if (req.file) {
    if (row.file_path) removeFile(row.file_path);
    file_path = 'surat-keluar/' + req.file.filename;
    file_original = req.file.originalname;
  }

  db.prepare(
    `UPDATE surat_keluar SET nomor_surat=?, perihal=?, ditujukan=?, tanggal=?, file_path=?, file_original=?, updated_at=datetime('now','localtime')
     WHERE id=?`
  ).run(nomor_surat, perihal, ditujukan, tanggal, file_path, file_original, row.id);

  res.redirect('/surat-keluar?msg=' + encodeURIComponent('Surat keluar berhasil diperbarui.'));
});

router.post('/:id/delete', requireWrite('surat_keluar'), (req, res) => {
  db.prepare(`UPDATE surat_keluar SET deleted_at=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  res.redirect('/surat-keluar?msg=' + encodeURIComponent('Surat keluar diarsipkan.'));
});

module.exports = router;

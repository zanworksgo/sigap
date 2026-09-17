'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('surat-masuk');

router.use(requireAccess('surat_masuk'));

function buildList(req) {
  const q = (req.query.q || '').trim();
  const bulan = (req.query.bulan || '').trim();
  const tahun = (req.query.tahun || '').trim();

  let sql = 'SELECT * FROM surat_masuk WHERE deleted_at IS NULL';
  const params = [];
  if (q) {
    sql += ' AND (nomor_surat LIKE ? OR asal_surat LIKE ? OR perihal LIKE ? OR penerima LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (bulan) {
    sql += " AND strftime('%m', tanggal_masuk) = ?";
    params.push(String(bulan).padStart(2, '0'));
  }
  if (tahun) {
    sql += " AND strftime('%Y', tanggal_masuk) = ?";
    params.push(tahun);
  }
  sql += ' ORDER BY tanggal_masuk ASC, id ASC';
  return { rows: db.prepare(sql).all(...params), filters: { q, bulan, tahun } };
}

router.get('/', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('surat-masuk/index', {
    title: 'Surat Masuk',
    rows,
    filters,
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('surat-masuk/print', {
    title: 'Cetak Data Surat Masuk',
    layout: false,
    rows,
    filters
  });
});

router.get('/:id/detail', (req, res) => {
  const row = db.prepare('SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(row);
});

router.post('/', requireWrite('surat_masuk'), upload.single('file'), (req, res) => {
  const nomor_surat = (req.body.nomor_surat || '').trim();
  const tanggal_masuk = (req.body.tanggal_masuk || '').trim();
  const asal_surat = (req.body.asal_surat || '').trim();
  const perihal = (req.body.perihal || '').trim();
  const penerima = (req.body.penerima || '').trim();

  if (!nomor_surat || !tanggal_masuk || !asal_surat || !perihal || !penerima) {
    if (req.file) removeFile('surat-masuk/' + req.file.filename);
    return res.redirect('/surat-masuk?type=error&msg=' + encodeURIComponent('Semua field wajib diisi.'));
  }

  const file_path = req.file ? 'surat-masuk/' + req.file.filename : null;
  const file_original = req.file ? req.file.originalname : null;

  db.prepare(
    `INSERT INTO surat_masuk (nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, req.session.user.id);

  res.redirect('/surat-masuk?msg=' + encodeURIComponent('Surat masuk berhasil ditambahkan.'));
});

router.post('/:id/edit', requireWrite('surat_masuk'), upload.single('file'), (req, res) => {
  const row = db.prepare('SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) {
    if (req.file) removeFile('surat-masuk/' + req.file.filename);
    return res.redirect('/surat-masuk?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
  }

  const nomor_surat = (req.body.nomor_surat || '').trim();
  const tanggal_masuk = (req.body.tanggal_masuk || '').trim();
  const asal_surat = (req.body.asal_surat || '').trim();
  const perihal = (req.body.perihal || '').trim();
  const penerima = (req.body.penerima || '').trim();

  if (!nomor_surat || !tanggal_masuk || !asal_surat || !perihal || !penerima) {
    if (req.file) removeFile('surat-masuk/' + req.file.filename);
    return res.redirect('/surat-masuk?type=error&msg=' + encodeURIComponent('Semua field wajib diisi.'));
  }

  let file_path = row.file_path;
  let file_original = row.file_original;
  if (req.file) {
    if (row.file_path) removeFile(row.file_path);
    file_path = 'surat-masuk/' + req.file.filename;
    file_original = req.file.originalname;
  }

  db.prepare(
    `UPDATE surat_masuk SET nomor_surat=?, tanggal_masuk=?, asal_surat=?, perihal=?, penerima=?, file_path=?, file_original=?, updated_at=datetime('now','localtime')
     WHERE id=?`
  ).run(nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, row.id);

  res.redirect('/surat-masuk?msg=' + encodeURIComponent('Surat masuk berhasil diperbarui.'));
});

router.post('/:id/delete', requireWrite('surat_masuk'), (req, res) => {
  db.prepare(`UPDATE surat_masuk SET deleted_at=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  res.redirect('/surat-masuk?msg=' + encodeURIComponent('Surat masuk diarsipkan.'));
});

module.exports = router;

'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');

const router = express.Router();

router.use(requireAccess('dokumentasi'));

function buildList(req) {
  const q = (req.query.q || '').trim();
  const tahun = (req.query.tahun || '').trim();

  let sql = 'SELECT * FROM dokumentasi WHERE deleted_at IS NULL';
  const params = [];
  if (q) {
    sql += ' AND nama_kegiatan LIKE ?';
    params.push(`%${q}%`);
  }
  if (tahun) {
    sql += " AND strftime('%Y', tanggal) = ?";
    params.push(tahun);
  }
  sql += ' ORDER BY tanggal DESC, id DESC';
  return { rows: db.prepare(sql).all(...params), filters: { q, tahun } };
}

function distinctTahun() {
  return db.prepare(
    "SELECT DISTINCT strftime('%Y', tanggal) AS th FROM dokumentasi WHERE deleted_at IS NULL AND tanggal IS NOT NULL ORDER BY th DESC"
  ).all().map((r) => r.th);
}

router.get('/', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('dokumentasi/index', {
    title: 'Dokumentasi Kegiatan',
    rows,
    filters,
    tahunList: distinctTahun(),
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('dokumentasi/print', { title: 'Cetak Dokumentasi Kegiatan', layout: false, rows, filters });
});

router.get('/:id/detail', (req, res) => {
  const row = db.prepare('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(row);
});

function parseBody(req) {
  const nama_kegiatan = (req.body.nama_kegiatan || '').trim();
  const tanggal = (req.body.tanggal || '').trim();
  const link = (req.body.link || '').trim();
  return { nama_kegiatan, tanggal, link };
}

function validate(d) {
  if (!d.nama_kegiatan || !d.tanggal || !d.link) return 'Semua field wajib diisi.';
  // Only accept safe http/https links.
  if (!/^https?:\/\/.+/i.test(d.link)) return 'Link harus diawali http:// atau https://';
  return null;
}

router.post('/', requireWrite('dokumentasi'), (req, res) => {
  const d = parseBody(req);
  const err = validate(d);
  if (err) return res.redirect('/dokumentasi?type=error&msg=' + encodeURIComponent(err));

  db.prepare(
    `INSERT INTO dokumentasi (nama_kegiatan, tanggal, link, created_by)
     VALUES (?, ?, ?, ?)`
  ).run(d.nama_kegiatan, d.tanggal, d.link, req.session.user.id);

  res.redirect('/dokumentasi?msg=' + encodeURIComponent('Dokumentasi berhasil ditambahkan.'));
});

router.post('/:id/edit', requireWrite('dokumentasi'), (req, res) => {
  const row = db.prepare('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) return res.redirect('/dokumentasi?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));

  const d = parseBody(req);
  const err = validate(d);
  if (err) return res.redirect('/dokumentasi?type=error&msg=' + encodeURIComponent(err));

  db.prepare(
    `UPDATE dokumentasi SET nama_kegiatan=?, tanggal=?, link=?, updated_at=datetime('now','localtime')
     WHERE id=?`
  ).run(d.nama_kegiatan, d.tanggal, d.link, row.id);

  res.redirect('/dokumentasi?msg=' + encodeURIComponent('Dokumentasi berhasil diperbarui.'));
});

router.post('/:id/delete', requireWrite('dokumentasi'), (req, res) => {
  db.prepare(`UPDATE dokumentasi SET deleted_at=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  res.redirect('/dokumentasi?msg=' + encodeURIComponent('Dokumentasi dihapus.'));
});

module.exports = router;

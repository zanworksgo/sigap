'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');

const router = express.Router();

router.use(requireAccess('alumni'));

function buildList(req) {
  const q = (req.query.q || '').trim();
  const angkatan = (req.query.angkatan || '').trim();

  let sql = "SELECT * FROM anggota WHERE deleted_at IS NULL AND status='Alumni'";
  const params = [];
  if (q) {
    sql += ' AND nama LIKE ?';
    params.push(`%${q}%`);
  }
  if (angkatan) {
    sql += ' AND angkatan = ?';
    params.push(angkatan);
  }
  // Ordinal ordering: treat angkatan as a number, not text.
  sql += ' ORDER BY CAST(angkatan AS INTEGER) ASC, nama ASC';
  return { rows: db.prepare(sql).all(...params), filters: { q, angkatan } };
}

router.get('/', (req, res) => {
  const { rows, filters } = buildList(req);
  const angkatanList = db.prepare(
    "SELECT DISTINCT angkatan FROM anggota WHERE deleted_at IS NULL AND status='Alumni' AND angkatan IS NOT NULL AND angkatan <> '' ORDER BY CAST(angkatan AS INTEGER) DESC"
  ).all().map((r) => r.angkatan);

  res.render('alumni/index', {
    title: 'Data Alumni',
    rows,
    filters,
    angkatanList,
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('alumni/print', { title: 'Cetak Data Alumni', layout: false, rows, filters });
});

router.get('/:id/detail', (req, res) => {
  const row = db.prepare("SELECT * FROM anggota WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(row);
});

// Return an alumni back to active membership.
router.post('/:id/to-aktif', requireWrite('alumni'), (req, res) => {
  db.prepare(`UPDATE anggota SET status='Aktif', updated_at=datetime('now','localtime') WHERE id=? AND deleted_at IS NULL`).run(req.params.id);
  res.redirect('/alumni?msg=' + encodeURIComponent('Alumni dikembalikan menjadi Anggota Aktif.'));
});

router.post('/:id/delete', requireWrite('alumni'), (req, res) => {
  db.prepare(`UPDATE anggota SET deleted_at=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  res.redirect('/alumni?msg=' + encodeURIComponent('Alumni dihapus.'));
});

module.exports = router;

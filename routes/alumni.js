'use strict';

const express = require('express');
const { get, all, run } = require('../db/pg');
const { requireAccess, requireWrite } = require('../middleware/auth');

const router = express.Router();

router.use(requireAccess('alumni'));

async function buildList(req) {
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
  sql += " ORDER BY NULLIF(regexp_replace(angkatan, '[^0-9]', '', 'g'), '')::int ASC NULLS LAST, nama ASC";
  return { rows: await all(sql, params), filters: { q, angkatan } };
}

router.get('/', async (req, res) => {
  const { rows, filters } = await buildList(req);
  const angkatanList = (await all(
    "SELECT DISTINCT angkatan FROM anggota WHERE deleted_at IS NULL AND status='Alumni' AND angkatan IS NOT NULL AND angkatan <> '' ORDER BY angkatan DESC"
  )).map((r) => r.angkatan);

  res.render('alumni/index', {
    title: 'Data Alumni',
    rows,
    filters,
    angkatanList,
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', async (req, res) => {
  const { rows, filters } = await buildList(req);
  res.render('alumni/print', { title: 'Cetak Data Alumni', layout: false, rows, filters });
});

router.get('/:id/detail', async (req, res) => {
  const row = await get("SELECT * FROM anggota WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(row);
});

// Return an alumni back to active membership.
router.post('/:id/to-aktif', requireWrite('alumni'), async (req, res) => {
  await run(`UPDATE anggota SET status='Aktif', updated_at=datetime('now','localtime') WHERE id=? AND deleted_at IS NULL`, [req.params.id]);
  res.redirect('/alumni?msg=' + encodeURIComponent('Alumni dikembalikan menjadi Anggota Aktif.'));
});

router.post('/:id/delete', requireWrite('alumni'), async (req, res) => {
  await run(`UPDATE anggota SET deleted_at=datetime('now','localtime') WHERE id=?`, [req.params.id]);
  res.redirect('/alumni?msg=' + encodeURIComponent('Alumni dihapus.'));
});

module.exports = router;

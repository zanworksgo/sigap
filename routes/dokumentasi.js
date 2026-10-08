'use strict';

const express = require('express');
const { get, all, run } = require('../db/pg');
const { requireAccess, requireWrite } = require('../middleware/auth');

const router = express.Router();

router.use(requireAccess('dokumentasi'));

async function buildList(req) {
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
  return { rows: await all(sql, params), filters: { q, tahun } };
}

async function distinctTahun() {
  return (await all(
    "SELECT DISTINCT strftime('%Y', tanggal) AS th FROM dokumentasi WHERE deleted_at IS NULL AND tanggal IS NOT NULL ORDER BY th DESC"
  )).map((r) => r.th);
}

router.get('/', async (req, res) => {
  const { rows, filters } = await buildList(req);
  res.render('dokumentasi/index', {
    title: 'Dokumentasi Kegiatan',
    rows,
    filters,
    tahunList: await distinctTahun(),
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', async (req, res) => {
  const { rows, filters } = await buildList(req);
  res.render('dokumentasi/print', { title: 'Cetak Dokumentasi Kegiatan', layout: false, rows, filters });
});

router.get('/:id/detail', async (req, res) => {
  const row = await get('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
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

router.post('/', requireWrite('dokumentasi'), async (req, res) => {
  const d = parseBody(req);
  const err = validate(d);
  if (err) return res.redirect('/dokumentasi?type=error&msg=' + encodeURIComponent(err));

  await run(
    `INSERT INTO dokumentasi (nama_kegiatan, tanggal, link, created_by)
     VALUES (?, ?, ?, ?)`,
    [d.nama_kegiatan, d.tanggal, d.link, req.session.user.id]
  );

  res.redirect('/dokumentasi?msg=' + encodeURIComponent('Dokumentasi berhasil ditambahkan.'));
});

router.post('/:id/edit', requireWrite('dokumentasi'), async (req, res) => {
  const row = await get('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!row) return res.redirect('/dokumentasi?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));

  const d = parseBody(req);
  const err = validate(d);
  if (err) return res.redirect('/dokumentasi?type=error&msg=' + encodeURIComponent(err));

  await run(
    `UPDATE dokumentasi SET nama_kegiatan=?, tanggal=?, link=?, updated_at=datetime('now','localtime')
     WHERE id=?`,
    [d.nama_kegiatan, d.tanggal, d.link, row.id]
  );

  res.redirect('/dokumentasi?msg=' + encodeURIComponent('Dokumentasi berhasil diperbarui.'));
});

router.post('/:id/delete', requireWrite('dokumentasi'), async (req, res) => {
  await run(`UPDATE dokumentasi SET deleted_at=datetime('now','localtime') WHERE id=?`, [req.params.id]);
  res.redirect('/dokumentasi?msg=' + encodeURIComponent('Dokumentasi dihapus.'));
});

module.exports = router;

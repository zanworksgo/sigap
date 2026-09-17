'use strict';

// Shared implementation for Pemasukan/Pengeluaran to avoid duplication.
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

function makeTransaksiRouter(jenis, moduleKey, basePath) {
  const express = require('express');
  const router = express.Router();
  const upload = createUploader(basePath);
  const label = jenis;

  router.use(requireAccess(moduleKey));

  function buildList(req) {
    const q = (req.query.q || '').trim();
    const bulan = (req.query.bulan || '').trim();
    const tahun = (req.query.tahun || '').trim();

    let sql = 'SELECT * FROM transaksi WHERE deleted_at IS NULL AND jenis = ?';
    const params = [jenis];
    if (q) {
      sql += ' AND (uraian LIKE ? OR kategori LIKE ? OR keterangan LIKE ?)';
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
    const rows = db.prepare(sql).all(...params);
    const total = rows.reduce((s, r) => s + r.nominal, 0);
    return { rows, total, filters: { q, bulan, tahun } };
  }

  router.get('/', (req, res) => {
    const { rows, total, filters } = buildList(req);
    res.render('keuangan/index', {
      title: label,
      jenis,
      moduleKey,
      basePath,
      rows,
      total,
      filters,
      flash: req.query.msg || null,
      flashType: req.query.type || 'success'
    });
  });

  router.get('/print', (req, res) => {
    const { rows, total, filters } = buildList(req);
    res.render('keuangan/print', { title: `Cetak ${label}`, layout: false, jenis, rows, total, filters });
  });

  router.get('/:id/detail', (req, res) => {
    const row = db.prepare('SELECT * FROM transaksi WHERE id = ? AND jenis = ? AND deleted_at IS NULL').get(req.params.id, jenis);
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
    res.json(row);
  });

  function parseBody(req) {
    const tanggal = (req.body.tanggal || '').trim();
    const uraian = (req.body.uraian || '').trim();
    const kategori = (req.body.kategori || '').trim() || null;
    const nominal = Math.round(Number(req.body.nominal));
    const keterangan = (req.body.keterangan || '').trim() || null;
    return { tanggal, uraian, kategori, nominal, keterangan };
  }

  function validate(d) {
    if (!d.tanggal || !d.uraian) return 'Tanggal dan uraian wajib diisi.';
    if (!Number.isFinite(d.nominal) || d.nominal < 0) return 'Nominal tidak valid.';
    return null;
  }

  router.post('/', requireWrite(moduleKey), upload.single('bukti'), (req, res) => {
    const d = parseBody(req);
    const err = validate(d);
    if (err) {
      if (req.file) removeFile(basePath + '/' + req.file.filename);
      return res.redirect(`/${basePath}?type=error&msg=` + encodeURIComponent(err));
    }
    const bukti_path = req.file ? basePath + '/' + req.file.filename : null;
    const bukti_original = req.file ? req.file.originalname : null;

    db.prepare(
      `INSERT INTO transaksi (jenis, tanggal, uraian, kategori, nominal, keterangan, bukti_path, bukti_original, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(jenis, d.tanggal, d.uraian, d.kategori, d.nominal, d.keterangan, bukti_path, bukti_original, req.session.user.id);

    res.redirect(`/${basePath}?msg=` + encodeURIComponent(`${label} berhasil ditambahkan.`));
  });

  router.post('/:id/edit', requireWrite(moduleKey), upload.single('bukti'), (req, res) => {
    const row = db.prepare('SELECT * FROM transaksi WHERE id = ? AND jenis = ? AND deleted_at IS NULL').get(req.params.id, jenis);
    if (!row) {
      if (req.file) removeFile(basePath + '/' + req.file.filename);
      return res.redirect(`/${basePath}?type=error&msg=` + encodeURIComponent('Data tidak ditemukan.'));
    }
    const d = parseBody(req);
    const err = validate(d);
    if (err) {
      if (req.file) removeFile(basePath + '/' + req.file.filename);
      return res.redirect(`/${basePath}?type=error&msg=` + encodeURIComponent(err));
    }

    let bukti_path = row.bukti_path;
    let bukti_original = row.bukti_original;
    if (req.file) {
      if (row.bukti_path) removeFile(row.bukti_path);
      bukti_path = basePath + '/' + req.file.filename;
      bukti_original = req.file.originalname;
    }

    db.prepare(
      `UPDATE transaksi SET tanggal=?, uraian=?, kategori=?, nominal=?, keterangan=?, bukti_path=?, bukti_original=?, updated_at=datetime('now','localtime')
       WHERE id=?`
    ).run(d.tanggal, d.uraian, d.kategori, d.nominal, d.keterangan, bukti_path, bukti_original, row.id);

    res.redirect(`/${basePath}?msg=` + encodeURIComponent(`${label} berhasil diperbarui.`));
  });

  router.post('/:id/delete', requireWrite(moduleKey), (req, res) => {
    db.prepare(`UPDATE transaksi SET deleted_at=datetime('now','localtime') WHERE id=? AND jenis=?`).run(req.params.id, jenis);
    res.redirect(`/${basePath}?msg=` + encodeURIComponent(`${label} dihapus.`));
  });

  return router;
}

module.exports = { makeTransaksiRouter };

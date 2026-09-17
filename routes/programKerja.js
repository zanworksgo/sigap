'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');

const STATUS = [
  { key: 'belum', label: 'Belum' },
  { key: 'proses', label: 'Proses' },
  { key: 'tinjauan', label: 'Tinjauan' },
  { key: 'selesai', label: 'Selesai' }
];
const STATUS_KEYS = STATUS.map((s) => s.key);

// Router for a bidang's "Daftar Program Kerja" page (No, Nama, Target, Status).
function daftarRouter(bidang) {
  const router = express.Router();
  const base = '/daftar-program-' + bidang.slug;
  router.use(requireAccess(bidang.module));

  function buildList(req) {
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();
    let sql = 'SELECT * FROM daftar_program WHERE deleted_at IS NULL AND bidang = ?';
    const params = [bidang.key];
    if (q) {
      sql += ' AND nama_program LIKE ?';
      params.push(`%${q}%`);
    }
    if (status && STATUS_KEYS.includes(status)) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id ASC';
    return { rows: db.prepare(sql).all(...params), filters: { q, status } };
  }

  router.get('/', (req, res) => {
    const { rows, filters } = buildList(req);
    res.render('program/daftar', {
      title: 'Daftar Program Kerja \u00B7 ' + bidang.label,
      rows,
      filters,
      statuses: STATUS,
      bidang,
      base,
      mod: bidang.module,
      flash: req.query.msg || null,
      flashType: req.query.type || 'success'
    });
  });

  router.get('/print', (req, res) => {
    const { rows, filters } = buildList(req);
    res.render('program/daftar-print', { title: 'Cetak Daftar Program Kerja', layout: false, rows, filters, statuses: STATUS, bidang });
  });

  function parseBody(req) {
    const nama_program = (req.body.nama_program || '').trim();
    const target = (req.body.target || '').trim() || null;
    let status = (req.body.status || 'belum').trim();
    if (!STATUS_KEYS.includes(status)) status = 'belum';
    return { nama_program, target, status };
  }

  router.post('/', requireWrite(bidang.module), (req, res) => {
    const d = parseBody(req);
    if (!d.nama_program) return res.redirect(base + '?type=error&msg=' + encodeURIComponent('Nama program kerja wajib diisi.'));
    db.prepare('INSERT INTO daftar_program (bidang, nama_program, target, status, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(bidang.key, d.nama_program, d.target, d.status, req.session.user.id);
    res.redirect(base + '?msg=' + encodeURIComponent('Program kerja berhasil ditambahkan.'));
  });

  router.post('/:id/edit', requireWrite(bidang.module), (req, res) => {
    const row = db.prepare('SELECT * FROM daftar_program WHERE id = ? AND bidang = ? AND deleted_at IS NULL').get(req.params.id, bidang.key);
    if (!row) return res.redirect(base + '?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
    const d = parseBody(req);
    if (!d.nama_program) return res.redirect(base + '?type=error&msg=' + encodeURIComponent('Nama program kerja wajib diisi.'));
    db.prepare("UPDATE daftar_program SET nama_program=?, target=?, status=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(d.nama_program, d.target, d.status, row.id);
    res.redirect(base + '?msg=' + encodeURIComponent('Program kerja berhasil diperbarui.'));
  });

  router.post('/:id/status', requireWrite(bidang.module), (req, res) => {
    const status = (req.body.status || '').trim();
    if (!STATUS_KEYS.includes(status)) return res.redirect(base + '?type=error&msg=' + encodeURIComponent('Status tidak valid.'));
    const row = db.prepare('SELECT id FROM daftar_program WHERE id = ? AND bidang = ? AND deleted_at IS NULL').get(req.params.id, bidang.key);
    if (!row) return res.redirect(base + '?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
    db.prepare("UPDATE daftar_program SET status=?, updated_at=datetime('now','localtime') WHERE id=?").run(status, row.id);
    res.redirect(base + '?msg=' + encodeURIComponent('Status program kerja diperbarui.'));
  });

  router.post('/:id/delete', requireWrite(bidang.module), (req, res) => {
    db.prepare("UPDATE daftar_program SET deleted_at=datetime('now','localtime') WHERE id=? AND bidang=?").run(req.params.id, bidang.key);
    res.redirect(base + '?msg=' + encodeURIComponent('Program kerja dihapus.'));
  });

  return router;
}

// Router for a bidang's "Hasil Program Kerja" page (manual input with PIC).
function hasilRouter(bidang) {
  const router = express.Router();
  const base = '/hasil-program-' + bidang.slug;
  router.use(requireAccess(bidang.module));

  function buildList(req) {
    const q = (req.query.q || '').trim();
    const tahun = (req.query.tahun || '').trim();
    let sql = 'SELECT * FROM hasil_program WHERE deleted_at IS NULL AND bidang = ?';
    const params = [bidang.key];
    if (q) {
      sql += ' AND nama_kegiatan LIKE ?';
      params.push(`%${q}%`);
    }
    if (tahun) {
      sql += " AND strftime('%Y', tanggal_mulai) = ?";
      params.push(tahun);
    }
    sql += ' ORDER BY tanggal_mulai DESC, id DESC';
    return { rows: db.prepare(sql).all(...params), filters: { q, tahun } };
  }

  function distinctTahun() {
    return db.prepare(
      "SELECT DISTINCT strftime('%Y', tanggal_mulai) AS th FROM hasil_program WHERE deleted_at IS NULL AND bidang = ? AND tanggal_mulai IS NOT NULL ORDER BY th DESC"
    ).all(bidang.key).map((r) => r.th);
  }

  router.get('/', (req, res) => {
    const { rows, filters } = buildList(req);
    res.render('program/hasil', {
      title: 'Hasil Program Kerja \u00B7 ' + bidang.label,
      rows,
      filters,
      tahunList: distinctTahun(),
      bidang,
      base,
      mod: bidang.module,
      flash: req.query.msg || null,
      flashType: req.query.type || 'success'
    });
  });

  router.get('/print', (req, res) => {
    const { rows, filters } = buildList(req);
    res.render('program/hasil-print', { title: 'Cetak Hasil Program Kerja', layout: false, rows, filters, bidang });
  });

  router.get('/:id/detail', (req, res) => {
    const row = db.prepare('SELECT * FROM hasil_program WHERE id = ? AND bidang = ? AND deleted_at IS NULL').get(req.params.id, bidang.key);
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
    res.json(row);
  });

  function parseBody(req) {
    const nama_kegiatan = (req.body.nama_kegiatan || '').trim();
    const tanggal_mulai = (req.body.tanggal_mulai || '').trim();
    const tanggal_selesai = (req.body.tanggal_selesai || '').trim() || null;
    const target = (req.body.target || '').trim() || null;
    const hasil = (req.body.hasil || '').trim() || null;
    const penanggung_jawab = (req.body.penanggung_jawab || '').trim() || null;
    return { nama_kegiatan, tanggal_mulai, tanggal_selesai, target, hasil, penanggung_jawab };
  }

  function validate(d) {
    if (!d.nama_kegiatan || !d.tanggal_mulai) return 'Nama kegiatan dan tanggal mulai wajib diisi.';
    if (d.tanggal_selesai && d.tanggal_selesai < d.tanggal_mulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    return null;
  }

  router.post('/', requireWrite(bidang.module), (req, res) => {
    const d = parseBody(req);
    const err = validate(d);
    if (err) return res.redirect(base + '?type=error&msg=' + encodeURIComponent(err));
    db.prepare('INSERT INTO hasil_program (bidang, nama_kegiatan, tanggal_mulai, tanggal_selesai, target, hasil, penanggung_jawab, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(bidang.key, d.nama_kegiatan, d.tanggal_mulai, d.tanggal_selesai, d.target, d.hasil, d.penanggung_jawab, req.session.user.id);
    res.redirect(base + '?msg=' + encodeURIComponent('Hasil program kerja berhasil ditambahkan.'));
  });

  router.post('/:id/edit', requireWrite(bidang.module), (req, res) => {
    const row = db.prepare('SELECT * FROM hasil_program WHERE id = ? AND bidang = ? AND deleted_at IS NULL').get(req.params.id, bidang.key);
    if (!row) return res.redirect(base + '?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
    const d = parseBody(req);
    const err = validate(d);
    if (err) return res.redirect(base + '?type=error&msg=' + encodeURIComponent(err));
    db.prepare("UPDATE hasil_program SET nama_kegiatan=?, tanggal_mulai=?, tanggal_selesai=?, target=?, hasil=?, penanggung_jawab=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(d.nama_kegiatan, d.tanggal_mulai, d.tanggal_selesai, d.target, d.hasil, d.penanggung_jawab, row.id);
    res.redirect(base + '?msg=' + encodeURIComponent('Hasil program kerja berhasil diperbarui.'));
  });

  router.post('/:id/delete', requireWrite(bidang.module), (req, res) => {
    db.prepare("UPDATE hasil_program SET deleted_at=datetime('now','localtime') WHERE id=? AND bidang=?").run(req.params.id, bidang.key);
    res.redirect(base + '?msg=' + encodeURIComponent('Hasil program kerja dihapus.'));
  });

  return router;
}

module.exports = { daftarRouter, hasilRouter, STATUS };

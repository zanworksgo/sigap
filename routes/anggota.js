'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('anggota');
const uploadFields = upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'keluar_bukti', maxCount: 1 }
]);

router.use(requireAccess('anggota'));

function buildList(req) {
  const q = (req.query.q || '').trim();
  const angkatan = (req.query.angkatan || '').trim();
  const status = (req.query.status || 'Aktif').trim() === 'Keluar' ? 'Keluar' : 'Aktif';

  let sql = "SELECT * FROM anggota WHERE deleted_at IS NULL AND status=?";
  const params = [status];
  if (q) {
    sql += ' AND (nama LIKE ? OR nra LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (angkatan) {
    sql += ' AND angkatan = ?';
    params.push(angkatan);
  }
  sql += ' ORDER BY nama ASC';
  return { rows: db.prepare(sql).all(...params), filters: { q, angkatan, status } };
}

function distinctAngkatan() {
  return db.prepare(
    "SELECT DISTINCT angkatan FROM anggota WHERE deleted_at IS NULL AND angkatan IS NOT NULL AND angkatan <> '' ORDER BY CAST(angkatan AS INTEGER) DESC"
  ).all().map((r) => r.angkatan);
}

router.get('/', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('anggota/index', {
    title: 'Data Anggota Aktif',
    rows,
    filters,
    angkatanList: distinctAngkatan(),
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/print', (req, res) => {
  const { rows, filters } = buildList(req);
  res.render('anggota/print', { title: 'Cetak Data Anggota Aktif', layout: false, rows, filters });
});

router.get('/:id/detail', (req, res) => {
  const row = db.prepare("SELECT * FROM anggota WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(row);
});

// Collect a repeated form field (kelas[]/jabatan[]) into a clean array.
function collectList(value) {
  const arr = Array.isArray(value) ? value : (value != null ? [value] : []);
  return arr.map((v) => String(v).trim()).filter(Boolean);
}

function parseBody(req) {
  const nama = (req.body.nama || '').trim();
  const tempat_lahir = (req.body.tempat_lahir || '').trim() || null;
  const tanggal_lahir = (req.body.tanggal_lahir || '').trim() || null;
  const kelas = collectList(req.body.kelas);
  const alamat = (req.body.alamat || '').trim();
  const no_hp = (req.body.no_hp || '').trim();
  // Angkatan is numeric-only so it sorts ordinally.
  const angkatan = (req.body.angkatan || '').replace(/[^0-9]/g, '') || null;
  const nra = (req.body.nra || '').trim() || null;
  const jabatan = collectList(req.body.jabatan);
  const catatan = (req.body.catatan || '').trim() || null;
  let status = (req.body.status || 'Aktif').trim();
  if (!['Aktif', 'Keluar'].includes(status)) status = 'Aktif';
  return { nama, tempat_lahir, tanggal_lahir, kelas, alamat, no_hp, angkatan, nra, jabatan, catatan, status };
}

function validate(d, hasBukti) {
  if (!d.nama || !d.alamat || !d.no_hp) return 'Field wajib belum lengkap.';
  if (d.kelas.length === 0) return 'Kelas wajib diisi minimal satu.';
  if (d.jabatan.length === 0) return 'Jabatan wajib diisi minimal satu.';
  if (d.status === 'Keluar' && !hasBukti) return 'Bukti (gambar/PDF) wajib diunggah jika status Keluar.';
  return null;
}

function pickFile(req, field) {
  return req.files && req.files[field] && req.files[field][0] ? req.files[field][0] : null;
}

function cleanupUploads(req) {
  const foto = pickFile(req, 'foto');
  const bukti = pickFile(req, 'keluar_bukti');
  if (foto) removeFile('anggota/' + foto.filename);
  if (bukti) removeFile('anggota/' + bukti.filename);
}

router.post('/', requireWrite('anggota'), uploadFields, (req, res) => {
  const d = parseBody(req);
  const fotoFile = pickFile(req, 'foto');
  const buktiFile = pickFile(req, 'keluar_bukti');

  const err = validate(d, !!buktiFile);
  if (err) {
    cleanupUploads(req);
    return res.redirect('/anggota?type=error&msg=' + encodeURIComponent(err));
  }

  const foto_path = fotoFile ? 'anggota/' + fotoFile.filename : null;
  const foto_original = fotoFile ? fotoFile.originalname : null;
  // Exit proof only kept when the member is marked Keluar.
  const keluar_bukti_path = d.status === 'Keluar' && buktiFile ? 'anggota/' + buktiFile.filename : null;
  const keluar_bukti_original = d.status === 'Keluar' && buktiFile ? buktiFile.originalname : null;
  if (d.status !== 'Keluar' && buktiFile) removeFile('anggota/' + buktiFile.filename);

  db.prepare(
    `INSERT INTO anggota (nama, tempat_lahir, tanggal_lahir, kelas, alamat, no_hp, angkatan, nra, jabatan, foto_path, foto_original, status, keluar_bukti_path, keluar_bukti_original, catatan, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    d.nama, d.tempat_lahir, d.tanggal_lahir, JSON.stringify(d.kelas), d.alamat, d.no_hp, d.angkatan, d.nra,
    JSON.stringify(d.jabatan), foto_path, foto_original, d.status, keluar_bukti_path, keluar_bukti_original, d.catatan, req.session.user.id
  );

  res.redirect('/anggota?msg=' + encodeURIComponent('Anggota berhasil ditambahkan.'));
});

router.post('/:id/edit', requireWrite('anggota'), uploadFields, (req, res) => {
  const row = db.prepare("SELECT * FROM anggota WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!row) {
    cleanupUploads(req);
    return res.redirect('/anggota?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
  }

  const d = parseBody(req);
  const fotoFile = pickFile(req, 'foto');
  const buktiFile = pickFile(req, 'keluar_bukti');

  const willHaveBukti = !!buktiFile || (d.status === 'Keluar' && !!row.keluar_bukti_path);
  const err = validate(d, willHaveBukti);
  if (err) {
    cleanupUploads(req);
    return res.redirect('/anggota?type=error&msg=' + encodeURIComponent(err));
  }

  let foto_path = row.foto_path;
  let foto_original = row.foto_original;
  if (fotoFile) {
    if (row.foto_path) removeFile(row.foto_path);
    foto_path = 'anggota/' + fotoFile.filename;
    foto_original = fotoFile.originalname;
  }

  let keluar_bukti_path = row.keluar_bukti_path;
  let keluar_bukti_original = row.keluar_bukti_original;
  if (d.status === 'Keluar') {
    if (buktiFile) {
      if (row.keluar_bukti_path) removeFile(row.keluar_bukti_path);
      keluar_bukti_path = 'anggota/' + buktiFile.filename;
      keluar_bukti_original = buktiFile.originalname;
    }
  } else {
    // Back to Aktif: discard any exit proof.
    if (row.keluar_bukti_path) removeFile(row.keluar_bukti_path);
    if (buktiFile) removeFile('anggota/' + buktiFile.filename);
    keluar_bukti_path = null;
    keluar_bukti_original = null;
  }

  db.prepare(
    `UPDATE anggota SET nama=?, tempat_lahir=?, tanggal_lahir=?, kelas=?, alamat=?, no_hp=?, angkatan=?, nra=?, jabatan=?, foto_path=?, foto_original=?, status=?, keluar_bukti_path=?, keluar_bukti_original=?, catatan=?, updated_at=datetime('now','localtime')
     WHERE id=?`
  ).run(
    d.nama, d.tempat_lahir, d.tanggal_lahir, JSON.stringify(d.kelas), d.alamat, d.no_hp, d.angkatan, d.nra,
    JSON.stringify(d.jabatan), foto_path, foto_original, d.status, keluar_bukti_path, keluar_bukti_original, d.catatan, row.id
  );

  res.redirect('/anggota?msg=' + encodeURIComponent('Anggota berhasil diperbarui.'));
});

router.post('/:id/delete', requireWrite('anggota'), (req, res) => {
  db.prepare(`UPDATE anggota SET deleted_at=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  res.redirect('/anggota?msg=' + encodeURIComponent('Anggota dihapus.'));
});

// Promote an active member into Alumni without re-entering identity.
router.post('/:id/to-alumni', requireWrite('anggota'), (req, res) => {
  db.prepare(`UPDATE anggota SET status='Alumni', updated_at=datetime('now','localtime') WHERE id=? AND deleted_at IS NULL`).run(req.params.id);
  res.redirect('/anggota?msg=' + encodeURIComponent('Anggota dipindahkan ke Alumni.'));
});

// Restore an exited member back to active; the exit proof is discarded.
router.post('/:id/to-aktif', requireWrite('anggota'), (req, res) => {
  const row = db.prepare("SELECT * FROM anggota WHERE id=? AND deleted_at IS NULL").get(req.params.id);
  if (row && row.keluar_bukti_path) removeFile(row.keluar_bukti_path);
  db.prepare(
    `UPDATE anggota SET status='Aktif', keluar_bukti_path=NULL, keluar_bukti_original=NULL, updated_at=datetime('now','localtime') WHERE id=? AND deleted_at IS NULL`
  ).run(req.params.id);
  res.redirect('/anggota?type=success&msg=' + encodeURIComponent('Anggota diaktifkan kembali.'));
});

module.exports = router;

'use strict';

const express = require('express');
const { get, all, run } = require('../db/pg');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('sertifikat');

router.use(requireAccess('sertifikat'));

async function buildList(req) {
    const q = (req.query.q || '').trim();
    const bulan = (req.query.bulan || '').trim();
    const tahun = (req.query.tahun || '').trim();

    let sql = 'SELECT * FROM sertifikat WHERE deleted_at IS NULL';
    const params = [];
    if (q) {
        sql += ' AND (nomor_sertifikat LIKE ? OR perihal LIKE ? OR penerima LIKE ?)';
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
    return { rows: await all(sql, params), filters: { q, bulan, tahun } };
}

router.get('/', async (req, res) => {
    const { rows, filters } = await buildList(req);
    res.render('sertifikat/index', {
        title: 'Sertifikat',
        rows,
        filters,
        flash: req.query.msg || null,
        flashType: req.query.type || 'success'
    });
});

router.get('/print', async (req, res) => {
    const { rows, filters } = await buildList(req);
    res.render('sertifikat/print', {
        title: 'Cetak Data Sertifikat',
        layout: false,
        rows,
        filters
    });
});

router.get('/:id/detail', async (req, res) => {
    const row = await get('SELECT * FROM sertifikat WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
    res.json(row);
});

router.post('/', requireWrite('sertifikat'), upload.single('file'), async (req, res) => {
    const nomor_sertifikat = (req.body.nomor_sertifikat || '').trim();
    const perihal = (req.body.perihal || '').trim();
    const penerima = (req.body.penerima || '').trim();
    const tanggal = (req.body.tanggal || '').trim();

    if (!nomor_sertifikat || !perihal || !penerima || !tanggal) {
        if (req.file) removeFile('sertifikat/' + req.file.filename);
        return res.redirect('/sertifikat?type=error&msg=' + encodeURIComponent('Semua field wajib diisi.'));
    }

    const dup = await get('SELECT id FROM sertifikat WHERE nomor_sertifikat = ? AND deleted_at IS NULL', [nomor_sertifikat]);
    if (dup) {
        if (req.file) removeFile('sertifikat/' + req.file.filename);
        return res.redirect('/sertifikat?type=error&msg=' + encodeURIComponent('Nomor sertifikat sudah terdaftar.'));
    }

    const file_path = req.file ? 'sertifikat/' + req.file.filename : null;
    const file_original = req.file ? req.file.originalname : null;

    await run(
        `INSERT INTO sertifikat (nomor_sertifikat, perihal, penerima, tanggal, file_path, file_original, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nomor_sertifikat, perihal, penerima, tanggal, file_path, file_original, req.session.user.id]
    );

    res.redirect('/sertifikat?msg=' + encodeURIComponent('Sertifikat berhasil ditambahkan.'));
});

router.post('/:id/edit', requireWrite('sertifikat'), upload.single('file'), async (req, res) => {
    const row = await get('SELECT * FROM sertifikat WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!row) {
        if (req.file) removeFile('sertifikat/' + req.file.filename);
        return res.redirect('/sertifikat?type=error&msg=' + encodeURIComponent('Data tidak ditemukan.'));
    }

    const nomor_sertifikat = (req.body.nomor_sertifikat || '').trim();
    const perihal = (req.body.perihal || '').trim();
    const penerima = (req.body.penerima || '').trim();
    const tanggal = (req.body.tanggal || '').trim();

    if (!nomor_sertifikat || !perihal || !penerima || !tanggal) {
        if (req.file) removeFile('sertifikat/' + req.file.filename);
        return res.redirect('/sertifikat?type=error&msg=' + encodeURIComponent('Semua field wajib diisi.'));
    }

    const dup = await get('SELECT id FROM sertifikat WHERE nomor_sertifikat = ? AND id <> ? AND deleted_at IS NULL', [nomor_sertifikat, row.id]);
    if (dup) {
        if (req.file) removeFile('sertifikat/' + req.file.filename);
        return res.redirect('/sertifikat?type=error&msg=' + encodeURIComponent('Nomor sertifikat sudah terdaftar.'));
    }

    let file_path = row.file_path;
    let file_original = row.file_original;
    if (req.file) {
        if (row.file_path) removeFile(row.file_path);
        file_path = 'sertifikat/' + req.file.filename;
        file_original = req.file.originalname;
    }

    await run(
        `UPDATE sertifikat SET nomor_sertifikat=?, perihal=?, penerima=?, tanggal=?, file_path=?, file_original=?, updated_at=datetime('now','localtime')
     WHERE id=?`,
        [nomor_sertifikat, perihal, penerima, tanggal, file_path, file_original, row.id]
    );

    res.redirect('/sertifikat?msg=' + encodeURIComponent('Sertifikat berhasil diperbarui.'));
});

router.post('/:id/delete', requireWrite('sertifikat'), async (req, res) => {
    await run(`UPDATE sertifikat SET deleted_at=datetime('now','localtime') WHERE id=?`, [req.params.id]);
    res.redirect('/sertifikat?msg=' + encodeURIComponent('Sertifikat diarsipkan.'));
});

module.exports = router;

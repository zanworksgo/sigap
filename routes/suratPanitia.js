'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

const MOD = 'surat_panitia';

// One router per kepanitiaan (Pasmansa Cup, Spartacus, ...). Each holds its own
// Surat Masuk & Surat Keluar archive, scoped by the `kepanitiaan` column.
function panitiaRouter(panitia) {
    const router = express.Router();
    const base = '/panitia/' + panitia.slug;
    const uploadMasuk = createUploader('surat-masuk-panitia/' + panitia.slug);
    const uploadKeluar = createUploader('surat-keluar-panitia/' + panitia.slug);

    router.use(requireAccess(MOD));

    function parseFilters(req) {
        return {
            q: (req.query.q || '').trim(),
            bulan: (req.query.bulan || '').trim(),
            tahun: (req.query.tahun || '').trim()
        };
    }

    function listMasuk(f) {
        let sql = 'SELECT * FROM surat_masuk_panitia WHERE deleted_at IS NULL AND kepanitiaan = ?';
        const params = [panitia.key];
        if (f.q) {
            sql += ' AND (nomor_surat LIKE ? OR asal_surat LIKE ? OR perihal LIKE ? OR penerima LIKE ?)';
            params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
        }
        if (f.bulan) { sql += " AND strftime('%m', tanggal_masuk) = ?"; params.push(String(f.bulan).padStart(2, '0')); }
        if (f.tahun) { sql += " AND strftime('%Y', tanggal_masuk) = ?"; params.push(f.tahun); }
        sql += ' ORDER BY tanggal_masuk ASC, id ASC';
        return db.prepare(sql).all(...params);
    }

    function listKeluar(f) {
        let sql = 'SELECT * FROM surat_keluar_panitia WHERE deleted_at IS NULL AND kepanitiaan = ?';
        const params = [panitia.key];
        if (f.q) {
            sql += ' AND (nomor_surat LIKE ? OR perihal LIKE ? OR ditujukan LIKE ?)';
            params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
        }
        if (f.bulan) { sql += " AND strftime('%m', tanggal) = ?"; params.push(String(f.bulan).padStart(2, '0')); }
        if (f.tahun) { sql += " AND strftime('%Y', tanggal) = ?"; params.push(f.tahun); }
    // Urutkan berdasarkan nomor urut surat (angka di awal nomor_surat).
    sql += ' ORDER BY CAST(nomor_surat AS INTEGER) ASC, nomor_surat ASC';

    router.get('/', (req, res) => {
        const active = req.query.tab === 'masuk' ? 'masuk' : 'keluar';
        const filters = parseFilters(req);
        const rows = active === 'keluar' ? listKeluar(filters) : listMasuk(filters);
        res.render('panitia/index', {
            title: 'Surat ' + panitia.label,
            panitia,
            base,
            active,
            rows,
            filters,
            flash: req.query.msg || null,
            flashType: req.query.type || 'success'
        });
    });

    router.get('/print', (req, res) => {
        const active = req.query.tab === 'masuk' ? 'masuk' : 'keluar';
        const filters = parseFilters(req);
        const rows = active === 'keluar' ? listKeluar(filters) : listMasuk(filters);
        res.render('panitia/print', { title: 'Cetak Surat ' + panitia.label, layout: false, panitia, type: active, rows, filters });
    });

    router.get('/masuk/:id/detail', (req, res) => {
        const row = db.prepare('SELECT * FROM surat_masuk_panitia WHERE id = ? AND kepanitiaan = ? AND deleted_at IS NULL').get(req.params.id, panitia.key);
        if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
        res.json(row);
    });

    router.get('/keluar/:id/detail', (req, res) => {
        const row = db.prepare('SELECT * FROM surat_keluar_panitia WHERE id = ? AND kepanitiaan = ? AND deleted_at IS NULL').get(req.params.id, panitia.key);
        if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
        res.json(row);
    });

    // ---- Surat Masuk ----
    const redirectMasuk = (res, opts = {}) => {
        const type = opts.type ? '&type=' + opts.type : '';
        return res.redirect(base + '?tab=masuk' + type + '&msg=' + encodeURIComponent(opts.msg));
    };

    router.post('/masuk', requireWrite(MOD), uploadMasuk.single('file'), (req, res) => {
        const nomor_surat = (req.body.nomor_surat || '').trim();
        const tanggal_masuk = (req.body.tanggal_masuk || '').trim();
        const asal_surat = (req.body.asal_surat || '').trim();
        const perihal = (req.body.perihal || '').trim();
        const penerima = (req.body.penerima || '').trim();

        if (!nomor_surat || !tanggal_masuk || !asal_surat || !perihal || !penerima) {
            if (req.file) removeFile('surat-masuk-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectMasuk(res, { type: 'error', msg: 'Semua field wajib diisi.' });
        }

        const file_path = req.file ? 'surat-masuk-panitia/' + panitia.slug + '/' + req.file.filename : null;
        const file_original = req.file ? req.file.originalname : null;

        db.prepare(
            `INSERT INTO surat_masuk_panitia (kepanitiaan, nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(panitia.key, nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, req.session.user.id);

        redirectMasuk(res, { msg: 'Surat masuk berhasil ditambahkan.' });
    });

    router.post('/masuk/:id/edit', requireWrite(MOD), uploadMasuk.single('file'), (req, res) => {
        const row = db.prepare('SELECT * FROM surat_masuk_panitia WHERE id = ? AND kepanitiaan = ? AND deleted_at IS NULL').get(req.params.id, panitia.key);
        if (!row) {
            if (req.file) removeFile('surat-masuk-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectMasuk(res, { type: 'error', msg: 'Data tidak ditemukan.' });
        }

        const nomor_surat = (req.body.nomor_surat || '').trim();
        const tanggal_masuk = (req.body.tanggal_masuk || '').trim();
        const asal_surat = (req.body.asal_surat || '').trim();
        const perihal = (req.body.perihal || '').trim();
        const penerima = (req.body.penerima || '').trim();

        if (!nomor_surat || !tanggal_masuk || !asal_surat || !perihal || !penerima) {
            if (req.file) removeFile('surat-masuk-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectMasuk(res, { type: 'error', msg: 'Semua field wajib diisi.' });
        }

        let file_path = row.file_path;
        let file_original = row.file_original;
        if (req.file) {
            if (row.file_path) removeFile(row.file_path);
            file_path = 'surat-masuk-panitia/' + panitia.slug + '/' + req.file.filename;
            file_original = req.file.originalname;
        }

        db.prepare(
            `UPDATE surat_masuk_panitia SET nomor_surat=?, tanggal_masuk=?, asal_surat=?, perihal=?, penerima=?, file_path=?, file_original=?, updated_at=datetime('now','localtime')
       WHERE id=?`
        ).run(nomor_surat, tanggal_masuk, asal_surat, perihal, penerima, file_path, file_original, row.id);

        redirectMasuk(res, { msg: 'Surat masuk berhasil diperbarui.' });
    });

    router.post('/masuk/:id/delete', requireWrite(MOD), (req, res) => {
        db.prepare("UPDATE surat_masuk_panitia SET deleted_at=datetime('now','localtime') WHERE id=? AND kepanitiaan=?").run(req.params.id, panitia.key);
        redirectMasuk(res, { msg: 'Surat masuk diarsipkan.' });
    });

    // ---- Surat Keluar ----
    const redirectKeluar = (res, opts = {}) => {
        const type = opts.type ? '&type=' + opts.type : '';
        return res.redirect(base + '?tab=keluar' + type + '&msg=' + encodeURIComponent(opts.msg));
    };

    router.post('/keluar', requireWrite(MOD), uploadKeluar.single('file'), (req, res) => {
        const nomor_surat = (req.body.nomor_surat || '').trim();
        const perihal = (req.body.perihal || '').trim();
        const ditujukan = (req.body.ditujukan || '').trim();
        const tanggal = (req.body.tanggal || '').trim();

        if (!nomor_surat || !perihal || !ditujukan || !tanggal) {
            if (req.file) removeFile('surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectKeluar(res, { type: 'error', msg: 'Semua field wajib diisi.' });
        }

        const dup = db.prepare('SELECT id FROM surat_keluar_panitia WHERE kepanitiaan = ? AND nomor_surat = ? AND deleted_at IS NULL').get(panitia.key, nomor_surat);
        if (dup) {
            if (req.file) removeFile('surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectKeluar(res, { type: 'error', msg: 'Nomor surat sudah terdaftar.' });
        }

        const file_path = req.file ? 'surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename : null;
        const file_original = req.file ? req.file.originalname : null;

        db.prepare(
            `INSERT INTO surat_keluar_panitia (kepanitiaan, nomor_surat, perihal, ditujukan, tanggal, file_path, file_original, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(panitia.key, nomor_surat, perihal, ditujukan, tanggal, file_path, file_original, req.session.user.id);

        redirectKeluar(res, { msg: 'Surat keluar berhasil ditambahkan.' });
    });

    router.post('/keluar/:id/edit', requireWrite(MOD), uploadKeluar.single('file'), (req, res) => {
        const row = db.prepare('SELECT * FROM surat_keluar_panitia WHERE id = ? AND kepanitiaan = ? AND deleted_at IS NULL').get(req.params.id, panitia.key);
        if (!row) {
            if (req.file) removeFile('surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectKeluar(res, { type: 'error', msg: 'Data tidak ditemukan.' });
        }

        const nomor_surat = (req.body.nomor_surat || '').trim();
        const perihal = (req.body.perihal || '').trim();
        const ditujukan = (req.body.ditujukan || '').trim();
        const tanggal = (req.body.tanggal || '').trim();

        if (!nomor_surat || !perihal || !ditujukan || !tanggal) {
            if (req.file) removeFile('surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectKeluar(res, { type: 'error', msg: 'Semua field wajib diisi.' });
        }

        const dup = db.prepare('SELECT id FROM surat_keluar_panitia WHERE kepanitiaan = ? AND nomor_surat = ? AND id <> ? AND deleted_at IS NULL').get(panitia.key, nomor_surat, row.id);
        if (dup) {
            if (req.file) removeFile('surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename);
            return redirectKeluar(res, { type: 'error', msg: 'Nomor surat sudah terdaftar.' });
        }

        let file_path = row.file_path;
        let file_original = row.file_original;
        if (req.file) {
            if (row.file_path) removeFile(row.file_path);
            file_path = 'surat-keluar-panitia/' + panitia.slug + '/' + req.file.filename;
            file_original = req.file.originalname;
        }

        db.prepare(
            `UPDATE surat_keluar_panitia SET nomor_surat=?, perihal=?, ditujukan=?, tanggal=?, file_path=?, file_original=?, updated_at=datetime('now','localtime')
       WHERE id=?`
        ).run(nomor_surat, perihal, ditujukan, tanggal, file_path, file_original, row.id);

        redirectKeluar(res, { msg: 'Surat keluar berhasil diperbarui.' });
    });

    router.post('/keluar/:id/delete', requireWrite(MOD), (req, res) => {
        db.prepare("UPDATE surat_keluar_panitia SET deleted_at=datetime('now','localtime') WHERE id=? AND kepanitiaan=?").run(req.params.id, panitia.key);
        redirectKeluar(res, { msg: 'Surat keluar diarsipkan.' });
    });

    return router;
}

module.exports = panitiaRouter;

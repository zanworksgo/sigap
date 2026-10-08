'use strict';

// One finance router per kepanitiaan (Pasmansa Cup, Spartacus, ...). Each panitia
// has its own cash book scoped by the `kepanitiaan` column. The four jenis model
// the money flow against the general treasury (Kas Umum):
//   - Alokasi       : dana diterima dari Kas Umum (transfer masuk ke panitia)
//   - Pemasukan     : pemasukan eksternal panitia (sponsor, tiket, dll)
//   - Pengeluaran   : pengeluaran panitia
//   - Pengembalian  : sisa dana dikembalikan ke Kas Umum
const express = require('express');
const { get, all, run } = require('../db/pg');
const { requireAccess, requireWrite } = require('../middleware/auth');
const { createUploader, removeFile } = require('../middleware/upload');

const MOD = 'keuangan_panitia';
const JENIS = ['Alokasi', 'Pemasukan', 'Pengeluaran', 'Pengembalian'];

function keuanganPanitiaRouter(panitia) {
    const router = express.Router();
    const base = '/keuangan-panitia/' + panitia.slug;
    const subdir = 'keuangan-panitia/' + panitia.slug;
    const upload = createUploader(subdir);

    router.use(requireAccess(MOD));

    async function buildList(req) {
        const q = (req.query.q || '').trim();
        const jenis = (req.query.jenis || '').trim();
        const bulan = (req.query.bulan || '').trim();
        const tahun = (req.query.tahun || '').trim();

        let sql = 'SELECT * FROM transaksi_panitia WHERE deleted_at IS NULL AND kepanitiaan = ?';
        const params = [panitia.key];
        if (q) {
            sql += ' AND (uraian LIKE ? OR kategori LIKE ? OR keterangan LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (jenis && JENIS.includes(jenis)) { sql += ' AND jenis = ?'; params.push(jenis); }
        if (bulan) { sql += " AND strftime('%m', tanggal) = ?"; params.push(String(bulan).padStart(2, '0')); }
        if (tahun) { sql += " AND strftime('%Y', tanggal) = ?"; params.push(tahun); }
        sql += ' ORDER BY tanggal ASC, id ASC';
        const rows = await all(sql, params);

        return { rows, filters: { q, jenis, bulan, tahun } };
    }

    // Totals per jenis across the whole panitia (ignores list filters) so the
    // saldo cards always reflect the true committee balance.
    async function summary() {
        const sums = { Alokasi: 0, Pemasukan: 0, Pengeluaran: 0, Pengembalian: 0 };
        const rows = await all(
            "SELECT jenis, COALESCE(SUM(nominal),0) total FROM transaksi_panitia WHERE deleted_at IS NULL AND kepanitiaan = ? GROUP BY jenis",
            [panitia.key]
        );
        rows.forEach((r) => { sums[r.jenis] = Number(r.total); });
        const saldo = sums.Alokasi + sums.Pemasukan - sums.Pengeluaran - sums.Pengembalian;
        return { ...sums, saldo };
    }

    router.get('/', async (req, res) => {
        const { rows, filters } = await buildList(req);
        res.render('panitia-keuangan/index', {
            title: 'Keuangan ' + panitia.label,
            panitia,
            base,
            jenisList: JENIS,
            rows,
            filters,
            sum: await summary(),
            flash: req.query.msg || null,
            flashType: req.query.type || 'success'
        });
    });

    router.get('/print', async (req, res) => {
        const { rows, filters } = await buildList(req);
        res.render('panitia-keuangan/print', {
            title: 'Cetak Keuangan ' + panitia.label,
            layout: false,
            panitia,
            rows,
            filters,
            sum: await summary()
        });
    });

    router.get('/:id/detail', async (req, res) => {
        const row = await get('SELECT * FROM transaksi_panitia WHERE id = ? AND kepanitiaan = ? AND deleted_at IS NULL', [req.params.id, panitia.key]);
        if (!row) return res.status(404).json({ error: 'Data tidak ditemukan.' });
        res.json(row);
    });

    function parseBody(req) {
        const jenis = (req.body.jenis || '').trim();
        const tanggal = (req.body.tanggal || '').trim();
        const uraian = (req.body.uraian || '').trim();
        const nominal = Math.round(Number(req.body.nominal));
        const keterangan = (req.body.keterangan || '').trim() || null;
        return { jenis, tanggal, uraian, nominal, keterangan };
    }

    function validate(d) {
        if (!JENIS.includes(d.jenis)) return 'Jenis transaksi tidak valid.';
        if (!d.tanggal || !d.uraian) return 'Tanggal dan uraian wajib diisi.';
        if (!Number.isFinite(d.nominal) || d.nominal <= 0) return 'Nominal tidak valid.';
        return null;
    }

    router.post('/', requireWrite(MOD), upload.single('bukti'), async (req, res) => {
        const d = parseBody(req);
        const err = validate(d);
        if (err) {
            if (req.file) removeFile(subdir + '/' + req.file.filename);
            return res.redirect(`${base}?type=error&msg=` + encodeURIComponent(err));
        }
        const bukti_path = req.file ? subdir + '/' + req.file.filename : null;
        const bukti_original = req.file ? req.file.originalname : null;

        await run(
      `INSERT INTO transaksi_panitia (kepanitiaan, jenis, tanggal, uraian, nominal, keterangan, bukti_path, bukti_original, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [panitia.key, d.jenis, d.tanggal, d.uraian, d.nominal, d.keterangan, bukti_path, bukti_original, req.session.user.id]
    );
        res.redirect(`${base}?msg=` + encodeURIComponent('Transaksi berhasil ditambahkan.'));
    });

    router.post('/:id/edit', requireWrite(MOD), upload.single('bukti'), async (req, res) => {
        const row = await get('SELECT * FROM transaksi_panitia WHERE id = ? AND kepanitiaan = ? AND deleted_at IS NULL', [req.params.id, panitia.key]);
        if (!row) {
            if (req.file) removeFile(subdir + '/' + req.file.filename);
            return res.redirect(`${base}?type=error&msg=` + encodeURIComponent('Data tidak ditemukan.'));
        }
        const d = parseBody(req);
        const err = validate(d);
        if (err) {
            if (req.file) removeFile(subdir + '/' + req.file.filename);
            return res.redirect(`${base}?type=error&msg=` + encodeURIComponent(err));
        }

        let bukti_path = row.bukti_path;
        let bukti_original = row.bukti_original;
        if (req.file) {
            if (row.bukti_path) removeFile(row.bukti_path);
            bukti_path = subdir + '/' + req.file.filename;
            bukti_original = req.file.originalname;
        }

        await run(
      `UPDATE transaksi_panitia SET jenis=?, tanggal=?, uraian=?, nominal=?, keterangan=?, bukti_path=?, bukti_original=?, updated_at=datetime('now','localtime')
       WHERE id=?`,
      [d.jenis, d.tanggal, d.uraian, d.nominal, d.keterangan, bukti_path, bukti_original, row.id]
    );
        res.redirect(`${base}?msg=` + encodeURIComponent('Transaksi berhasil diperbarui.'));
    });

    router.post('/:id/delete', requireWrite(MOD), async (req, res) => {
        await run("UPDATE transaksi_panitia SET deleted_at=datetime('now','localtime') WHERE id=? AND kepanitiaan=?", [req.params.id, panitia.key]);
        res.redirect(`${base}?msg=` + encodeURIComponent('Transaksi dihapus.'));
    });

    return router;
}

module.exports = keuanganPanitiaRouter;

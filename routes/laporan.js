'use strict';

const express = require('express');
const { db } = require('../db/database');
const { requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(requireAccess('laporan'));

function buildReport(req) {
  const bulan = (req.query.bulan || '').trim();
  const tahun = (req.query.tahun || '').trim();

  let sql = 'SELECT * FROM transaksi WHERE deleted_at IS NULL';
  const params = [];
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

  const totalMasuk = rows.filter((r) => r.jenis === 'Pemasukan').reduce((s, r) => s + r.nominal, 0);
  const totalKeluar = rows.filter((r) => r.jenis === 'Pengeluaran').reduce((s, r) => s + r.nominal, 0);
  return { rows, totalMasuk, totalKeluar, saldo: totalMasuk - totalKeluar, filters: { bulan, tahun } };
}

router.get('/', (req, res) => {
  const data = buildReport(req);
  res.render('laporan/index', { title: 'Laporan Keuangan', ...data });
});

router.get('/print', (req, res) => {
  const data = buildReport(req);
  res.render('laporan/print', { title: 'Cetak Laporan Keuangan', layout: false, ...data });
});

module.exports = router;

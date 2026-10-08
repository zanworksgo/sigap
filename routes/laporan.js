'use strict';

const express = require('express');
const { get, all } = require('../db/pg');
const { requireAccess } = require('../middleware/auth');
const KEPANITIAAN = require('../config/kepanitiaan');

const router = express.Router();

router.use(requireAccess('laporan'));

async function buildReport(req) {
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
  const rows = await all(sql, params);

  const totalMasuk = rows.filter((r) => r.jenis === 'Pemasukan').reduce((s, r) => s + Number(r.nominal), 0);
  const totalKeluar = rows.filter((r) => r.jenis === 'Pengeluaran').reduce((s, r) => s + Number(r.nominal), 0);
  return { rows, totalMasuk, totalKeluar, saldo: totalMasuk - totalKeluar, filters: { bulan, tahun } };
}

// Consolidated organisation cash across Kas Umum + every kepanitiaan.
// Figures are all-time so committee balances stay accurate (a balance cannot be
// meaningfully sliced by month). Allocation/return are internal transfers.
async function buildKonsolidasi() {
  const kasMasuk = Number((await get("SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pemasukan'")).s);
  const kasKeluar = Number((await get("SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pengeluaran'")).s);
  const kasUmum = kasMasuk - kasKeluar;

  const panitiaList = [];
  for (const p of KEPANITIAAN) {
    const s = { Alokasi: 0, Pemasukan: 0, Pengeluaran: 0, Pengembalian: 0 };
    const rows = await all(
      "SELECT jenis, COALESCE(SUM(nominal),0) total FROM transaksi_panitia WHERE deleted_at IS NULL AND kepanitiaan = ? GROUP BY jenis",
      [p.key]
    );
    rows.forEach((r) => { s[r.jenis] = Number(r.total); });
    const saldo = s.Alokasi + s.Pemasukan - s.Pengeluaran - s.Pengembalian;
    panitiaList.push({ label: p.label, slug: p.slug, ...s, saldo });
  }

  const totalAlokasi = panitiaList.reduce((a, p) => a + p.Alokasi, 0);
  const totalPengembalian = panitiaList.reduce((a, p) => a + p.Pengembalian, 0);
  const totalPengeluaranPanitia = panitiaList.reduce((a, p) => a + p.Pengeluaran, 0);
  const totalSaldoPanitia = panitiaList.reduce((a, p) => a + p.saldo, 0);
  const kasUmumTersedia = kasUmum - totalAlokasi + totalPengembalian;
  const totalKasOrganisasi = kasUmumTersedia + totalSaldoPanitia;

  return {
    panitiaList,
    kasUmum,
    totalAlokasi,
    totalPengembalian,
    totalPengeluaranPanitia,
    totalSaldoPanitia,
    kasUmumTersedia,
    totalKasOrganisasi
  };
}

router.get('/', async (req, res) => {
  const data = await buildReport(req);
  res.render('laporan/index', { title: 'Laporan Keuangan', konsolidasi: await buildKonsolidasi(), ...data });
});

router.get('/print', async (req, res) => {
  const data = await buildReport(req);
  res.render('laporan/print', { title: 'Cetak Laporan Keuangan', layout: false, konsolidasi: await buildKonsolidasi(), ...data });
});

module.exports = router;

'use strict';

const express = require('express');
const { get, all } = require('../db/pg');
const BIDANG = require('../config/bidang');
const { canAccess } = require('../config/permissions');

const router = express.Router();

function currentMonthYear() {
  const now = new Date();
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const tahun = String(now.getFullYear());
  return { bulan, tahun, ym: `${tahun}-${bulan}` };
}

async function buildStats() {
  const { ym } = currentMonthYear();

  const suratMasukBulan = Number((await get(
    "SELECT COUNT(*) c FROM surat_masuk WHERE deleted_at IS NULL AND strftime('%Y-%m', tanggal_masuk) = ?", [ym]
  )).c);
  const suratMasukTotal = Number((await get(
    'SELECT COUNT(*) c FROM surat_masuk WHERE deleted_at IS NULL'
  )).c);
  const suratKeluarBulan = Number((await get(
    "SELECT COUNT(*) c FROM surat_keluar WHERE deleted_at IS NULL AND strftime('%Y-%m', tanggal) = ?", [ym]
  )).c);
  const suratKeluarTotal = Number((await get(
    'SELECT COUNT(*) c FROM surat_keluar WHERE deleted_at IS NULL'
  )).c);

  const pemasukanBulan = Number((await get(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pemasukan' AND strftime('%Y-%m', tanggal) = ?", [ym]
  )).s);
  const pengeluaranBulan = Number((await get(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pengeluaran' AND strftime('%Y-%m', tanggal) = ?", [ym]
  )).s);
  const pemasukanTotal = Number((await get(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pemasukan'"
  )).s);
  const pengeluaranTotal = Number((await get(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pengeluaran'"
  )).s);

  const anggotaAktif = Number((await get(
    "SELECT COUNT(*) c FROM anggota WHERE deleted_at IS NULL AND status='Aktif'"
  )).c);
  const alumni = Number((await get(
    "SELECT COUNT(*) c FROM anggota WHERE deleted_at IS NULL AND status='Alumni'"
  )).c);

  return {
    suratMasukBulan,
    suratMasukTotal,
    suratKeluarBulan,
    suratKeluarTotal,
    pemasukanBulan,
    pengeluaranBulan,
    saldo: pemasukanTotal - pengeluaranTotal,
    anggotaAktif,
    alumni
  };
}

// Per-bidang program kerja counts: terlaksana (status 'selesai') vs tidak.
async function buildProgramStats(role) {
  const list = BIDANG.filter((b) => canAccess(role, b.module));
  const out = [];
  for (const b of list) {
    const terlaksana = Number((await get(
      "SELECT COUNT(*) c FROM daftar_program WHERE deleted_at IS NULL AND bidang = ? AND status = 'selesai'", [b.key]
    )).c);
    const tidakTerlaksana = Number((await get(
      "SELECT COUNT(*) c FROM daftar_program WHERE deleted_at IS NULL AND bidang = ? AND status <> 'selesai'", [b.key]
    )).c);
    out.push({ label: b.label, terlaksana, tidakTerlaksana, total: terlaksana + tidakTerlaksana });
  }
  return out;
}

router.get('/', async (req, res) => {
  const stats = await buildStats();
  const role = req.session.user.role;

  const suratTerbaru = await all(
    'SELECT * FROM surat_masuk WHERE deleted_at IS NULL ORDER BY tanggal_masuk DESC, id DESC LIMIT 5'
  );
  const transaksiTerbaru = await all(
    'SELECT * FROM transaksi WHERE deleted_at IS NULL ORDER BY tanggal DESC, id DESC LIMIT 5'
  );

  res.render('dashboard', {
    title: 'Dashboard',
    stats,
    role,
    programStats: await buildProgramStats(role),
    suratTerbaru,
    transaksiTerbaru
  });
});

module.exports = router;

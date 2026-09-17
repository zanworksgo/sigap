'use strict';

const express = require('express');
const { db } = require('../db/database');
const BIDANG = require('../config/bidang');
const { canAccess } = require('../config/permissions');

const router = express.Router();

function currentMonthYear() {
  const now = new Date();
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const tahun = String(now.getFullYear());
  return { bulan, tahun, ym: `${tahun}-${bulan}` };
}

function buildStats() {
  const { ym } = currentMonthYear();

  const suratMasukBulan = db.prepare(
    "SELECT COUNT(*) c FROM surat_masuk WHERE deleted_at IS NULL AND strftime('%Y-%m', tanggal_masuk) = ?"
  ).get(ym).c;
  const suratMasukTotal = db.prepare(
    'SELECT COUNT(*) c FROM surat_masuk WHERE deleted_at IS NULL'
  ).get().c;
  const suratKeluarBulan = db.prepare(
    "SELECT COUNT(*) c FROM surat_keluar WHERE deleted_at IS NULL AND strftime('%Y-%m', tanggal) = ?"
  ).get(ym).c;
  const suratKeluarTotal = db.prepare(
    'SELECT COUNT(*) c FROM surat_keluar WHERE deleted_at IS NULL'
  ).get().c;

  const pemasukanBulan = db.prepare(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pemasukan' AND strftime('%Y-%m', tanggal) = ?"
  ).get(ym).s;
  const pengeluaranBulan = db.prepare(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pengeluaran' AND strftime('%Y-%m', tanggal) = ?"
  ).get(ym).s;
  const pemasukanTotal = db.prepare(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pemasukan'"
  ).get().s;
  const pengeluaranTotal = db.prepare(
    "SELECT COALESCE(SUM(nominal),0) s FROM transaksi WHERE deleted_at IS NULL AND jenis='Pengeluaran'"
  ).get().s;

  const anggotaAktif = db.prepare(
    "SELECT COUNT(*) c FROM anggota WHERE deleted_at IS NULL AND status='Aktif'"
  ).get().c;
  const alumni = db.prepare(
    "SELECT COUNT(*) c FROM anggota WHERE deleted_at IS NULL AND status='Alumni'"
  ).get().c;

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
function buildProgramStats(role) {
  return BIDANG
    .filter((b) => canAccess(role, b.module))
    .map((b) => {
      const terlaksana = db.prepare(
        "SELECT COUNT(*) c FROM daftar_program WHERE deleted_at IS NULL AND bidang = ? AND status = 'selesai'"
      ).get(b.key).c;
      const tidakTerlaksana = db.prepare(
        "SELECT COUNT(*) c FROM daftar_program WHERE deleted_at IS NULL AND bidang = ? AND status <> 'selesai'"
      ).get(b.key).c;
      return { label: b.label, terlaksana, tidakTerlaksana, total: terlaksana + tidakTerlaksana };
    });
}

router.get('/', (req, res) => {
  const stats = buildStats();
  const role = req.session.user.role;

  const suratTerbaru = db.prepare(
    'SELECT * FROM surat_masuk WHERE deleted_at IS NULL ORDER BY tanggal_masuk DESC, id DESC LIMIT 5'
  ).all();
  const transaksiTerbaru = db.prepare(
    'SELECT * FROM transaksi WHERE deleted_at IS NULL ORDER BY tanggal DESC, id DESC LIMIT 5'
  ).all();

  res.render('dashboard', {
    title: 'Dashboard',
    stats,
    role,
    programStats: buildProgramStats(role),
    suratTerbaru,
    transaksiTerbaru
  });
});

module.exports = router;

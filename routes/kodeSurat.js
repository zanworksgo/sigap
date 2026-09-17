'use strict';

const express = require('express');
const { requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(requireAccess('kode_surat'));

// Static reference table. Kept simple and editable in code as requested.
const KODE = [
  { kode: 'A', keterangan: 'Keanggotaan' },
  { kode: 'B', keterangan: 'Biasa/Lain-lain' },
  { kode: 'C', keterangan: 'Dinas/Penting/Segera' },
  { kode: 'D', keterangan: 'Keuangan' },
  { kode: 'E', keterangan: 'Kegiatan' },
  { kode: 'F', keterangan: 'Perlengkapan' },
  { kode: 'G', keterangan: 'Humas/Kerjasama' },
  { kode: 'H', keterangan: 'Kurikulum' },
  { kode: 'I', keterangan: 'Pendidikan dan Latihan' },
  { kode: 'J', keterangan: 'Organisasi' },
  { kode: 'K', keterangan: 'Pengawasan' },
  { kode: 'L', keterangan: 'Pengembangan' }
];

// Breakdown of the sample letter number, shown as an explanation table.
const PENOMORAN = {
  contoh: '001/23.04.101/E/II/2025',
  bagian: [
    { kode: '001', keterangan: 'Nomor urut pembuatan surat' },
    { kode: '23', keterangan: 'Kode Sulawesi Selatan' },
    { kode: '04', keterangan: 'Nomor Kode Kabupaten Jeneponto' },
    { kode: '101', keterangan: 'Nomor Unit SMAN 1 Jeneponto' },
    { kode: 'E', keterangan: 'Kode Surat' },
    { kode: 'II', keterangan: 'Bulan pembuatan surat (dituliskan romawi)' },
    { kode: '2025', keterangan: 'Tahun pembuatan surat' }
  ]
};

router.get('/', (req, res) => {
  res.render('kode-surat/index', { title: 'Aturan Surat', kode: KODE, penomoran: PENOMORAN });
});

module.exports = router;

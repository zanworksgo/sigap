'use strict';

// Central definition of every "bidang" that owns Program Kerja pages
// (Daftar Program Kerja + Hasil Program Kerja). Adding an entry here wires up
// the permission module, database rows, routes, sidebar menu, and the
// Ketua Umum sidebar grouping automatically.
const BIDANG = [
  { key: 'sdm', slug: 'sdm', module: 'program_sdm', role: 'Bidang SDM', label: 'Bidang SDM & Kaderisasi', short: 'SDM', icon: 'users' },
  { key: 'sosial', slug: 'sosial', module: 'program_sosial', role: 'Bidang Sosial', label: 'Bidang Sosial & Kerohanian', short: 'Sosial', icon: 'award' },
  { key: 'dana', slug: 'dana', module: 'program_dana', role: 'Bidang Dana', label: 'Bidang Dana & Kewirausahaan', short: 'Dana', icon: 'wallet' },
  { key: 'humas', slug: 'humas', module: 'program_humas', role: 'Humas', label: 'Bidang Hubungan Masyarakat', short: 'Humas', icon: 'user-check' }
];

module.exports = BIDANG;

'use strict';

// Central definition of which modules each role can access and modify.
// This is the single source of truth used by both server-side guards
// and the sidebar menu rendering.

const BIDANG = require('./bidang');

const MODULES = {
  dashboard: 'Dashboard',
  users: 'Manajemen User',
  surat_masuk: 'Surat Masuk',
  surat_keluar: 'Surat Keluar',
  kode_surat: 'Aturan Surat',
  anggota: 'Data Anggota Aktif',
  alumni: 'Data Alumni',
  dokumentasi: 'Dokumentasi',
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  laporan: 'Laporan Keuangan'
};

// access: modules a role may VIEW.
// write:  modules a role may CREATE/UPDATE/DELETE.
const ROLE_ACCESS = {
  Admin: {
    access: ['dashboard', 'users', 'surat_masuk', 'surat_keluar', 'kode_surat', 'anggota', 'alumni', 'dokumentasi', 'pemasukan', 'pengeluaran', 'laporan'],
    write: ['users', 'surat_masuk', 'surat_keluar', 'anggota', 'alumni', 'dokumentasi', 'pemasukan', 'pengeluaran']
  },
  'Ketua Umum': {
    // Read-only monitoring across all administrative modules, grouped per jabatan.
    access: ['dashboard', 'surat_masuk', 'surat_keluar', 'kode_surat', 'anggota', 'alumni', 'dokumentasi', 'pemasukan', 'pengeluaran', 'laporan'],
    write: []
  },
  Sekretaris: {
    access: ['dashboard', 'surat_masuk', 'surat_keluar', 'kode_surat'],
    write: ['surat_masuk', 'surat_keluar']
  },
  Humas: {
    access: ['dashboard', 'anggota', 'alumni', 'dokumentasi'],
    write: ['anggota', 'alumni', 'dokumentasi']
  },
  Bendahara: {
    access: ['dashboard', 'pemasukan', 'pengeluaran', 'laporan'],
    write: ['pemasukan', 'pengeluaran']
  }
};

// Jabatan groupings used to render the Ketua Umum sidebar grouped by role.
// Each group lists the MENU keys the jabatan manages.
const JABATAN_GROUPS = [
  { key: 'sekretaris', label: 'Sekretaris', icon: 'send', modules: ['surat_masuk', 'surat_keluar', 'kode_surat'] },
  { key: 'humas', label: 'Bidang Hubungan Masyarakat', icon: 'user-check', modules: ['anggota', 'alumni', 'dokumentasi'] },
  { key: 'bendahara', label: 'Bendahara', icon: 'wallet', modules: ['pemasukan', 'pengeluaran', 'laporan'] }
];

// Wire each bidang's Program Kerja module into the relevant roles and menus.
BIDANG.forEach((b) => {
  MODULES[b.module] = b.label;

  // Admin manages all; Ketua Umum monitors all (read-only).
  ROLE_ACCESS.Admin.access.push(b.module);
  ROLE_ACCESS.Admin.write.push(b.module);
  ROLE_ACCESS['Ketua Umum'].access.push(b.module);

  // The owning role gets access + write (created here if it does not exist).
  if (!ROLE_ACCESS[b.role]) ROLE_ACCESS[b.role] = { access: [], write: [] };
  if (!ROLE_ACCESS[b.role].access.includes(b.module)) ROLE_ACCESS[b.role].access.push(b.module);
  if (!ROLE_ACCESS[b.role].write.includes(b.module)) ROLE_ACCESS[b.role].write.push(b.module);

  // Ketua Umum sidebar grouping: Humas joins its existing group; others get one.
  const menuKeys = ['daftar_' + b.slug, 'hasil_' + b.slug];
  const existing = JABATAN_GROUPS.find((g) => g.key === b.key);
  if (existing) {
    existing.modules.push(...menuKeys);
  } else {
    JABATAN_GROUPS.push({ key: b.key, label: b.label, icon: b.icon, modules: menuKeys });
  }
});

function canAccess(role, module) {
  const r = ROLE_ACCESS[role];
  return !!r && r.access.includes(module);
}

function canWrite(role, module) {
  const r = ROLE_ACCESS[role];
  return !!r && r.write.includes(module);
}

module.exports = { MODULES, ROLE_ACCESS, JABATAN_GROUPS, canAccess, canWrite };

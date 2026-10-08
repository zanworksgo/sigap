'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
require('express-async-errors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { init, pool, get } = require('./db/pg');
const { MODULES, ROLE_ACCESS, canAccess, canWrite } = require('./config/permissions');
const BIDANG = require('./config/bidang');
const KEPANITIAAN = require('./config/kepanitiaan');
const format = require('./utils/format');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Behind a hosting proxy (Railway/Nginx) so secure cookies work.
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Live reload (development only): auto-refresh the browser on file changes.
const LIVE_RELOAD = process.env.NODE_ENV !== 'production';
if (LIVE_RELOAD) {
  const livereload = require('livereload');
  const lrServer = livereload.createServer({ exts: ['ejs', 'css', 'js'], delay: 120 });
  lrServer.watch([path.join(__dirname, 'views'), path.join(__dirname, 'public')]);
  // Reload the browser once the server process has restarted.
  lrServer.server.once('connection', () => {
    setTimeout(() => lrServer.refresh('/'), 120);
  });
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new pgSession({
    pool,
    schemaName: process.env.PG_SCHEMA || 'sigap',
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'sigap-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    sameSite: 'lax',
    secure: IS_PRODUCTION
  }
}));

// Sidebar menu definition per module (order matters).
const MENU = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'grid' },
  { key: 'users', label: 'Manajemen User', href: '/users', icon: 'users' },
  { key: 'surat_masuk', label: 'Surat Masuk', href: '/surat-masuk', icon: 'inbox' },
  { key: 'surat_keluar', label: 'Surat Keluar', href: '/surat-keluar', icon: 'send' },
  { key: 'kode_surat', label: 'Aturan Surat', href: '/kode-surat', icon: 'book' },
  { key: 'anggota', label: 'Data Anggota Aktif', href: '/anggota', icon: 'user-check' },
  { key: 'alumni', label: 'Data Alumni', href: '/alumni', icon: 'award' },
  { key: 'dokumentasi', label: 'Dokumentasi Kegiatan', href: '/dokumentasi', icon: 'camera' },
  { key: 'pemasukan', label: 'Pemasukan', href: '/pemasukan', icon: 'trending-up' },
  { key: 'pengeluaran', label: 'Pengeluaran', href: '/pengeluaran', icon: 'trending-down' },
  { key: 'laporan', label: 'Laporan Keuangan', href: '/laporan', icon: 'file-text' }
];

// Expose common template variables to every view.
app.use((req, res, next) => {
  const user = req.session.user || null;
  res.locals.user = user;
  res.locals.currentPath = req.path;
  res.locals.appName = 'SIGAP';
  res.locals.appLong = 'Sistem Informasi dan Gerbang Administrasi Paskibra';
  res.locals.org = 'Paskibra SMA Negeri 1 Jeneponto';
  res.locals.copyright = '\u00A9 2026 <a href="https://instagram.com/fauzan_azhri.zip" target="_blank" rel="noopener noreferrer" style="color:var(--primary);font-weight:600;">Farhan</a>. All Rights Reserved.';
  res.locals.fmt = format;
  res.locals.liveReload = LIVE_RELOAD;
  res.locals.canWrite = (mod) => (user ? canWrite(user.role, mod) : false);
  res.locals.canAccess = (mod) => (user ? canAccess(user.role, mod) : false);
  // Modules grouped under a role/bidang heading in the sidebar.
  const SEKRETARIS_MODULES = ['surat_masuk', 'surat_keluar', 'kode_surat'];
  const BENDAHARA_MODULES = ['pemasukan', 'pengeluaran', 'laporan'];
  const HUMAS_MODULES = ['anggota', 'alumni', 'dokumentasi'];
  const GROUPED_MODULES = [...SEKRETARIS_MODULES, ...BENDAHARA_MODULES, ...HUMAS_MODULES];

  res.locals.menu = user
    ? MENU.filter((m) => canAccess(user.role, m.key) && !GROUPED_MODULES.includes(m.key))
    : [];

  // Build sidebar item objects for a set of module keys, in MENU order.
  const itemsFor = (modules) =>
    MENU
      .filter((m) => modules.includes(m.key) && canAccess(user.role, m.key))
      .map((m) => ({ href: m.href, icon: m.icon, label: m.label }));

  // Static role groups: Sekretaris & Bendahara oversee their own menus.
  const staticGroups = user
    ? [
      { label: 'Sekretaris', icon: 'inbox', items: itemsFor(SEKRETARIS_MODULES) },
      { label: 'Bendahara', icon: 'wallet', items: itemsFor(BENDAHARA_MODULES) }
    ].filter((g) => g.items.length > 0)
    : [];

  // Program Kerja per bidang (Daftar + Hasil). The Humas bidang also holds the
  // Data Anggota, Data Alumni, and Dokumentasi pages.
  const bidangGroups = user
    ? BIDANG
      .map((b) => {
        const items = [];
        if (canAccess(user.role, b.module)) {
          items.push(
            { href: '/daftar-program-' + b.slug, icon: 'file-text', label: 'Daftar Program Kerja' },
            { href: '/hasil-program-' + b.slug, icon: 'award', label: 'Hasil Program Kerja' }
          );
        }
        if (b.key === 'humas') {
          MENU
            .filter((m) => HUMAS_MODULES.includes(m.key) && canAccess(user.role, m.key))
            .forEach((m) => items.push({ href: m.href, icon: m.icon, label: m.label }));
        }
        return { label: b.label, icon: b.icon, items };
      })
      .filter((g) => g.items.length > 0)
    : [];

  // Kepanitiaan: satu item sidebar per panitia. Saat diklik membuka halaman
  // ber-tab (Surat Masuk/Keluar + Keuangan). Tujuan link mengikuti akses role:
  // yang punya akses surat masuk ke halaman surat, selain itu ke halaman keuangan.
  const canSuratPanitia = user && canAccess(user.role, 'surat_panitia');
  const canKeuanganPanitia = user && canAccess(user.role, 'keuangan_panitia');
  const kepanitiaanGroups = user && (canSuratPanitia || canKeuanganPanitia)
    ? [{
      label: 'Kepanitiaan',
      icon: 'award',
      items: KEPANITIAAN.map((p) => ({
        href: (canSuratPanitia ? '/panitia/' : '/keuangan-panitia/') + p.slug,
        icon: p.icon,
        label: p.label,
        match: ['/panitia/' + p.slug, '/keuangan-panitia/' + p.slug]
      }))
    }]
    : [];

  res.locals.menuGroups = [...staticGroups, ...kepanitiaanGroups, ...bidangGroups];
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/users', requireAuth, require('./routes/users'));
app.use('/surat-masuk', requireAuth, require('./routes/suratMasuk'));
app.use('/surat-keluar', requireAuth, require('./routes/suratKeluar'));
app.use('/kode-surat', requireAuth, require('./routes/kodeSurat'));
app.use('/anggota', requireAuth, require('./routes/anggota'));
app.use('/alumni', requireAuth, require('./routes/alumni'));
app.use('/pemasukan', requireAuth, require('./routes/pemasukan'));
app.use('/pengeluaran', requireAuth, require('./routes/pengeluaran'));
app.use('/laporan', requireAuth, require('./routes/laporan'));
app.use('/dokumentasi', requireAuth, require('./routes/dokumentasi'));
app.use('/file', requireAuth, require('./routes/files'));

// Program Kerja routes, one Daftar + Hasil router per bidang.
const { daftarRouter, hasilRouter } = require('./routes/programKerja');
BIDANG.forEach((b) => {
  app.use('/daftar-program-' + b.slug, requireAuth, daftarRouter(b));
  app.use('/hasil-program-' + b.slug, requireAuth, hasilRouter(b));
});

// Surat Kepanitiaan routes, one router per kepanitiaan (masuk + keluar).
const panitiaRouter = require('./routes/suratPanitia');
KEPANITIAAN.forEach((p) => {
  app.use('/panitia/' + p.slug, requireAuth, panitiaRouter(p));
});

// Keuangan Kepanitiaan routes, one cash-book router per kepanitiaan.
const keuanganPanitiaRouter = require('./routes/keuanganPanitia');
KEPANITIAAN.forEach((p) => {
  app.use('/keuangan-panitia/' + p.slug, requireAuth, keuanganPanitiaRouter(p));
});

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Tidak Ditemukan',
    code: 404,
    message: 'Halaman yang Anda cari tidak ditemukan.'
  });
});

// Error handler (includes multer file-validation errors).
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  if (req.accepts('html') && req.method === 'GET') {
    return res.status(status).render('error', {
      title: 'Terjadi Kesalahan',
      code: status,
      message: err.message || 'Terjadi kesalahan pada server.'
    });
  }
  res.status(status).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

// Initialise the database, seed defaults on first run, then start listening.
async function start() {
  await init();

  // One-time data import from the legacy SQLite volume into Supabase.
  // Set RUN_SQLITE_MIGRATION=1 for the first deploy, then remove it.
  if (process.env.RUN_SQLITE_MIGRATION === '1') {
    await require('./db/migrate-to-pg').migrate(process.env.SQLITE_PATH);
  } else {
    const row = await get('SELECT COUNT(*) AS c FROM users');
    if (Number(row.c) === 0) {
      await require('./db/seed').seed({ log: false });
    }
  }

  app.listen(PORT, () => {
    console.log(`SIGAP berjalan di http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Gagal memulai server:', err);
  process.exit(1);
});

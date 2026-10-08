'use strict';

// Seed script: creates default users for SIGAP.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { init, run } = require('./pg');
const BIDANG = require('../config/bidang');

const defaultPassword = 'password123';
const hash = bcrypt.hashSync(defaultPassword, 10);

const users = [
  { nama: 'Administrator', username: 'admin', email: 'admin@sigap.id', role: 'Admin' },
  { nama: 'Ketua Umum', username: 'ketua', email: 'ketua@sigap.id', role: 'Ketua Umum' },
  { nama: 'Sekretaris', username: 'sekretaris', email: 'sekretaris@sigap.id', role: 'Sekretaris' },
  { nama: 'Humas', username: 'humas', email: 'humas@sigap.id', role: 'Humas' },
  { nama: 'Bendahara', username: 'bendahara', email: 'bendahara@sigap.id', role: 'Bendahara' }
];

// One account per bidang role (Humas already listed above).
BIDANG.forEach((b) => {
  if (users.some((u) => u.role === b.role)) return;
  const uname = 'bidang-' + b.slug;
  users.push({ nama: b.role, username: uname, email: uname + '@sigap.id', role: b.role });
});

async function seed({ log = true } = {}) {
  for (const u of users) {
    await run(
      `INSERT INTO users (nama, username, email, password, role, status)
       VALUES (?, ?, ?, ?, ?, 'Aktif')
       ON CONFLICT DO NOTHING`,
      [u.nama, u.username, u.email, hash, u.role]
    );
  }
  if (!log) return;
  console.log('Seed selesai. Akun default (password: %s):', defaultPassword);
  for (const u of users) {
    console.log(`  - ${u.role.padEnd(12)} | username: ${u.username}`);
  }
}

if (require.main === module) {
  (async () => {
    await init();
    await seed();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seed };

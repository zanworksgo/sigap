'use strict';

// Seed script: creates default users and sample data for SIGAP.
const bcrypt = require('bcryptjs');
const { db, init } = require('./database');
const BIDANG = require('../config/bidang');

init();

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

const insertUser = db.prepare(
  `INSERT OR IGNORE INTO users (nama, username, email, password, role, status)
   VALUES (@nama, @username, @email, @password, @role, 'Aktif')`
);

const seedUsers = db.transaction((list) => {
  for (const u of list) {
    insertUser.run({ ...u, password: hash });
  }
});

seedUsers(users);

console.log('Seed selesai. Akun default (password: %s):', defaultPassword);
for (const u of users) {
  console.log(`  - ${u.role.padEnd(12)} | username: ${u.username}`);
}
process.exit(0);

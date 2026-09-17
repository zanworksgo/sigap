'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { requireAccess, requireRole } = require('../middleware/auth');
const BIDANG = require('../config/bidang');

const router = express.Router();

// Only Admin manages users.
router.use(requireAccess('users'), requireRole('Admin'));

const baseRoles = ['Admin', 'Ketua Umum', 'Sekretaris', 'Humas', 'Bendahara'];
const bidangRoles = BIDANG.map((b) => b.role).filter((r) => !baseRoles.includes(r));
const ROLES = [...baseRoles, ...bidangRoles];

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const role = (req.query.role || '').trim();

  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (nama LIKE ? OR username LIKE ? OR email LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  sql += ' ORDER BY id ASC';
  const users = db.prepare(sql).all(...params);

  res.render('users/index', {
    title: 'Manajemen User',
    users,
    roles: ROLES,
    filters: { q, role },
    flash: req.query.msg || null,
    flashType: req.query.type || 'success'
  });
});

router.get('/:id/detail', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json({
    id: user.id,
    nama: user.nama,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at
  });
});

router.post('/', (req, res) => {
  const nama = (req.body.nama || '').trim();
  const username = (req.body.username || '').trim();
  const email = (req.body.email || '').trim() || null;
  const role = (req.body.role || '').trim();
  const password = req.body.password || '';

  if (!nama || !username || !role || !password) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Data wajib belum lengkap.'));
  }
  if (!ROLES.includes(role)) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Role tidak valid.'));
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)').get(username, email);
  if (exists) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Username atau email sudah digunakan.'));
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (nama, username, email, password, role, status)
     VALUES (?, ?, ?, ?, ?, 'Aktif')`
  ).run(nama, username, email, hash, role);

  res.redirect('/users?msg=' + encodeURIComponent('User berhasil ditambahkan.'));
});

router.post('/:id/edit', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/users?type=error&msg=' + encodeURIComponent('User tidak ditemukan.'));

  const nama = (req.body.nama || '').trim();
  const username = (req.body.username || '').trim();
  const email = (req.body.email || '').trim() || null;
  const role = (req.body.role || '').trim();

  if (!nama || !username || !role || !ROLES.includes(role)) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Data tidak valid.'));
  }
  const clash = db.prepare(
    'SELECT id FROM users WHERE (username = ? OR (email IS NOT NULL AND email = ?)) AND id <> ?'
  ).get(username, email, user.id);
  if (clash) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Username atau email sudah digunakan.'));
  }

  db.prepare(
    `UPDATE users SET nama=?, username=?, email=?, role=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(nama, username, email, role, user.id);

  res.redirect('/users?msg=' + encodeURIComponent('User berhasil diperbarui.'));
});

router.post('/:id/toggle', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/users?type=error&msg=' + encodeURIComponent('User tidak ditemukan.'));
  if (user.id === req.session.user.id) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Tidak dapat menonaktifkan akun sendiri.'));
  }
  const next = user.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
  db.prepare(`UPDATE users SET status=?, updated_at=datetime('now','localtime') WHERE id=?`).run(next, user.id);
  res.redirect('/users?msg=' + encodeURIComponent(`Status user diubah menjadi ${next}.`));
});

router.post('/:id/reset-password', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/users?type=error&msg=' + encodeURIComponent('User tidak ditemukan.'));
  const newPass = req.body.password || '';
  if (newPass.length < 6) {
    return res.redirect('/users?type=error&msg=' + encodeURIComponent('Password minimal 6 karakter.'));
  }
  const hash = bcrypt.hashSync(newPass, 10);
  db.prepare(`UPDATE users SET password=?, updated_at=datetime('now','localtime') WHERE id=?`).run(hash, user.id);
  res.redirect('/users?msg=' + encodeURIComponent('Password berhasil direset.'));
});

module.exports = router;

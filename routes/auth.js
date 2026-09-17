'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Masuk', error: null, values: {} });
});

router.post('/login', (req, res) => {
  const identifier = (req.body.identifier || '').trim();
  const password = req.body.password || '';

  if (!identifier || !password) {
    return res.status(400).render('login', {
      title: 'Masuk',
      error: 'Username/email dan password wajib diisi.',
      values: { identifier }
    });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1'
  ).get(identifier, identifier);

  const invalidMsg = 'Username/email atau password salah.';
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).render('login', {
      title: 'Masuk',
      error: invalidMsg,
      values: { identifier }
    });
  }

  if (user.status !== 'Aktif') {
    return res.status(403).render('login', {
      title: 'Masuk',
      error: 'Akun Anda dinonaktifkan. Hubungi Admin.',
      values: { identifier }
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('login', {
        title: 'Masuk',
        error: 'Terjadi kesalahan. Coba lagi.',
        values: { identifier }
      });
    }
    req.session.user = {
      id: user.id,
      nama: user.nama,
      username: user.username,
      email: user.email,
      role: user.role
    };
    res.redirect('/dashboard');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;

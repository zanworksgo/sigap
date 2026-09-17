'use strict';

const { canAccess, canWrite } = require('../config/permissions');

// Require an authenticated session; otherwise redirect to login.
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (req.accepts('html')) {
    return res.redirect('/login');
  }
  return res.status(401).json({ error: 'Tidak terautentikasi.' });
}

// Require the current user's role to have VIEW access to a module.
function requireAccess(module) {
  return function (req, res, next) {
    const role = req.session.user.role;
    if (canAccess(role, module)) {
      return next();
    }
    return res.status(403).render('error', {
      title: 'Akses Ditolak',
      code: 403,
      message: 'Anda tidak memiliki akses ke halaman ini.'
    });
  };
}

// Require the current user's role to have WRITE access to a module.
// Enforced on the server for every create/update/delete operation.
function requireWrite(module) {
  return function (req, res, next) {
    const role = req.session.user.role;
    if (canWrite(role, module)) {
      return next();
    }
    if (req.accepts('html') && req.method === 'GET') {
      return res.status(403).render('error', {
        title: 'Akses Ditolak',
        code: 403,
        message: 'Anda tidak diperbolehkan mengubah data ini.'
      });
    }
    return res.status(403).json({ error: 'Anda tidak diperbolehkan mengubah data ini.' });
  };
}

// Restrict a route to specific roles (e.g. Admin only).
function requireRole(...roles) {
  return function (req, res, next) {
    if (roles.includes(req.session.user.role)) {
      return next();
    }
    return res.status(403).render('error', {
      title: 'Akses Ditolak',
      code: 403,
      message: 'Halaman ini khusus untuk role tertentu.'
    });
  };
}

module.exports = { requireAuth, requireAccess, requireWrite, requireRole };

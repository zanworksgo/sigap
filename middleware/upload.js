'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp']
};

function makeStorage(subdir) {
  const dest = path.join(UPLOAD_ROOT, subdir);
  fs.mkdirSync(dest, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${unique}${ALLOWED[ext] ? ext : '.pdf'}`);
    }
  });
}

// Accept only PDF or image files, validated by extension AND mimetype.
function pdfFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ALLOWED[ext] && ALLOWED[ext].includes(file.mimetype);
  if (!allowed) {
    return cb(new Error('Hanya file PDF atau gambar (JPG, PNG, WEBP) yang diperbolehkan.'));
  }
  cb(null, true);
}

function createUploader(subdir) {
  const uploader = multer({
    storage: makeStorage(subdir),
    fileFilter: pdfFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
  });

  // Wrap multer.single so upload/validation errors redirect back with a
  // friendly message instead of surfacing a raw 500.
  const originalSingle = uploader.single.bind(uploader);
  uploader.single = function (field) {
    const mw = originalSingle(field);
    return function (req, res, next) {
      mw(req, res, (err) => {
        if (!err) return next();
        let msg = err.message || 'Gagal mengunggah file.';
        if (err.code === 'LIMIT_FILE_SIZE') msg = 'Ukuran file melebihi 5 MB.';
        return res.redirect(`${req.baseUrl}?type=error&msg=` + encodeURIComponent(msg));
      });
    };
  };

  // Same friendly-error wrapper for multi-field uploads (e.g. foto + bukti).
  const originalFields = uploader.fields.bind(uploader);
  uploader.fields = function (fields) {
    const mw = originalFields(fields);
    return function (req, res, next) {
      mw(req, res, (err) => {
        if (!err) return next();
        let msg = err.message || 'Gagal mengunggah file.';
        if (err.code === 'LIMIT_FILE_SIZE') msg = 'Ukuran file melebihi 5 MB.';
        return res.redirect(`${req.baseUrl}?type=error&msg=` + encodeURIComponent(msg));
      });
    };
  };

  return uploader;
}

function removeFile(relPath) {
  if (!relPath) return;
  const full = path.join(UPLOAD_ROOT, relPath.replace(/^uploads[\\/]/, ''));
  fs.promises.unlink(full).catch(() => { });
}

module.exports = { createUploader, removeFile, UPLOAD_ROOT };

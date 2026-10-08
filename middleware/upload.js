'use strict';

const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { uploadBuffer, removeObject } = require('../db/storage');

const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp']
};

// Accept only PDF or image files, validated by extension AND mimetype.
function pdfFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ALLOWED[ext] && ALLOWED[ext].includes(file.mimetype);
  if (!allowed) {
    return cb(new Error('Hanya file PDF atau gambar (JPG, PNG, WEBP) yang diperbolehkan.'));
  }
  cb(null, true);
}

function makeFilename(originalname) {
  const unique = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname).toLowerCase();
  return `${Date.now()}-${unique}${ALLOWED[ext] ? ext : '.pdf'}`;
}

function redirectErr(req, res, err) {
  let msg = err.message || 'Gagal mengunggah file.';
  if (err.code === 'LIMIT_FILE_SIZE') msg = 'Ukuran file melebihi 5 MB.';
  return res.redirect(`${req.baseUrl}?type=error&msg=` + encodeURIComponent(msg));
}

// Uploader for a given subdir (becomes the object-key prefix in Storage, e.g.
// "anggota" or "surat-masuk-panitia/<slug>"). Files are buffered in memory then
// pushed to Supabase Storage; req.file(.filename) keeps the previous shape so
// route handlers need no changes.
function createUploader(subdir) {
  const uploader = multer({
    storage: multer.memoryStorage(),
    fileFilter: pdfFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
  });

  async function pushFile(file) {
    const filename = makeFilename(file.originalname);
    await uploadBuffer(`${subdir}/${filename}`, file.buffer, file.mimetype);
    file.filename = filename;
  }

  const originalSingle = uploader.single.bind(uploader);
  uploader.single = function (field) {
    const mw = originalSingle(field);
    return function (req, res, next) {
      mw(req, res, (err) => {
        if (err) return redirectErr(req, res, err);
        if (!req.file) return next();
        pushFile(req.file).then(() => next()).catch((e) => redirectErr(req, res, e));
      });
    };
  };

  const originalFields = uploader.fields.bind(uploader);
  uploader.fields = function (fields) {
    const mw = originalFields(fields);
    return function (req, res, next) {
      mw(req, res, (err) => {
        if (err) return redirectErr(req, res, err);
        const files = req.files ? Object.values(req.files).flat() : [];
        Promise.all(files.map(pushFile)).then(() => next()).catch((e) => redirectErr(req, res, e));
      });
    };
  };

  return uploader;
}

function removeFile(relPath) {
  if (!relPath) return;
  removeObject(relPath);
}

module.exports = { createUploader, removeFile };


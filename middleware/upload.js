'use strict';

const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { uploadBuffer, removeObject } = require('../db/storage');

// Kept only for backward-compatible imports; no disk I/O is performed anymore.
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || '/tmp/uploads';

const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp']
};

function genName(originalname) {
  const unique = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname).toLowerCase();
  return `${Date.now()}-${unique}${ALLOWED[ext] ? ext : '.pdf'}`;
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
    storage: multer.memoryStorage(),
    fileFilter: pdfFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
  });

  // Upload one in-memory file to Supabase and expose .filename like disk multer,
  // so routes keep building file_path = '<subdir>/' + req.file.filename.
  async function persist(file) {
    const filename = genName(file.originalname);
    await uploadBuffer(`${subdir}/${filename}`, file.buffer, file.mimetype);
    file.filename = filename;
  }

  function friendly(err) {
    if (err.code === 'LIMIT_FILE_SIZE') return 'Ukuran file melebihi 5 MB.';
    return err.message || 'Gagal mengunggah file.';
  }

  const redirectErr = (req, res, msg) =>
    res.redirect(`${req.baseUrl}?type=error&msg=` + encodeURIComponent(msg));

  const originalSingle = uploader.single.bind(uploader);
  uploader.single = function (field) {
    const mw = originalSingle(field);
    return function (req, res, next) {
      mw(req, res, (err) => {
        if (err) return redirectErr(req, res, friendly(err));
        if (!req.file) return next();
        persist(req.file).then(() => next()).catch((e) => redirectErr(req, res, e.message || 'Gagal menyimpan file.'));
      });
    };
  };

  const originalFields = uploader.fields.bind(uploader);
  uploader.fields = function (fields) {
    const mw = originalFields(fields);
    return function (req, res, next) {
      mw(req, res, (err) => {
        if (err) return redirectErr(req, res, friendly(err));
        const files = req.files ? Object.values(req.files).flat() : [];
        Promise.all(files.map(persist)).then(() => next()).catch((e) => redirectErr(req, res, e.message || 'Gagal menyimpan file.'));
      });
    };
  };

  return uploader;
}

// Delete an uploaded object from Supabase Storage (key = "<subdir>/<file>").
function removeFile(relPath) {
  removeObject(relPath);
}

module.exports = { createUploader, removeFile, UPLOAD_ROOT };

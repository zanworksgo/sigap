# SIGAP

**Sistem Informasi dan Gerbang Administrasi Paskibra**
Paskibra SMA Negeri 1 Jeneponto

Aplikasi web internal untuk administrasi surat, keanggotaan, dan keuangan organisasi.

## Teknologi

- Node.js + Express (server-rendered EJS)
- better-sqlite3 (database relasional, tanpa server terpisah)
- express-session + bcryptjs (autentikasi & hash password)
- multer (upload PDF)

## Menjalankan

```bash
npm install       # instal dependency
npm run seed      # buat akun default (sekali saja)
npm start         # jalankan di http://localhost:3000
```

Untuk pengembangan dengan **live reload** (server restart otomatis + browser
auto-refresh saat file berubah, tanpa refresh manual): `npm run dev`.

## Logo

Simpan foto/logo Paskibra di `public/img/logo.png`. Logo otomatis tampil di
sidebar dan halaman login. Bila file belum ada, sistem menampilkan teks "SG"
sebagai cadangan.

## Akun Default

Password semua akun: `password123` (segera ganti melalui menu Admin > Reset Password).

| Role        | Username     |
| ----------- | ------------ |
| Admin       | `admin`      |
| Ketua Umum  | `ketua`      |
| Sekretaris  | `sekretaris` |
| Humas       | `humas`      |
| Bendahara   | `bendahara`  |

## Hak Akses

- **Admin** — seluruh modul + manajemen user.
- **Ketua Umum** — read-only (monitoring seluruh data, tanpa ubah/tambah/hapus).
- **Sekretaris** — CRUD Surat Masuk & Surat Keluar, Petunjuk Kode Surat.
- **Humas** — CRUD Data Anggota Aktif & Alumni.
- **Bendahara** — CRUD Pemasukan/Pengeluaran, Laporan Keuangan.

Hak akses divalidasi di server (lihat `config/permissions.js` dan `middleware/auth.js`).

## Struktur

```
server.js              # entry point + registrasi route
config/permissions.js  # matriks akses per role
middleware/            # auth (proteksi route/role) & upload (validasi PDF)
db/                    # skema database & seed
routes/                # logika tiap modul
views/                 # halaman EJS + partial + halaman cetak
public/                # CSS (light/dark) & JS
data/                  # file SQLite (dibuat otomatis)
uploads/               # file PDF terunggah
```

## Keamanan

- Password di-hash (bcrypt), tidak pernah disimpan plain text.
- Route diproteksi; role divalidasi server-side, bukan sekadar sembunyi tombol.
- Upload dibatasi hanya PDF, maksimal 5 MB.
- File terunggah hanya dapat diakses oleh role yang berhak (route `/file`).
- Ganti `SESSION_SECRET` pada `.env` sebelum produksi.

© 2026 SIGAP · Developed by Farhan

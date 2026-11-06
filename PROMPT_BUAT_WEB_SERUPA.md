# PROMPT: Membangun Web Sistem Administrasi Internal (Serupa SIGAP)

> Salin seluruh isi di bawah ini ke AI coding assistant (Copilot, ChatGPT, Claude, dsb).
> Ganti bagian **[DALAM KURUNG SIKU]** sesuai organisasi/kebutuhan Anda.
> Prompt ini sengaja dibuat **generik dan dapat dipakai ulang** untuk membangun
> sistem administrasi internal apa pun (sekolah, organisasi, komunitas, UMKM, dll).

---

## PERAN & TUJUAN

Anda adalah **software engineer sekaligus UI/UX developer**. Bangunkan saya sebuah
**aplikasi web administrasi internal** bernama **[NAMA SISTEM]** untuk **[NAMA ORGANISASI]**.

Sistem ini **bukan website profil publik**, melainkan **sistem informasi internal**
untuk mengelola data organisasi. Buat sistem yang **sederhana, stabil, modern,
responsif, mudah digunakan, dan benar-benar operasional** — bukan prototipe.

Fokus utama:
- Login & role-based access (hak akses per peran).
- CRUD data (Create, Read, Update, Delete).
- Pencarian, filter, dan pagination.
- Upload & pengelolaan file (mis. PDF).
- Cetak data/laporan (print-friendly, siap Save as PDF).
- Dashboard ringkas per role.
- Pengarsipan & monitoring data.

Prinsip: **Create → Read → Update → Delete → Search/Filter → Print.**

---

## TEKNOLOGI (STACK)

Gunakan stack sederhana dan server-rendered berikut:

- **Backend:** Node.js + Express.
- **View:** EJS (server-side rendering) + partial (top/sidebar/bottom).
- **Database:** SQLite (`better-sqlite3`) untuk lokal; siapkan jalur migrasi ke
  **PostgreSQL** untuk produksi (opsional).
- **Auth:** `express-session` + `bcryptjs` (password di-hash, tidak pernah plain text).
- **Upload:** `multer` (validasi tipe file & batas ukuran, mis. PDF maks 5 MB).
- **Styling:** CSS murni (tanpa framework berat) — variabel CSS untuk tema.
- **Dev experience:** live reload saat development (`node --watch` / `livereload`).

Hindari arsitektur yang terlalu kompleks (jangan paksakan SPA/React bila tidak perlu).

Struktur folder yang diharapkan:
```
server.js              # entry point + registrasi route
config/permissions.js  # matriks hak akses per role (single source of truth)
middleware/            # auth (proteksi route & role) + upload (validasi file)
db/                    # skema database, koneksi, seed akun default
routes/                # satu file per modul
views/                 # halaman EJS + partial + halaman cetak (print)
public/                # CSS (light/dark), JS, logo, manifest PWA
uploads/ atau storage  # file terunggah
```

---

## ROLE & HAK AKSES

Gunakan beberapa role dengan matriks hak akses terpusat di `config/permissions.js`
(dipakai bersama oleh guard server-side DAN rendering menu sidebar). Contoh role:

1. **Admin** — akses penuh semua modul + manajemen user.
2. **[Pimpinan / Monitoring]** — **read-only** (lihat semua data & statistik, tanpa ubah/tambah/hapus).
3. **[Peran A, mis. Sekretaris]** — CRUD modul [surat/dokumen].
4. **[Peran B, mis. Humas]** — CRUD modul [data anggota].
5. **[Peran C, mis. Bendahara]** — CRUD modul [keuangan].

Aturan wajib:
- Definisikan `access` (modul yang boleh DILIHAT) dan `write` (modul yang boleh DIUBAH) per role.
- **Hak akses divalidasi di server**, bukan sekadar menyembunyikan tombol di frontend.
- User yang belum login tidak boleh membuka halaman mana pun dengan mengetik URL langsung.

---

## HALAMAN LOGIN

- Field: Username/Email + Password + tombol Masuk.
- Validasi field, indikator loading saat submit, dan pesan error bila gagal.
- Session authentication + logout.
- Desain modern, bersih, memakai identitas warna & logo [NAMA SISTEM].

---

## MODUL YANG DIBANGUN

Buat modul-modul berikut (sesuaikan dengan kebutuhan Anda). Setiap modul harus punya:
tabel daftar + search/filter + pagination + modal Tambah/Edit + konfirmasi Hapus +
tombol Cetak Data + system field (`id`, `created_at`, `updated_at`, `created_by`).

> Ganti daftar modul di bawah dengan modul Anda sendiri. Contoh referensi:

1. **Manajemen User** (Admin) — tambah/edit user, ubah role, aktif/nonaktif, reset password.
2. **[Modul Dokumen Masuk]** — field unik (mis. indeks/nomor unik), tanggal, asal, perihal, penerima, file PDF.
3. **[Modul Dokumen Keluar]** — nomor unik, tanggal, perihal, tujuan, file PDF.
4. **[Modul Data Anggota]** — biodata, status aktif, foto/dokumen.
5. **[Modul Keuangan: Pemasukan & Pengeluaran]** — nominal, tanggal, kategori, bukti, + Laporan Keuangan dengan saldo.
6. **[Modul lain sesuai kebutuhan]**.

### Aturan per modul
- **Keunikan data** (mis. nomor/indeks) wajib di-enforce di level database, dengan pesan error jelas bila duplikat.
- **File upload**: hanya tipe yang diizinkan (mis. `.pdf`), batasi ukuran, dan sediakan aksi **Preview / Download / Print**.
- **Keamanan file**: file hanya bisa diakses role yang berhak (lewat route khusus, mis. `/file/:id`), bukan URL publik langsung.
- Pertimbangkan **soft delete** untuk data penting agar tidak hilang permanen.

---

## DASHBOARD

Dashboard ringkas per role berisi **card statistik** (angka ringkas), misalnya:
- Jumlah dokumen bulan ini & total.
- Pemasukan/pengeluaran bulan ini & saldo.
- Jumlah anggota aktif/alumni.
- Data terbaru (daftar singkat).

Tidak perlu grafik kompleks — utamakan angka yang jelas dan cepat dibaca.

---

## DESAIN UI/UX

Gaya **dashboard administrasi modern**: clean, minimalist, formal, banyak white space,
card sederhana, border tipis, rounded corner secukupnya, shadow sangat halus.

- **Warna aksen:** [PILIH WARNA, mis. merah #E50914] di atas dominasi **putih**.
- Aksen dipakai untuk: active menu, tombol utama, badge penting, focus state, branding.
- Hindari gradient berlebihan, desain terlalu ramai, atau seluruh card berwarna.

### Light Mode (default) — contoh variabel
```css
--background: #FAFAFA;  --surface: #FFFFFF;  --sidebar: #FFFFFF;
--primary: #E50914;     --primary-hover: #C90812;  --primary-soft: #FFF1F2;
--text: #171717;        --text-secondary: #737373; --border: #E5E5E5;
```

### Dark Mode — contoh variabel
```css
--background-dark: #0D0D0D;  --surface-dark: #171717;  --sidebar-dark: #111111;
--primary-dark-mode: #EF233C;
--text-dark: #F5F5F5;        --text-secondary-dark: #A3A3A3;  --border-dark: #2A2A2A;
```

Sediakan **toggle Light/Dark Mode** di topbar dan simpan preferensi (localStorage/cookie).

### Layout
- **Sidebar kiri:** branding, menu sesuai role, info & role user, logout.
- **Topbar:** judul/navigasi, toggle tema, info user.
- **Main content** + **footer/copyright** kecil & bersih.
- **Responsive:** sidebar menjadi drawer/collapsible di mobile.

---

## STANDAR KUALITAS (WAJIB DIPENUHI)

1. Semua tombol harus berfungsi — **tidak ada placeholder/tombol palsu**.
2. Gunakan **modal/dialog** untuk Tambah & Edit data.
3. **Konfirmasi** sebelum menghapus data.
4. Validasi **frontend DAN backend**.
5. Saat menyimpan: disable tombol sementara, tampilkan loading, cegah double submit, beri feedback sukses/gagal.
6. Sediakan **loading state, empty state, error state, success feedback**.
7. Responsif di desktop & smartphone.
8. **Jangan menambahkan fitur yang tidak diminta.**

---

## FITUR CETAK (PRINT)

Pisahkan dua hal:
1. **Print Data** — halaman cetak khusus (jangan mencetak dashboard/sidebar). Berisi
   header organisasi + judul laporan + periode + tabel data bersih. Pakai **CSS print
   untuk kertas A4**. User bisa print langsung atau Save as PDF via dialog browser.
2. **Print File** — aksi Preview/Download/Print pada file PDF tiap data.

---

## KEAMANAN

- Password di-hash (bcrypt), tidak pernah disimpan plain text.
- Semua route diproteksi; role divalidasi **server-side**.
- Upload dibatasi tipe & ukuran file.
- File terunggah hanya diakses role berhak melalui route khusus.
- `SESSION_SECRET` disimpan di `.env`, bukan di dalam kode.
- Terapkan pencegahan OWASP Top 10 (SQL injection via parameter binding, XSS escaping EJS, dll).

---

## DELIVERABLE

- Kode berjalan dengan `npm install` lalu `npm start` (plus `npm run seed` untuk akun default).
- README singkat: cara menjalankan, daftar akun default, dan ringkasan hak akses.
- Akun default dibuat lewat skrip seed (password default yang harus diganti setelah login).

---

### Catatan penggunaan
Bila ingin mendekati persis sistem referensi, tambahkan detail spesifik per modul
(nama field, aturan unik, kolom tabel, isi dashboard) seperti contoh di atas. Semakin
rinci field & aturan yang Anda sebutkan, semakin akurat hasil yang dibangun AI.

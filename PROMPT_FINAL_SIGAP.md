# MASTER PROMPT FINAL --- SIGAP

## Sistem Informasi dan Gerbang Administrasi Paskibra

### Paskibra SMA Negeri 1 Jeneponto

Anda adalah **software engineer sekaligus UI/UX developer** yang
bertugas membangun aplikasi web internal bernama **SIGAP (Sistem
Informasi dan Gerbang Administrasi Paskibra)** untuk **Paskibra SMA
Negeri 1 Jeneponto**.

Bangun sistem yang **sederhana, stabil, modern, responsif, mudah
digunakan, dan benar-benar operasional**. Jangan membuat arsitektur atau
fitur yang terlalu kompleks. Fokus utama sistem adalah:

-   Login dan role-based access.
-   CRUD data.
-   Pengarsipan.
-   Monitoring.
-   Pencarian dan filter.
-   Upload dan pengelolaan file.
-   Cetak laporan.
-   Dashboard berdasarkan role.

SIGAP adalah **sistem informasi internal organisasi**, bukan website
profil publik.

------------------------------------------------------------------------

# 1. IDENTITAS SISTEM

**Nama:** SIGAP\
**Kepanjangan:** Sistem Informasi dan Gerbang Administrasi Paskibra\
**Organisasi:** Paskibra SMA Negeri 1 Jeneponto

Gunakan nama **SIGAP** pada logo teks, login, sidebar, title halaman,
dan identitas sistem.

Jangan gunakan angka `101` pada nama aplikasi atau branding utama.

Footer/copyright:

> © 2026 SIGAP · Developed by Farhan

Tampilkan copyright secara kecil, bersih, dan tidak mengganggu tampilan.

------------------------------------------------------------------------

# 2. TUJUAN SISTEM

SIGAP digunakan untuk membantu administrasi internal organisasi,
meliputi:

-   Surat Masuk.
-   Surat Keluar.
-   Petunjuk Kode Surat.
-   Data Anggota Aktif.
-   Data Alumni.
-   Pemasukan.
-   Pengeluaran.
-   Laporan Keuangan.
-   Monitoring oleh Ketua Umum.
-   Manajemen pengguna oleh Admin.

Modul inventaris dan website profil publik **belum dibuat pada versi
ini**.

------------------------------------------------------------------------

# 3. PRINSIP PENGEMBANGAN

Gunakan prinsip:

**Create → Read → Update → Delete → Search/Filter → Print**

Prioritaskan:

1.  Semua tombol harus berfungsi.
2.  Tidak ada halaman atau tombol palsu/placeholder.
3.  UI sederhana dan mudah dipahami.
4.  Validasi frontend dan backend.
5.  Hak akses benar-benar diperiksa di server.
6.  Responsive pada desktop dan smartphone.
7.  Data tersimpan dengan baik di database.
8.  Proses CRUD cepat dan tidak membingungkan.
9.  Gunakan modal/dialog untuk tambah dan edit data.
10. Konfirmasi sebelum menghapus data.
11. Gunakan loading, empty state, error state, dan success feedback.
12. Jangan menambahkan fitur yang tidak diminta.

Jika memungkinkan, gunakan **soft delete** untuk data administrasi
penting agar data tidak langsung hilang permanen.

------------------------------------------------------------------------

# 4. DESAIN UI/UX

## 4.1 Konsep Visual

Gunakan gaya dashboard berdasarkan referensi visual berikut:

-   Clean.
-   Minimalist.
-   Modern.
-   Formal.
-   Banyak white space.
-   Card sederhana.
-   Border tipis.
-   Rounded corner secukupnya.
-   Shadow sangat halus atau cukup menggunakan border.
-   Merah sebagai warna aksen.
-   Putih sebagai warna dominan.
-   Hindari tampilan terlalu ramai.
-   Hindari gradient berlebihan.
-   Hindari seluruh card berwarna merah.
-   Hindari desain bergaya militer/camouflage.

Desain harus terasa seperti **dashboard administrasi modern**, bukan
website sekolah lama.

## 4.2 Light Mode --- Default

Light Mode menjadi tema default.

Gunakan pendekatan warna:

``` css
--background: #FAFAFA;
--surface: #FFFFFF;
--sidebar: #FFFFFF;

--primary: #E50914;
--primary-hover: #C90812;
--primary-soft: #FFF1F2;

--text: #171717;
--text-secondary: #737373;

--border: #E5E5E5;
```

Merah digunakan untuk:

-   Active menu.
-   Tombol utama.
-   Indicator.
-   Accent line.
-   Icon tertentu.
-   Badge penting.
-   Focus state.
-   Elemen branding.

Putih tetap menjadi warna dominan.

## 4.3 Dark Mode

Sediakan toggle Light/Dark Mode pada topbar.

Contoh warna:

``` css
--background-dark: #0D0D0D;
--surface-dark: #171717;
--sidebar-dark: #111111;

--primary-dark-mode: #EF233C;

--text-dark: #F5F5F5;
--text-secondary-dark: #A3A3A3;

--border-dark: #2A2A2A;
```

Dark Mode tetap menggunakan merah sebagai accent.

Simpan preferensi tema pengguna menggunakan mekanisme sederhana seperti
localStorage/cookie agar tema tetap sama setelah halaman direfresh.

------------------------------------------------------------------------

# 5. STRUKTUR LAYOUT

Gunakan:

-   Sidebar kiri.
-   Topbar.
-   Main content.
-   Footer/copyright.
-   Responsive mobile navigation.

Sidebar berisi:

-   Branding SIGAP.
-   Menu sesuai role.
-   Informasi user.
-   Role user.
-   Logout.

Topbar dapat berisi:

-   Judul/area navigasi.
-   Toggle Light/Dark Mode.
-   Informasi/profile user.

Pada desktop sidebar tetap terlihat.

Pada mobile sidebar berubah menjadi drawer/collapsible menu.

------------------------------------------------------------------------

# 6. LOGIN

Buat halaman login modern dan sederhana.

Field:

-   Username atau Email.
-   Password.
-   Tombol Masuk.

Tambahkan:

-   Validasi field.
-   Loading saat login.
-   Pesan jika login gagal.
-   Session authentication.
-   Logout.
-   Proteksi route.

User yang belum login tidak boleh membuka dashboard dengan mengetik URL
secara langsung.

Desain login tetap menggunakan identitas merah-putih SIGAP.

------------------------------------------------------------------------

# 7. ROLE

Gunakan lima role utama:

1.  Admin
2.  Ketua Umum
3.  Sekretaris
4.  Humas
5.  Bendahara

Tidak perlu membuat permission builder yang kompleks.

------------------------------------------------------------------------

# 8. ADMIN

Admin merupakan pengelola sistem tertinggi.

Admin dapat:

-   Mengakses seluruh modul.
-   Melihat seluruh data.
-   Mengelola data jika diperlukan.
-   Menambah user.
-   Edit user.
-   Mengubah role.
-   Mengaktifkan/nonaktifkan akun.
-   Reset password.
-   Melihat detail user.

## Manajemen User

Tabel:

-   No.
-   Nama.
-   Username/Email.
-   Role.
-   Status.
-   Aksi.

Aksi:

-   Detail.
-   Edit.
-   Aktif/Nonaktif.
-   Reset Password.

Password wajib di-hash dan tidak boleh disimpan sebagai plain text.

------------------------------------------------------------------------

# 9. KETUA UMUM

Ketua Umum adalah **monitoring/read-only**.

Ketua dapat melihat:

-   Dashboard keseluruhan.
-   Surat Masuk.
-   Surat Keluar.
-   Data Anggota Aktif.
-   Data Alumni.
-   Pemasukan.
-   Pengeluaran.
-   Laporan.

Ketua dapat:

-   View.
-   Detail.
-   Search.
-   Filter.
-   Melihat statistik.

Ketua **tidak dapat**:

-   Tambah.
-   Edit.
-   Hapus.
-   Mengubah user.
-   Mengubah role.

Jangan hanya menyembunyikan tombol CRUD. Backend/server juga wajib
menolak operasi perubahan data dari role Ketua.

## Dashboard Ketua

Tampilkan card:

-   Surat Masuk Bulan Ini.
-   Surat Keluar Bulan Ini.
-   Total Surat Masuk.
-   Total Surat Keluar.
-   Pemasukan Bulan Ini.
-   Pengeluaran Bulan Ini.
-   Saldo.
-   Jumlah Anggota Aktif.
-   Jumlah Alumni.

Tidak perlu grafik kompleks.

------------------------------------------------------------------------

# 10. SEKRETARIS

Menu:

-   Dashboard.
-   Surat Masuk.
-   Surat Keluar.
-   Petunjuk Kode Surat.
-   Logout.

Dashboard Sekretaris:

-   Surat Masuk Bulan Ini.
-   Surat Keluar Bulan Ini.
-   Total Surat Masuk.
-   Total Surat Keluar.
-   Data surat terbaru.

Sekretaris memiliki CRUD pada Surat Masuk dan Surat Keluar.

------------------------------------------------------------------------

# 11. SURAT MASUK

Field:

## Indeks

-   Wajib.
-   Harus unik.
-   Tidak boleh terdapat indeks yang sama.

## Nomor Surat

-   Wajib.

## Tanggal Masuk

-   Wajib.
-   Date picker.

## Asal Surat

-   Wajib.

## Perihal

-   Wajib.

## Penerima Surat

-   Wajib.

## File Surat

-   PDF.
-   Validasi file `.pdf`.
-   Batasi ukuran file secara wajar.
-   Dapat Preview, Download, dan Print.

## System Field

-   ID.
-   Created At.
-   Updated At.
-   Created By jika diperlukan.

### Tabel Surat Masuk

Tampilkan:

-   No.
-   Indeks.
-   Tanggal Masuk.
-   Nomor Surat.
-   Asal Surat.
-   Perihal.
-   Penerima.
-   File.
-   Aksi.

Sediakan:

-   Search.
-   Filter bulan.
-   Filter tahun.
-   Pagination jika data banyak.
-   `+ Tambah Surat`.
-   `Cetak Data`.

Aksi Sekretaris/Admin:

-   Detail.
-   Edit.
-   Hapus/Arsipkan.
-   Preview File.
-   Download File.
-   Print File.

Jika indeks duplikat:

> Indeks sudah digunakan. Silakan gunakan indeks lain.

Keunikan indeks wajib diterapkan pada database.

------------------------------------------------------------------------

# 12. MODAL SURAT MASUK

Tambah dan Edit menggunakan modal/dialog.

Modal Tambah berisi:

-   Indeks.
-   Nomor Surat.
-   Tanggal Masuk.
-   Asal Surat.
-   Perihal.
-   Penerima Surat.
-   Upload PDF.
-   Batal.
-   Simpan Data.

Modal harus responsive.

Ketika menyimpan:

-   Disable tombol sementara.
-   Tampilkan loading.
-   Hindari double submit.
-   Tampilkan success/error feedback.

------------------------------------------------------------------------

# 13. SURAT KELUAR

Field:

## Nomor Surat

-   Wajib.
-   Harus unik.
-   Tidak boleh ada nomor Surat Keluar yang sama.

## Perihal

-   Wajib.

## Ditujukan Kepada

-   Wajib.

## Tanggal

-   Wajib.

## File

-   PDF.
-   Preview.
-   Download.
-   Print.

## System Field

-   ID.
-   Created At.
-   Updated At.
-   Created By jika diperlukan.

Tabel:

-   No.
-   Nomor Surat.
-   Tanggal.
-   Perihal.
-   Ditujukan.
-   File.
-   Aksi.

Gunakan modal untuk Tambah dan Edit.

Jika nomor surat duplikat:

> Nomor surat sudah terdaftar.

------------------------------------------------------------------------

# 14. PRINT DATA SURAT

Pisahkan:

1.  **Print Data**
2.  **Print File Surat**

## Print Data

Tombol `Cetak Data` membuat halaman print khusus.

Jangan mencetak dashboard.

### Surat Masuk

Header:

**PASKIBRA SMA NEGERI 1 JENEPONTO**

**DATA SURAT MASUK**

**PERIODE \[BULAN/TAHUN\]**

Tabel:

-   No.
-   Indeks.
-   Tanggal.
-   Nomor Surat.
-   Asal Surat.
-   Perihal.
-   Penerima.

Jangan masukkan file.

### Surat Keluar

Header:

**PASKIBRA SMA NEGERI 1 JENEPONTO**

**DATA SURAT KELUAR**

**PERIODE \[BULAN/TAHUN\]**

Tabel:

-   No.
-   Nomor Surat.
-   Tanggal.
-   Perihal.
-   Ditujukan.

Gunakan CSS print yang rapi dan sesuai kertas A4.

Browser dapat menggunakan dialog print sehingga user dapat:

-   Print langsung.
-   Save as PDF.

## Print File

File PDF pada setiap data memiliki aksi:

-   Preview.
-   Download.
-   Print.

------------------------------------------------------------------------

# 15. PETUNJUK KODE SURAT

Buat halaman:

**Petunjuk Kode Surat**

Halaman hanya bersifat edukasi/referensi.

Contoh struktur:

  Kode   Keterangan
  ------ -------------
  A      Keanggotaan
  B      Biasa
  C      Dinas
  D      Keuangan
  E      Kegiatan
  ...    ...

Data kode akan disesuaikan kemudian.

Tidak perlu membuat generator nomor surat otomatis.

------------------------------------------------------------------------

# 16. HUMAS

Humas mengelola:

-   Data Anggota Aktif.
-   Data Alumni.

Humas memiliki CRUD penuh pada modul tersebut.

Menu:

-   Dashboard.
-   Data Anggota Aktif.
-   Data Alumni.
-   Logout.

------------------------------------------------------------------------

# 17. DATA ANGGOTA AKTIF

Gunakan **hanya variabel utama berikut**:

## Nama Lengkap

-   Wajib.
-   Text.

## Tempat, Tanggal Lahir

-   Wajib.
-   Tampilan contoh:

`Makassar, 02 Juni 2009`

Secara database boleh dipisah menjadi `tempat_lahir` dan `tanggal_lahir`
agar lebih terstruktur, tetapi pada UI ditampilkan secara mudah dan
natural.

## Kelas

-   Wajib.

## Alamat Lengkap

-   Wajib.
-   Textarea.

## Nomor HP/WhatsApp Aktif

-   Wajib.
-   Simpan sebagai string agar angka `0` di depan tidak hilang.

## Angkatan

-   Tidak wajib.
-   Text/number sesuai implementasi.

## Jabatan di Paskibra

-   Wajib.
-   Select:
    -   Anggota
    -   Pengurus

## Bidang

-   Hanya berlaku untuk Pengurus.
-   Jika Jabatan = Anggota, field Bidang tidak ditampilkan dan nilainya
    null.
-   Jika Jabatan = Pengurus, tampilkan field Bidang.
-   Pilihan Bidang dapat disesuaikan kemudian.

------------------------------------------------------------------------

# 18. TABEL ANGGOTA AKTIF

Jangan tampilkan semua data pada tabel utama.

Tampilkan:

-   No.
-   Nama.
-   Kelas.
-   Angkatan.
-   Jabatan.
-   Bidang.
-   Nomor HP/WhatsApp.
-   Aksi.

Sediakan:

-   `+ Tambah Anggota`.
-   Search nama.
-   Filter Angkatan.
-   Filter Jabatan.
-   Detail.
-   Edit.
-   Hapus.
-   Cetak Data.

Ketua hanya dapat:

-   View.
-   Search.
-   Filter.
-   Detail.

Ketua tidak memiliki Tambah/Edit/Hapus.

------------------------------------------------------------------------

# 19. DETAIL ANGGOTA

Detail menampilkan:

-   Nama Lengkap.
-   Tempat, Tanggal Lahir.
-   Kelas.
-   Alamat Lengkap.
-   Nomor HP/WhatsApp Aktif.
-   Angkatan.
-   Jabatan.
-   Bidang.

Gunakan modal/detail view yang rapi.

------------------------------------------------------------------------

# 20. MODAL TAMBAH/EDIT ANGGOTA

Gunakan modal/dialog.

Form mengikuti variabel Data Anggota Aktif.

Buat field Bidang dinamis:

``` text
Jika Jabatan = Anggota
→ Bidang disembunyikan
→ Bidang = null

Jika Jabatan = Pengurus
→ Bidang ditampilkan
```

------------------------------------------------------------------------

# 21. PRINT DATA ANGGOTA AKTIF

Header:

**PASKIBRA SMA NEGERI 1 JENEPONTO**

**DATA ANGGOTA AKTIF**

Tabel:

-   No.
-   Nama Lengkap.
-   Tempat, Tanggal Lahir.
-   Kelas.
-   Alamat Lengkap.
-   Nomor HP/WhatsApp.
-   Angkatan.
-   Jabatan.
-   Bidang.

Jika tabel terlalu lebar gunakan A4 landscape.

------------------------------------------------------------------------

# 22. DATA ALUMNI

Sediakan modul Data Alumni.

Jangan membuatnya terlalu kompleks karena variabel alumni akan
dikembangkan kemudian.

Arsitektur data sebaiknya memungkinkan Anggota Aktif nantinya berubah
menjadi Alumni tanpa perlu input ulang seluruh identitas.

------------------------------------------------------------------------

# 23. BENDAHARA

Bendahara mengelola:

-   Pemasukan.
-   Pengeluaran.
-   Laporan Keuangan.

Dashboard:

-   Pemasukan Bulan Ini.
-   Pengeluaran Bulan Ini.
-   Saldo.

Rumus:

`Saldo = Total Pemasukan - Total Pengeluaran`

------------------------------------------------------------------------

# 24. PEMASUKAN

Field:

-   Tanggal.
-   Uraian.
-   Kategori.
-   Nominal.
-   Keterangan.
-   Bukti (opsional).

Sediakan:

-   Tambah.
-   Detail.
-   Edit.
-   Hapus.
-   Search.
-   Filter.
-   Print.

------------------------------------------------------------------------

# 25. PENGELUARAN

Field:

-   Tanggal.
-   Uraian.
-   Kategori.
-   Nominal.
-   Keterangan.
-   Bukti (opsional).

Sediakan:

-   Tambah.
-   Detail.
-   Edit.
-   Hapus.
-   Search.
-   Filter.
-   Print.

------------------------------------------------------------------------

# 26. LAPORAN KEUANGAN

Buat halaman print:

**LAPORAN KEUANGAN**

**PASKIBRA SMA NEGERI 1 JENEPONTO**

**PERIODE \[BULAN/TAHUN\]**

Tabel:

-   No.
-   Tanggal.
-   Uraian.
-   Pemasukan.
-   Pengeluaran.

Bagian akhir:

-   Total Pemasukan.
-   Total Pengeluaran.
-   Saldo.

Format harus rapi dan layak menjadi lampiran administrasi/LPJ sederhana.

------------------------------------------------------------------------

# 27. RESPONSIVE

Sistem wajib nyaman pada:

-   Desktop.
-   Laptop.
-   Tablet.
-   Smartphone.

Pada smartphone:

-   Sidebar menjadi drawer.
-   Tabel dapat horizontal scroll.
-   Modal menyesuaikan layar.
-   Form tidak keluar layar.
-   Tombol aksi tetap mudah digunakan.
-   Card dashboard menyesuaikan grid.

------------------------------------------------------------------------

# 28. DATABASE

Gunakan database relasional.

Entitas minimal:

``` text
User
SuratMasuk
SuratKeluar
Anggota
TransaksiKeuangan
```

Tambahkan field sistem jika diperlukan:

``` text
id
created_at
updated_at
deleted_at
created_by
```

Constraint penting:

``` text
SuratMasuk.indeks = UNIQUE
SuratKeluar.nomor_surat = UNIQUE
```

Nomor WhatsApp/HP disimpan sebagai string.

Nominal keuangan gunakan tipe angka/decimal yang aman untuk uang.

------------------------------------------------------------------------

# 29. KEAMANAN

Minimal:

-   Hash password.
-   Session/authentication aman.
-   Protect route.
-   Server-side role validation.
-   Validasi input.
-   Validasi upload PDF.
-   Batasi ukuran file.
-   Jangan izinkan executable file.
-   Data internal tidak public.
-   File internal tidak dapat diakses tanpa authorization.
-   Jangan hanya mengandalkan hide/show tombol di frontend.

------------------------------------------------------------------------

# 30. FITUR YANG TIDAK PERLU DIBUAT

Jangan tambahkan:

-   AI.
-   Chatbot.
-   QR Code.
-   WhatsApp automation.
-   Payment gateway.
-   Mobile app native.
-   Microservices.
-   Multi-tenant.
-   Subscription.
-   Approval workflow kompleks.
-   Notification system kompleks.
-   Inventaris.
-   Website profil publik.
-   CMS publik.
-   Fitur lain yang belum diminta.

------------------------------------------------------------------------

# 31. URUTAN PENGERJAAN

Kerjakan bertahap.

## Tahap 1 --- Foundation

-   Setup project.
-   Database.
-   Authentication.
-   Login/logout.
-   Role.
-   Light/Dark Mode.
-   Dashboard layout.
-   Sidebar responsive.

## Tahap 2 --- Admin

-   Manajemen User.
-   Role user.
-   Status user.

## Tahap 3 --- Sekretariat

-   Dashboard Sekretaris.
-   Surat Masuk.
-   Surat Keluar.
-   Petunjuk Kode Surat.
-   Upload PDF.
-   Preview/download/print file.
-   Print Data.

## Tahap 4 --- Humas

-   Data Anggota Aktif.
-   Detail.
-   Search/filter.
-   Print.
-   Data Alumni dasar.

## Tahap 5 --- Bendahara

-   Pemasukan.
-   Pengeluaran.
-   Saldo.
-   Laporan.
-   Print laporan.

## Tahap 6 --- Ketua

-   Dashboard monitoring.
-   Integrasi statistik seluruh modul.
-   Pastikan seluruh akses Ketua read-only.

## Tahap 7 --- Finalisasi

-   Responsive testing.
-   Role testing.
-   CRUD testing.
-   File upload testing.
-   Print testing.
-   Dark Mode testing.
-   Error handling.
-   Security check dasar.
-   Deployment.

------------------------------------------------------------------------

# 32. KRITERIA SELESAI

SIGAP dianggap selesai jika:

-   Login/logout berfungsi.
-   Role berfungsi.
-   Admin dapat mengelola user.
-   Ketua hanya read-only.
-   Sekretaris dapat CRUD Surat Masuk/Keluar.
-   Indeks Surat Masuk tidak dapat duplikat.
-   Nomor Surat Keluar tidak dapat duplikat.
-   Upload PDF bekerja.
-   Preview/download/print PDF bekerja.
-   Cetak data surat bekerja.
-   Humas dapat CRUD Anggota Aktif.
-   Field Bidang dinamis sesuai Jabatan.
-   Search/filter anggota bekerja.
-   Print anggota bekerja.
-   Bendahara dapat CRUD transaksi.
-   Perhitungan saldo benar.
-   Laporan keuangan dapat dicetak.
-   Dashboard Ketua menampilkan data aktual.
-   Light Mode bekerja.
-   Dark Mode bekerja.
-   Tema tersimpan setelah refresh.
-   Responsive.
-   Tidak ada tombol mati.
-   Tidak ada halaman palsu.
-   Tidak ada error pada alur utama.
-   Copyright tampil:

`© 2026 SIGAP · Developed by Farhan`

------------------------------------------------------------------------

# 33. INSTRUKSI PENTING UNTUK CODING ASSISTANT

**Jangan langsung membangun seluruh sistem sekaligus.**

Kerjakan modul demi modul.

Setelah menyelesaikan satu modul:

1.  Jalankan aplikasi.
2.  Periksa error.
3.  Test CRUD.
4.  Test database.
5.  Test role.
6.  Test responsive.
7.  Test Light/Dark Mode jika terkait.
8.  Pastikan semua tombol bekerja.
9.  Perbaiki masalah terlebih dahulu.
10. Baru lanjut ke modul berikutnya.

Jika harus mengambil keputusan teknis yang tidak disebutkan di prompt,
pilih pendekatan yang:

-   Sederhana.
-   Stabil.
-   Aman.
-   Mudah dipahami.
-   Mudah dikembangkan.
-   Cocok untuk developer pemula.

Jangan mengubah kebutuhan bisnis hanya untuk membuat sistem terlihat
lebih canggih.

**SIGAP harus terlihat modern, tetapi tetap sederhana secara teknis.**

Prioritas akhir:

> **Fungsional → Stabil → Mudah Digunakan → Rapi → Baru Dikembangkan
> Lebih Lanjut.**

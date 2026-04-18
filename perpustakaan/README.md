# Sistem Informasi Perpustakaan SMAN 10 Bogor

Proyek ini adalah aplikasi web perpustakaan sekolah berbasis **Next.js** dengan pendekatan **Modular Monolith**. Sistem dibangun untuk mendukung tiga mode akses utama:

- **Administrator / Petugas Perpustakaan**
- **Siswa**
- **Publik / Pengunjung**

Saat ini proyek sudah memiliki fondasi autentikasi, navigasi per peran, layout dashboard, pembacaan data nyata dari database Supabase, serta beberapa action penting seperti pendaftaran siswa, verifikasi akun siswa, update password siswa oleh admin, reset password siswa berbasis bantuan admin, dan absensi.

README ini merangkum:

- status implementasi saat ini
- fitur yang sudah berjalan
- fitur yang masih parsial
- fitur yang belum diimplementasikan
- kebutuhan konfigurasi

## Teknologi

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js App Router + Server Actions
- **Database**: Supabase PostgreSQL
- **Password Hashing**: bcryptjs
- **Bahasa UI**: Indonesia

## Arsitektur

Struktur saat ini masih satu aplikasi, tetapi sudah mulai dipisah ke area domain:

- `modules/access`
  - session
  - login
  - signup siswa
  - verifikasi siswa
  - update password siswa
  - reset password siswa
- `modules/library`
  - data loader buku
  - data loader siswa
  - data loader transaksi
  - data loader absensi
  - komponen tabel dan kartu ringkasan

## Mode Akses

### 1. Administrator

Administrator login menggunakan data pada tabel `admin`.

Identifier yang didukung:

- `username`
- `nama`

Setelah login, admin diarahkan ke area:

- `/admin`
- `/admin/buku`
- `/admin/anggota`
- `/admin/peminjaman`
- `/admin/pengembalian`
- `/admin/absensi`
- `/admin/laporan`

### 2. Siswa

Siswa login menggunakan data pada tabel `siswa`.

Identifier yang didukung:

- `nama`
- `username`
- `email`

Siswa hanya bisa login jika `status_keanggotaan = 'aktif'`.

Jika status masih `menunggu_verifikasi`, login akan ditolak.

Setelah login, siswa diarahkan ke area:

- `/siswa`
- `/siswa/absensi`
- `/siswa/katalog`
- `/siswa/peminjaman`
- `/siswa/riwayat`

### 3. Publik

Publik dapat masuk melalui:

- tombol **Masuk sebagai publik**
- kredensial `public / public`

Area publik:

- `/public`
- `/public/absensi`
- `/public/katalog`

## Fitur Yang Sudah Diimplementasikan

### Autentikasi dan Session

Sudah:

- login admin dari database `admin`
- login siswa dari database `siswa`
- login publik
- session berbasis cookie
- proteksi route sesuai role
- redirect sesuai role setelah login
- logout

File utama:

- [app/actions/auth.ts](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/actions/auth.ts)
- [modules/access/lib/database-auth.ts](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/lib/database-auth.ts)
- [modules/access/lib/session.ts](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/lib/session.ts)

### Registrasi Siswa

Sudah:

- halaman signup siswa
- input data siswa lengkap:
  - nama
  - nisn
  - tahun_masuk
  - nomor_whatsapp
  - email
  - username
  - password
  - kelas
- validasi sederhana
- cek duplikasi `nisn`, `username`, `email`
- password di-hash dengan bcrypt
- status awal akun: `menunggu_verifikasi`

File utama:

- [app/signup/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/signup/page.tsx)
- [modules/access/ui/signup-form.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/ui/signup-form.tsx)
- [modules/access/lib/student-registration.ts](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/lib/student-registration.ts)

### Verifikasi Siswa Oleh Admin

Sudah:

- admin dapat melihat siswa dengan status `menunggu_verifikasi`
- admin dapat menyetujui akun siswa
- status siswa diubah menjadi `aktif`

File utama:

- [app/admin/anggota/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/admin/anggota/page.tsx)
- [modules/access/ui/approve-siswa-form.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/ui/approve-siswa-form.tsx)

### Update Password Siswa Oleh Admin

Sudah:

- admin dapat mengubah password siswa dari halaman anggota
- password baru disimpan dalam bentuk bcrypt hash
- admin dapat mengosongkan password siswa dari panel anggota
- siswa dapat membuat password baru sendiri lewat halaman lupa password jika password lama sudah dikosongkan admin
- siswa yang masih ingat password lama juga dapat mengganti password sendiri dari halaman yang sama

File utama:

- [modules/access/ui/update-siswa-password-form.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/ui/update-siswa-password-form.tsx)
- [app/actions/auth.ts](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/actions/auth.ts)
- [app/lupa-password/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/lupa-password/page.tsx)

### Absensi

Sudah:

- publik dapat mengisi absensi pengunjung
- data masuk ke tabel:
  - `absensi`
  - `absensi_umum`
- siswa dapat mencatat absensi dirinya
- data masuk ke tabel:
  - `absensi`
  - `absensi_siswa`
- admin dapat melihat daftar absensi

File utama:

- [app/actions/attendance.ts](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/actions/attendance.ts)
- [app/public/absensi/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/public/absensi/page.tsx)
- [app/siswa/absensi/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/siswa/absensi/page.tsx)
- [app/admin/absensi/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/admin/absensi/page.tsx)

### Katalog Buku

Sudah:

- admin dapat melihat daftar buku
- siswa dapat melihat katalog buku
- publik dapat melihat katalog buku
- data buku dibaca dari tabel `buku`

File utama:

- [app/admin/buku/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/admin/buku/page.tsx)
- [app/siswa/katalog/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/siswa/katalog/page.tsx)
- [app/public/katalog/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/public/katalog/page.tsx)

### Transaksi dan Riwayat

Sudah:

- admin dapat melihat transaksi peminjaman
- admin dapat melihat transaksi pengembalian
- siswa dapat melihat peminjaman aktif
- siswa dapat melihat riwayat transaksi sendiri

Data dibaca dari tabel `transaksi`.

File utama:

- [app/admin/peminjaman/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/admin/peminjaman/page.tsx)
- [app/admin/pengembalian/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/admin/pengembalian/page.tsx)
- [app/siswa/peminjaman/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/siswa/peminjaman/page.tsx)
- [app/siswa/riwayat/page.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/app/siswa/riwayat/page.tsx)

### Dashboard dan Navigasi

Sudah:

- layout dashboard dengan sidebar kiri
- top bar konsisten untuk admin, siswa, dan publik
- menu sidebar bisa diklik dan menuju route berbeda
- label menu berbahasa Indonesia
- halaman admin, siswa, dan publik sudah dipisah per route utama

File utama:

- [modules/access/ui/dashboard-shell.tsx](C:/Users/candra/Documents/GitHub/Kel2-Project-RPL-2026/perpustakaan/modules/access/ui/dashboard-shell.tsx)

## Fitur Yang Sudah Ada Tapi Masih Parsial

Bagian berikut sudah ada sebagai halaman dan pembacaan data nyata, tetapi belum menjadi CRUD atau proses bisnis lengkap.

### Admin - Buku

Sudah:

- lihat daftar buku

Belum:

- tambah buku
- edit buku
- hapus buku
- kelola genre
- kelola copy buku

### Admin - Anggota

Sudah:

- lihat data siswa
- verifikasi siswa
- update password siswa
- kosongkan password siswa agar bisa set ulang mandiri

Belum:

- tambah anggota manual oleh admin
- edit data siswa
- nonaktifkan akun siswa
- hapus anggota

### Admin - Peminjaman

Sudah:

- lihat daftar transaksi

Belum:

- form pencatatan peminjaman
- pilih copy buku otomatis
- validasi stok saat pinjam dari UI

### Admin - Pengembalian

Sudah:

- lihat transaksi selesai

Belum:

- proses pengembalian dari UI
- input kondisi saat kembali
- hitung keterlambatan dari UI

### Admin - Laporan

Sudah:

- ringkasan angka/statistik laporan

Belum:

- filter periode
- cetak laporan
- unduh laporan
- laporan kehilangan buku

### Siswa

Sudah:

- lihat katalog
- lihat transaksi sendiri
- absensi siswa
- ganti password sendiri lewat halaman lupa password

Belum:

- QR code scan sungguhan
- detail buku per transaksi
- notifikasi jatuh tempo

### Publik

Sudah:

- absensi pengunjung
- lihat katalog

Belum:

- pencarian realtime
- filter kategori
- detail buku

## Fitur Yang Belum Diimplementasikan

Fitur berikut belum ada atau belum dikerjakan sama sekali:

- CRUD penuh buku
- CRUD penuh anggota
- transaksi peminjaman dari admin
- transaksi pengembalian dari admin
- detail transaksi (`detail_transaksi`) dari UI
- laporan kehilangan buku
- export / print laporan
- integrasi QR code scan nyata
- upload gambar sampul buku
- pencarian dan filter katalog yang benar-benar interaktif
- reset password via email
- notifikasi WhatsApp / email
- role management lebih detail
- audit log aktivitas admin

## Pemetaan Use Case Ke Status Implementasi

### UC-01 Mengelola Data Buku

Status:

- **Parsial**

Sudah:

- baca data buku

Belum:

- tambah, edit, hapus buku

### UC-02 Mengelola Data Anggota

Status:

- **Parsial**

Sudah:

- registrasi siswa
- verifikasi siswa
- update password siswa
- reset password siswa dengan bantuan admin

Belum:

- edit penuh data anggota

### UC-03 Mencatat Peminjaman Buku

Status:

- **Belum**

### UC-04 Mencatat Pengembalian Buku

Status:

- **Belum**

### UC-05 Lihat Riwayat Transaksi

Status:

- **Sudah / Parsial**

Sudah:

- admin lihat daftar transaksi
- siswa lihat transaksi sendiri

Belum:

- detail lengkap transaksi per copy buku

### UC-06 Absensi Pengunjung

Status:

- **Sudah**

### UC-07 Cetak atau Unduh Laporan

Status:

- **Belum**

### UC-08 Telusuri Katalog Buku

Status:

- **Sudah / Parsial**

Sudah:

- lihat daftar buku
- tampilkan lokasi rak
- tampilkan stok

Belum:

- pencarian/filter interaktif

## Konfigurasi Environment

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

Catatan:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` dipakai untuk kebutuhan client
- `SUPABASE_SECRET_KEY` dipakai server-side untuk query login, registrasi, verifikasi, update password, dan absensi
- jangan commit `.env.local`

## Permission Database Yang Dibutuhkan

Karena aplikasi memakai query server-side ke Supabase, role server perlu akses ke schema dan tabel.

Minimal:

```sql
grant usage on schema public to service_role;
grant select on table public.admin to service_role;
grant select, insert, update on table public.siswa to service_role;
grant select, insert on table public.absensi to service_role;
grant select, insert on table public.absensi_umum to service_role;
grant select, insert on table public.absensi_siswa to service_role;
grant select on table public.buku to service_role;
grant select on table public.transaksi to service_role;
```

## Menjalankan Proyek

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Type check:

```bash
node .\node_modules\typescript\bin\tsc --noEmit
```

## Struktur Route Saat Ini

### Publik

- `/`
- `/signup`
- `/lupa-password`
- `/public`
- `/public/absensi`
- `/public/katalog`

### Admin

- `/admin`
- `/admin/buku`
- `/admin/anggota`
- `/admin/peminjaman`
- `/admin/pengembalian`
- `/admin/absensi`
- `/admin/laporan`

### Siswa

- `/siswa`
- `/siswa/absensi`
- `/siswa/katalog`
- `/siswa/peminjaman`
- `/siswa/riwayat`

## Catatan Kondisi Proyek Saat Ini

Status umum:

- fondasi autentikasi sudah ada
- layout dashboard sudah ada
- navigasi sidebar sudah berfungsi
- beberapa modul sudah membaca data nyata dari database
- sebagian proses bisnis inti masih belum menjadi CRUD / workflow lengkap

Dengan kata lain:

- proyek **sudah melewati tahap mockup murni**
- beberapa halaman **sudah menampilkan data nyata dari database**
- tetapi sistem **belum selesai sebagai sistem perpustakaan penuh**

## Rekomendasi Langkah Berikutnya

Urutan yang paling masuk akal:

1. selesaikan **CRUD Buku**
2. lanjutkan **peminjaman**
3. lanjutkan **pengembalian**
4. selesaikan **laporan**
5. rapikan **katalog publik dan siswa** dengan search/filter

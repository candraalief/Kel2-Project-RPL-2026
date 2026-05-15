# Sistem Informasi Perpustakaan SMAN 10 Bogor

Aplikasi web perpustakaan sekolah berbasis **Next.js App Router** dan **Supabase PostgreSQL**. Sistem ini memakai data nyata dari database untuk autentikasi, anggota, katalog buku, eksemplar, peminjaman, pengembalian, absensi, profil, dan laporan.

## Teknologi

- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Backend: Next.js App Router dan Server Actions
- Database: Supabase PostgreSQL
- Storage: Supabase Storage untuk cover buku
- Auth/session: session cookie internal
- Password hashing: bcryptjs
- Bahasa UI: Indonesia

## Mode Akses

### Admin

Admin login dari tabel `admin`. Identifier login yang didukung adalah `username`, `email`, atau `nama`.

Route admin:

- `/admin`
- `/admin/buku`
- `/admin/buku/tambah`
- `/admin/anggota`
- `/admin/pengembalian`
- `/admin/absensi`
- `/admin/laporan`
- `/admin/profil`

Catatan:

- Route lama `/admin/peminjaman` diarahkan ke `/admin/buku`.
- Manajemen akun admin khusus superadmin memakai `id_admin = 0`.

### Siswa

Siswa login dari tabel `siswa`. Identifier login yang didukung adalah `nama`, `username`, atau `email`.

Route siswa:

- `/siswa`
- `/siswa/absensi`
- `/siswa/katalog`
- `/siswa/peminjaman`
- `/siswa/riwayat`
- `/siswa/profil`

Catatan:

- Siswa hanya bisa login jika `status_keanggotaan = aktif`.
- Siswa yang masih `menunggu_verifikasi` ditolak sampai disetujui admin.

### Publik

Publik dapat masuk melalui akses publik atau kredensial `public / public`.

Route publik:

- `/public`
- `/public/absensi`
- `/public/katalog`

## Struktur Domain

- `modules/access`: login, session, role guard, registrasi siswa, profil, anggota, reset password, shell dashboard, loading navigasi.
- `modules/library`: katalog, eksemplar, peminjaman, pengembalian, absensi, laporan, PDF, Excel, data loader.
- `modules/shared`: komponen reusable seperti loading tombol.
- `app/actions`: server action untuk auth, attendance, catalog, dan transactions.
- `supabase/sql`: SQL pendukung RPC checkout peminjaman.

## Fitur Terimplementasi

### Autentikasi dan UX Login

- Login admin, siswa, dan publik.
- Proteksi route berdasarkan role.
- Redirect otomatis setelah login sesuai role.
- Logout.
- Session berbasis cookie internal.
- Password memakai bcrypt.
- Input password di login, signup, dan lupa password memiliki tombol lihat/sembunyikan password.
- Signup siswa memiliki input konfirmasi password.
- Navigasi sidebar/navbar menampilkan loading saat tab ditekan sebelum data halaman selesai dimuat.
- Tombol tab/segmented control penting memakai state loading saat ditekan.

File utama:

- `app/actions/auth.ts`
- `modules/access/lib/database-auth.ts`
- `modules/access/lib/session.ts`
- `modules/access/lib/guards.ts`
- `modules/access/ui/login-form.tsx`
- `modules/access/ui/password-input.tsx`
- `modules/access/ui/dashboard-nav.tsx`
- `modules/access/ui/dashboard-shell.tsx`

### Registrasi dan Profil Siswa

- Signup siswa dengan status awal `menunggu_verifikasi`.
- Validasi duplikasi `nisn`, `username`, dan `email`.
- Data signup: nama, NISN, tahun masuk, nomor WhatsApp/telepon, email, username, password, dan kelas.
- Password signup wajib dikonfirmasi.
- Siswa dapat memperbarui profil sendiri.
- Session siswa diperbarui setelah profil disimpan.
- Siswa dapat membuka halaman reset/lupa password sesuai alur aplikasi.

File utama:

- `app/signup/page.tsx`
- `app/lupa-password/page.tsx`
- `modules/access/lib/student-registration.ts`
- `modules/access/ui/signup-form.tsx`
- `modules/access/ui/update-siswa-profile-form.tsx`
- `modules/access/ui/reset-siswa-password-form.tsx`

### Modul Anggota Admin

- Daftar siswa terdaftar dan siswa menunggu verifikasi.
- Tab anggota memakai loading saat ditekan.
- Search, filter, sort, dan reset filter.
- Tambah siswa manual.
- Lihat detail siswa.
- Edit data siswa.
- Approve pendaftaran siswa.
- Reject pendaftaran siswa dan hapus dari database.
- Hapus siswa memakai confirmation card.
- Hapus siswa diblokir jika siswa terkait transaksi.
- Reset password siswa memakai confirmation card.
- Reset password tidak mengubah status siswa.
- Notifikasi sukses/error untuk action penting.
- Nomor telepon dipakai sebagai kolom utama di tabel anggota.

File utama:

- `app/admin/anggota/page.tsx`
- `modules/access/ui/admin-members.tsx`
- `modules/access/ui/approve-siswa-form.tsx`
- `modules/access/ui/reset-siswa-password-form.tsx`
- `modules/access/ui/clear-siswa-password-form.tsx`

### Profil Admin

- Daftar admin.
- Detail admin.
- Tambah admin.
- Edit admin.
- Hapus admin khusus superadmin.
- Hapus admin memakai konfirmasi ketik `hapus admin`.
- Loading dan popup sukses/error pada action admin.

File utama:

- `app/admin/profil/page.tsx`
- `modules/access/lib/admin-profile.ts`
- `modules/access/ui/admin-profile-forms.tsx`

### Katalog Buku

Katalog dipakai oleh admin, siswa, dan publik. Admin memiliki action lengkap, sedangkan siswa/publik memakai mode baca.

- Daftar buku dalam bentuk card.
- Search berdasarkan judul, penulis, penerbit, ISBN, dan genre.
- Filter genre.
- Filter status ketersediaan.
- Filter tahun terbit dari/sampai.
- Reset filter.
- Pagination katalog dengan pilihan 5, 10, atau 25 item.
- Card menampilkan cover, judul, penulis, genre, lokasi rak, dan jumlah tersedia.
- Detail buku via modal.
- Detail buku menampilkan informasi buku, ringkasan eksemplar, dan jadwal jatuh tempo peminjaman aktif.
- Jadwal jatuh tempo menampilkan tanggal, jam, menit, dan jumlah eksemplar yang jatuh tempo.
- Untuk admin, jadwal jatuh tempo dapat memuat nama siswa, kelas, dan ID transaksi.
- Untuk siswa/publik, jadwal jatuh tempo disanitasi dan hanya menampilkan jadwal serta jumlah.
- Cover buku ditampilkan dari `foto_url`; jika cover berasal dari bucket `foto_buku`, sistem membuat signed URL display agar tetap tampil walau bucket private.
- Link cover dari internet tetap dapat dipakai.

File utama:

- `app/admin/buku/page.tsx`
- `app/siswa/katalog/page.tsx`
- `app/public/katalog/page.tsx`
- `modules/library/lib/catalog.ts`
- `modules/library/ui/admin-catalog.tsx`

### Tambah dan Edit Buku

- Tambah buku baru.
- Edit data buku lewat modal.
- Data buku: judul, penulis, penerbit, ISBN, tahun terbit, lokasi rak, deskripsi, genre, dan jumlah copy awal.
- Deskripsi disimpan ke `deskripsi_buku` dan tetap punya fallback `deskripsi`.
- ISBN divalidasi unik jika kolom tersedia.
- Upload cover buku ke Supabase Storage bucket `foto_buku`.
- Cover upload mendukung `image/jpeg`, `image/jpg`, `image/png`, dan `image/webp`.
- Batas upload cover 10 MB.
- Cover hasil upload disimpan ke kolom `buku.foto_url`.
- Form juga mendukung input URL gambar internet ke `foto_url`.
- Menu edit menampilkan cover aktif sebagai background area upload.
- Saat admin memilih file cover baru di edit modal, preview langsung berubah sebelum disimpan.
- Jika cover bucket diganti, dikosongkan, atau buku dihapus, file lama di bucket `foto_buku` ikut dibersihkan setelah database berhasil disimpan.
- Jika upload cover baru berhasil tetapi penyimpanan database gagal, file baru yang telanjur masuk bucket akan dihapus kembali.
- Setelah tambah/edit berhasil, halaman katalog di-refresh.

File utama:

- `app/actions/catalog.ts`
- `modules/library/ui/admin-catalog-forms.tsx`
- `modules/library/ui/admin-catalog.tsx`

### Genre

- Tambah genre.
- Cari genre.
- List genre yang sudah dibuat.
- Edit genre via modal.
- Hapus genre via modal.
- Hapus genre melepas relasi buku-genre.
- Multi-select genre pada form tambah buku.
- Genre diurutkan alfabetis.
- Genre dalam form tambah buku menampilkan beberapa item awal dan sisanya lewat tombol `More`.

File utama:

- `modules/library/ui/admin-catalog-forms.tsx`
- `app/actions/catalog.ts`

### Eksemplar Buku

Konsep status eksemplar:

- `tersedia`
- `dipinjam`
- `rusak`
- `dikeluarkan` atau fallback legacy `hilang`

Fitur:

- Jumlah tersedia dihitung dari tabel copy, bukan input manual.
- Jika tabel copy belum tersedia, data fallback ke `buku.stok_buku`.
- Tambah eksemplar dari katalog.
- Eksemplar baru otomatis berstatus `tersedia`.
- Keluarkan eksemplar via modal.
- Eksemplar yang bisa dikeluarkan adalah eksemplar aktif yang tidak sedang dipinjam.
- Eksemplar `rusak` masih dianggap aktif dan dapat dikeluarkan.
- Eksemplar `dipinjam` tidak bisa dikeluarkan dari katalog.
- Alasan `Tidak Kembali dari Peminjam` diarahkan ke modul pengembalian agar transaksi tetap tercatat.
- Server action tetap menolak pengeluaran eksemplar dengan alasan tidak kembali dari peminjam.

File utama:

- `modules/library/lib/catalog.ts`
- `modules/library/ui/admin-catalog.tsx`
- `app/actions/catalog.ts`

### Peminjaman

- Admin melakukan peminjaman dari katalog memakai keranjang.
- Keranjang menampilkan cover buku jika tersedia.
- Checkout wajib memilih siswa.
- Deadline peminjaman wajib diisi manual.
- `tanggal_jatuh_tempo` memakai `timestamptz`.
- Input deadline mendukung tanggal, jam, dan menit.
- Tidak ada default tanggal jatuh tempo otomatis.
- Validasi deadline tidak boleh sebelum tanggal pinjam.
- RPC checkout disesuaikan untuk menyimpan deadline sampai jam dan menit.
- Siswa melihat peminjaman aktif dan riwayat transaksi.
- Tampilan siswa menampilkan deadline dengan jam dan menit.

File utama:

- `modules/library/ui/borrow-checkout-drawer.tsx`
- `modules/library/ui/siswa-dashboard.tsx`
- `modules/library/ui/siswa-borrowing-history.tsx`
- `app/actions/transactions.ts`
- `supabase/sql/checkout_peminjaman.sql`

### Pengembalian

- Admin melihat daftar peminjaman/pengembalian.
- Proses pengembalian mendukung detail item buku per transaksi.
- Pengembalian mencatat jumlah buku baik, rusak, dan hilang/tidak kembali per item.
- Status eksemplar saat kembali:
  - baik menjadi `tersedia`
  - rusak menjadi `rusak`
  - hilang/tidak kembali menjadi `hilang` atau fallback `dikeluarkan`
- Modul pengembalian menjaga riwayat transaksi siswa tetap tersimpan.
- Perhitungan keterlambatan memakai timestamp jatuh tempo, termasuk jam dan menit.

File utama:

- `app/admin/pengembalian/page.tsx`
- `modules/library/ui/admin-returns.tsx`
- `modules/library/lib/data.ts`
- `app/actions/transactions.ts`

### Absensi

- Publik dapat mengisi absensi pengunjung umum.
- Siswa dapat mengisi absensi dengan akun sendiri.
- Siswa dibatasi hanya bisa absen satu kali per hari.
- Validasi sekali sehari dilakukan di server action dan juga tercermin di UI.
- Admin dapat melihat daftar absensi.
- Data disimpan ke tabel utama `absensi` dan detail ke `absensi_siswa` atau `absensi_umum`.
- Absensi siswa menyimpan kelas saat absen.
- Absensi umum menyimpan instansi asal.

File utama:

- `app/actions/attendance.ts`
- `app/public/absensi/page.tsx`
- `app/siswa/absensi/page.tsx`
- `app/admin/absensi/page.tsx`
- `modules/library/ui/attendance-forms.tsx`
- `modules/library/lib/data.ts`

### Laporan Admin

Halaman laporan memakai filter yang sama untuk semua jenis laporan:

- Jenis laporan: Peminjaman, Koleksi Buku, Absensi.
- Periode: bulanan, tahunan, atau sepanjang waktu.
- Input bulan/tahun mengikuti periode.
- Format: PDF atau Excel.
- Perubahan filter langsung memuat ulang data.
- Tombol `Reset Filter` mengembalikan filter default.
- Tombol unduh menampilkan konfirmasi sebelum download.
- Semua preview tabel memakai pagination untuk optimasi tampilan.
- Tab laporan menampilkan loading saat ditekan.

Laporan Peminjaman:

- Tab `Semua Peminjaman`.
- Tab `Rekap Per Siswa`.
- Data semua peminjaman memuat ID transaksi, nama siswa, kelas, judul buku, tanggal pinjam, jatuh tempo, tanggal kembali, dan status.
- Status mencakup dipinjam, dikembalikan, dan terlambat.
- Rekap per siswa memuat total transaksi, sedang dipinjam, dikembalikan tepat waktu, dan terlambat.

Laporan Koleksi Buku:

- Tab `Inventaris Buku`.
- Tab `Buku Terpopuler`.
- Inventaris menampilkan semua judul, penulis, total eksemplar aktif, dan total eksemplar dikeluarkan.
- Buku terpopuler diranking berdasarkan total dipinjam pada periode yang dipilih.

Laporan Absensi:

- Tab `Absensi Siswa`.
- Tab `Absensi Umum`.
- Absensi siswa memuat nama, kelas saat absen, tujuan kunjungan, dan waktu.
- Absensi umum memuat nama, instansi asal, tujuan kunjungan, dan waktu.

Export:

- Excel dibuat sebagai workbook `.xlsx` dengan beberapa sheet sesuai jenis laporan.
- PDF dibuat server-side sebagai file `.pdf`.

File utama:

- `app/admin/laporan/page.tsx`
- `app/admin/laporan/unduh/route.ts`
- `modules/library/ui/admin-reports.tsx`
- `modules/library/lib/reports.ts`
- `modules/library/lib/xlsx.ts`
- `modules/library/lib/pdf.ts`

## Supabase Storage

Bucket cover buku:

- Nama bucket: `foto_buku`
- File size limit: 10 MB
- MIME type yang direkomendasikan:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`

Catatan:

- Upload dilakukan dari server action memakai kredensial server.
- URL hasil upload disimpan ke `buku.foto_url`.
- Katalog membuat signed URL untuk object dari bucket `foto_buku` agar cover tetap tampil jika bucket tidak public.
- File di bucket `foto_buku` otomatis dibersihkan saat cover diganti/dihapus atau saat buku dihapus.
- Link gambar eksternal tetap boleh digunakan selama berupa URL `http://` atau `https://`.

## Konfigurasi Environment

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

Catatan:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` dipakai untuk client Supabase bila diperlukan.
- `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY` dipakai server-side.
- Jangan commit `.env.local`.

## Permission Database Minimal

Aplikasi memakai Supabase server-side, sehingga service role perlu akses ke tabel yang digunakan.

Contoh grant dasar:

```sql
grant usage on schema public to service_role;

grant select, insert, update, delete on table public.admin to service_role;
grant select, insert, update, delete on table public.siswa to service_role;

grant select, insert, update, delete on table public.absensi to service_role;
grant select, insert, update, delete on table public.absensi_siswa to service_role;
grant select, insert, update, delete on table public.absensi_umum to service_role;

grant select, insert, update, delete on table public.buku to service_role;
grant select, insert, update, delete on table public.genre to service_role;
grant select, insert, update, delete on table public.genres to service_role;

grant select, insert, update, delete on table public.buku_genre to service_role;
grant select, insert, update, delete on table public.genre_buku to service_role;
grant select, insert, update, delete on table public.buku_genres to service_role;
grant select, insert, update, delete on table public.book_genres to service_role;

grant select, insert, update, delete on table public.copy_buku to service_role;
grant select, insert, update, delete on table public.buku_copy to service_role;
grant select, insert, update, delete on table public.buku_copies to service_role;
grant select, insert, update, delete on table public.book_copies to service_role;

grant select, insert, update, delete on table public.transaksi to service_role;
grant select, insert, update, delete on table public.detail_transaksi to service_role;
grant select, insert, update, delete on table public.detail_transaksi_peminjaman to service_role;
```

Sesuaikan grant dengan nama tabel yang benar-benar ada di database.

## Menjalankan Proyek

Masuk ke folder aplikasi:

```bash
cd perpustakaan
```

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Struktur Route

Publik:

- `/`
- `/login/admin`
- `/login/siswa`
- `/signup`
- `/lupa-password`
- `/public`
- `/public/absensi`
- `/public/katalog`

Admin:

- `/admin`
- `/admin/buku`
- `/admin/buku/tambah`
- `/admin/anggota`
- `/admin/pengembalian`
- `/admin/absensi`
- `/admin/laporan`
- `/admin/profil`

Siswa:

- `/siswa`
- `/siswa/absensi`
- `/siswa/katalog`
- `/siswa/peminjaman`
- `/siswa/riwayat`
- `/siswa/profil`

## Catatan Implementasi

- README ini menggambarkan implementasi saat ini.
- Beberapa loader masih defensif dan punya fallback nama tabel/kolom untuk kompatibilitas schema lama.
- Kolom penting yang sudah didukung: `buku.foto_url`, `buku.deskripsi_buku`, dan `transaksi.tanggal_jatuh_tempo` bertipe `timestamptz`.
- Untuk produksi, schema database sebaiknya distandarkan agar fallback dapat dikurangi.

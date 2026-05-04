# Sistem Informasi Perpustakaan SMAN 10 Bogor

Aplikasi web perpustakaan sekolah berbasis **Next.js App Router** dan **Supabase PostgreSQL**. Sistem ini mendukung tiga mode akses:

- **Admin / Petugas Perpustakaan**
- **Siswa**
- **Publik / Pengunjung**

Status proyek saat ini: aplikasi sudah memakai data nyata dari database untuk autentikasi, anggota, katalog buku, genre, eksemplar buku, absensi, profil, dan transaksi. Beberapa workflow inti admin seperti modul anggota dan katalog sudah memiliki aksi CRUD/konfirmasi yang cukup lengkap.

## Teknologi

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js App Router + Server Actions
- **Database**: Supabase PostgreSQL
- **Auth/session**: session cookie internal
- **Password hashing**: bcryptjs
- **Bahasa UI**: Indonesia

## Struktur Domain

- `modules/access`
  - login/logout
  - session dan guard role
  - registrasi siswa
  - profil admin dan siswa
  - manajemen akun admin
  - reset/update password
- `modules/library`
  - loader buku, genre, copy buku, siswa, absensi, transaksi
  - katalog admin
  - form tambah buku/genre
  - pengembalian admin
  - kartu dan tabel UI perpustakaan
- `app/actions`
  - server actions untuk auth, absensi, katalog, transaksi

## Mode Akses

### Admin

Admin login dari tabel `admin`.

Identifier login yang didukung:

- `username`
- `nama`

Route admin:

- `/admin`
- `/admin/buku`
- `/admin/buku/tambah`
- `/admin/anggota`
- `/admin/pengembalian`
- `/admin/absensi`
- `/admin/laporan`
- `/admin/profil`

Catatan route: peminjaman admin berada di `/admin/buku` (Katalog & Peminjaman). Route lama `/admin/peminjaman` diarahkan kembali ke katalog.

Catatan: manajemen akun admin hanya aktif untuk superadmin (`id_admin = 0`).

### Siswa

Siswa login dari tabel `siswa`.

Identifier login yang didukung:

- `nama`
- `username`
- `email`

Siswa hanya bisa login jika `status_keanggotaan = 'aktif'`. Akun `menunggu_verifikasi` ditolak sampai disetujui admin.

Route siswa:

- `/siswa`
- `/siswa/absensi`
- `/siswa/katalog`
- `/siswa/peminjaman`
- `/siswa/riwayat`
- `/siswa/profil`

### Publik

Publik bisa masuk melalui tombol **Masuk sebagai publik** atau kredensial `public / public`.

Route publik:

- `/public`
- `/public/absensi`
- `/public/katalog`

## Fitur Terimplementasi

### Autentikasi dan Session

Sudah berjalan:

- login admin, siswa, dan publik
- proteksi route berdasarkan role
- redirect otomatis sesuai role
- logout
- session berbasis cookie

File utama:

- `app/actions/auth.ts`
- `modules/access/lib/database-auth.ts`
- `modules/access/lib/session.ts`
- `modules/access/lib/guards.ts`

### Registrasi dan Profil Siswa

Sudah berjalan:

- signup siswa
- validasi duplikasi `nisn`, `username`, `email`
- password hash bcrypt
- status awal `menunggu_verifikasi`
- siswa dapat update profil sendiri
- session siswa ikut diperbarui setelah profil disimpan

Data signup:

- nama
- nisn
- tahun masuk
- nomor WhatsApp / telepon
- email
- username
- password
- kelas

File utama:

- `app/signup/page.tsx`
- `modules/access/ui/signup-form.tsx`
- `modules/access/lib/student-registration.ts`
- `modules/access/ui/student-profile-form.tsx`

### Modul Anggota Admin

Sudah berjalan:

- daftar siswa terdaftar dan menunggu verifikasi
- search siswa
- filter/sort kolom
- reset filter
- tambah siswa manual
- lihat detail siswa
- edit siswa
- hapus siswa dengan confirmation card
- fallback nonaktif jika siswa terikat transaksi dan tidak bisa dihapus
- reset password siswa dengan confirmation card
- reset password tidak mengubah status siswa
- notifikasi sukses standar untuk action penting
- accept pendaftaran dengan confirmation card
- reject pendaftaran dengan confirmation card dan langsung hapus dari database
- status dan aksi tabel dibuat center
- nomor telepon digunakan sebagai kolom utama menggantikan email di tabel

File utama:

- `app/admin/anggota/page.tsx`
- `app/actions/auth.ts`
- `modules/access/ui/*siswa*`

### Profil Admin

Sudah berjalan:

- daftar admin
- detail admin
- tambah admin
- edit admin
- hapus admin khusus superadmin
- hapus admin memakai konfirmasi ketik `hapus admin`
- loading dan popup sukses standar

File utama:

- `app/admin/profil/page.tsx`
- `modules/access/ui/admin-profile-forms.tsx`
- `app/actions/auth.ts`

### Absensi

Sudah berjalan:

- publik mengisi absensi pengunjung
- siswa mencatat absensi sendiri
- admin melihat daftar absensi
- data dicoba masuk ke tabel `absensi`, `absensi_umum`, dan `absensi_siswa` sesuai konteks

File utama:

- `app/actions/attendance.ts`
- `app/public/absensi/page.tsx`
- `app/siswa/absensi/page.tsx`
- `app/admin/absensi/page.tsx`

## Katalog Admin

### Daftar Buku

Sudah berjalan:

- daftar buku admin
- pencarian judul, penulis, penerbit, ISBN, genre
- filter genre
- filter status ketersediaan
- filter tahun dari/sampai
- reset filter
- card informasi ringkas
- jumlah tersedia tampil di card buku
- pagination default 5 buku
- pilihan jumlah tampil 5, 10, 25
- pagination angka `1 2 3 ...`
- detail buku via modal
- edit buku via modal
- hapus buku via confirmation card

Aturan hapus buku:

- buku hanya bisa dihapus jika belum pernah dipinjam
- jika pernah dipinjam atau terikat transaksi, hapus diblokir dan pesan ditampilkan di card

File utama:

- `app/admin/buku/page.tsx`
- `modules/library/ui/admin-catalog.tsx`
- `modules/library/lib/catalog.ts`
- `app/actions/catalog.ts`

### Tambah dan Edit Buku

Sudah berjalan:

- tambah buku baru
- upload cover opsional ke bucket `book-covers`
- judul, penulis, penerbit, ISBN, tahun terbit, lokasi rak, deskripsi
- jumlah copy awal
- multi-genre
- validasi ISBN unik
- edit data buku dasar
- setelah edit berhasil, data katalog refresh dan modal ditutup

Catatan ISBN:

- kolom database yang digunakan adalah `isbn` lowercase
- kode baca data tetap punya fallback `ISBN` untuk kompatibilitas data lama

### Lokasi Rak

Lokasi rak dibatasi sebagai pilihan tetap:

- `Rak A1` sampai `Rak A6`
- `Rak B1` sampai `Rak B6`
- berlanjut sampai
- `Rak J1` sampai `Rak J6`

Form tambah buku memakai picker:

- dropdown kode rak `A-J`
- tombol kiri/kanan untuk nomor `1-6`
- hidden input menyimpan nilai final, misalnya `Rak B2`
- preview denah terdiri dari dua placeholder gambar:
  - kiri: persegi panjang untuk denah utama
  - kanan: persegi untuk detail/undak rak

Validasi server menolak `lokasi_rak` di luar daftar tersebut.

File utama:

- `modules/library/lib/shelf-locations.ts`
- `modules/library/ui/admin-catalog-forms.tsx`
- `app/actions/catalog.ts`

### Genre

Sudah berjalan:

- tambah genre
- cari genre berdasarkan nama
- list genre yang sudah dibuat
- edit genre via modal/card
- hapus genre via modal/card
- hapus genre juga melepas relasi buku-genre
- pemilihan genre di tambah buku berupa checklist button
- genre di form tambah buku tampil 3 dulu, sisanya lewat tombol `More`

File utama:

- `modules/library/ui/admin-catalog-forms.tsx`
- `app/actions/catalog.ts`

### Eksemplar Buku

Konsep status eksemplar:

- `tersedia`
- `dipinjam`
- `rusak`
- `dikeluarkan` atau fallback legacy `hilang`

Definisi yang dipakai:

- **Total Eksemplar Aktif**: eksemplar yang masih masuk koleksi, yaitu tersedia + dipinjam + rusak. Tidak termasuk dikeluarkan/hilang.
- **Eksemplar Tersedia**: status `tersedia`, bisa dipinjam.
- **Eksemplar Dipinjam**: status `dipinjam`.
- **Kondisi/Status Rusak**: status `rusak`, masih dianggap aktif.
- **Eksemplar Dikeluarkan**: eksemplar tidak masuk koleksi aktif.

Sudah berjalan:

- tambah eksemplar dari card buku
- eksemplar baru otomatis `tersedia`
- keluarkan eksemplar via modal/card
- yang bisa dikeluarkan adalah eksemplar aktif yang tidak sedang dipinjam
- copy `rusak` bisa dikeluarkan
- copy `dipinjam` tidak bisa dikeluarkan dari katalog
- alasan `Tidak Kembali dari Peminjam` bisa dipilih tetapi tombol submit disabled
- untuk alasan tidak kembali, UI memberi peringatan agar memakai modul pengembalian
- server action juga menolak alasan tidak kembali jika dipanggil langsung

File utama:

- `app/actions/catalog.ts`
- `modules/library/ui/admin-catalog.tsx`
- `modules/library/lib/catalog.ts`

## Peminjaman dan Pengembalian

Sudah berjalan:

- admin melihat data peminjaman
- admin melihat data pengembalian
- siswa melihat peminjaman aktif
- siswa melihat riwayat transaksi
- modul pengembalian mendukung detail transaksi siswa
- proses pengembalian dapat mencatat jumlah buku baik/rusak/hilang per buku transaksi
- status eksemplar saat kembali:
  - baik -> `tersedia`
  - rusak -> `rusak`
  - hilang/tidak kembali -> `hilang` atau fallback `dikeluarkan`

Catatan desain:

- kasus `Tidak Kembali dari Peminjam` harus diproses dari modul pengembalian agar transaksi siswa ikut tercatat
- katalog hanya menangani pengeluaran eksemplar aktif yang tidak sedang dipinjam

File utama:

- `app/admin/pengembalian/page.tsx`
- `app/admin/peminjaman/page.tsx` (redirect ke katalog)
- `app/actions/transactions.ts`
- `modules/library/ui/admin-returns.tsx`
- `modules/library/lib/data.ts`

## Katalog Siswa dan Publik

Sudah berjalan:

- siswa melihat katalog
- publik melihat katalog
- lokasi rak dan stok ditampilkan dari data buku/copy

Masih dapat ditingkatkan:

- search/filter interaktif siswa dan publik
- detail buku publik/siswa
- tampilan denah rak nyata jika aset gambar sudah tersedia

## Laporan

Sudah ada:

- halaman laporan admin
- ringkasan angka/statistik dasar

Belum lengkap:

- filter periode
- cetak/unduh laporan
- laporan kehilangan/kerusakan detail

## Konfigurasi Environment

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

Catatan:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` dipakai untuk client Supabase bila diperlukan
- `SUPABASE_SECRET_KEY` dipakai server-side untuk query database
- bucket Supabase Storage `book-covers` dipakai untuk cover buku
- jangan commit `.env.local`

## Permission Database Minimal

Karena aplikasi memakai Supabase server-side, `service_role` perlu akses ke tabel yang digunakan.

Contoh grant dasar:

```sql
grant usage on schema public to service_role;

grant select, insert, update, delete on table public.admin to service_role;
grant select, insert, update, delete on table public.siswa to service_role;
grant select, insert, update, delete on table public.absensi to service_role;
grant select, insert, update, delete on table public.absensi_umum to service_role;
grant select, insert, update, delete on table public.absensi_siswa to service_role;

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
grant select, insert, update, delete on table public.transaksi_detail to service_role;
grant select, insert, update, delete on table public.detail_peminjaman to service_role;
grant select, insert, update, delete on table public.peminjaman_detail to service_role;
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

### Publik

- `/`
- `/login/admin`
- `/login/siswa`
- `/signup`
- `/lupa-password`
- `/public`
- `/public/absensi`
- `/public/katalog`

### Admin

- `/admin`
- `/admin/buku`
- `/admin/buku/tambah`
- `/admin/anggota`
- `/admin/pengembalian`
- `/admin/absensi`
- `/admin/laporan`
- `/admin/profil`

### Siswa

- `/siswa`
- `/siswa/absensi`
- `/siswa/katalog`
- `/siswa/peminjaman`
- `/siswa/riwayat`
- `/siswa/profil`

## Catatan Implementasi

- README ini menggambarkan implementasi saat ini, bukan rancangan awal.
- Katalog admin sudah melewati mockup dan memakai data Supabase.
- Beberapa tabel dibuat adaptif dengan fallback nama tabel/kolom, misalnya tabel genre/copy.
- Untuk produksi, sebaiknya schema database distandarkan agar fallback bisa dikurangi.

## Rekomendasi Lanjutan

Prioritas berikutnya:

1. finalisasi workflow peminjaman dari admin
2. finalisasi pengembalian dan detail transaksi per eksemplar
3. tambahkan aset gambar denah rak nyata
4. lengkapi laporan periode dan export
5. tambah search/filter katalog untuk siswa dan publik

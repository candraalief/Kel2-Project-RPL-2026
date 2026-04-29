# Admin Katalog Refactor

Dokumen ini merangkum refactor halaman Admin Katalog.

## Route

- Daftar katalog admin: `/admin/buku`
- Tambah katalog: `/admin/buku/tambah`

Sidebar dan shell dashboard tetap memakai implementasi lama dari `DashboardShell`.

## Halaman Daftar Katalog

Halaman `/admin/buku` sekarang fokus untuk daftar, pencarian, filter, dan detail buku.

Fitur utama:

- Card besar `+ Tambah Buku Baru` mengarah ke `/admin/buku/tambah`.
- Search berdasarkan judul, penulis, penerbit, atau kategori/genre.
- Filter genre yang diurutkan alfabetis.
- Filter status ketersediaan: semua, tersedia, tidak tersedia.
- Filter tahun terbit dari dan sampai tahun.
- Reset filter.
- Empty state saat tidak ada buku ditemukan.
- Card buku hanya menampilkan foto, judul, penulis, genre singkat, lokasi rak, jumlah tersedia, tombol Edit, dan tombol Hapus.
- Klik card membuka modal detail.
- Klik Edit atau Hapus tidak membuka modal detail.
- Hapus buku memakai konfirmasi browser sebelum submit.

Modal detail menampilkan:

- Foto buku
- Judul
- Penulis
- Penerbit
- ISBN
- Tahun terbit
- Genre
- Deskripsi
- Lokasi rak
- Denah rak
- Total copy
- Jumlah tersedia
- Jumlah dipinjam / tidak tersedia

## Halaman Tambah Katalog

Halaman `/admin/buku/tambah` berisi dua tab:

- Tambah Buku
- Tambah Genre

Form Tambah Buku:

- Foto buku / upload gambar
- Judul buku
- Penulis
- Penerbit
- ISBN
- Tahun terbit
- Lokasi rak
- Genre multi-select
- Deskripsi buku
- Jumlah copy awal

Form Tambah Genre:

- Nama genre
- Deskripsi genre

Genre di form Tambah Buku:

- Bisa pilih lebih dari satu genre.
- Bisa mencari genre.
- List genre diurutkan alfabetis.
- Genre terpilih diringkas jika terlalu banyak, dengan indikator `+N lainnya`.
- Genre tersembunyi bisa dilihat kembali lewat tombol expand.
- Setelah genre baru berhasil ditambahkan, halaman memakai `router.refresh()` untuk memperbarui daftar genre dan opsi form tanpa hard reload browser.

## Validasi

Validasi yang diterapkan:

- Judul buku wajib.
- Penulis wajib.
- Tahun terbit harus angka tahun valid jika diisi.
- Jumlah copy awal minimal 1.
- Nama genre wajib.
- Nama genre dicegah duplikat berdasarkan daftar genre yang berhasil dibaca aplikasi.
- ISBN dicek unik jika kolom `isbn` tersedia di tabel `buku`. Jika kolom belum tersedia, validasi ini dilewati agar schema lama tidak rusak.

## Perhitungan Copy Buku

Jumlah tersedia tidak menjadi input manual utama.

Perhitungan yang dipakai:

```text
available_count = count(copy buku dengan status = "tersedia")
total_copy = count(seluruh copy buku)
unavailable_count = total_copy - available_count
```

Kode mencoba membaca tabel copy dalam urutan berikut:

- `copy_buku` dengan kolom `id_buku`, `status`
- `buku_copy` dengan kolom `id_buku`, `status`
- `buku_copies` dengan kolom `id_buku`, `status`
- `book_copies` dengan kolom `book_id`, `status`

Jika tabel copy belum tersedia, halaman fallback ke `buku.stok_buku` agar data lama tetap bisa tampil. Fallback ini hanya untuk kompatibilitas schema lama.

Saat tambah buku berhasil, sistem mencoba membuat record copy sejumlah `jumlah copy awal` dengan status default `tersedia` memakai konfigurasi tabel copy di atas.

## Asumsi Schema Database

Schema project saat ini masih parsial dan dokumentasi lama hanya memastikan tabel `buku`. Karena itu implementasi dibuat defensif.

Kolom buku yang didukung jika tersedia:

- `id_buku`
- `judul`
- `penulis`
- `penerbit`
- `isbn`
- `tahun_terbit`
- `lokasi_rak`
- `deskripsi`
- `foto_buku` / `foto_url` / `cover_url` / `gambar`
- `denah_rak` / `denah_url` / `shelf_map_url`
- `stok_buku` sebagai fallback schema lama

Tabel genre yang didukung:

- `genre`
- `genres`

Kolom genre yang didukung:

- `id_genre` / `genre_id` / `id`
- `nama_genre` / `nama` / `name` / `genre`
- `deskripsi_genre` / `deskripsi` / `description`

Tabel relasi buku-genre yang didukung:

- `buku_genre`
- `genre_buku`
- `buku_genres`
- `book_genres`

Upload cover disiapkan ke Supabase Storage bucket `book-covers`. Jika bucket belum ada, buku tetap bisa dibuat tanpa gambar.

## File Utama

- `app/admin/buku/page.tsx`
- `app/admin/buku/tambah/page.tsx`
- `app/actions/catalog.ts`
- `modules/library/lib/catalog.ts`
- `modules/library/ui/admin-catalog.tsx`
- `modules/library/ui/admin-catalog-forms.tsx`
- `modules/access/ui/dashboard-shell.tsx`

## Verifikasi

Checklist akhir yang harus tetap hijau:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

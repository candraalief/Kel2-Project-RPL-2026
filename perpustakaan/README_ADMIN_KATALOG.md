# Admin Katalog

Dokumen ini merangkum implementasi teknis halaman katalog admin.

## Route

- Daftar katalog admin: `/admin/buku`
- Tambah katalog: `/admin/buku/tambah`
- Katalog siswa: `/siswa/katalog`
- Katalog publik: `/public/katalog`

## Halaman Daftar Katalog

Fitur utama:

- Card buku dengan cover, judul, penulis, genre, lokasi rak, dan jumlah tersedia.
- Search judul, penulis, penerbit, ISBN, dan genre.
- Filter genre.
- Filter status ketersediaan.
- Filter tahun terbit.
- Reset filter.
- Pagination 5, 10, atau 25 buku per halaman.
- Detail buku via modal.
- Edit buku via modal.
- Hapus buku via confirmation card.
- Tambah ke keranjang peminjaman dari card.
- Tambah dan keluarkan eksemplar dari modal edit.

Mode siswa dan publik memakai UI katalog yang sama tetapi `readOnly`, sehingga action admin disembunyikan.

## Detail Buku

Modal detail menampilkan:

- Cover buku.
- Judul, penulis, penerbit, ISBN, tahun terbit, genre, deskripsi, dan lokasi rak.
- Ringkasan eksemplar: total aktif, tersedia, dipinjam, dikeluarkan.
- Jadwal jatuh tempo peminjaman aktif untuk buku tersebut.

Jadwal jatuh tempo:

- Admin melihat ID transaksi, nama siswa, kelas, tanggal, jam, menit, dan jumlah.
- Siswa/publik hanya melihat tanggal, jam, menit, dan jumlah.

## Tambah dan Edit Buku

Form buku mendukung:

- Judul buku.
- Penulis.
- Penerbit.
- ISBN.
- Tahun terbit.
- Lokasi rak.
- Deskripsi buku.
- Jumlah copy awal.
- Multi-genre.
- Upload cover.
- URL gambar cover dari internet.

Catatan cover:

- Upload cover memakai Supabase Storage bucket `foto_buku`.
- MIME yang didukung: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
- Batas file: 10 MB.
- URL cover disimpan ke kolom `buku.foto_url`.
- Form edit menampilkan cover yang tersimpan sebagai background area upload.
- Saat memilih file baru di modal edit, preview langsung berubah sebelum disimpan.
- Katalog membuat signed URL display untuk cover dari bucket `foto_buku`.
- Cover lama dari bucket `foto_buku` otomatis dihapus saat diganti, dikosongkan, atau buku berhasil dihapus.
- Jika upload cover baru berhasil tetapi simpan database gagal, file baru yang telanjur terunggah ikut dibersihkan.

Catatan deskripsi:

- Deskripsi disimpan ke `buku.deskripsi_buku`.
- Kode masih membaca fallback `deskripsi`, `description`, dan `sinopsis`.

## Genre

- Tambah genre.
- Cari genre.
- Edit genre.
- Hapus genre.
- Hapus genre melepas relasi buku-genre.
- Multi-select genre pada form buku.

Tabel genre yang didukung:

- `genre`
- `genres`

Relasi genre yang didukung:

- `buku_genre`
- `genre_buku`
- `buku_genres`
- `book_genres`

## Eksemplar Buku

Perhitungan:

```text
total_aktif = tersedia + dipinjam + rusak
tersedia = copy dengan status tersedia
dipinjam = copy dengan status dipinjam
dikeluarkan = copy dengan status dikeluarkan/hilang/legacy removed
```

Tabel copy yang dicoba:

- `copy_buku` dengan kolom `id_buku`, `status`
- `buku_copy` dengan kolom `id_buku`, `status`
- `buku_copies` dengan kolom `id_buku`, `status`
- `book_copies` dengan kolom `book_id`, `status`

Jika tabel copy belum tersedia, katalog fallback ke `buku.stok_buku`.

Aturan:

- Eksemplar baru otomatis `tersedia`.
- Eksemplar aktif yang tidak sedang dipinjam dapat dikeluarkan.
- Eksemplar `dipinjam` tidak bisa dikeluarkan dari katalog.
- Alasan tidak kembali dari peminjam harus diproses lewat modul pengembalian.

## File Utama

- `app/admin/buku/page.tsx`
- `app/admin/buku/tambah/page.tsx`
- `app/actions/catalog.ts`
- `modules/library/lib/catalog.ts`
- `modules/library/ui/admin-catalog.tsx`
- `modules/library/ui/admin-catalog-forms.tsx`
- `modules/library/ui/borrow-checkout-drawer.tsx`

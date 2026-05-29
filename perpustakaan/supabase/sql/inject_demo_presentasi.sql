-- Data demo presentasi Sistem Informasi Perpustakaan SMAN 10 Bogor.
--
-- Jalankan setelah:
--   1. supabase/sql/create_tables.sql
--   2. supabase/sql/checkout_peminjaman.sql
--
-- Akun demo:
--   superadmin / demo12345  (dibuat hanya jika id_admin = 0 belum ada)
--   demo_admin / demo12345
--   demo_siswa / demo12345
--   demo_siswa_dua / demo12345
--   demo_pending / demo12345  (status awal menunggu_verifikasi)
--
-- Catatan:
-- - Script ini aman dijalankan ulang.
-- - Script hanya menghapus ulang data demo dengan ID 9100-9199.
-- - Data asli hasil input/demo manual tidak ikut dihapus.
-- - Kolom genre di database demo saat ini memakai nama_genre/deskripsi_genre,
--   sedangkan schema baru memakai nama/deskripsi. Script ini mendukung keduanya.

begin;

-- Bersihkan data demo lama dari script ini saja.
delete from public.detail_transaksi
where id_transaksi between 9100 and 9199
   or id_copy_buku between 9100 and 9199
   or id_transaksi in (
    select id_transaksi
    from public.transaksi
    where id_siswa between 9100 and 9199
       or id_admin between 9100 and 9199
  );

delete from public.transaksi
where id_transaksi between 9100 and 9199
   or id_siswa between 9100 and 9199
   or id_admin between 9100 and 9199;

delete from public.absensi_siswa
where id_absensi between 9100 and 9199
   or id_siswa between 9100 and 9199;

delete from public.absensi_umum
where id_absensi between 9100 and 9199;

delete from public.absensi
where id_absensi between 9100 and 9199;

delete from public.buku_genre
where id_buku between 9100 and 9199
   or id_genre between 9100 and 9199;

delete from public.copy_buku
where id_copy_buku between 9100 and 9199
   or id_buku between 9100 and 9199;

delete from public.buku
where id_buku between 9100 and 9199
   or isbn in (
    'DEMO-WEB-001',
    'DEMO-ALGO-002',
    'DEMO-FISIKA-003',
    'DEMO-FIKSI-004',
    'DEMO-SPEAK-005'
  );

delete from public.genre
where id_genre between 9100 and 9199;

delete from public.siswa
where id_siswa between 9100 and 9199
   or username in (
    'demo_siswa',
    'demo_siswa_dua',
    'demo_pending',
    'demo_nonaktif'
  );

delete from public.admin
where id_admin between 9100 and 9199
   or username in ('demo_admin');

-- Superadmin untuk manajemen akun admin.
-- Jika superadmin asli sudah ada, data ini tidak akan menimpa.
insert into public.admin (
  id_admin,
  nama,
  username,
  email,
  nomor_telephone,
  password
)
values (
  0,
  'Perpustakaan SMAN 10 Bogor',
  'superadmin',
  'perpustakaan@sman10bogor.sch.id',
  '081234567890',
  '$2b$10$wAFBmrw1Tf710St4r6ze2OSne3ejCXaObOKuVspYSCEjZGkBbZLOC'
)
on conflict (id_admin) do nothing;

-- Admin demo untuk login dan menjalankan alur presentasi.
insert into public.admin (
  id_admin,
  nama,
  username,
  email,
  nomor_telephone,
  password
)
values
  (
    9100,
    'Admin Demo Perpustakaan',
    'demo_admin',
    'demo.admin@sman10bogor.sch.id',
    '081200009100',
    '$2b$10$wAFBmrw1Tf710St4r6ze2OSne3ejCXaObOKuVspYSCEjZGkBbZLOC'
  );

-- Siswa aktif, siswa menunggu verifikasi, dan siswa nonaktif untuk filter anggota.
insert into public.siswa (
  id_siswa,
  nama,
  nis,
  nisn,
  username,
  email,
  password,
  kelas,
  tahun_masuk,
  nomor_whatsapp,
  status_keanggotaan
)
values
  (
    9100,
    'Andi Demo Pratama',
    '2419100',
    'DEMO9100',
    'demo_siswa',
    'demo.siswa@sman10bogor.sch.id',
    '$2b$10$wAFBmrw1Tf710St4r6ze2OSne3ejCXaObOKuVspYSCEjZGkBbZLOC',
    'XI IPA 1',
    2024,
    '081300009100',
    'aktif'
  ),
  (
    9101,
    'Bunga Demo Lestari',
    '2519101',
    'DEMO9101',
    'demo_pending',
    'demo.pending@sman10bogor.sch.id',
    '$2b$10$wAFBmrw1Tf710St4r6ze2OSne3ejCXaObOKuVspYSCEjZGkBbZLOC',
    'X IPS 2',
    2025,
    '081300009101',
    'menunggu_verifikasi'
  ),
  (
    9102,
    'Citra Demo Sari',
    '2319102',
    'DEMO9102',
    'demo_siswa_dua',
    'demo.siswa.dua@sman10bogor.sch.id',
    '$2b$10$wAFBmrw1Tf710St4r6ze2OSne3ejCXaObOKuVspYSCEjZGkBbZLOC',
    'XII MIPA 3',
    2023,
    '081300009102',
    'aktif'
  ),
  (
    9103,
    'Dimas Demo Saputra',
    '2319103',
    'DEMO9103',
    'demo_nonaktif',
    'demo.nonaktif@sman10bogor.sch.id',
    '$2b$10$wAFBmrw1Tf710St4r6ze2OSne3ejCXaObOKuVspYSCEjZGkBbZLOC',
    'XII IPS 1',
    2023,
    '081300009103',
    'nonaktif'
  );

-- Genre demo. Mendukung schema lama dan baru.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'genre'
      and column_name = 'nama_genre'
  ) then
    insert into public.genre (id_genre, nama_genre, deskripsi_genre)
    values
      (9100, 'Demo - Pendidikan', 'Genre demo untuk buku pelajaran dan referensi sekolah.'),
      (9101, 'Demo - Teknologi', 'Genre demo untuk buku teknologi, komputer, dan pemrograman.'),
      (9102, 'Demo - Fiksi', 'Genre demo untuk novel dan bacaan ringan.'),
      (9103, 'Demo - Pengembangan Diri', 'Genre demo untuk buku motivasi dan keterampilan diri.');
  else
    insert into public.genre (id_genre, nama, deskripsi)
    values
      (9100, 'Demo - Pendidikan', 'Genre demo untuk buku pelajaran dan referensi sekolah.'),
      (9101, 'Demo - Teknologi', 'Genre demo untuk buku teknologi, komputer, dan pemrograman.'),
      (9102, 'Demo - Fiksi', 'Genre demo untuk novel dan bacaan ringan.'),
      (9103, 'Demo - Pengembangan Diri', 'Genre demo untuk buku motivasi dan keterampilan diri.');
  end if;
end
$$;

-- Katalog buku demo untuk search, filter, detail, cover, lokasi rak, dan eksemplar.
insert into public.buku (
  id_buku,
  judul,
  penulis,
  penerbit,
  isbn,
  tahun_terbit,
  lokasi_rak,
  deskripsi_buku,
  foto_url,
  stok_buku
)
values
  (
    9100,
    'Dasar-Dasar Pemrograman Web',
    'Tim Informatika Sekolah',
    'Pustaka Digital Nusantara',
    'DEMO-WEB-001',
    2024,
    'Rak Demo A1',
    'Buku pengantar HTML, CSS, JavaScript, dan konsep dasar aplikasi web untuk pelajar.',
    'https://placehold.co/400x600/1d4ed8/ffffff.png?text=Pemrograman+Web',
    3
  ),
  (
    9101,
    'Algoritma dan Struktur Data',
    'Dr. Raka Prasetya',
    'Pustaka Digital Nusantara',
    'DEMO-ALGO-002',
    2023,
    'Rak Demo A2',
    'Buku referensi untuk memahami algoritma, array, stack, queue, tree, dan graph.',
    'https://placehold.co/400x600/0f766e/ffffff.png?text=Algoritma',
    3
  ),
  (
    9102,
    'Fisika SMA Kelas XII',
    'Lia Rahmawati',
    'Penerbit Sekolah Merdeka',
    'DEMO-FISIKA-003',
    2024,
    'Rak Demo B1',
    'Buku pelajaran fisika untuk materi listrik, magnet, gelombang, dan fisika modern.',
    'https://placehold.co/400x600/be123c/ffffff.png?text=Fisika+XII',
    2
  ),
  (
    9103,
    'Novel Persahabatan di Perpustakaan',
    'Nadia Kirana',
    'Sahabat Literasi',
    'DEMO-FIKSI-004',
    2022,
    'Rak Demo C1',
    'Novel ringan tentang persahabatan siswa yang tumbuh dari kegiatan literasi sekolah.',
    'https://placehold.co/400x600/7c3aed/ffffff.png?text=Novel+Demo',
    2
  ),
  (
    9104,
    'Public Speaking untuk Pelajar',
    'Maya Lestari',
    'Sahabat Literasi',
    'DEMO-SPEAK-005',
    2025,
    'Rak Demo D1',
    'Panduan praktis membangun percaya diri, menyusun materi, dan berbicara di depan kelas.',
    'https://placehold.co/400x600/ea580c/ffffff.png?text=Public+Speaking',
    2
  );

insert into public.buku_genre (id_buku, id_genre)
values
  (9100, 9101),
  (9100, 9100),
  (9101, 9101),
  (9102, 9100),
  (9103, 9102),
  (9104, 9103);

-- Eksemplar buku dengan variasi status untuk detail katalog dan transaksi.
insert into public.copy_buku (
  id_copy_buku,
  id_buku,
  status,
  updated_at
)
values
  (9100, 9100, 'tersedia', now()),
  (9101, 9100, 'dipinjam', now()),
  (9102, 9100, 'rusak', now()),
  (9103, 9101, 'tersedia', now()),
  (9104, 9101, 'tersedia', now()),
  (9105, 9101, 'tersedia', now()),
  (9106, 9102, 'tersedia', now()),
  (9107, 9102, 'dikeluarkan', now()),
  (9108, 9103, 'tersedia', now()),
  (9109, 9103, 'dipinjam', now()),
  (9110, 9104, 'tersedia', now()),
  (9111, 9104, 'tersedia', now());

-- Transaksi aktif untuk dashboard siswa dan riwayat peminjaman.
insert into public.transaksi (
  id_transaksi,
  id_siswa,
  id_admin,
  tanggal_pinjam,
  tanggal_jatuh_tempo,
  tanggal_kembali,
  status,
  catatan
)
values
  (
    9100,
    9100,
    9100,
    now() - interval '1 day',
    now() + interval '6 days',
    null,
    'dipinjam',
    'Data demo: peminjaman aktif untuk ditampilkan pada dashboard siswa.'
  ),
  (
    9101,
    9100,
    9100,
    now() - interval '14 days',
    now() - interval '7 days',
    now() - interval '6 days',
    'kembali',
    'Data demo: transaksi sudah dikembalikan untuk laporan dan riwayat.'
  ),
  (
    9102,
    9102,
    9100,
    now() - interval '10 days',
    now() - interval '1 day',
    null,
    'dipinjam',
    'Data demo: peminjaman terlambat untuk uji pengembalian.'
  );

insert into public.detail_transaksi (
  id_transaksi,
  id_copy_buku,
  kondisi_saat_pinjam,
  kondisi_saat_kembali,
  id_buku
)
values
  (9100, 9101, 'baik', null, 9100),
  (9101, 9105, 'baik', 'baik', 9101),
  (9102, 9109, 'baik', null, 9103);

-- Absensi demo untuk laporan.
-- Demo login siswa sebaiknya memakai demo_siswa agar masih bisa mencoba absen manual.
insert into public.absensi (
  id_absensi,
  nama,
  tujuan,
  jenis_pengunjung,
  waktu_kunjungan
)
values
  (
    9100,
    'Citra Demo Sari',
    'Membaca buku referensi',
    'siswa',
    now() - interval '2 days'
  ),
  (
    9101,
    'Pak Arief Demo',
    'Kunjungan perpustakaan',
    'umum',
    now() - interval '1 day'
  ),
  (
    9102,
    'Bu Ratna Demo',
    'Pendampingan literasi',
    'umum',
    now() - interval '3 days'
  );

insert into public.absensi_siswa (
  id_absensi,
  id_siswa,
  kelas_saat_absen
)
values
  (9100, 9102, 'XII MIPA 3');

insert into public.absensi_umum (
  id_absensi,
  instansi_asal
)
values
  (9101, 'Komite Sekolah'),
  (9102, 'Dinas Pendidikan Kota Bogor');

-- Sinkronkan sequence setelah insert ID manual.
create or replace function public.__sync_demo_sequence(
  p_table_name text,
  p_column_name text
)
returns void
language plpgsql
as $$
declare
  v_sequence_name text;
begin
  v_sequence_name := pg_get_serial_sequence('public.' || p_table_name, p_column_name);

  if v_sequence_name is not null then
    execute format(
      'select setval(%L, (select greatest(coalesce(max(%I), 0), 1) from public.%I), true)',
      v_sequence_name,
      p_column_name,
      p_table_name
    );
  end if;
exception
  when others then
    null;
end;
$$;

select public.__sync_demo_sequence('admin', 'id_admin');
select public.__sync_demo_sequence('siswa', 'id_siswa');
select public.__sync_demo_sequence('genre', 'id_genre');
select public.__sync_demo_sequence('buku', 'id_buku');
select public.__sync_demo_sequence('copy_buku', 'id_copy_buku');
select public.__sync_demo_sequence('transaksi', 'id_transaksi');
select public.__sync_demo_sequence('absensi', 'id_absensi');

drop function if exists public.__sync_demo_sequence(text, text);

commit;

-- Ringkasan data demo yang seharusnya tersedia setelah script dijalankan:
-- - 1 admin demo untuk login admin.
-- - 2 siswa aktif untuk peminjaman, absensi, dan laporan.
-- - 1 siswa menunggu_verifikasi untuk demo approve anggota.
-- - 1 siswa nonaktif untuk filter status anggota.
-- - 5 buku demo dengan genre, cover, lokasi rak, dan eksemplar.
-- - 1 transaksi aktif untuk dashboard siswa.
-- - 1 transaksi aktif terlambat untuk demo pengembalian.
-- - 1 transaksi selesai untuk riwayat dan laporan.
-- - 3 data absensi untuk laporan absensi.

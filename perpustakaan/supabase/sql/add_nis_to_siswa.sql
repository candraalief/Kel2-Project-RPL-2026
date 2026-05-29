-- Tambahkan kolom NIS untuk database Supabase yang sudah berjalan.
-- Jalankan script ini di Supabase SQL Editor jika tabel public.siswa sudah ada.

alter table public.siswa
  add column if not exists nis text;

create unique index if not exists siswa_nis_key
  on public.siswa (nis)
  where nis is not null and nis <> '';

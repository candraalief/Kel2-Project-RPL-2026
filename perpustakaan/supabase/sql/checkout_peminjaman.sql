-- Atomic checkout peminjaman.
-- Jalankan file ini di Supabase SQL Editor setelah perubahan schema.
--
-- Prinsip:
-- - 1 transaksi dapat berisi banyak judul dan banyak copy.
-- - Copy yang boleh dipinjam hanya status `tersedia` atau `rusak`.
-- - Copy status `dipinjam` atau `dikeluarkan` dilewati.
-- - Semua proses all-or-nothing. Jika satu buku kurang copy, transaksi,
--   detail_transaksi, dan update copy_buku semuanya rollback otomatis.

create or replace function public.checkout_peminjaman(
  p_id_siswa integer,
  p_id_admin integer,
  p_tanggal_pinjam timestamptz,
  p_tanggal_jatuh_tempo date,
  p_catatan text,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id integer;
  v_request record;
  v_selected_count integer;
begin
  if p_id_siswa is null or p_id_siswa <= 0 then
    raise exception 'Siswa tidak valid.';
  end if;

  if p_id_admin is null or p_id_admin <= 0 then
    raise exception 'Admin tidak valid.';
  end if;

  if p_tanggal_pinjam is null or p_tanggal_jatuh_tempo is null then
    raise exception 'Tanggal peminjaman wajib diisi.';
  end if;

  if p_tanggal_jatuh_tempo < (p_tanggal_pinjam at time zone 'Asia/Jakarta')::date then
    raise exception 'Tenggat kembali tidak boleh lebih awal dari tanggal pinjam.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang peminjaman masih kosong.';
  end if;

  if not exists (
    select 1
    from public.siswa
    where id_siswa = p_id_siswa
      and status_keanggotaan = 'aktif'
  ) then
    raise exception 'Peminjaman hanya bisa dibuat untuk siswa aktif.';
  end if;

  if not exists (
    select 1
    from public.admin
    where id_admin = p_id_admin
  ) then
    raise exception 'Admin tidak ditemukan.';
  end if;

  create temporary table if not exists checkout_requested_books (
    id_buku integer primary key,
    quantity integer not null
  ) on commit drop;

  create temporary table if not exists checkout_selected_copies (
    id_buku integer not null,
    id_copy_buku integer primary key,
    kondisi_saat_pinjam text not null
  ) on commit drop;

  truncate table checkout_requested_books;
  truncate table checkout_selected_copies;

  insert into checkout_requested_books (id_buku, quantity)
  select
    coalesce((item.value ->> 'bookId')::integer, (item.value ->> 'id_buku')::integer) as id_buku,
    sum((item.value ->> 'quantity')::integer)::integer as quantity
  from jsonb_array_elements(p_items) as item(value)
  group by coalesce((item.value ->> 'bookId')::integer, (item.value ->> 'id_buku')::integer);

  if exists (
    select 1
    from checkout_requested_books
    where id_buku is null
       or id_buku <= 0
       or quantity is null
       or quantity <= 0
  ) then
    raise exception 'Isi keranjang peminjaman tidak valid.';
  end if;

  for v_request in
    select id_buku, quantity
    from checkout_requested_books
    order by id_buku
  loop
    if not exists (
      select 1
      from public.buku
      where id_buku = v_request.id_buku
    ) then
      raise exception 'Buku dengan ID % tidak ditemukan.', v_request.id_buku;
    end if;

    insert into checkout_selected_copies (
      id_buku,
      id_copy_buku,
      kondisi_saat_pinjam
    )
    select
      v_request.id_buku,
      selected.id_copy_buku,
      selected.kondisi_saat_pinjam
    from (
      select
        cb.id_copy_buku,
        case
          when cb.status = 'rusak'::public.status_buku then 'rusak'
          else 'baik'
        end as kondisi_saat_pinjam
      from public.copy_buku cb
      where cb.id_buku = v_request.id_buku
        and cb.status in ('tersedia'::public.status_buku, 'rusak'::public.status_buku)
      order by
        case
          when cb.status = 'tersedia'::public.status_buku then 0
          else 1
        end,
        cb.id_copy_buku
      limit v_request.quantity
      for update skip locked
    ) selected;

    get diagnostics v_selected_count = row_count;

    if v_selected_count < v_request.quantity then
      raise exception 'Buku ID % hanya memiliki % copy yang bisa dipinjam dari % yang diminta.',
        v_request.id_buku,
        v_selected_count,
        v_request.quantity;
    end if;
  end loop;

  insert into public.transaksi (
    id_siswa,
    id_admin,
    tanggal_pinjam,
    tanggal_jatuh_tempo,
    tanggal_kembali,
    status,
    catatan
  )
  values (
    p_id_siswa,
    p_id_admin,
    p_tanggal_pinjam,
    p_tanggal_jatuh_tempo,
    null,
    'dipinjam'::public.status_transaksi,
    nullif(trim(coalesce(p_catatan, '')), '')
  )
  returning id_transaksi into v_transaction_id;

  insert into public.detail_transaksi (
    id_transaksi,
    id_copy_buku,
    kondisi_saat_pinjam,
    kondisi_saat_kembali,
    id_buku
  )
  select
    v_transaction_id,
    selected.id_copy_buku,
    selected.kondisi_saat_pinjam,
    null,
    selected.id_buku
  from checkout_selected_copies selected;

  update public.copy_buku cb
  set
    status = 'dipinjam'::public.status_buku,
    updated_at = now()
  where cb.id_copy_buku in (
    select selected.id_copy_buku
    from checkout_selected_copies selected
  );

  return v_transaction_id;
end;
$$;

grant execute on function public.checkout_peminjaman(
  integer,
  integer,
  timestamptz,
  date,
  text,
  jsonb
) to service_role;

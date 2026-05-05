-- Normalize legacy copy statuses so "rusak" is no longer a structured status.
--
-- This script is defensive: it attempts common table names used in this repo and
-- skips gracefully if a table/column doesn't exist.

DO $$
BEGIN
  -- copy_buku
  BEGIN
    EXECUTE $$
      UPDATE public.copy_buku
      SET status = 'tersedia'
      WHERE lower(status::text) IN ('rusak', 'damaged')
    $$;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'skip: table public.copy_buku not found';
    WHEN undefined_column THEN
      RAISE NOTICE 'skip: column status not found on public.copy_buku';
  END;

  -- buku_copy
  BEGIN
    EXECUTE $$
      UPDATE public.buku_copy
      SET status = 'tersedia'
      WHERE lower(status::text) IN ('rusak', 'damaged')
    $$;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'skip: table public.buku_copy not found';
    WHEN undefined_column THEN
      RAISE NOTICE 'skip: column status not found on public.buku_copy';
  END;

  -- buku_copies
  BEGIN
    EXECUTE $$
      UPDATE public.buku_copies
      SET status = 'tersedia'
      WHERE lower(status::text) IN ('rusak', 'damaged')
    $$;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'skip: table public.buku_copies not found';
    WHEN undefined_column THEN
      RAISE NOTICE 'skip: column status not found on public.buku_copies';
  END;

  -- book_copies
  BEGIN
    EXECUTE $$
      UPDATE public.book_copies
      SET status = 'tersedia'
      WHERE lower(status::text) IN ('rusak', 'damaged')
    $$;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'skip: table public.book_copies not found';
    WHEN undefined_column THEN
      RAISE NOTICE 'skip: column status not found on public.book_copies';
  END;
END $$;

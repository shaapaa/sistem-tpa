-- Memperbaiki ambiguity pada create_hafalan_cicilan.
--
-- RETURNS TABLE pada function ini membuat nama output seperti
-- santri_id dan surat_id menjadi variabel PL/pgSQL.
-- Karena itu, ON CONFLICT (santri_id, surat_id) dapat dianggap
-- ambigu antara variabel function dan kolom tabel.
--
-- Gunakan nama unique constraint secara eksplisit.

create or replace function public.create_hafalan_cicilan(
  p_santri_id uuid,
  p_surat_id uuid,
  p_ayat_selesai integer,
  p_status text,
  p_catatan text default null
)
returns table (
  cicilan_id uuid,
  hafalan_santri_id uuid,
  santri_id uuid,
  surat_id uuid,
  ayat_mulai integer,
  ayat_selesai integer,
  status text,
  tanggal date,
  created_at timestamptz,
  nama_surat text,
  jumlah_ayat integer
)
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_pengajar_id uuid;
  v_hafalan_santri_id uuid;
  v_jumlah_ayat integer;
  v_nama_surat text;
  v_ayat_mulai integer;
  v_last_ayat_selesai integer;
  v_max_ayat_selesai integer;
  v_cicilan public.hafalan_surat_cicilan%rowtype;

begin

  -- ==========================================================
  -- VALIDASI LOGIN
  -- ==========================================================

  if auth.uid() is null then
    raise exception
      'Anda harus login untuk mencatat hafalan'
      using errcode = '28000';
  end if;


  -- ==========================================================
  -- VALIDASI ROLE
  -- ==========================================================

  if public.user_role() <> 'PENGAJAR' then
    raise exception
      'Hanya pengajar yang dapat mencatat hafalan'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- VALIDASI PROFIL PENGAJAR
  -- ==========================================================

  v_pengajar_id := public.pengajar_id();

  if v_pengajar_id is null then
    raise exception
      'Profil pengajar tidak ditemukan atau tidak aktif'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- VALIDASI SANTRI
  -- ==========================================================

  if p_santri_id is null
     or not (
       p_santri_id = any(public.pengajar_santri_ids())
     )
  then
    raise exception
      'Santri tidak berada dalam cakupan kelompok Anda'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- AMBIL DATA SURAT
  -- ==========================================================

  select
    s.nama,
    s.jumlah_ayat
  into
    v_nama_surat,
    v_jumlah_ayat
  from public.surat as s
  where s.id = p_surat_id
    and s.aktif is true;


  if not found then
    raise exception
      'Surat tidak ditemukan atau tidak aktif'
      using errcode = '23503';
  end if;


  -- ==========================================================
  -- VALIDASI AYAT
  -- ==========================================================

  if p_ayat_selesai is null
     or p_ayat_selesai < 1
  then
    raise exception
      'Ayat selesai harus bernilai minimal 1'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- VALIDASI STATUS
  -- ==========================================================

  if p_status is null
     or p_status not in (
       'LANCAR',
       'KURANG_LANCAR',
       'TIDAK_LANCAR'
     )
  then
    raise exception
      'Status hafalan tidak valid'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- LOCK PASANGAN SANTRI + SURAT
  -- ==========================================================

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_santri_id::text || ':' || p_surat_id::text,
      0
    )
  );


  -- ==========================================================
  -- CARI RECORD INDUK
  -- ==========================================================

  select hs.id
  into v_hafalan_santri_id
  from public.hafalan_santri as hs
  where hs.santri_id = p_santri_id
    and hs.surat_id = p_surat_id
  for update;


  -- ==========================================================
  -- BUAT RECORD INDUK JIKA BELUM ADA
  -- ==========================================================

  if v_hafalan_santri_id is null then

    insert into public.hafalan_santri (
      santri_id,
      surat_id
    )
    values (
      p_santri_id,
      p_surat_id
    )
    on conflict on constraint hafalan_santri_santri_id_surat_id_key
    do nothing
    returning id
    into v_hafalan_santri_id;


    -- Jika record sudah ada, ambil kembali ID-nya.
    if v_hafalan_santri_id is null then

      select hs.id
      into v_hafalan_santri_id
      from public.hafalan_santri as hs
      where hs.santri_id = p_santri_id
        and hs.surat_id = p_surat_id
      for update;

    end if;

  end if;


  -- ==========================================================
  -- CARI CICILAN TERAKHIR
  -- ==========================================================

  select c.ayat_selesai
  into v_last_ayat_selesai
  from public.hafalan_surat_cicilan as c
  where c.hafalan_santri_id = v_hafalan_santri_id
  order by
    c.tanggal desc,
    c.created_at desc,
    c.id desc
  limit 1;


  -- ==========================================================
  -- CARI AYAT SELESAI TERBESAR
  -- ==========================================================

  select max(c.ayat_selesai)
  into v_max_ayat_selesai
  from public.hafalan_surat_cicilan as c
  where c.hafalan_santri_id = v_hafalan_santri_id;


  -- ==========================================================
  -- TENTUKAN AYAT MULAI
  -- ==========================================================

  v_ayat_mulai :=
    coalesce(v_last_ayat_selesai, 0) + 1;


  -- ==========================================================
  -- VALIDASI SURAT SUDAH SELESAI
  -- ==========================================================

  if v_ayat_mulai > v_jumlah_ayat then
    raise exception
      'Hafalan surat % sudah selesai',
      v_nama_surat
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- VALIDASI RIWAYAT
  -- ==========================================================

  if v_max_ayat_selesai is not null
     and v_ayat_mulai <= v_max_ayat_selesai
  then
    raise exception
      'Riwayat cicilan surat % tidak konsisten dan perlu ditinjau',
      v_nama_surat
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- VALIDASI AYAT SELESAI
  -- ==========================================================

  if p_ayat_selesai < v_ayat_mulai then
    raise exception
      'Ayat selesai tidak boleh kurang dari ayat mulai %',
      v_ayat_mulai
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- VALIDASI JUMLAH AYAT
  -- ==========================================================

  if p_ayat_selesai > v_jumlah_ayat then
    raise exception
      'Ayat selesai melebihi jumlah ayat surat % (%)',
      v_nama_surat,
      v_jumlah_ayat
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- VALIDASI RENTANG TIDAK BERTUMPAH TINDIH
  -- ==========================================================

  if exists (
    select 1
    from public.hafalan_surat_cicilan as c
    where c.hafalan_santri_id = v_hafalan_santri_id
      and c.ayat_mulai <= p_ayat_selesai
      and c.ayat_selesai >= v_ayat_mulai
  )
  then
    raise exception
      'Rentang ayat cicilan bertumpang tindih dengan riwayat yang sudah ada'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- INSERT CICILAN
  -- ==========================================================

  insert into public.hafalan_surat_cicilan (
    hafalan_santri_id,
    pengajar_id,
    ayat_mulai,
    ayat_selesai,
    status,
    jenis,
    catatan
  )
  values (
    v_hafalan_santri_id,
    v_pengajar_id,
    v_ayat_mulai,
    p_ayat_selesai,
    p_status,
    'setoran_baru',
    nullif(
      trim(p_catatan),
      ''
    )
  )
  returning *
  into v_cicilan;


  -- ==========================================================
  -- RETURN DATA
  -- ==========================================================

  return query
  select
    v_cicilan.id,
    v_hafalan_santri_id,
    p_santri_id,
    p_surat_id,
    v_cicilan.ayat_mulai,
    v_cicilan.ayat_selesai,
    v_cicilan.status,
    v_cicilan.tanggal,
    v_cicilan.created_at,
    v_nama_surat,
    v_jumlah_ayat;

end;

$function$;


-- ============================================================
-- PERMISSION RPC
-- ============================================================

revoke all
on function public.create_hafalan_cicilan(
  uuid,
  uuid,
  integer,
  text,
  text
)
from public;


grant execute
on function public.create_hafalan_cicilan(
  uuid,
  uuid,
  integer,
  text,
  text
)
to authenticated;
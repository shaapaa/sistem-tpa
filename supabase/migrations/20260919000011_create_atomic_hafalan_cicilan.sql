-- Membuat pencatatan cicilan hafalan surah atomik dan append-only.
-- Progres ayat ditentukan di database, bukan oleh state frontend.

drop policy if exists "Pengajar insert cicilan" on public.hafalan_surat_cicilan;
drop policy if exists "Pengajar update cicilan" on public.hafalan_surat_cicilan;

-- Berlaku untuk data baru tanpa memaksa perubahan pada data historis.
do $do$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hafalan_surat_cicilan_ayat_mulai_minimum'
      and conrelid = 'public.hafalan_surat_cicilan'::regclass
  ) then
    alter table public.hafalan_surat_cicilan
      add constraint hafalan_surat_cicilan_ayat_mulai_minimum
      check (ayat_mulai >= 1) not valid;
  end if;
end;
$do$;

-- Record induk hanya dibuat oleh RPC di bawah ini. Pengajar tetap dapat membaca
-- progres santri dalam cakupannya, tetapi tidak dapat mengubah/menghapus riwayat.
drop policy if exists "Pengajar hafalan_santri" on public.hafalan_santri;
drop policy if exists "Pengajar read hafalan_santri" on public.hafalan_santri;
create policy "Pengajar read hafalan_santri" on public.hafalan_santri
  for select
  using (
    public.user_role() = 'PENGAJAR'
    and santri_id = any(public.pengajar_santri_ids())
  );

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
  if auth.uid() is null then
    raise exception 'Anda harus login untuk mencatat hafalan' using errcode = '28000';
  end if;

  if public.user_role() <> 'PENGAJAR' then
    raise exception 'Hanya pengajar yang dapat mencatat hafalan' using errcode = '42501';
  end if;

  v_pengajar_id := public.pengajar_id();
  if v_pengajar_id is null then
    raise exception 'Profil pengajar tidak ditemukan atau tidak aktif' using errcode = '42501';
  end if;

  if p_santri_id is null or not (p_santri_id = any(public.pengajar_santri_ids())) then
    raise exception 'Santri tidak berada dalam cakupan kelompok Anda' using errcode = '42501';
  end if;

  select s.nama, s.jumlah_ayat
    into v_nama_surat, v_jumlah_ayat
  from public.surat s
  where s.id = p_surat_id
    and s.aktif is true;

  if not found then
    raise exception 'Surat tidak ditemukan atau tidak aktif' using errcode = '23503';
  end if;

  if p_ayat_selesai is null or p_ayat_selesai < 1 then
    raise exception 'Ayat selesai harus bernilai minimal 1' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('LANCAR', 'KURANG_LANCAR', 'TIDAK_LANCAR') then
    raise exception 'Status hafalan tidak valid' using errcode = '22023';
  end if;

  -- Mengunci pasangan santri/surat sebelum mencari atau membuat record induk.
  -- Ini juga menangani kasus ketika record induknya belum ada.
  perform pg_advisory_xact_lock(hashtextextended(p_santri_id::text || ':' || p_surat_id::text, 0));

  select hs.id
    into v_hafalan_santri_id
  from public.hafalan_santri hs
  where hs.santri_id = p_santri_id
    and hs.surat_id = p_surat_id
  for update;

  if v_hafalan_santri_id is null then
    insert into public.hafalan_santri (santri_id, surat_id)
    values (p_santri_id, p_surat_id)
    on conflict (santri_id, surat_id) do nothing
    returning id into v_hafalan_santri_id;

    if v_hafalan_santri_id is null then
      select hs.id
        into v_hafalan_santri_id
      from public.hafalan_santri hs
      where hs.santri_id = p_santri_id
        and hs.surat_id = p_surat_id
      for update;
    end if;
  end if;

  select c.ayat_selesai
    into v_last_ayat_selesai
  from public.hafalan_surat_cicilan c
  where c.hafalan_santri_id = v_hafalan_santri_id
  order by c.tanggal desc, c.created_at desc, c.id desc
  limit 1;

  select max(c.ayat_selesai)
    into v_max_ayat_selesai
  from public.hafalan_surat_cicilan c
  where c.hafalan_santri_id = v_hafalan_santri_id;

  v_ayat_mulai := coalesce(v_last_ayat_selesai, 0) + 1;

  if v_ayat_mulai > v_jumlah_ayat then
    raise exception 'Hafalan surat % sudah selesai', v_nama_surat using errcode = '22023';
  end if;

  -- Riwayat lama yang tidak konsisten tidak diubah otomatis. Input baru ditolak
  -- agar progres tidak mundur atau menimpa rentang ayat yang telah tercatat.
  if v_max_ayat_selesai is not null and v_ayat_mulai <= v_max_ayat_selesai then
    raise exception 'Riwayat cicilan surat % tidak konsisten dan perlu ditinjau', v_nama_surat using errcode = '22023';
  end if;

  if p_ayat_selesai < v_ayat_mulai then
    raise exception 'Ayat selesai tidak boleh kurang dari ayat mulai %', v_ayat_mulai using errcode = '22023';
  end if;

  if p_ayat_selesai > v_jumlah_ayat then
    raise exception 'Ayat selesai melebihi jumlah ayat surat % (%)', v_nama_surat, v_jumlah_ayat using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.hafalan_surat_cicilan c
    where c.hafalan_santri_id = v_hafalan_santri_id
      and c.ayat_mulai <= p_ayat_selesai
      and c.ayat_selesai >= v_ayat_mulai
  ) then
    raise exception 'Rentang ayat cicilan bertumpang tindih dengan riwayat yang sudah ada' using errcode = '22023';
  end if;

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
    nullif(trim(p_catatan), '')
  )
  returning * into v_cicilan;

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

revoke all on function public.create_hafalan_cicilan(uuid, uuid, integer, text, text) from public;
grant execute on function public.create_hafalan_cicilan(uuid, uuid, integer, text, text) to authenticated;

-- Koreksi setoran hafalan dilakukan melalui RPC agar urutan ayat tidak rusak.
-- Pengajar dapat selalu membetulkan status dan catatan miliknya. Perubahan
-- surah atau ayat hanya dapat dilakukan jika setoran tersebut satu-satunya
-- riwayat pada hafalan surah santri.

create or replace function public.update_hafalan_surat_cicilan(
  p_cicilan_id uuid,
  p_surat_id uuid,
  p_ayat_selesai integer,
  p_status text,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pengajar_id uuid;
  v_cicilan public.hafalan_surat_cicilan%rowtype;
  v_santri_id uuid;
  v_surat_id_lama uuid;
  v_jumlah_ayat integer;
  v_nama_surat text;
  v_jumlah_riwayat integer;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login untuk mengoreksi hafalan' using errcode = '28000';
  end if;

  if public.user_role() is distinct from 'PENGAJAR' then
    raise exception 'Hanya pengajar yang dapat mengoreksi hafalan' using errcode = '42501';
  end if;

  v_pengajar_id := public.pengajar_id();
  if v_pengajar_id is null then
    raise exception 'Profil pengajar tidak ditemukan atau tidak aktif' using errcode = '42501';
  end if;

  select c.*
    into v_cicilan
  from public.hafalan_surat_cicilan c
  join public.hafalan_santri hs on hs.id = c.hafalan_santri_id
  where c.id = p_cicilan_id
  for update of c, hs;

  if not found then
    raise exception 'Setoran hafalan tidak ditemukan' using errcode = 'P0002';
  end if;

  select hs.santri_id, hs.surat_id
    into v_santri_id, v_surat_id_lama
  from public.hafalan_santri hs
  where hs.id = v_cicilan.hafalan_santri_id;

  if v_cicilan.pengajar_id is distinct from v_pengajar_id then
    raise exception 'Anda hanya dapat mengoreksi setoran yang dicatat sendiri' using errcode = '42501';
  end if;

  if not (v_santri_id = any(public.pengajar_santri_ids())) then
    raise exception 'Santri tidak berada dalam cakupan kelompok Anda' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('LANCAR', 'KURANG_LANCAR', 'TIDAK_LANCAR') then
    raise exception 'Status hafalan tidak valid' using errcode = '22023';
  end if;

  select s.nama, s.jumlah_ayat
    into v_nama_surat, v_jumlah_ayat
  from public.surat s
  where s.id = p_surat_id
    and s.aktif is true;

  if not found then
    raise exception 'Surat tidak ditemukan atau tidak aktif' using errcode = '23503';
  end if;

  if p_ayat_selesai is null
    or p_ayat_selesai < v_cicilan.ayat_mulai
    or p_ayat_selesai > v_jumlah_ayat then
    raise exception 'Ayat selesai tidak valid untuk surat %', v_nama_surat using errcode = '22023';
  end if;

  -- Mengunci tujuan perubahan surah agar tidak berbenturan dengan pencatatan
  -- setoran baru untuk pasangan santri dan surah yang sama.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_santri_id::text || ':' || p_surat_id::text, 0)
  );

  select count(*)
    into v_jumlah_riwayat
  from public.hafalan_surat_cicilan c
  where c.hafalan_santri_id = v_cicilan.hafalan_santri_id;

  if (p_surat_id is distinct from v_surat_id_lama or p_ayat_selesai is distinct from v_cicilan.ayat_selesai)
    and v_jumlah_riwayat <> 1 then
    raise exception 'Surah atau ayat hanya dapat diubah bila belum ada setoran lanjutan. Anda masih dapat memperbaiki status dan catatan.' using errcode = '22023';
  end if;

  if p_surat_id is distinct from v_surat_id_lama then
    if exists (
      select 1
      from public.hafalan_santri hs
      where hs.santri_id = v_santri_id
        and hs.surat_id = p_surat_id
        and hs.id <> v_cicilan.hafalan_santri_id
    ) then
      raise exception 'Santri sudah memiliki riwayat untuk surat %', v_nama_surat using errcode = '23505';
    end if;

    update public.hafalan_santri
    set surat_id = p_surat_id,
        updated_at = now()
    where id = v_cicilan.hafalan_santri_id;
  end if;

  update public.hafalan_surat_cicilan
  set ayat_selesai = p_ayat_selesai,
      status = p_status,
      catatan = nullif(trim(p_catatan), ''),
      updated_at = now()
  where id = v_cicilan.id;
end;
$function$;

revoke all on function public.update_hafalan_surat_cicilan(uuid, uuid, integer, text, text) from public;
grant execute on function public.update_hafalan_surat_cicilan(uuid, uuid, integer, text, text) to authenticated;

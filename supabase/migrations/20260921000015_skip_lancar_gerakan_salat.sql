-- Komponen yang sudah pernah Lancar adalah capaian tuntas dan tidak boleh
-- dinilai ulang pada sesi berikutnya.

create or replace function public.create_perkembangan_gerakan_salat(
  p_santri_id uuid,
  p_komponen jsonb,
  p_catatan text default null
)
returns table (
  id uuid,
  santri_id uuid,
  pengajar_id uuid,
  tanggal date,
  catatan text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pengajar_id uuid;
  v_parent public.perkembangan_gerakan_salat%rowtype;
  v_input_count integer;
  v_distinct_count integer;
  v_remaining_count integer;
  v_remaining_match_count integer;
  v_active_master_count integer;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login untuk mencatat gerakan salat' using errcode = '28000';
  end if;

  if public.user_role() is distinct from 'PENGAJAR' then
    raise exception 'Hanya pengajar yang dapat mencatat gerakan salat' using errcode = '42501';
  end if;

  v_pengajar_id := public.pengajar_id();
  if v_pengajar_id is null then
    raise exception 'Profil pengajar tidak ditemukan atau tidak aktif' using errcode = '42501';
  end if;

  if p_santri_id is null or not (p_santri_id = any(public.pengajar_santri_ids())) then
    raise exception 'Santri tidak berada dalam cakupan kelompok Anda' using errcode = '42501';
  end if;

  if jsonb_typeof(p_komponen) is distinct from 'array' then
    raise exception 'Komponen gerakan salat harus berupa daftar penilaian' using errcode = '22023';
  end if;

  select count(*) into v_active_master_count
  from public.komponen_salat
  where aktif is true;

  if v_active_master_count <> 8 then
    raise exception 'Master komponen salat aktif harus berjumlah tepat delapan' using errcode = '22023';
  end if;

  select count(*) into v_remaining_count
  from public.komponen_salat k
  where k.aktif is true
    and not exists (
      select 1
      from public.perkembangan_gerakan_salat_komponen d
      join public.perkembangan_gerakan_salat g on g.id = d.perkembangan_gerakan_salat_id
      where g.santri_id = p_santri_id
        and d.komponen_salat_id = k.id
        and d.status = 'LANCAR'
    );

  if v_remaining_count = 0 then
    raise exception 'Semua komponen gerakan salat sudah Lancar' using errcode = '22023';
  end if;

  select
    count(*),
    count(distinct (item.value ->> 'komponen_salat_id')::uuid),
    count(k.id)
  into v_input_count, v_distinct_count, v_remaining_match_count
  from jsonb_array_elements(p_komponen) as item(value)
  left join public.komponen_salat k
    on k.id = (item.value ->> 'komponen_salat_id')::uuid
    and k.aktif is true
    and not exists (
      select 1
      from public.perkembangan_gerakan_salat_komponen d
      join public.perkembangan_gerakan_salat g on g.id = d.perkembangan_gerakan_salat_id
      where g.santri_id = p_santri_id
        and d.komponen_salat_id = k.id
        and d.status = 'LANCAR'
    )
  where (item.value ->> 'status') in ('LANCAR', 'BUTUH_BIMBINGAN');

  if v_input_count <> v_remaining_count
    or v_distinct_count <> v_remaining_count
    or v_remaining_match_count <> v_remaining_count then
    raise exception 'Semua komponen yang belum Lancar wajib dinilai satu kali; komponen Lancar tidak boleh dinilai ulang' using errcode = '22023';
  end if;

  insert into public.perkembangan_gerakan_salat (santri_id, pengajar_id, catatan)
  values (p_santri_id, v_pengajar_id, nullif(trim(p_catatan), ''))
  returning * into v_parent;

  insert into public.perkembangan_gerakan_salat_komponen (
    perkembangan_gerakan_salat_id,
    komponen_salat_id,
    status
  )
  select
    v_parent.id,
    (item.value ->> 'komponen_salat_id')::uuid,
    item.value ->> 'status'
  from jsonb_array_elements(p_komponen) as item(value);

  return query
  select v_parent.id, v_parent.santri_id, v_parent.pengajar_id, v_parent.tanggal, v_parent.catatan, v_parent.created_at;
end;
$function$;

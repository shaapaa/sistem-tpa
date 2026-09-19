-- Model baru Praktik Salat. Tabel praktik_salat dan perkembangan_salat_komponen
-- lama tetap menjadi histori legacy dan tidak dipetakan ulang.

create table public.perkembangan_gerakan_salat (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.santri(id) on delete cascade,
  pengajar_id uuid not null references public.pengajar(id) on delete restrict,
  tanggal date not null default current_date,
  catatan text,
  created_at timestamptz not null default now()
);

create table public.perkembangan_gerakan_salat_komponen (
  id uuid primary key default gen_random_uuid(),
  perkembangan_gerakan_salat_id uuid not null references public.perkembangan_gerakan_salat(id) on delete cascade,
  komponen_salat_id uuid not null references public.komponen_salat(id) on delete restrict,
  status text not null check (status in ('LANCAR', 'BUTUH_BIMBINGAN')),
  created_at timestamptz not null default now(),
  unique (perkembangan_gerakan_salat_id, komponen_salat_id)
);

create table public.perkembangan_niat_salat (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.santri(id) on delete cascade,
  jenis_salat_id uuid not null references public.jenis_salat(id) on delete restrict,
  pengajar_id uuid not null references public.pengajar(id) on delete restrict,
  tanggal date not null default current_date,
  status text not null check (status in ('LANCAR', 'BUTUH_BIMBINGAN')),
  catatan text,
  created_at timestamptz not null default now()
);

create index idx_gerakan_salat_santri_tanggal
  on public.perkembangan_gerakan_salat (santri_id, tanggal desc);
create index idx_gerakan_salat_detail_parent
  on public.perkembangan_gerakan_salat_komponen (perkembangan_gerakan_salat_id);
create index idx_niat_salat_santri_tanggal
  on public.perkembangan_niat_salat (santri_id, tanggal desc);

alter table public.perkembangan_gerakan_salat enable row level security;
alter table public.perkembangan_gerakan_salat_komponen enable row level security;
alter table public.perkembangan_niat_salat enable row level security;

create policy "Admin read gerakan salat" on public.perkembangan_gerakan_salat
  for select using (public.user_role() = 'ADMIN');
create policy "Admin read gerakan salat komponen" on public.perkembangan_gerakan_salat_komponen
  for select using (public.user_role() = 'ADMIN');
create policy "Admin read niat salat" on public.perkembangan_niat_salat
  for select using (public.user_role() = 'ADMIN');

create policy "Pengajar read gerakan salat" on public.perkembangan_gerakan_salat
  for select
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
create policy "Pengajar read gerakan salat komponen" on public.perkembangan_gerakan_salat_komponen
  for select
  using (
    public.user_role() = 'PENGAJAR'
    and perkembangan_gerakan_salat_id in (
      select g.id
      from public.perkembangan_gerakan_salat g
      where g.santri_id = any(public.pengajar_santri_ids())
    )
  );
create policy "Pengajar read niat salat" on public.perkembangan_niat_salat
  for select
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));

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
  v_active_match_count integer;
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

  if jsonb_typeof(p_komponen) is distinct from 'array' or jsonb_array_length(p_komponen) <> 8 then
    raise exception 'Tepat delapan komponen gerakan salat wajib dinilai' using errcode = '22023';
  end if;

  select count(*)
    into v_active_master_count
  from public.komponen_salat k
  where k.aktif is true;

  if v_active_master_count <> 8 then
    raise exception 'Master komponen salat aktif harus berjumlah tepat delapan' using errcode = '22023';
  end if;

  select
    count(*),
    count(distinct (item.value ->> 'komponen_salat_id')::uuid),
    count(k.id)
  into v_input_count, v_distinct_count, v_active_match_count
  from jsonb_array_elements(p_komponen) as item(value)
  left join public.komponen_salat k
    on k.id = (item.value ->> 'komponen_salat_id')::uuid
    and k.aktif is true
  where (item.value ->> 'status') in ('LANCAR', 'BUTUH_BIMBINGAN');

  if v_input_count <> 8 or v_distinct_count <> 8 or v_active_match_count <> 8 then
    raise exception 'Komponen harus unik, aktif, dan memiliki status valid' using errcode = '22023';
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

create or replace function public.create_perkembangan_niat_salat(
  p_santri_id uuid,
  p_jenis_salat_id uuid,
  p_status text,
  p_catatan text default null
)
returns table (
  id uuid,
  santri_id uuid,
  jenis_salat_id uuid,
  pengajar_id uuid,
  tanggal date,
  status text,
  catatan text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pengajar_id uuid;
  v_niat public.perkembangan_niat_salat%rowtype;
  v_active_jenis_count integer;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login untuk mencatat niat salat' using errcode = '28000';
  end if;

  if public.user_role() is distinct from 'PENGAJAR' then
    raise exception 'Hanya pengajar yang dapat mencatat niat salat' using errcode = '42501';
  end if;

  v_pengajar_id := public.pengajar_id();
  if v_pengajar_id is null then
    raise exception 'Profil pengajar tidak ditemukan atau tidak aktif' using errcode = '42501';
  end if;

  if p_santri_id is null or not (p_santri_id = any(public.pengajar_santri_ids())) then
    raise exception 'Santri tidak berada dalam cakupan kelompok Anda' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('LANCAR', 'BUTUH_BIMBINGAN') then
    raise exception 'Status niat salat tidak valid' using errcode = '22023';
  end if;

  select count(*)
    into v_active_jenis_count
  from public.jenis_salat j
  where j.aktif is true;

  if v_active_jenis_count <> 5 then
    raise exception 'Master jenis salat aktif harus berjumlah tepat lima' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.jenis_salat j
    where j.id = p_jenis_salat_id
      and j.aktif is true
  ) then
    raise exception 'Jenis salat tidak ditemukan atau tidak aktif' using errcode = '23503';
  end if;

  insert into public.perkembangan_niat_salat (santri_id, jenis_salat_id, pengajar_id, status, catatan)
  values (p_santri_id, p_jenis_salat_id, v_pengajar_id, p_status, nullif(trim(p_catatan), ''))
  returning * into v_niat;

  return query
  select v_niat.id, v_niat.santri_id, v_niat.jenis_salat_id, v_niat.pengajar_id, v_niat.tanggal, v_niat.status, v_niat.catatan, v_niat.created_at;
end;
$function$;

revoke all on function public.create_perkembangan_gerakan_salat(uuid, jsonb, text) from public;
grant execute on function public.create_perkembangan_gerakan_salat(uuid, jsonb, text) to authenticated;
revoke all on function public.create_perkembangan_niat_salat(uuid, uuid, text, text) from public;
grant execute on function public.create_perkembangan_niat_salat(uuid, uuid, text, text) to authenticated;

drop trigger if exists presensi_hadir_dari_gerakan_salat on public.perkembangan_gerakan_salat;
create trigger presensi_hadir_dari_gerakan_salat
  after insert on public.perkembangan_gerakan_salat
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

drop trigger if exists presensi_hadir_dari_niat_salat on public.perkembangan_niat_salat;
create trigger presensi_hadir_dari_niat_salat
  after insert on public.perkembangan_niat_salat
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

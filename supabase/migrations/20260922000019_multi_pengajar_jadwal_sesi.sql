-- Satu jadwal sesi dapat memiliki beberapa pengajar. Kolom pengajar_id lama
-- dipertahankan sebagai data kompatibilitas; sumber penugasan baru adalah tabel ini.

create table if not exists public.jadwal_sesi_pengajar (
  id uuid primary key default gen_random_uuid(),
  jadwal_sesi_id uuid not null references public.jadwal_sesi(id) on delete cascade,
  pengajar_id uuid not null references public.pengajar(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (jadwal_sesi_id, pengajar_id)
);

insert into public.jadwal_sesi_pengajar (jadwal_sesi_id, pengajar_id)
select js.id, js.pengajar_id
from public.jadwal_sesi js
where js.pengajar_id is not null
on conflict (jadwal_sesi_id, pengajar_id) do nothing;

create index if not exists idx_jadwal_sesi_pengajar_pengajar
  on public.jadwal_sesi_pengajar (pengajar_id, jadwal_sesi_id);

create or replace function public.batasi_tiga_pengajar_per_jadwal_sesi()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  perform pg_advisory_xact_lock(hashtext(new.jadwal_sesi_id::text));
  if (select count(*) from public.jadwal_sesi_pengajar where jadwal_sesi_id = new.jadwal_sesi_id) >= 3 then
    raise exception 'Satu jadwal sesi hanya dapat memiliki maksimal tiga pengajar';
  end if;
  return new;
end;
$function$;

drop trigger if exists batasi_tiga_pengajar_per_jadwal_sesi on public.jadwal_sesi_pengajar;
create trigger batasi_tiga_pengajar_per_jadwal_sesi
  before insert on public.jadwal_sesi_pengajar
  for each row execute function public.batasi_tiga_pengajar_per_jadwal_sesi();

alter table public.jadwal_sesi_pengajar enable row level security;

create or replace function public.pengajar_memiliki_jadwal_sesi(p_jadwal_sesi_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $function$
  select exists (
    select 1 from public.jadwal_sesi_pengajar jsp
    where jsp.jadwal_sesi_id = p_jadwal_sesi_id
      and jsp.pengajar_id = public.pengajar_id()
  );
$function$;

create or replace function public.pengajar_memiliki_sesi(p_sesi_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $function$
  select exists (
    select 1 from public.jadwal_sesi js
    where js.sesi_id = p_sesi_id
      and public.pengajar_memiliki_jadwal_sesi(js.id)
  );
$function$;

drop policy if exists "Admin jadwal sesi pengajar" on public.jadwal_sesi_pengajar;
create policy "Admin jadwal sesi pengajar" on public.jadwal_sesi_pengajar
  for all using (public.user_role() = 'ADMIN') with check (public.user_role() = 'ADMIN');
drop policy if exists "Pengajar read penugasan sesi" on public.jadwal_sesi_pengajar;
create policy "Pengajar read penugasan sesi" on public.jadwal_sesi_pengajar
  for select using (public.pengajar_memiliki_jadwal_sesi(jadwal_sesi_id));

drop policy if exists "Pengajar read jadwal sesi" on public.jadwal_sesi;
create policy "Pengajar read jadwal sesi" on public.jadwal_sesi
  for select using (public.pengajar_memiliki_jadwal_sesi(public.jadwal_sesi.id));

drop policy if exists "Pengajar read sesi" on public.sesi;
create policy "Pengajar read sesi" on public.sesi
  for select using (
    public.user_role() = 'PENGAJAR'
    and public.pengajar_memiliki_sesi(public.sesi.id)
  );

-- Scope pengajar berasal dari penugasan jadwal sesi, bukan pemilik kelompok.
create or replace function public.pengajar_kelompok_ids()
returns uuid[]
language sql security definer stable set search_path = ''
as $function$
  select coalesce(array_agg(k.id), array[]::uuid[])
  from public.kelompok k
  where exists (
    select 1
    from public.jadwal_sesi js
    join public.jadwal_sesi_pengajar jsp on jsp.jadwal_sesi_id = js.id
    where js.sesi_id = k.sesi_id
      and jsp.pengajar_id = public.pengajar_id()
  );
$function$;

create or replace function public.pengajar_boleh_input_santri_hari_ini(p_santri_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $function$
  select exists (
    select 1
    from public.santri s
    join public.kelompok k on k.id = s.kelompok_id
    join public.jadwal_sesi js on js.sesi_id = k.sesi_id
    join public.jadwal_sesi_pengajar jsp on jsp.jadwal_sesi_id = js.id
    where s.id = p_santri_id
      and jsp.pengajar_id = public.pengajar_id()
      and js.is_active = true
      and js.hari = (array['MINGGU','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'])[extract(dow from now() at time zone 'Asia/Jakarta')::int + 1]
  );
$function$;

-- Cegah duplikasi per unit penilaian tanpa menghapus riwayat lama. Advisory lock
-- membuat dua request serentak untuk unit yang sama tidak dapat lolos bersamaan.
create or replace function public.validasi_satu_penilaian_harian()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  v_santri_id uuid;
  v_key text;
  v_exists boolean;
begin
  if tg_table_name = 'hafalan_surat_cicilan' then
    select santri_id into v_santri_id from public.hafalan_santri where id = new.hafalan_santri_id;
    v_key := format('%s:%s:%s', v_santri_id, new.tanggal, 'HAFALAN_SURAT');
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.hafalan_surat_cicilan c join public.hafalan_santri hs on hs.id = c.hafalan_santri_id where hs.santri_id = v_santri_id and c.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'perkembangan_hafalan_doa' then
    v_key := format('%s:%s:%s', new.santri_id, new.tanggal, 'HAFALAN_DOA');
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.perkembangan_hafalan_doa d where d.santri_id = new.santri_id and d.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'perkembangan_niat_salat' then
    v_key := format('%s:%s:%s:%s', new.santri_id, new.tanggal, 'NIAT_SALAT', new.jenis_salat_id);
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.perkembangan_niat_salat n where n.santri_id = new.santri_id and n.jenis_salat_id = new.jenis_salat_id and n.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'perkembangan_salat_komponen' then
    v_key := format('%s:%s:%s:%s', new.santri_id, new.tanggal, 'SALAT_KOMPONEN', new.komponen_salat_id);
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.perkembangan_salat_komponen s where s.santri_id = new.santri_id and s.komponen_salat_id = new.komponen_salat_id and s.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'praktik_salat' then
    v_key := format('%s:%s:%s:%s', new.santri_id, new.tanggal, 'PRAKTIK_SALAT', new.jenis_salat_id);
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.praktik_salat p where p.santri_id = new.santri_id and p.jenis_salat_id is not distinct from new.jenis_salat_id and p.tanggal = new.tanggal) into v_exists;
  else
    v_key := format('%s:%s:%s', new.santri_id, new.tanggal, tg_table_name);
    perform pg_advisory_xact_lock(hashtext(v_key));
    execute format('select exists(select 1 from public.%I where santri_id = $1 and tanggal = $2)', tg_table_name)
      into v_exists using new.santri_id, new.tanggal;
  end if;
  if v_exists then
    raise exception 'Data perkembangan ini sudah dinilai oleh pengajar lain.' using errcode = '23505';
  end if;
  return new;
end;
$function$;

drop trigger if exists satu_penilaian_bacaan on public.perkembangan_bacaan;
create trigger satu_penilaian_bacaan before insert on public.perkembangan_bacaan for each row execute function public.validasi_satu_penilaian_harian();
drop trigger if exists satu_penilaian_doa on public.perkembangan_hafalan_doa;
create trigger satu_penilaian_doa before insert on public.perkembangan_hafalan_doa for each row execute function public.validasi_satu_penilaian_harian();
drop trigger if exists satu_penilaian_cicilan on public.hafalan_surat_cicilan;
create trigger satu_penilaian_cicilan before insert on public.hafalan_surat_cicilan for each row execute function public.validasi_satu_penilaian_harian();
drop trigger if exists satu_penilaian_gerakan on public.perkembangan_gerakan_salat;
create trigger satu_penilaian_gerakan before insert on public.perkembangan_gerakan_salat for each row execute function public.validasi_satu_penilaian_harian();
drop trigger if exists satu_penilaian_niat on public.perkembangan_niat_salat;
create trigger satu_penilaian_niat before insert on public.perkembangan_niat_salat for each row execute function public.validasi_satu_penilaian_harian();
drop trigger if exists satu_penilaian_salat_komponen on public.perkembangan_salat_komponen;
create trigger satu_penilaian_salat_komponen before insert on public.perkembangan_salat_komponen for each row execute function public.validasi_satu_penilaian_harian();
drop trigger if exists satu_penilaian_praktik_salat on public.praktik_salat;
create trigger satu_penilaian_praktik_salat before insert on public.praktik_salat for each row execute function public.validasi_satu_penilaian_harian();

-- Realtime untuk kolaborasi antar pengajar. DO block aman bila tabel sudah ada.
do $do$
declare t text;
begin
  foreach t in array array['presensi','perkembangan_bacaan','perkembangan_hafalan_doa','hafalan_surat_cicilan','perkembangan_gerakan_salat','perkembangan_niat_salat'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$do$;

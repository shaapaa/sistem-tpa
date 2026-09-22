-- Penugasan pengajar melekat pada jadwal (hari + sesi), bukan pada sesi global.

alter table public.jadwal_sesi
  add column if not exists pengajar_id uuid references public.pengajar(id) on delete restrict;

-- Pertahankan penugasan yang sudah dimigrasikan sebelumnya sebagai nilai awal.
update public.jadwal_sesi js
set pengajar_id = se.pengajar_id
from public.sesi se
where se.id = js.sesi_id
  and js.pengajar_id is null;

create index if not exists idx_jadwal_sesi_pengajar on public.jadwal_sesi(pengajar_id);

drop policy if exists "Pengajar read jadwal sesi" on public.jadwal_sesi;
create policy "Pengajar read jadwal sesi" on public.jadwal_sesi
  for select using (pengajar_id = public.pengajar_id());

-- Riwayat dapat dibaca untuk sesi yang pernah ditangani pengajar.
create or replace function public.pengajar_kelompok_ids()
returns uuid[]
language sql security definer stable set search_path = ''
as $function$
  select coalesce(array_agg(k.id), array[]::uuid[])
  from public.kelompok k
  where k.sesi_id in (
    select distinct js.sesi_id from public.jadwal_sesi js
    where js.pengajar_id = public.pengajar_id()
  );
$function$;

-- Input hanya diizinkan untuk jadwal pengajar pada hari Jakarta saat ini.
create or replace function public.pengajar_boleh_input_santri_hari_ini(p_santri_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $function$
  select exists (
    select 1 from public.santri s
    join public.kelompok k on k.id = s.kelompok_id
    join public.jadwal_sesi js on js.sesi_id = k.sesi_id
    where s.id = p_santri_id
      and js.pengajar_id = public.pengajar_id()
      and js.is_active = true
      and js.hari = (array['MINGGU','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'])[extract(dow from now() at time zone 'Asia/Jakarta')::int + 1]
  );
$function$;

create or replace function public.validasi_jadwal_input_hari_ini()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_santri_id uuid;
begin
  if tg_table_name = 'hafalan_surat_cicilan' then
    select santri_id into v_santri_id from public.hafalan_santri where id = new.hafalan_santri_id;
  else
    v_santri_id := new.santri_id;
  end if;
  if new.tanggal <> (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Perkembangan hanya dapat dicatat untuk hari ini';
  end if;
  if not public.pengajar_boleh_input_santri_hari_ini(v_santri_id) then
    raise exception 'Pengajar tidak memiliki jadwal untuk sesi santri hari ini';
  end if;
  return new;
end;
$function$;

create trigger validasi_jadwal_bacaan before insert on public.perkembangan_bacaan for each row execute function public.validasi_jadwal_input_hari_ini();
create trigger validasi_jadwal_doa before insert on public.perkembangan_hafalan_doa for each row execute function public.validasi_jadwal_input_hari_ini();
create trigger validasi_jadwal_cicilan before insert on public.hafalan_surat_cicilan for each row execute function public.validasi_jadwal_input_hari_ini();
create trigger validasi_jadwal_gerakan before insert on public.perkembangan_gerakan_salat for each row execute function public.validasi_jadwal_input_hari_ini();
create trigger validasi_jadwal_niat before insert on public.perkembangan_niat_salat for each row execute function public.validasi_jadwal_input_hari_ini();
create trigger validasi_jadwal_presensi before insert or update on public.presensi for each row execute function public.validasi_jadwal_input_hari_ini();

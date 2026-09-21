-- Pengajar yang ditugaskan pada salah satu kelompok dapat mengajar seluruh
-- kelompok dalam sesi yang sama. Kelompok A tetap Iqra dan Kelompok B tetap Quran;
-- yang berubah hanya cakupan santri yang dapat diakses pengajar pada satu sesi.

create or replace function public.pengajar_kelompok_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $function$
  select coalesce(array_agg(k.id), array[]::uuid[])
  from public.kelompok k
  where auth.uid() is not null
    and k.sesi_id in (
      select kelompok_tugas.sesi_id
      from public.kelompok kelompok_tugas
      where kelompok_tugas.pengajar_id = public.pengajar_id()
    )
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'PENGAJAR'
        and p.is_active is true
    );
$function$;

-- Konsisten dengan bacaan dan hafalan: setiap perkembangan baru berarti santri hadir.
drop trigger if exists presensi_hadir_dari_gerakan_salat on public.perkembangan_gerakan_salat;
create trigger presensi_hadir_dari_gerakan_salat
  after insert on public.perkembangan_gerakan_salat
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

drop trigger if exists presensi_hadir_dari_niat_salat on public.perkembangan_niat_salat;
create trigger presensi_hadir_dari_niat_salat
  after insert on public.perkembangan_niat_salat
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

-- Tahap 3A: otorisasi role SANTRI melalui relasi wali_santri.
-- Tidak mengubah relasi legacy santri.profile_id maupun anak_santri_id().

create or replace function public.wali_santri_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(array_agg(ws.santri_id), array[]::uuid[])
  from public.wali_santri ws
  where ws.profile_id = auth.uid();
$function$;

alter table public.wali_santri enable row level security;

create policy "Admin wali_santri" on public.wali_santri
  for all
  using (public.user_role() = 'ADMIN')
  with check (public.user_role() = 'ADMIN');

create policy "Santri read wali_santri" on public.wali_santri
  for select
  using (
    public.user_role() = 'SANTRI'
    and profile_id = auth.uid()
  );

drop policy if exists "Santri read santri" on public.santri;
create policy "Santri read santri" on public.santri
  for select
  using (
    public.user_role() = 'SANTRI'
    and id = any(public.wali_santri_ids())
  );

drop policy if exists "Santri read kelompok" on public.kelompok;
create policy "Santri read kelompok" on public.kelompok
  for select
  using (
    public.user_role() = 'SANTRI'
    and id in (
      select s.kelompok_id
      from public.santri s
      where s.id = any(public.wali_santri_ids())
    )
  );

drop policy if exists "Santri read jadwal" on public.jadwal;
create policy "Santri read jadwal" on public.jadwal
  for select
  using (
    public.user_role() = 'SANTRI'
    and kelompok_id in (
      select s.kelompok_id
      from public.santri s
      where s.id = any(public.wali_santri_ids())
    )
  );

drop policy if exists "Santri read presensi" on public.presensi;
create policy "Santri read presensi" on public.presensi
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

drop policy if exists "Santri read bacaan" on public.perkembangan_bacaan;
create policy "Santri read bacaan" on public.perkembangan_bacaan
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

drop policy if exists "Santri read hafalan_santri" on public.hafalan_santri;
create policy "Santri read hafalan_santri" on public.hafalan_santri
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

drop policy if exists "Santri read cicilan" on public.hafalan_surat_cicilan;
create policy "Santri read cicilan" on public.hafalan_surat_cicilan
  for select
  using (
    public.user_role() = 'SANTRI'
    and hafalan_santri_id in (
      select hs.id
      from public.hafalan_santri hs
      where hs.santri_id = any(public.wali_santri_ids())
    )
  );

drop policy if exists "Santri read hafalan_doa" on public.perkembangan_hafalan_doa;
create policy "Santri read hafalan_doa" on public.perkembangan_hafalan_doa
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

drop policy if exists "Santri read salat_komponen" on public.perkembangan_salat_komponen;
create policy "Santri read salat_komponen" on public.perkembangan_salat_komponen
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

drop policy if exists "Santri read praktik_salat" on public.praktik_salat;
create policy "Santri read praktik_salat" on public.praktik_salat
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

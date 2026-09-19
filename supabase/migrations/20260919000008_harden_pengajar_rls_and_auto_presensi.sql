-- Perkuat RLS Pengajar, atribusi pencatatan, dan presensi otomatis dari input perkembangan.

create or replace function public.pengajar_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $function$
  select pj.id
  from public.pengajar pj
  where auth.uid() is not null
    and pj.profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'PENGAJAR'
        and p.is_active is true
    )
  limit 1;
$function$;

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
    and k.pengajar_id = public.pengajar_id()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'PENGAJAR'
        and p.is_active is true
    );
$function$;

create or replace function public.pengajar_santri_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $function$
  select coalesce(array_agg(s.id), array[]::uuid[])
  from public.santri s
  where auth.uid() is not null
    and s.kelompok_id = any(public.pengajar_kelompok_ids())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'PENGAJAR'
        and p.is_active is true
    );
$function$;

revoke all on function public.pengajar_id() from public;
grant execute on function public.pengajar_id() to authenticated;
revoke all on function public.pengajar_kelompok_ids() from public;
grant execute on function public.pengajar_kelompok_ids() to authenticated;
revoke all on function public.pengajar_santri_ids() from public;
grant execute on function public.pengajar_santri_ids() to authenticated;

drop policy if exists "Pengajar read profiles" on public.profiles;
create policy "Pengajar read profiles" on public.profiles
  for select
  using (public.user_role() = 'PENGAJAR' and id = auth.uid());

drop policy if exists "Pengajar presensi" on public.presensi;
create policy "Pengajar read presensi" on public.presensi
  for select
  using (
    public.user_role() = 'PENGAJAR'
    and santri_id = any(public.pengajar_santri_ids())
  );
create policy "Pengajar insert presensi" on public.presensi
  for insert
  with check (
    public.user_role() = 'PENGAJAR'
    and santri_id = any(public.pengajar_santri_ids())
    and pengajar_id = public.pengajar_id()
    and kelompok_id = (select s.kelompok_id from public.santri s where s.id = santri_id)
  );
create policy "Pengajar update presensi" on public.presensi
  for update
  using (
    public.user_role() = 'PENGAJAR'
    and santri_id = any(public.pengajar_santri_ids())
    and pengajar_id = public.pengajar_id()
  )
  with check (
    public.user_role() = 'PENGAJAR'
    and santri_id = any(public.pengajar_santri_ids())
    and pengajar_id = public.pengajar_id()
    and kelompok_id = (select s.kelompok_id from public.santri s where s.id = santri_id)
  );

drop policy if exists "Pengajar bacaan" on public.perkembangan_bacaan;
create policy "Pengajar read bacaan" on public.perkembangan_bacaan
  for select
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
create policy "Pengajar insert bacaan" on public.perkembangan_bacaan
  for insert
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());
create policy "Pengajar update bacaan" on public.perkembangan_bacaan
  for update
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id())
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());

drop policy if exists "Pengajar cicilan" on public.hafalan_surat_cicilan;
create policy "Pengajar read cicilan" on public.hafalan_surat_cicilan
  for select
  using (
    public.user_role() = 'PENGAJAR'
    and hafalan_santri_id in (select hs.id from public.hafalan_santri hs where hs.santri_id = any(public.pengajar_santri_ids()))
  );
create policy "Pengajar insert cicilan" on public.hafalan_surat_cicilan
  for insert
  with check (
    public.user_role() = 'PENGAJAR'
    and hafalan_santri_id in (select hs.id from public.hafalan_santri hs where hs.santri_id = any(public.pengajar_santri_ids()))
    and pengajar_id = public.pengajar_id()
  );
create policy "Pengajar update cicilan" on public.hafalan_surat_cicilan
  for update
  using (
    public.user_role() = 'PENGAJAR'
    and hafalan_santri_id in (select hs.id from public.hafalan_santri hs where hs.santri_id = any(public.pengajar_santri_ids()))
    and pengajar_id = public.pengajar_id()
  )
  with check (
    public.user_role() = 'PENGAJAR'
    and hafalan_santri_id in (select hs.id from public.hafalan_santri hs where hs.santri_id = any(public.pengajar_santri_ids()))
    and pengajar_id = public.pengajar_id()
  );

drop policy if exists "Pengajar hafalan_doa" on public.perkembangan_hafalan_doa;
create policy "Pengajar read hafalan_doa" on public.perkembangan_hafalan_doa
  for select
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
create policy "Pengajar insert hafalan_doa" on public.perkembangan_hafalan_doa
  for insert
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());
create policy "Pengajar update hafalan_doa" on public.perkembangan_hafalan_doa
  for update
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id())
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());

drop policy if exists "Pengajar salat_komponen" on public.perkembangan_salat_komponen;
create policy "Pengajar read salat_komponen" on public.perkembangan_salat_komponen
  for select
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
create policy "Pengajar insert salat_komponen" on public.perkembangan_salat_komponen
  for insert
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());
create policy "Pengajar update salat_komponen" on public.perkembangan_salat_komponen
  for update
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id())
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());

drop policy if exists "Pengajar praktik_salat" on public.praktik_salat;
create policy "Pengajar read praktik_salat" on public.praktik_salat
  for select
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
create policy "Pengajar insert praktik_salat" on public.praktik_salat
  for insert
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());
create policy "Pengajar update praktik_salat" on public.praktik_salat
  for update
  using (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id())
  with check (public.user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()) and pengajar_id = public.pengajar_id());

create or replace function public.buat_presensi_hadir_dari_perkembangan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_santri_id uuid;
  v_kelompok_id uuid;
begin
  if tg_table_name = 'hafalan_surat_cicilan' then
    select hs.santri_id into v_santri_id
    from public.hafalan_santri hs
    where hs.id = new.hafalan_santri_id;
  else
    v_santri_id := new.santri_id;
  end if;

  select s.kelompok_id into v_kelompok_id
  from public.santri s
  where s.id = v_santri_id;

  insert into public.presensi (santri_id, kelompok_id, pengajar_id, tanggal, status)
  values (v_santri_id, v_kelompok_id, new.pengajar_id, new.tanggal, 'HADIR')
  on conflict (santri_id, tanggal) do nothing;

  return new;
end;
$function$;

drop trigger if exists presensi_hadir_dari_bacaan on public.perkembangan_bacaan;
create trigger presensi_hadir_dari_bacaan
  after insert on public.perkembangan_bacaan
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

drop trigger if exists presensi_hadir_dari_cicilan on public.hafalan_surat_cicilan;
create trigger presensi_hadir_dari_cicilan
  after insert on public.hafalan_surat_cicilan
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

drop trigger if exists presensi_hadir_dari_hafalan_doa on public.perkembangan_hafalan_doa;
create trigger presensi_hadir_dari_hafalan_doa
  after insert on public.perkembangan_hafalan_doa
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

drop trigger if exists presensi_hadir_dari_salat_komponen on public.perkembangan_salat_komponen;
create trigger presensi_hadir_dari_salat_komponen
  after insert on public.perkembangan_salat_komponen
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

drop trigger if exists presensi_hadir_dari_praktik_salat on public.praktik_salat;
create trigger presensi_hadir_dari_praktik_salat
  after insert on public.praktik_salat
  for each row execute function public.buat_presensi_hadir_dari_perkembangan();

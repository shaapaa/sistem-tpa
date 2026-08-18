-- ============================================
-- MIGRATION: Remove kelas/groups system
-- The schedule is only PAGI/SORE with fixed times.
-- ============================================

-- 1) Drop policies that reference santris.group_id first
drop policy if exists "Pengajar read santris" on santris;
drop policy if exists "Pengajar write pertemuans" on pertemuans;
drop policy if exists "Pengajar write absensis" on absensis;
drop policy if exists "Pengajar write progres" on progres_bacaans;
drop policy if exists "Pengajar write hafalans" on hafalans;
drop policy if exists "Pengajar write doa" on doa_harians;
drop policy if exists "Pengajar write sholat" on praktik_sholats;
drop policy if exists "Pengajar write evaluasi" on evaluasis;
drop policy if exists "Pengajar write perkembangan" on perkembangan_santris;
drop policy if exists "Orang Tua read groups" on groups;

-- 2) Drop FK-referencing columns (avoids cascade-deleting santri rows)
alter table santris drop column if exists group_id;
alter table jadwals drop column if exists group_id;
alter table pertemuans drop column if exists group_id;

-- 3) Drop group tables
drop table if exists group_pengajars;
drop table if exists groups;

drop function if exists public.pengajar_in_group(uuid);

-- 4) Helper: sesi(s) taught by the current pengajar, derived from their jadwal
create or replace function public.pengajar_sesis()
returns text[] as $$
  select coalesce(array_agg(distinct case when jam_mulai < '12:00' then 'PAGI' else 'SORE' end), '{}')
  from jadwals
  where pengajar_id = (select id from pengajars where user_id = auth.uid());
$$ language sql security definer stable;

-- 5) Recreate policies using sesi instead of groups
create policy "Pengajar read santris" on santris for select
  using (public.user_role() = 'PENGAJAR' and sesi = any(public.pengajar_sesis()));

create policy "Pengajar write pertemuans" on pertemuans for all
  using (public.user_role() = 'PENGAJAR' and jadwal_id in (select id from jadwals where pengajar_id = public.pengajar_id()))
  with check (public.user_role() = 'PENGAJAR' and jadwal_id in (select id from jadwals where pengajar_id = public.pengajar_id()));

create policy "Pengajar write absensis" on absensis for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

create policy "Pengajar write progres" on progres_bacaans for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

create policy "Pengajar write hafalans" on hafalans for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

create policy "Pengajar write doa" on doa_harians for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

create policy "Pengajar write sholat" on praktik_sholats for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

create policy "Pengajar write evaluasi" on evaluasis for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

create policy "Pengajar write perkembangan" on perkembangan_santris for all
  using (public.user_role() = 'PENGAJAR' and (select sesi from santris where id = student_id) = any(public.pengajar_sesis()));

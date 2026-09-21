-- Sesi adalah unit penugasan dan jadwal. Kelompok A/B hanya membedakan materi bacaan.

alter table public.sesi
  add column if not exists pengajar_id uuid references public.pengajar(id) on delete set null;

-- Pindahkan penugasan lama bila satu sesi sebelumnya hanya memiliki satu pengajar.
update public.sesi se
set pengajar_id = sumber.pengajar_id
from (
  select sesi_id, min(pengajar_id::text)::uuid as pengajar_id
  from public.kelompok
  where pengajar_id is not null
  group by sesi_id
  having count(distinct pengajar_id) = 1
) sumber
where sumber.sesi_id = se.id
  and se.pengajar_id is null;

create table if not exists public.jadwal_sesi (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references public.sesi(id) on delete cascade,
  hari text not null check (hari in ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT')),
  jam_mulai time not null,
  jam_selesai time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesi_id, hari)
);

-- Salin satu jadwal untuk setiap sesi/hari dari skema lama yang per-kelompok.
insert into public.jadwal_sesi (sesi_id, hari, jam_mulai, jam_selesai, is_active)
select distinct on (k.sesi_id, j.hari)
  k.sesi_id, j.hari, j.jam_mulai, j.jam_selesai, j.is_active
from public.jadwal j
join public.kelompok k on k.id = j.kelompok_id
order by k.sesi_id, j.hari, j.created_at
on conflict (sesi_id, hari) do nothing;

create index if not exists idx_jadwal_sesi_sesi on public.jadwal_sesi(sesi_id);

alter table public.jadwal_sesi enable row level security;
create policy "Admin jadwal sesi" on public.jadwal_sesi
  for all using (public.user_role() = 'ADMIN') with check (public.user_role() = 'ADMIN');
create policy "Pengajar read jadwal sesi" on public.jadwal_sesi
  for select using (sesi_id in (select id from public.sesi where pengajar_id = public.pengajar_id()));

create or replace function public.pengajar_kelompok_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $function$
  select coalesce(array_agg(k.id), array[]::uuid[])
  from public.kelompok k
  join public.sesi se on se.id = k.sesi_id
  where auth.uid() is not null
    and se.pengajar_id = public.pengajar_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'PENGAJAR' and p.is_active is true
    );
$function$;

drop policy if exists "Pengajar read sesi" on public.sesi;
create policy "Pengajar read sesi" on public.sesi
  for select using (public.user_role() = 'PENGAJAR' and pengajar_id = public.pengajar_id());

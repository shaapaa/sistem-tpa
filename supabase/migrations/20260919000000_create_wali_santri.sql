-- Relasi wali (profile role SANTRI) dengan santri.
-- Mempertahankan santri.profile_id sebagai relasi legacy selama masa transisi.

create table if not exists public.wali_santri (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  santri_id uuid not null references public.santri(id) on delete cascade,
  hubungan text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wali_santri_profile_id_santri_id_key unique (profile_id, santri_id)
);

-- Constraint UNIQUE menyediakan index dengan prefix profile_id; index berikutnya
-- melayani pencarian relasi dari sisi santri.
create index if not exists idx_wali_santri_santri_id
  on public.wali_santri (santri_id);

-- Backfill hanya dari relasi legacy yang memiliki profile SANTRI valid.
-- Tidak menebak hubungan wali dan tidak mengubah santri.profile_id.
insert into public.wali_santri (profile_id, santri_id)
select s.profile_id, s.id
from public.santri s
join public.profiles p on p.id = s.profile_id
where s.profile_id is not null
  and p.role = 'SANTRI'
on conflict (profile_id, santri_id) do nothing;

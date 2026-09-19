-- Pengajuan hubungan wali dengan santri sebelum diverifikasi admin.
-- Relasi final tetap disimpan pada public.wali_santri setelah approval.

create table public.pengajuan_wali (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  santri_id uuid not null references public.santri(id) on delete cascade,
  hubungan text null,
  status text not null default 'PENDING',
  catatan_admin text null,
  verified_by uuid null references public.profiles(id) on delete set null,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pengajuan_wali_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED'))
);

create index idx_pengajuan_wali_profile_id on public.pengajuan_wali (profile_id);
create index idx_pengajuan_wali_santri_id on public.pengajuan_wali (santri_id);
create index idx_pengajuan_wali_status on public.pengajuan_wali (status);
create unique index pengajuan_wali_pending_profile_santri_key
  on public.pengajuan_wali (profile_id, santri_id)
  where status = 'PENDING';

alter table public.pengajuan_wali enable row level security;

create policy "Admin pengajuan_wali" on public.pengajuan_wali
  for all
  using (public.user_role() = 'ADMIN')
  with check (public.user_role() = 'ADMIN');

create policy "Santri read pengajuan_wali" on public.pengajuan_wali
  for select
  using (
    public.user_role() = 'SANTRI'
    and profile_id = auth.uid()
  );

create policy "Santri create pengajuan_wali" on public.pengajuan_wali
  for insert
  with check (
    public.user_role() = 'SANTRI'
    and profile_id = auth.uid()
  );

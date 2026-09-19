-- Registrasi mandiri Pengajar hanya dapat memilih data master yang belum memiliki akun.
-- Auth user dibuat oleh Supabase Auth di client; fungsi ini menghubungkan profile dan
-- data pengajar dalam satu transaksi database setelah user memiliki session.

create or replace function public.pengajar_tanpa_akun()
returns table (id uuid, nama text)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.id, p.nama
  from public.pengajar p
  where p.profile_id is null
  order by p.nama;
$function$;

create or replace function public.register_pengajar_profile(p_pengajar_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_profile_id uuid := auth.uid();
  selected_pengajar_nama text;
begin
  if current_profile_id is null then
    raise exception 'Autentikasi diperlukan untuk mendaftar sebagai pengajar';
  end if;

  if p_pengajar_id is null then
    raise exception 'Data pengajar wajib dipilih';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = current_profile_id
  ) then
    raise exception 'Profile untuk akun ini sudah ada' using errcode = 'unique_violation';
  end if;

  -- Lock baris master agar dua pendaftaran tidak dapat menghubungkan pengajar yang sama.
  select p.nama
  into selected_pengajar_nama
  from public.pengajar p
  where p.id = p_pengajar_id
    and p.profile_id is null
  for update;

  if selected_pengajar_nama is null then
    raise exception 'Data pengajar tidak tersedia atau sudah memiliki akun';
  end if;

  insert into public.profiles (id, nama, role, is_active)
  values (current_profile_id, selected_pengajar_nama, 'PENGAJAR', true);

  update public.pengajar p
  set profile_id = current_profile_id,
      updated_at = now()
  where p.id = p_pengajar_id
    and p.profile_id is null;

  if not found then
    raise exception 'Data pengajar tidak tersedia atau sudah memiliki akun';
  end if;
end;
$function$;

revoke all on function public.pengajar_tanpa_akun() from public;
grant execute on function public.pengajar_tanpa_akun() to anon, authenticated;

revoke all on function public.register_pengajar_profile(uuid) from public;
grant execute on function public.register_pengajar_profile(uuid) to authenticated;

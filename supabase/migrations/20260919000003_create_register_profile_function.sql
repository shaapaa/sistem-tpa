-- Registrasi mandiri hanya dapat membuat profile milik user yang sedang login
-- dengan role teknis SANTRI.

create or replace function public.register_santri_profile(p_nama text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_profile_id uuid := auth.uid();
  normalized_nama text := btrim(p_nama);
begin
  if current_profile_id is null then
    raise exception 'Autentikasi diperlukan untuk membuat profile';
  end if;

  if normalized_nama is null or normalized_nama = '' then
    raise exception 'Nama lengkap wajib diisi';
  end if;

  if exists (select 1 from public.profiles where id = current_profile_id) then
    raise exception 'Profile untuk akun ini sudah ada' using errcode = 'unique_violation';
  end if;

  insert into public.profiles (id, nama, role, is_active)
  values (current_profile_id, normalized_nama, 'SANTRI', true);
end;
$function$;

revoke all on function public.register_santri_profile(text) from public;
grant execute on function public.register_santri_profile(text) to authenticated;

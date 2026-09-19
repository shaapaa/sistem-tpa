-- Hindari bentrok identifier dengan special SQL value CURRENT_ROLE.

create or replace function public.link_santri_by_identity(
  p_nama text,
  p_tanggal_lahir date,
  p_hubungan text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_profile_id uuid := auth.uid();
  v_current_role text;
  current_is_active boolean;
  normalized_nama text := btrim(p_nama);
  normalized_hubungan text := btrim(p_hubungan);
  matching_santri_ids uuid[];
  matching_count integer;
  matched_santri_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Autentikasi diperlukan untuk menghubungkan anak';
  end if;

  select p.role, p.is_active
  into v_current_role, current_is_active
  from public.profiles p
  where p.id = current_profile_id;

  if v_current_role is null then
    raise exception 'Profile untuk akun ini tidak ditemukan';
  end if;

  if v_current_role <> 'SANTRI' then
    raise exception 'Hanya akun orang tua/wali yang dapat menghubungkan anak';
  end if;

  if current_is_active is false then
    raise exception 'Akun ini tidak aktif';
  end if;

  if normalized_nama is null or normalized_nama = '' then
    raise exception 'Nama lengkap santri wajib diisi';
  end if;

  if p_tanggal_lahir is null then
    raise exception 'Tanggal lahir santri wajib diisi';
  end if;

  if normalized_hubungan is null
     or normalized_hubungan not in ('Ayah', 'Ibu', 'Wali') then
    raise exception 'Hubungan harus Ayah, Ibu, atau Wali';
  end if;

  select array_agg(candidate.id)
  into matching_santri_ids
  from (
    select s.id
    from public.santri s
    where s.is_active = true
      and lower(btrim(s.nama)) = lower(normalized_nama)
      and s.tanggal_lahir = p_tanggal_lahir
    limit 2
  ) candidate;

  matching_count := coalesce(cardinality(matching_santri_ids), 0);
  if matching_count = 0 then
    return 'not_found';
  end if;
  if matching_count > 1 then
    return 'ambiguous';
  end if;

  matched_santri_id := matching_santri_ids[1];
  if exists (
    select 1
    from public.wali_santri ws
    where ws.profile_id = current_profile_id
      and ws.santri_id = matched_santri_id
  ) then
    return 'already_linked';
  end if;

  begin
    insert into public.wali_santri (profile_id, santri_id, hubungan)
    values (current_profile_id, matched_santri_id, normalized_hubungan);
  exception
    when unique_violation then
      return 'already_linked';
  end;

  return 'linked';
end;
$function$;

revoke all on function public.link_santri_by_identity(text, date, text) from public;
grant execute on function public.link_santri_by_identity(text, date, text) to authenticated;

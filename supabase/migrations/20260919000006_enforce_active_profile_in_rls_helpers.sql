-- Akun nonaktif tidak boleh memperoleh role ataupun daftar santri melalui helper RLS.

create or replace function public.user_role()
returns text
language sql
security definer
stable
set search_path = ''
as $function$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active is true
  limit 1;
$function$;

create or replace function public.wali_santri_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $function$
  select coalesce(array_agg(ws.santri_id), array[]::uuid[])
  from public.wali_santri ws
  where ws.profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'SANTRI'
        and p.is_active is true
    );
$function$;

revoke all on function public.user_role() from public;
grant execute on function public.user_role() to authenticated;

revoke all on function public.wali_santri_ids() from public;
grant execute on function public.wali_santri_ids() to authenticated;

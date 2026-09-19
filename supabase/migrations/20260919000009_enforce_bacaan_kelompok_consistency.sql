-- Jenis bacaan harus selalu mengikuti kelompok santri saat ini.
-- Riwayat lama tidak diubah; validasi berlaku untuk insert dan perubahan bacaan berikutnya.

create or replace function public.validasi_jenis_bacaan_kelompok()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_kelompok_nama text;
  v_jenis_diharapkan text;
begin
  select k.nama
  into v_kelompok_nama
  from public.santri s
  join public.kelompok k on k.id = s.kelompok_id
  where s.id = new.santri_id;

  v_jenis_diharapkan := case v_kelompok_nama
    when 'A' then 'IQRA'
    when 'B' then 'QURAN'
    else null
  end;

  if v_jenis_diharapkan is null then
    raise exception 'Santri harus berada pada Kelompok A atau B sebelum perkembangan bacaan dicatat'
      using errcode = 'check_violation';
  end if;

  if new.jenis_bacaan <> v_jenis_diharapkan then
    raise exception 'Jenis bacaan % tidak sesuai dengan Kelompok %', new.jenis_bacaan, v_kelompok_nama
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;

drop trigger if exists validasi_jenis_bacaan_kelompok on public.perkembangan_bacaan;
create trigger validasi_jenis_bacaan_kelompok
  before insert or update of santri_id, jenis_bacaan on public.perkembangan_bacaan
  for each row execute function public.validasi_jenis_bacaan_kelompok();

-- Tetap pertahankan cakupan penugasan dan atribusi Pengajar di policy,
-- sekaligus menolak payload jenis bacaan yang tidak sesuai kelompok.
drop policy if exists "Pengajar insert bacaan" on public.perkembangan_bacaan;
create policy "Pengajar insert bacaan" on public.perkembangan_bacaan
  for insert
  with check (
    public.user_role() = 'PENGAJAR'
    and santri_id = any(public.pengajar_santri_ids())
    and pengajar_id = public.pengajar_id()
    and exists (
      select 1
      from public.santri s
      join public.kelompok k on k.id = s.kelompok_id
      where s.id = santri_id
        and ((k.nama = 'A' and jenis_bacaan = 'IQRA')
          or (k.nama = 'B' and jenis_bacaan = 'QURAN'))
    )
  );

drop policy if exists "Pengajar update bacaan" on public.perkembangan_bacaan;
create policy "Pengajar update bacaan" on public.perkembangan_bacaan
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
    and exists (
      select 1
      from public.santri s
      join public.kelompok k on k.id = s.kelompok_id
      where s.id = santri_id
        and ((k.nama = 'A' and jenis_bacaan = 'IQRA')
          or (k.nama = 'B' and jenis_bacaan = 'QURAN'))
    )
  );

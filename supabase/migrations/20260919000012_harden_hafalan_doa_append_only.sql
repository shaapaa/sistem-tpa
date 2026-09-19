-- Memperketat Hafalan Doa untuk pencatatan baru tanpa mengubah riwayat lama.

drop policy if exists "Pengajar update hafalan_doa" on public.perkembangan_hafalan_doa;

-- Jika data historis bersih, jadikan kolom benar-benar NOT NULL. Bila masih ada
-- nilai NULL, data lama dibiarkan apa adanya dan CHECK NOT VALID tetap menolak
-- NULL pada INSERT/UPDATE baru sampai pembersihan manual dilakukan.
do $do$
begin
  if exists (
    select 1
    from public.perkembangan_hafalan_doa
    where status is null
  ) then
    raise notice 'Status NULL ditemukan pada riwayat Hafalan Doa; kolom belum diubah menjadi NOT NULL.';

    if not exists (
      select 1
      from pg_constraint
      where conname = 'perkembangan_hafalan_doa_status_required'
        and conrelid = 'public.perkembangan_hafalan_doa'::regclass
    ) then
      alter table public.perkembangan_hafalan_doa
        add constraint perkembangan_hafalan_doa_status_required
        check (status is not null) not valid;
    end if;
  else
    alter table public.perkembangan_hafalan_doa
      alter column status set not null;
  end if;
end;
$do$;

create or replace function public.validasi_doa_aktif_untuk_hafalan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.doa d
    where d.id = new.doa_id
      and d.aktif is true
  ) then
    raise exception 'Doa tidak ditemukan atau sudah tidak aktif' using errcode = '23503';
  end if;

  return new;
end;
$function$;

drop trigger if exists validasi_doa_aktif_untuk_hafalan on public.perkembangan_hafalan_doa;
create trigger validasi_doa_aktif_untuk_hafalan
  before insert on public.perkembangan_hafalan_doa
  for each row execute function public.validasi_doa_aktif_untuk_hafalan();

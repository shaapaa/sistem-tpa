-- Memperjelas referensi kolom pada trigger cicilan hafalan.
-- Tanpa alias, PL/pgSQL dapat membaca santri_id sebagai referensi ambigu.

create or replace function public.validasi_jadwal_input_hari_ini()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_santri_id uuid;
begin
  if tg_table_name = 'hafalan_surat_cicilan' then
    select hs.santri_id into v_santri_id
    from public.hafalan_santri hs
    where hs.id = new.hafalan_santri_id;
  else
    v_santri_id := new.santri_id;
  end if;
  if new.tanggal <> (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Perkembangan hanya dapat dicatat untuk hari ini';
  end if;
  if not public.pengajar_boleh_input_santri_hari_ini(v_santri_id) then
    raise exception 'Pengajar tidak memiliki jadwal untuk sesi santri hari ini';
  end if;
  return new;
end;
$function$;

-- Trigger ini juga berjalan sebelum insert cicilan hafalan. Gunakan alias tabel
-- agar santri_id tidak berbenturan dengan variabel PL/pgSQL yang bernama sama.
create or replace function public.validasi_satu_penilaian_harian()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  v_santri_id uuid;
  v_key text;
  v_exists boolean;
begin
  if tg_table_name = 'hafalan_surat_cicilan' then
    select hs.santri_id into v_santri_id
    from public.hafalan_santri hs
    where hs.id = new.hafalan_santri_id;
    v_key := format('%s:%s:%s', v_santri_id, new.tanggal, 'HAFALAN_SURAT');
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(
      select 1
      from public.hafalan_surat_cicilan c
      join public.hafalan_santri hs on hs.id = c.hafalan_santri_id
      where hs.santri_id = v_santri_id and c.tanggal = new.tanggal
    ) into v_exists;
  elsif tg_table_name = 'perkembangan_hafalan_doa' then
    v_key := format('%s:%s:%s', new.santri_id, new.tanggal, 'HAFALAN_DOA');
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.perkembangan_hafalan_doa d where d.santri_id = new.santri_id and d.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'perkembangan_niat_salat' then
    v_key := format('%s:%s:%s:%s', new.santri_id, new.tanggal, 'NIAT_SALAT', new.jenis_salat_id);
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.perkembangan_niat_salat n where n.santri_id = new.santri_id and n.jenis_salat_id = new.jenis_salat_id and n.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'perkembangan_salat_komponen' then
    v_key := format('%s:%s:%s:%s', new.santri_id, new.tanggal, 'SALAT_KOMPONEN', new.komponen_salat_id);
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.perkembangan_salat_komponen s where s.santri_id = new.santri_id and s.komponen_salat_id = new.komponen_salat_id and s.tanggal = new.tanggal) into v_exists;
  elsif tg_table_name = 'praktik_salat' then
    v_key := format('%s:%s:%s:%s', new.santri_id, new.tanggal, 'PRAKTIK_SALAT', new.jenis_salat_id);
    perform pg_advisory_xact_lock(hashtext(v_key));
    select exists(select 1 from public.praktik_salat p where p.santri_id = new.santri_id and p.jenis_salat_id is not distinct from new.jenis_salat_id and p.tanggal = new.tanggal) into v_exists;
  else
    v_key := format('%s:%s:%s', new.santri_id, new.tanggal, tg_table_name);
    perform pg_advisory_xact_lock(hashtext(v_key));
    execute format('select exists(select 1 from public.%I where santri_id = $1 and tanggal = $2)', tg_table_name)
      into v_exists using new.santri_id, new.tanggal;
  end if;
  if v_exists then
    raise exception 'Data perkembangan ini sudah dinilai oleh pengajar lain.' using errcode = '23505';
  end if;
  return new;
end;
$function$;

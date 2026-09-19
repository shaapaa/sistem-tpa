-- Orang Tua membaca perkembangan Praktik Salat model baru melalui relasi wali_santri.
-- Tidak menambah hak tulis dan tidak mengubah data/model legacy.

create policy "Santri read gerakan salat" on public.perkembangan_gerakan_salat
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

create policy "Santri read gerakan salat komponen" on public.perkembangan_gerakan_salat_komponen
  for select
  using (
    public.user_role() = 'SANTRI'
    and perkembangan_gerakan_salat_id in (
      select g.id
      from public.perkembangan_gerakan_salat g
      where g.santri_id = any(public.wali_santri_ids())
    )
  );

create policy "Santri read niat salat" on public.perkembangan_niat_salat
  for select
  using (
    public.user_role() = 'SANTRI'
    and santri_id = any(public.wali_santri_ids())
  );

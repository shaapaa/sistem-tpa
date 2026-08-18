# Daily Attendance Table for Pengajar

## Goal

Give the pengajar a per-day attendance view: for a chosen Sesi + Tanggal, show all santri on that sesi with an automatically-derived status, and let the pengajar mark Izin/Sakit/Alpha (or Hadir) for santri who have no input that day.

## Design

On `/pengajar/presensi`:

- Keep the existing stats cards and history list below.
- Add a "Tabel Presensi Harian" section with filters: Sesi (Pagi/Sore) and Tanggal (DatePicker, default today).
- Load all santri for the selected Sesi.
- For each santri, derive status:
  - HADIR if a `perkembangan_santris` row exists for that student on the selected date, OR an `absensis` HADIR row exists for that date.
  - Otherwise `Belum diinput`.
- Persist status by upserting into `absensis` (meeting_id, student_id, teacher_id, status), reusing the existing `(meeting_id, student_id)` conflict target.
- A meeting is created/loaded for the pengajar's jadwal on that day (PAGI vs SORE based on the selected sesi) if none exists.
- Each row shows the santri name, current status badge, and action buttons (Hadir, Izin, Sakit, Alpha). Saving updates the row in place.
- Keep a loading state and empty state when no sesi/tanggal or no santri.

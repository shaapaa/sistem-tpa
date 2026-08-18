# Quiet Institutional Redesign

## Goal

Give every existing page a cohesive, premium institutional interface that feels like a serious education operations system rather than a generic card dashboard, without changing business behavior or the existing Supabase data model.

## Visual Direction

- Palette: warm paper background, charcoal ink, forest green primary accent, amber only for attention states.
- Typography: existing Geist family; semibold hierarchy, tighter display tracking, tabular data figures.
- Surfaces: flat panels and separators by default; shadows reserved for dialogs, popovers, and floating elements.
- Layout: desktop sidebar rail around 240px, content max-width around 1280px, mobile top identity plus bottom navigation.
- Motion: short opacity/transform transitions only; no decorative animation that slows data entry.
- Accessibility: visible focus rings, semantic landmarks, action labels, and no hover-only actions.

## Page Structure

### Shared

- `PageHeader`: title, concise description, optional back link, and primary action.
- `SectionHeader`: section label, count, filters, and action aligned on one baseline.
- `MetricRail`: compact operational metrics with links instead of four identical cards.
- `FilterBar`: search, session, period, and type controls; inline desktop and stacked mobile.
- `EntityRow`: square avatar, identity, metadata, status, and always-visible actions.
- `StatusBadge`: one visual mapping for attendance and development assessment.
- `EmptyState`: contextual copy and a directly relevant CTA.
- `Dialog`: create/edit and destructive confirmation only; validation and server errors appear as clear inline/dialog feedback.

### Admin

- Dashboard: metric rail, attendance chart, recent activity, and linked metrics.
- Santri and pengajar: searchable entity rows/cards with visible edit/delete controls and compact metadata.
- Kelas: grouped Pagi/Sore sections, all groups shown, teacher assignment and class details visible.
- Jadwal: weekday board with teacher, session, and time; no empty oversized columns.
- Users: compact management table with explicit role and action states.

### Pengajar

- Dashboard: today's schedule, students needing input, and current progress status.
- Jadwal: readable Hari/Sesi/Jam table, scoped to the logged-in teacher.
- Perkembangan: session selector, searchable student list, then focused Bacaan/Hafalan/Praktik Sholat workflow.
- Rekap Perkembangan: filterable timeline/list with student, date, type, assessment, and notes.
- Presensi: period filters, summary, and status rows; development input continues to mark the related student present.
- Laporan: report-like layout with period filters, generated records, editable teacher notes, and export.

### Orang Tua

- Dashboard: child identity, attendance percentage, reading summary, memorization summary, and a shared period filter.
- Anak: structured child information sections.
- Laporan: printable report structure with attendance summary, development timeline, and teacher notes.

## Interaction Rules

- Edit/delete actions are always visible on desktop and mobile.
- Every mutation has saving, success, and specific error feedback.
- No browser `alert()` or `confirm()` calls.
- Empty and loading states match the shape of the content they replace.
- Existing RLS, role guards, CRUD behavior, and Supabase queries remain intact unless a change is strictly needed to support the visual structure.

## Scope

- Redesign all existing admin, pengajar, orang tua, login, shared layout, and shared UI primitives.
- Keep Next.js, Tailwind CSS v4, Base UI, Recharts, and current dependencies.
- Do not add a new design framework or rewrite the backend.
- Verify desktop and mobile layouts, all role routes, CRUD controls, and build output after implementation.

## Self-Review

- No placeholder or undecided requirements remain.
- The visual direction is consistent across all roles.
- Role-specific page structures preserve the current domain workflows.
- Mobile behavior is explicit and does not depend on hover.
- No database migration is required for the redesign itself.

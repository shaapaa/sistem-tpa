# Quiet Institutional Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every existing TPA page into a Quiet Institutional interface that feels deliberate and education-focused instead of a generic card dashboard, while preserving Supabase workflows and role behavior.

**Architecture:** Keep the current Next.js App Router, Base UI primitives, Tailwind v4, and Supabase queries. Establish a small shared visual layer first (`PageHeader`, `SectionHeader`, `MetricRail`, `FilterBar`, `EntityRow`, and status utilities), then migrate layouts and role pages in batches. Existing page-level data fetching remains in place unless a query must change to support the visual composition.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Base UI, Supabase, Recharts, Geist.

## Global Constraints

- Use the approved **Quiet Institutional** direction: warm paper, charcoal ink, forest green primary accent, amber only for attention states.
- Do not introduce another UI framework, animation package, icon package, or chart package.
- Preserve existing Supabase tables, RLS, role guards, CRUD behavior, and backend contracts.
- Use semantic landmarks and visible keyboard focus states.
- Edit/delete actions must be visible without hover on desktop and mobile.
- Do not use browser `alert()` or `confirm()`.
- Every changed page must be checked at desktop and mobile widths.
- Do not create commits automatically; leave commit decisions to the user.

---

## File Map

- Modify `src/app/globals.css`: tokens, typography, surface rules, spacing, focus, motion, and responsive utilities.
- Modify `src/components/layout/app-shell.tsx`: shared content frame and responsive shell spacing.
- Modify `src/components/layout/sidebar.tsx`: institutional rail and role identity treatment.
- Modify `src/components/layout/mobile-nav.tsx`: mobile bottom navigation with visible labels and active state.
- Create `src/components/layout/page-header.tsx`: reusable page title/action header.
- Create `src/components/layout/section-header.tsx`: reusable section title/count/filter row.
- Create `src/components/layout/metric-rail.tsx`: compact linked metrics.
- Create `src/components/layout/filter-bar.tsx`: responsive filter/search wrapper.
- Create `src/components/layout/entity-row.tsx`: reusable santri/pengajar/user row treatment.
- Modify `src/components/ui/card.tsx`, `button.tsx`, `badge.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `table.tsx`, `tabs.tsx`: remove generic surface defaults and align primitives to the new visual language.
- Modify `src/app/login/page.tsx`: focused institutional sign-in composition.
- Modify `src/app/admin/page.tsx`, `santri/page.tsx`, `pengajar/page.tsx`, `users/page.tsx`, `kelas/page.tsx`, `jadwal/page.tsx`: admin redesign batch.
- Modify `src/app/pengajar/page.tsx`, `jadwal/page.tsx`, `perkembangan/page.tsx`, `rekap-perkembangan/page.tsx`, `presensi/page.tsx`, `laporan/page.tsx`: pengajar redesign batch.
- Modify `src/app/orang-tua/page.tsx`, `anak/page.tsx`, `laporan/page.tsx`: parent redesign batch.
- Modify `src/lib/format.ts`: shared status/session display helpers where needed.

## Verification Helpers

- Build: `npm run build`
- Route smoke test: request `/login`, `/admin`, `/admin/santri`, `/admin/pengajar`, `/admin/kelas`, `/admin/jadwal`, `/pengajar`, `/pengajar/jadwal`, `/pengajar/perkembangan`, `/pengajar/presensi`, `/pengajar/laporan`, `/orang-tua`, `/orang-tua/anak`, `/orang-tua/laporan` and require HTTP 200.
- Playwright role smoke test: log in as admin, pengajar, and orang tua; assert page headers, active navigation, visible action controls, and mobile bottom navigation.

---

### Task 1: Establish the Visual Foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/ui/tabs.tsx`
- Create: `src/components/layout/page-header.tsx`
- Create: `src/components/layout/section-header.tsx`
- Create: `src/components/layout/metric-rail.tsx`
- Create: `src/components/layout/filter-bar.tsx`
- Create: `src/components/layout/entity-row.tsx`

**Interfaces:**
- `PageHeader({ eyebrow?, title, description?, backHref?, action? })` renders a semantic header with one primary action.
- `SectionHeader({ title, description?, count?, actions? })` aligns section metadata and controls.
- `MetricRail({ items })` accepts `{ label, value, detail?, href?, tone? }[]` and renders compact linked metrics.
- `FilterBar({ children })` provides responsive layout only; filters remain controlled by their page.
- `EntityRow({ initials, title, meta?, badges?, actions? })` renders always-visible actions.

- [ ] **Step 1: Replace the current token hierarchy**
  - Set warm paper background, charcoal foreground, forest primary, restrained secondary/muted surfaces, and consistent border hue.
  - Keep Geist variables and tabular numerals.
  - Add `.surface-panel`, `.surface-inset`, `.metric-rail`, `.focus-ring`, and responsive spacing utilities.
  - Remove generic card shadow as the default surface treatment.

- [ ] **Step 2: Update primitives**
  - Make `Card` flat by default and use elevation only where passed explicitly.
  - Keep button states physical but reduce pill-like styling.
  - Make input/select/dialog focus states visibly consistent.
  - Keep badges compact and square-rounded rather than fully pill-shaped for neutral metadata.

- [ ] **Step 3: Add shared layout components**
  - Implement the five interfaces above with semantic elements.
  - Make actions keyboard reachable and visible at all breakpoints.

- [ ] **Step 4: Run verification**

```bash
npm run build
```

Expected: successful compilation with no TypeScript errors.

---

### Task 2: Redesign the Application Shell and Login

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/mobile-nav.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Recompose desktop shell**
  - Use a narrow institutional rail with clearer role identity and active route marker.
  - Keep the main content max-width and reduce empty horizontal stretch.

- [ ] **Step 2: Recompose mobile shell**
  - Keep bottom navigation labels visible.
  - Add safe-area spacing and prevent content from being covered.
  - Ensure all actions remain visible without hover.

- [ ] **Step 3: Redesign login**
  - Use a quiet split composition: identity panel and focused sign-in panel.
  - Remove decorative generic blocks; keep error feedback inline/dialog-based.

- [ ] **Step 4: Verify role shell and login**
  - Confirm unauthenticated protected routes redirect to `/login`.
  - Confirm each role gets the correct nav after login.

---

### Task 3: Redesign Admin Pages

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/santri/page.tsx`
- Modify: `src/app/admin/pengajar/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/kelas/page.tsx`
- Modify: `src/app/admin/jadwal/page.tsx`

- [ ] **Step 1: Recompose dashboard**
  - Replace the repeated four-card row with `MetricRail`.
  - Keep the attendance chart but give it a clear panel hierarchy and readable legend.
  - Add a recent-activity/list area if current data can support it without a new query model.
  - Preserve metric links to their destination pages.

- [ ] **Step 2: Recompose santri and pengajar management**
  - Use `PageHeader`, `FilterBar`, and `EntityRow`.
  - Keep edit/delete actions permanently visible.
  - Preserve current form fields, ConfirmDialog behavior, password visibility, and rollback/error messages.

- [ ] **Step 3: Recompose users table**
  - Make role and account status visually scannable.
  - Keep responsive fallback rows on mobile instead of forcing an oversized table.

- [ ] **Step 4: Recompose kelas**
  - Keep Pagi/Sore grouping, show every group, assigned teacher, level, and actions.
  - Use the existing `group_pengajars` join query; do not add a direct `pengajar_id` column to groups.

- [ ] **Step 5: Recompose jadwal**
  - Use the weekday board with teacher/session/time rows.
  - Keep the current Pagi/Sore time mapping and visible edit/delete controls.

- [ ] **Step 6: Verify admin workflows**
  - Playwright: open all admin routes, open santri/pengajar/kelas/jadwal dialogs, assert visible actions and no browser dialogs.

---

### Task 4: Redesign Pengajar Pages

**Files:**
- Modify: `src/app/pengajar/page.tsx`
- Modify: `src/app/pengajar/jadwal/page.tsx`
- Modify: `src/app/pengajar/perkembangan/page.tsx`
- Modify: `src/app/pengajar/rekap-perkembangan/page.tsx`
- Modify: `src/app/pengajar/presensi/page.tsx`
- Modify: `src/app/pengajar/laporan/page.tsx`

- [ ] **Step 1: Recompose dashboard**
  - Prioritize today's schedule and pending input status over generic stat cards.

- [ ] **Step 2: Recompose jadwal and presensi**
  - Use readable table/list rows with session grouping and period filters.
  - Keep teacher-scoped RLS queries and auto-attendance behavior.

- [ ] **Step 3: Recompose perkembangan workflow**
  - Keep Pagi/Sore selector, santri search list, and three input tabs.
  - Use a selected-student header with current session and attendance status.
  - Keep Iqra/Quran, hafalan, sholat, assessment, notes, and save feedback.

- [ ] **Step 4: Recompose rekap and laporan**
  - Use a timeline/list treatment for development records.
  - Treat editable teacher notes as a report block, not an isolated generic card.
  - Keep export action and filters.

- [ ] **Step 5: Verify pengajar workflows**
  - Playwright: login, navigate each route, select session/student, assert development controls, period controls, and report note controls.

---

### Task 5: Redesign Orang Tua Pages

**Files:**
- Modify: `src/app/orang-tua/page.tsx`
- Modify: `src/app/orang-tua/anak/page.tsx`
- Modify: `src/app/orang-tua/laporan/page.tsx`

- [ ] **Step 1: Recompose dashboard**
  - Use child identity header, asymmetric progress summaries, and one shared period filter.

- [ ] **Step 2: Recompose child detail**
  - Use structured information sections with a clear primary identity block.

- [ ] **Step 3: Recompose report**
  - Present attendance, development timeline, and teacher notes in a printable hierarchy.
  - Keep export action and empty state.

- [ ] **Step 4: Verify parent workflows**
  - Playwright: login, assert dashboard metrics/filter, open child detail, open report, assert teacher-note and export controls.

---

### Task 6: Whole-App Verification

**Files:**
- Modify only if verification finds a visual regression.

- [ ] **Step 1: Run build**

```bash
npm run build
```

- [ ] **Step 2: Run route smoke test**
  - Require HTTP 200 for login and every admin, pengajar, and orang tua route.

- [ ] **Step 3: Run Playwright desktop checks**
  - Verify all role headers, active navigation, visible actions, forms, empty/loading/error states, and report controls.

- [ ] **Step 4: Run Playwright mobile checks**
  - Use a 390px viewport and verify bottom navigation, visible edit/delete buttons, readable rows, dialogs, and no horizontal layout break.

- [ ] **Step 5: Inspect repository state**
  - Confirm no build logs, browser caches, test data, or secrets are added.
  - Do not commit automatically.

## Self-Review

- All pages are covered by Tasks 2–5.
- Existing role/data workflows are explicitly preserved.
- Mobile behavior and visible actions are explicit.
- No new dependency or schema migration is required.
- Verification includes build, route smoke, desktop Playwright, and mobile Playwright.
- No placeholders or unresolved design choices remain.

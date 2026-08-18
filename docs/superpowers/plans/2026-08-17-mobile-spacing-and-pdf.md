# Mobile Spacing and A4 PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the role dashboards and related mobile UI, replace native date inputs, and generate direct A4 PDF reports with an institutional header.

**Architecture:** Keep the existing layout and page architecture. Make shared spacing/card/date behavior reusable in existing components, and put PDF creation in one client-safe report utility consumed by both report pages.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Base UI/shadcn components, Supabase, `jsPDF`, `jspdf-autotable`.

## Global Constraints

- Preserve the Quiet Institutional typography, palette, and existing route behavior.
- Do not invent address or contact details for the report header.
- Mobile dashboard cards must optimize vertical space without harming tap targets.
- PDF output must be A4 portrait and save directly as `.pdf` in the browser.
- Do not commit automatically.

---

### Task 1: Add PDF dependencies and shared report helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/report-pdf.ts`

**Interfaces:**
- Produces `createReportPdf(options)` for both report pages.
- Produces `loadLogoDataUrl()` that returns `Promise<string | null>`.

- [ ] **Step 1: Add the two browser PDF dependencies**

Run:

```bash
npm install jspdf jspdf-autotable
```

- [ ] **Step 2: Implement shared PDF types and logo loading**

Use `new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })`, load `/logo-mark.svg` through `fetch`, convert the response to a data URL, and catch failures so text-only output remains possible.

- [ ] **Step 3: Implement the kop and table helpers**

The helper must draw the logo when available, then draw:

```text
TPA BAITUL YATAMA
SISTEM MONITORING PENDIDIKAN
```

Draw a separator line, report title, metadata, and use `autoTable(doc, { head, body, margin, pageBreak: "auto", showHead: "everyPage" })` for tables. Use `doc.save(filename)` at the end.

- [ ] **Step 4: Run the build**

Run: `npm run build`

Expected: TypeScript and Next.js build pass.

---

### Task 2: Compact shared dashboard metrics and spacing

**Files:**
- Modify: `src/components/layout/metric-rail.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/pengajar/page.tsx`
- Modify: `src/app/orang-tua/page.tsx`
- Modify: relevant empty-state blocks in `src/app/pengajar/presensi/page.tsx`, `src/app/pengajar/rekap-perkembangan/page.tsx`, `src/app/admin/kelas/page.tsx`, and `src/app/orang-tua/laporan/page.tsx`

**Interfaces:**
- Keeps the existing `MetricRail` item interface.
- No data query or route changes.

- [ ] **Step 1: Make `MetricRail` two columns by default**

Change the grid to `grid-cols-2 divide-x divide-y`, keep `lg:grid-cols-4`, and reduce default item padding while preserving larger `sm` padding.

- [ ] **Step 2: Compact dashboard wrapper spacing**

Use `space-y-6` and `gap-6` on admin and pengajar dashboard roots/sections. Reduce the shell mobile container padding to `py-5` while retaining desktop spacing.

- [ ] **Step 3: Make orang tua summary cards 2x2 on mobile**

Change the card grid to `grid-cols-2`, use compact card header/content padding, and remove the mobile behavior that makes the fourth card occupy a desktop-only span.

- [ ] **Step 4: Reduce only excessive empty-state padding**

Use `p-5 sm:p-8` in identified empty states and keep the existing visual treatment.

- [ ] **Step 5: Build and inspect class output**

Run: `npm run build`

Expected: Build passes and all dashboard routes still compile.

---

### Task 3: Fix pengajar schedule, development tabs, summary cards, and sidebar state

**Files:**
- Modify: `src/app/pengajar/page.tsx`
- Modify: `src/app/pengajar/perkembangan/page.tsx`
- Modify: `src/app/pengajar/presensi/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- No changes to Supabase data shape or event handlers.

- [ ] **Step 1: Normalize schedule typography**

Set schedule session labels to `text-sm font-medium` and metadata to `text-xs`, with compact row padding on mobile and current desktop padding at `sm`.

- [ ] **Step 2: Make development tabs mobile-safe**

Use `min-h-12 h-auto`, `grid-cols-3`, compact `px-1`, and `text-xs sm:text-sm`. Keep icons at `h-4 w-4` and allow labels to wrap only if needed.

- [ ] **Step 3: Rebuild presensi summary cards as horizontal content**

Use a card content row with icon block followed by label and value. Keep status colors, but ensure the number is directly below the label in the same content column.

- [ ] **Step 4: Remove sidebar inset accent**

Remove `shadow-[inset_3px_0_0_oklch(...)]` and the active-only icon accent class. Keep active background and light foreground.

- [ ] **Step 5: Run the build**

Run: `npm run build`

Expected: Build passes with no changed behavior outside presentation.

---

### Task 4: Add reusable shadcn-style date picker and replace native inputs

**Files:**
- Create: `src/components/ui/date-picker.tsx`
- Modify: `src/app/pengajar/laporan/page.tsx`
- Modify: `src/app/pengajar/rekap-perkembangan/page.tsx`
- Modify: `src/app/pengajar/presensi/page.tsx`
- Modify: `src/app/admin/santri/page.tsx`

**Interfaces:**
- `DatePickerProps`: `value: string`, `onChange: (value: string) => void`, `placeholder?: string`, `disabled?: boolean`.
- Date values remain `YYYY-MM-DD` strings for existing Supabase filters/forms.

- [ ] **Step 1: Implement the local calendar popover**

Use the existing Base UI/shadcn primitives and native `Date` calculations. Render a button trigger showing the formatted selected date and a small calendar grid with previous/next month controls. Selecting a day emits an ISO date string.

- [ ] **Step 2: Replace report and recap date inputs**

Replace each `Input type="date"` with `DatePicker` while preserving state names and query filters.

- [ ] **Step 3: Replace the santri birth-date input**

Use the same component and keep the existing form value contract.

- [ ] **Step 4: Search for remaining native date inputs**

Run:

```bash
rg 'type="date"' src
```

Expected: no remaining native date input in application pages.

---

### Task 5: Convert both report exports to direct A4 PDFs

**Files:**
- Modify: `src/app/orang-tua/laporan/page.tsx`
- Modify: `src/app/pengajar/laporan/page.tsx`
- Modify: `src/lib/report-pdf.ts`

**Interfaces:**
- Both page handlers call the shared helper and pass page-specific metadata/table rows.

- [ ] **Step 1: Remove HTML blob export logic**

Delete the current `Blob`/`.html` download handlers and HTML string generators from both report pages.

- [ ] **Step 2: Build the orang tua report payload**

Pass student name, group, print date, attendance summary, and development rows to the PDF helper. Preserve the existing detail mapping for bacaan, hafalan, and sholat.

- [ ] **Step 3: Build the pengajar report payload**

Pass current filters, grouped student rows, and saved teacher note to the PDF helper. Keep grouped sections represented by student name rows or section headings.

- [ ] **Step 4: Save direct `.pdf` files**

Use filenames `laporan-${student}-${date}.pdf` and `laporan-perkembangan-${date}.pdf`, sanitized for filesystem-safe characters.

- [ ] **Step 5: Build and verify generated PDF structure**

Run: `npm run build`.

Then manually click both report buttons in a browser and verify a PDF downloads with A4 pages, kop, metadata, and table content.

---

### Task 6: Full verification

**Files:**
- No new files.

- [ ] **Step 1: Run build and lint**

Run: `npm run build` and `npm run lint`.

- [ ] **Step 2: Run mobile route checks**

Verify `/admin`, `/pengajar`, `/orang-tua`, `/pengajar/perkembangan`, `/pengajar/presensi`, and `/pengajar/rekap-perkembangan` at a 390px viewport. Confirm no horizontal overflow and expected 2-column card layouts.

- [ ] **Step 3: Verify desktop visual consistency**

Verify sidebar active state has no left accent line, schedule typography matches surrounding text, and summary cards align icon/label/value without empty top space.

- [ ] **Step 4: Verify PDF downloads**

Download one orang tua report and one pengajar report; confirm both are `.pdf` files and open successfully.

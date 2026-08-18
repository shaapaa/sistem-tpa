# Mobile Spacing and A4 PDF Design

## Goals

- Make dashboard metric cards efficient on mobile without changing desktop hierarchy.
- Apply the same compact visual language to admin, pengajar, and orang tua dashboards.
- Replace oversized or vertically wasteful dashboard sections found during the spacing audit.
- Make report downloads generate actual A4 PDF files directly from the browser.
- Keep the existing quiet institutional typography, colors, and component patterns.

## Layout Changes

`MetricRail` will use two columns at the default breakpoint and four columns at `lg`. Its item padding will be reduced on small screens. This gives admin four metrics in a 2x2 layout and keeps the two pengajar metrics side by side.

The orang tua dashboard's four summary cards will use the same 2x2 mobile behavior and compact card content. Dashboard-level vertical spacing will use `space-y-6` and `gap-6` where the current `space-y-8`/`gap-8` creates unnecessary scroll length. Empty states will use compact padding on mobile and retain larger padding from `sm` upward.

Pengajar schedule rows will use an explicit small title and smaller metadata text. The development tabs will use a taller responsive trigger row with compact mobile typography so labels remain tappable without clipping.

Presensi summary cards will use a horizontal icon/content layout at all sizes. The icon, label, and value will remain grouped instead of relying on card flow that leaves empty space above the values.

The active sidebar item will retain its background and foreground contrast but lose the inset accent line. This keeps the active state aligned with the quiet institutional visual language.

## Date Picker

All report-related date filters will use a local shadcn-style calendar popover component instead of native `input[type=date]`. The selected value will remain an ISO date string so existing Supabase filters do not change.

The date picker will be reused in pengajar laporan, rekap perkembangan, and presensi filters. The santri birth-date form will use the same component where applicable.

## PDF Export

The two existing report exports will be replaced with client-side PDF generation using `jsPDF` and `jspdf-autotable`.

Each generated document will be A4 portrait with consistent margins and automatic table page breaks. The header will include the existing logo, `TPA BAITUL YATAMA`, `SISTEM MONITORING PENDIDIKAN`, a separator line, report title, student/group or filter metadata, and print date. No address or contact data will be invented because none exists in the current project.

The orang tua report will include attendance summary and the child's development table. The pengajar report will include grouped development tables and the saved teacher note. Filenames will use the current report type and ISO date.

The logo SVG will be loaded as a data URL before PDF creation. If loading fails, PDF generation will continue with the text header.

## Verification

- Build and TypeScript check pass.
- Mobile dashboard checks confirm admin and orang tua cards are 2x2 and pengajar metrics are side by side.
- No report page retains native date inputs.
- PDF export produces a `.pdf` file and includes A4 page dimensions, kop, metadata, and table content.
- Existing route smoke tests remain passing.

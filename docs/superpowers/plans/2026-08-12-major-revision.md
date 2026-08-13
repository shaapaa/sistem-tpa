# TPA Baitul Yatama - Major Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise all 3 role dashboards (Admin, Pengajar, Orang Tua) with new features: charts, development tracking, attendance auto-input, reports, PDF export, and enhanced forms.

**Architecture:** 
- Schema migration: add new columns to santris (pekerjaan_orang_tua, iuran, keterangan, pendidikan_saat_ini)
- New tables: perkembangan_santris (unified development tracking), praktik_sholat_santris (simplified prayer practice)
- Pengajar gets full CRUD for development input with auto-attendance
- Orang Tua gets dashboard with stats + report with PDF
- Admin gets dashboard charts + enhanced forms + delete capability

**Tech Stack:** Next.js 16, Supabase, shadcn/ui, Lucide React, recharts (for charts), @react-pdf/renderer (for PDF)

---

## Phase 1: Database Schema Migration

### Task 1.1: Add new columns to santris table

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/001_add_santri_fields.sql`

**Steps:**

- [ ] **Step 1: Create migration file**

```sql
-- Migration: Add new fields to santris table
ALTER TABLE santris 
  ADD COLUMN pekerjaan_ayah text,
  ADD COLUMN pekerjaan_ibu text,
  ADD COLUMN iuran numeric(10,2) DEFAULT 0,
  ADD COLUMN keterangan text CHECK (keterangan IN ('IQRA', 'QURAN')),
  ADD COLUMN pendidikan_saat_ini text;
```

- [ ] **Step 2: Update schema.sql to reflect new columns**

Update the santris table definition in schema.sql to include the new columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add new fields to santris table"
```

---

### Task 1.2: Create perkembangan_santris table

**Files:**
- Create: `supabase/migrations/002_create_perkembangan_table.sql`

**Steps:**

- [ ] **Step 1: Create migration file**

```sql
-- Unified development tracking table
CREATE TABLE perkembangan_santris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES santris(id) ON DELETE RESTRICT,
  teacher_id uuid REFERENCES pengajars(id) ON DELETE RESTRICT,
  meeting_id uuid REFERENCES pertemuans(id) ON DELETE RESTRICT,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  tipe_perkembangan text NOT NULL CHECK (tipe_perkembangan IN ('BACAAN', 'HAFALAN', 'PRAKTIK_SHOLAT')),
  
  -- For BACAAN type
  jenis_bacaan text CHECK (jenis_bacaan IN ('IQRA', 'QURAN')),
  iqra_ke int,
  halaman_iqra int,
  juz int,
  surah text,
  
  -- For HAFALAN type
  nama_surah text,
  nama_doa text,
  
  -- For PRAKTIK_SHOLAT type
  jenis_sholat text,
  
  -- Common fields
  penilaian text CHECK (penilaian IN ('BAIK', 'CUKUP_BAIK', 'KURANG')),
  catatan text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_perkembangan_student ON perkembangan_santris(student_id);
CREATE INDEX idx_perkembangan_teacher ON perkembangan_santris(teacher_id);
CREATE INDEX idx_perkembangan_tanggal ON perkembangan_santris(tanggal);
CREATE INDEX idx_perkembangan_tipe ON perkembangan_santris(tipe_perkembangan);

-- RLS
ALTER TABLE perkembangan_santris ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE policy "Admin perkembangan" ON perkembangan_santris FOR ALL USING (public.user_role() = 'ADMIN');

-- Pengajar: read/write their assigned groups
CREATE policy "Pengajar write perkembangan" ON perkembangan_santris FOR ALL 
  USING (public.user_role() = 'PENGAJAR' AND public.pengajar_in_group((SELECT group_id FROM santris WHERE id = student_id)));

-- Orang Tua: read-only their linked child
CREATE policy "Orang Tua read perkembangan" ON perkembangan_santris FOR SELECT 
  USING (public.user_role() = 'ORANG_TUA' AND student_id = public.anak_id());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: create perkembangan_santris table"
```

---

## Phase 2: Pengajar Pages

### Task 2.1: Update Pengajar Sidebar Navigation

**Files:**
- Modify: `src/lib/constants.ts`

**Steps:**

- [ ] **Step 1: Update pengajarNav**

```typescript
export const pengajarNav: NavItem[] = [
  { label: "Dashboard", href: "/pengajar", iconName: "LayoutDashboard" },
  { label: "Jadwal", href: "/pengajar/jadwal", iconName: "Calendar" },
  { label: "Perkembangan", href: "/pengajar/perkembangan", iconName: "TrendingUp" },
  { label: "Presensi", href: "/pengajar/presensi", iconName: "ClipboardCheck" },
  { label: "Laporan", href: "/pengajar/laporan", iconName: "FileText" },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: update pengajar sidebar navigation"
```

---

### Task 2.2: Create Perkembangan Page (Input Form)

**Files:**
- Create: `src/app/pengajar/perkembangan/page.tsx`

**Features:**
- Select group → select santri
- Tabs: Bacaan, Hafalan, Praktik Sholat
- Bacaan tab: dropdown jenis (Iqra/Quran)
  - If Iqra: dropdown 1-6, input halaman
  - If Quran: searchable dropdown Juz + Surah
  - Rating: Baik, Cukup Baik, Kurang
  - Catatan textarea
- Hafalan tab: input nama surah/doa, rating, catatan
- Praktik Sholat tab: dropdown jenis sholat, rating, catatan
- Auto-create attendance record when saving development

- [ ] **Step 1: Create page with form structure**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, BookOpen, BookMarked, Mic, Moon, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ... implementation
```

- [ ] **Step 2: Implement form logic with auto-attendance**

- [ ] **Step 3: Commit**

```bash
git add src/app/pengajar/perkembangan/
git commit -m "feat: create perkembangan input page for pengajar"
```

---

### Task 2.3: Create Rekap Perkembangan Page

**Files:**
- Create: `src/app/pengajar/rekap-perkembangan/page.tsx`

**Features:**
- List of all development entries
- Filter by date range, group, santri
- Show: nama, tanggal, tipe perkembangan, keterangan
- Editable (can update catatan)

- [ ] **Step 1: Create page with table/list view**

- [ ] **Step 2: Implement filtering**

- [ ] **Step 3: Commit**

```bash
git add src/app/pengajar/rekap-perkembangan/
git commit -m "feat: create rekap perkembangan page"
```

---

### Task 2.4: Update Presensi Page with Auto-Input

**Files:**
- Modify: `src/app/pengajar/absensi/page.tsx` (rename to presensi)

**Features:**
- When teacher saves perkembangan, auto-set attendance to HADIR
- Show recap by period (date range filter)
- Manual override available

- [ ] **Step 1: Update page to show auto-attendance status**

- [ ] **Step 2: Add period filter**

- [ ] **Step 3: Commit**

```bash
git add src/app/pengajar/
git commit -m "feat: update presensi with auto-input and period filter"
```

---

### Task 2.5: Create Laporan Perkembangan Page

**Files:**
- Create: `src/app/pengajar/laporan/page.tsx`

**Features:**
- Auto-generated report from development inputs
- Editable (teacher can add notes)
- Print/Export functionality

- [ ] **Step 1: Create report page**

- [ ] **Step 2: Implement PDF export**

- [ ] **Step 3: Commit**

```bash
git add src/app/pengajar/laporan/
git commit -m "feat: create laporan perkembangan page"
```

---

## Phase 3: Orang Tua Pages

### Task 3.1: Redesign Orang Tua Dashboard

**Files:**
- Modify: `src/app/orang-tua/page.tsx`

**Features:**
- Attendance percentage card
- Memorization recap card
- Quran/Iqra reading recap card
- Period filter (weekly, monthly, custom)

- [ ] **Step 1: Create dashboard with stats cards**

```tsx
// Stats cards with percentages
// Period filter dropdown
// Charts for visual representation
```

- [ ] **Step 2: Implement data fetching**

- [ ] **Step 3: Commit**

```bash
git add src/app/orang-tua/page.tsx
git commit -m "feat: redesign orang tua dashboard with stats"
```

---

### Task 3.2: Create Laporan Page for Orang Tua

**Files:**
- Create: `src/app/orang-tua/laporan/page.tsx`

**Features:**
- Overall recap of child's progress
- Teacher notes (catatan pengajar)
- PDF download button

- [ ] **Step 1: Create report page**

- [ ] **Step 2: Implement PDF generation**

- [ ] **Step 3: Commit**

```bash
git add src/app/orang-tua/laporan/
git commit -m "feat: create laporan page for orang tua with PDF export"
```

---

### Task 3.3: Update Orang Tua Navigation

**Files:**
- Modify: `src/lib/constants.ts`

**Steps:**

- [ ] **Step 1: Add Laporan to orangTuaNav**

```typescript
export const orangTuaNav: NavItem[] = [
  { label: "Dashboard", href: "/orang-tua", iconName: "LayoutDashboard" },
  { label: "Anak", href: "/orang-tua/anak", iconName: "Baby" },
  { label: "Progres", href: "/orang-tua/progres", iconName: "BarChart3" },
  { label: "Laporan", href: "/orang-tua/laporan", iconName: "FileText" },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add laporan to orang tua navigation"
```

---

## Phase 4: Admin Pages

### Task 4.1: Add Charts to Admin Dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`
- Install: `recharts`

**Features:**
- Chart showing attendance trends
- Chart showing student distribution
- Cards link to respective pages

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Create charts component**

- [ ] **Step 3: Update dashboard to link cards**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx package.json package-lock.json
git commit -m "feat: add charts to admin dashboard with linked cards"
```

---

### Task 4.2: Update Santri Form

**Files:**
- Modify: `src/app/admin/santri/page.tsx`

**Features:**
- Add: Pekerjaan Orang Tua (ayah & ibu)
- Add: Iuran/Infaq (dropdown 25, 50, 75, 100)
- Add: Keterangan (dropdown IQRA/QURAN)
- Add: Pendidikan Saat Ini (text input)
- Add: Delete button

- [ ] **Step 1: Update form with new fields**

- [ ] **Step 2: Implement delete functionality**

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/santri/page.tsx
git commit -m "feat: update santri form with new fields and delete"
```

---

### Task 4.3: Add Delete to Pengajar Management

**Files:**
- Modify: `src/app/admin/pengajar/page.tsx`

**Features:**
- Add delete button for each pengajar
- Confirmation dialog before delete

- [ ] **Step 1: Add delete button and handler**

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/pengajar/page.tsx
git commit -m "feat: add delete functionality to pengajar management"
```

---

### Task 4.4: Redesign Admin Jadwal Page

**Files:**
- Modify: `src/app/admin/jadwal/page.tsx`

**Features:**
- Similar layout to kelas page
- Group by day with clear time slots
- Easy add/edit/delete

- [ ] **Step 1: Redesign page layout**

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/jadwal/page.tsx
git commit -m "feat: redesign admin jadwal page"
```

---

## Phase 5: PDF Export

### Task 5.1: Install PDF Library

**Files:**
- Install: `@react-pdf/renderer`

**Steps:**

- [ ] **Step 1: Install package**

```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install react-pdf for PDF export"
```

---

### Task 5.2: Create PDF Components

**Files:**
- Create: `src/components/pdf/laporan-perkembangan.tsx`
- Create: `src/components/pdf/laporan-anak.tsx`

**Steps:**

- [ ] **Step 1: Create PDF template components**

- [ ] **Step 2: Test PDF generation**

- [ ] **Step 3: Commit**

```bash
git add src/components/pdf/
git commit -m "feat: create PDF components for reports"
```

---

## Verification

### Task V1: Build Verification

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors

### Task V2: Browser Testing

- [ ] **Step 1: Test Admin Dashboard**

- Charts render correctly
- Cards link to pages
- Delete works for santri and pengajar

- [ ] **Step 2: Test Pengajar Pages**

- Perkembangan form saves correctly
- Auto-attendance works
- Rekap shows data
- Laporan generates PDF

- [ ] **Step 3: Test Orang Tua Pages**

- Dashboard shows stats
- Period filter works
- Laporan generates PDF

### Task V3: Final Commit

```bash
git add -A
git commit -m "feat: complete major revision - all features implemented"
```

---

## Summary

**New Files:**
- `src/app/pengajar/perkembangan/page.tsx`
- `src/app/pengajar/rekap-perkembangan/page.tsx`
- `src/app/pengajar/laporan/page.tsx`
- `src/app/orang-tua/laporan/page.tsx`
- `src/components/pdf/laporan-perkembangan.tsx`
- `src/components/pdf/laporan-anak.tsx`
- `supabase/migrations/001_add_santri_fields.sql`
- `supabase/migrations/002_create_perkembangan_table.sql`

**Modified Files:**
- `src/lib/constants.ts` (navigation updates)
- `src/app/admin/page.tsx` (charts + linked cards)
- `src/app/admin/santri/page.tsx` (new fields + delete)
- `src/app/admin/pengajar/page.tsx` (delete)
- `src/app/admin/jadwal/page.tsx` (redesign)
- `src/app/pengajar/absensi/page.tsx` (auto-attendance)
- `src/app/orang-tua/page.tsx` (redesign dashboard)
- `supabase/schema.sql` (new fields)

**New Dependencies:**
- `recharts` (charts)
- `@react-pdf/renderer` (PDF export)

# TPA Baitul Yatama - Sistem Monitoring

Sistem monitoring TPA Baitul Yatama untuk mengelola data santri, pengajar, kelas, jadwal, absensi, dan progres belajar.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui (Base UI)
- **Auth**: Supabase Auth
- **Database**: Supabase PostgreSQL + Row Level Security
- **Icons**: Lucide React

## Roles

| Role | Access |
|------|--------|
| Admin | Full CRUD: santri, pengajar, kelas, jadwal, users |
| Pengajar | Input absensi & progres, lihat jadwal |
| Orang Tua | Lihat data anak & progres |

## Getting Started

```bash
cp .env.example .env.local   # fill in Supabase credentials
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_APP_NAME` | No | App name (default: TPA Baitul Yatama) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | For admin operations (seeding) |

## Build

```bash
npm run build
npm start
```

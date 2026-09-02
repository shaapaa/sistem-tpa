export function formatIslamicDate(d: Date = new Date()): { masehi: string; masehiShort: string; hijri: string } {
  const masehi = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const masehiShort = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  let hijri = ""
  try {
    hijri = new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(d)
  } catch {
    hijri = ""
  }
  return { masehi, masehiShort, hijri }
}

export const HADITH_QUOTES: { t: string; s: string }[] = [
  { t: "Barang siapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.", s: "HR. Muslim" },
  { t: "Amalan yang paling dicintai Allah adalah yang terus-menerus walaupun sedikit.", s: "HR. Bukhari & Muslim" },
  { t: "Sebaik-baik kalian adalah yang mempelajari Al-Qur\u2019an dan mengajarkannya.", s: "HR. Bukhari" },
]
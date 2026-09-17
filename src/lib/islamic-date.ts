export function formatIslamicDate(d: Date = new Date()): { masehi: string; masehiShort: string; hijri: string } {
  const masehi = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const masehiShort = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  let hijri = ""
  try {
    // Try a list of locale tags with the Islamic Umm al-Qura calendar.
    // Some mobile browsers ignore the Unicode extension in certain forms
    // (especially with region subtags), so try several variants and pick
    // the first formatted result that does not equal the Gregorian output.
    const candidates = [
      "id-u-ca-islamic-umalqura",
      "id-ID-u-ca-islamic-umalqura",
      "ar-SA-u-ca-islamic-umalqura",
      "en-u-ca-islamic-umalqura",
    ]
    const gregorianYear = String(d.getFullYear())
    for (const loc of candidates) {
      try {
        const formatted = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" }).format(d)
        // Basic sanity: if browser ignored the calendar extension it may
        // return the Gregorian date (contains the gregorian year). Skip
        // those results and accept the first one that looks like a Hijri date.
        if (formatted && !formatted.includes(gregorianYear)) {
          hijri = formatted
          break
        }
      } catch {
        // ignore and try next locale
      }
    }
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
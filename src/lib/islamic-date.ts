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
        const dtf = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" })
        const formatted = dtf.format(d)
        const cal = dtf.resolvedOptions?.().calendar
        // Prefer results where the resolved calendar is an Islamic variant.
        if (cal && /islamic/i.test(cal)) {
          hijri = formatted
          break
        }
        // Fallback sanity: sometimes resolvedOptions isn't reliable; accept
        // formatted result if it doesn't contain the Gregorian year.
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
  // If Intl didn't yield a Hijri date, fall back to an algorithmic conversion
  // (arithmetical Umm al-Qura approximation) to ensure mobile shows a value.
  if (!hijri) {
    try {
      const hijriDate = gregorianToHijri(d)
      const HIJRI_MONTHS = [
        "Muharram",
        "Safar",
        "Rabi'ul Awwal",
        "Rabi'ul Akhir",
        "Jumada I",
        "Jumada II",
        "Rajab",
        "Sya'ban",
        "Ramadhan",
        "Syawal",
        "Dzulqa'dah",
        "Dzulhijjah",
      ]
      hijri = `${hijriDate.day} ${HIJRI_MONTHS[hijriDate.month - 1]} ${hijriDate.year}`
    } catch {
      // ignore
    }
  }
  return { masehi, masehiShort, hijri }
}

function gregorianToHijri(d: Date) {
  // Algorithm adapted from publicly available conversion formulas.
  const day = d.getUTCDate()
  const month = d.getUTCMonth() + 1
  const year = d.getUTCFullYear()

  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

  let l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  l = l - 10631 * n + 354
  let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238))
  l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29
  const mH = Math.floor((24 * l) / 709)
  const dH = l - Math.floor((709 * mH) / 24)
  const yH = 30 * n + j - 30

  return { day: dH, month: mH, year: yH }
}

export const HADITH_QUOTES: { t: string; s: string }[] = [
  { t: "Barang siapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.", s: "HR. Muslim" },
  { t: "Amalan yang paling dicintai Allah adalah yang terus-menerus walaupun sedikit.", s: "HR. Bukhari & Muslim" },
  { t: "Sebaik-baik kalian adalah yang mempelajari Al-Qur\u2019an dan mengajarkannya.", s: "HR. Bukhari" },
]
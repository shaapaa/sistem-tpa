export function todayJakarta(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  return `${value("year")}-${value("month")}-${value("day")}`
}

export function formatIslamicDate(d: Date = new Date()): { masehi: string; masehiShort: string; hijri: string } {
  const masehi = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const masehiShort = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  let hijri = ""
  try {
    // Jangan menerima hasil locale hanya karena tahunnya berbeda dari Masehi:
    // sejumlah browser mobile dapat fallback ke kalender lain dan menampilkan era
    // seperti "SM". Ambil bagian numeriknya dan validasi kalender + rentangnya.
    const dtf = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    })
    const parts = dtf.formatToParts(d)
    const valueOf = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
    const day = valueOf("day")
    const month = valueOf("month")
    const year = valueOf("year")
    const calendar = dtf.resolvedOptions().calendar
    if (calendar === "islamic-umalqura" && day >= 1 && day <= 30 && month >= 1 && month <= 12 && year >= 1300 && year <= 1700) {
      const HIJRI_MONTHS = [
        "Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir", "Jumada I", "Jumada II",
        "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah",
      ]
      hijri = `${day} ${HIJRI_MONTHS[month - 1]} ${year} H`
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
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()

  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

  let l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  l = l - 10631 * n + 354
  const j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238))
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

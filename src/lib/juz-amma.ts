// Jumlah ayat surah-surah Juz Amma (juz 30) + Al-Fatihah
// Key: nama surah, Value: jumlah ayat
export const JUZ_AMMA_AYAT: Record<string, number> = {
  "Al-Fatihah": 7,
  "An-Naba": 40,
  "An-Nazi'at": 46,
  "Abasa": 42,
  "At-Takwir": 29,
  "Al-Infitar": 19,
  "Al-Mutaffifin": 36,
  "Al-Inshiqaq": 25,
  "Al-Buruj": 22,
  "At-Tariq": 17,
  "Al-A'la": 19,
  "Al-Ghashiyah": 26,
  "Al-Fajr": 30,
  "Al-Balad": 20,
  "Ash-Shams": 15,
  "Al-Layl": 21,
  "Ad-Duha": 11,
  "Ash-Sharh": 8,
  "At-Tin": 8,
  "Al-Alaq": 19,
  "Al-Qadr": 5,
  "Al-Bayyinah": 8,
  "Az-Zalzalah": 8,
  "Al-Adiyat": 11,
  "Al-Qari'ah": 11,
  "At-Takathur": 8,
  "Al-Asr": 3,
  "Al-Humazah": 9,
  "Al-Fil": 5,
  "Quraysh": 4,
  "Al-Ma'un": 7,
  "Al-Kawthar": 3,
  "Al-Kafirun": 6,
  "An-Nasr": 3,
  "Al-Masad": 5,
  "Al-Ikhlas": 4,
  "Al-Falaq": 5,
  "An-Nas": 6,
};

export const JUZ_AMMA_SURAH_LIST = Object.keys(JUZ_AMMA_AYAT);

// Total ayat seluruh target (Juz Amma + Al-Fatihah)
export const JUZ_AMMA_TOTAL_AYAT = Object.values(JUZ_AMMA_AYAT).reduce((a, b) => a + b, 0);

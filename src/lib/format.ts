export function formatRole(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "Admin",
    PENGAJAR: "Pengajar",
    ORANG_TUA: "Orang Tua",
  };
  return map[role] ?? role;
}

export function formatGender(gender: string | null): string {
  if (!gender) return "-";
  const map: Record<string, string> = {
    LAKI_LAKI: "Laki-laki",
    PEREMPUAN: "Perempuan",
  };
  return map[gender] ?? gender;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    HADIR: "Hadir",
    IZIN: "Izin",
    SAKIT: "Sakit",
    ALPHA: "Alpha",
    LANCAR: "Lancar",
    KURANG_LANCAR: "Kurang Lancar",
    TIDAK_LANCAR: "Tidak Lancar",
    LULUS: "Lulus",
    TIDAK_LULUS: "Tidak Lulus",
    PENDING: "Pending",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
  };
  return map[status] ?? status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatHari(hari: string): string {
  const map: Record<string, string> = {
    SENIN: "Senin",
    SELASA: "Selasa",
    RABU: "Rabu",
    KAMIS: "Kamis",
    JUMAT: "Jumat",
    SABTU: "Sabtu",
    MINGGU: "Minggu",
  };
  return map[hari] ?? hari.charAt(0) + hari.slice(1).toLowerCase();
}

export function formatSesi(sesi: string): string {
  const map: Record<string, string> = {
    PAGI: "Pagi",
    SORE: "Sore",
  };
  return map[sesi] ?? sesi.charAt(0) + sesi.slice(1).toLowerCase();
}

export function formatTingkat(tingkat: string): string {
  const map: Record<string, string> = {
    IQRA: "Iqra",
    QURAN: "Quran",
  };
  return map[tingkat] ?? tingkat.charAt(0) + tingkat.slice(1).toLowerCase();
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatNilai(nilai: number): string {
  return `${nilai}`;
}

export function getStatusBadgeVariant(status: string): "default" | "success" | "warning" | "destructive" | "secondary" {
  const successStatuses = ["HADIR", "LULUS", "LANCAR", "APPROVED"];
  const warningStatuses = ["IZIN", "SAKIT", "KURANG_LANCAR", "PENDING"];
  const destructiveStatuses = ["ALPHA", "TIDAK_LULUS", "TIDAK_LANCAR", "REJECTED"];

  if (successStatuses.includes(status)) return "success";
  if (warningStatuses.includes(status)) return "warning";
  if (destructiveStatuses.includes(status)) return "destructive";
  return "secondary";
}
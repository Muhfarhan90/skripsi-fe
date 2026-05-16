const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function ensureUtcSuffix(value: string): string {
  if (value.endsWith("Z") || value.endsWith("z")) {
    return value;
  }

  const timeSeparatorIndex = value.indexOf("T");
  const lastPlusIndex = value.lastIndexOf("+");
  const lastMinusIndex = value.lastIndexOf("-");
  const hasTimezoneOffset =
    lastPlusIndex > timeSeparatorIndex || lastMinusIndex > timeSeparatorIndex;

  if (hasTimezoneOffset) {
    return value;
  }

  return `${value}Z`;
}

export function parseUtcDateTime(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(ensureUtcSuffix(normalized));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatUtcDateTimeToJakarta(value: string | null | undefined): string {
  const parsed = parseUtcDateTime(value);
  if (!parsed) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(parsed);
}

export function formatRemainingAccessTime(value: string | null | undefined): string {
  const parsed = parseUtcDateTime(value);
  if (!parsed) {
    return "Tidak dibatasi";
  }

  const remainingMs = parsed.getTime() - Date.now();
  if (remainingMs <= 0) {
    return "Akses kelas sudah berakhir";
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const totalHours = Math.ceil(remainingMs / 3_600_000);
  const totalDays = Math.ceil(remainingMs / 86_400_000);

  if (totalDays >= 1) {
    return `${totalDays} hari`;
  }

  if (totalHours >= 1) {
    return `${totalHours} jam`;
  }

  return `${Math.max(totalMinutes, 1)} menit`;
}

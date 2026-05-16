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

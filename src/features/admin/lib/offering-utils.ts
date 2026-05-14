export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toStatusLabel(value?: string | null): string {
  if (!value) return "-";

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function toApiDateOrNull(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (DATE_ONLY_PATTERN.test(normalized)) {
    return normalized;
  }

  const normalizedDateTime = normalized.replace(" ", "T");
  if (LOCAL_DATE_TIME_PATTERN.test(normalizedDateTime)) {
    return normalizedDateTime.slice(0, 10);
  }

  const date = new Date(normalizedDateTime);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toApiDateTimeOrNull(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (DATE_ONLY_PATTERN.test(normalized)) {
    return `${normalized} 00:00:00`;
  }

  const normalizedDateTime = normalized.replace(" ", "T");
  if (LOCAL_DATE_TIME_PATTERN.test(normalizedDateTime)) {
    return `${normalizedDateTime.slice(0, 16).replace("T", " ")}:00`;
  }

  const date = new Date(normalizedDateTime);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:00`;
}

export function toDateInput(value?: string | null): string {
  if (!value) return "";

  const normalized = value.trim().replace(" ", "T");
  if (DATE_ONLY_PATTERN.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";

  const normalized = value.trim().replace(" ", "T");
  if (DATE_ONLY_PATTERN.test(normalized)) {
    return `${normalized}T00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

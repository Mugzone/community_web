export type EventStatus = "upcoming" | "ongoing" | "ended" | "unknown";

export const parseEventDate = (value?: string | number) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return new Date(value * 1000);
  const normalized = value.replace(/\./g, "-");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const parts = normalized.split("-").map((part) => Number(part));
  if (parts.length === 3 && parts.every((num) => Number.isFinite(num))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return undefined;
};

export const buildEventStatus = (
  start?: string | number,
  end?: string | number
): EventStatus => {
  const startDate = parseEventDate(start);
  const endDate = parseEventDate(end);
  if (!startDate || !endDate) return "unknown";
  const now = new Date();
  if (now < startDate) return "upcoming";
  if (now >= startDate && now <= endDate) return "ongoing";
  return "ended";
};

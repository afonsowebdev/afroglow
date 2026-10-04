const TZ = "Europe/Lisbon";

export const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-PT", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });

export function longDay(iso: string) {
  const label = new Date(iso).toLocaleDateString("pt-PT", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const dayParts = (iso: string) => ({
  weekday: new Date(iso)
    .toLocaleDateString("pt-PT", { timeZone: TZ, weekday: "short" })
    .replace(".", ""),
  day: new Date(iso).toLocaleDateString("pt-PT", {
    timeZone: TZ,
    day: "numeric",
  }),
  month: new Date(iso)
    .toLocaleDateString("pt-PT", { timeZone: TZ, month: "short" })
    .replace(".", ""),
});

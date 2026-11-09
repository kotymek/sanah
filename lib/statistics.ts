export type VideoStat = {
  id: string;
  views: number | null;
  status: "ok" | "unavailable" | "no_count";
};
export type Observation = { fetchedAt: string; videos: VideoStat[] };
export type Snapshot = {
  version: 1;
  fetchedAt: string | null;
  videos: VideoStat[];
  history: Observation[];
};
export const DAY = 86_400_000;
export const EMPTY_SNAPSHOT: Snapshot = { version: 1, fetchedAt: null, videos: [], history: [] };

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

/** All records are validated before use; missing counts must never become zero. */
export function parseSnapshot(input: unknown, now = Date.now()): Snapshot {
  if (!input || typeof input !== "object") throw new Error("Nieprawidłowy format statystyk.");
  const data = input as Snapshot;
  const validateVideos = (videos: VideoStat[]) => {
    if (!Array.isArray(videos) || videos.length > 2000) throw new Error("Nieprawidłowa lista nagrań.");
    const seen = new Set<string>();
    for (const v of videos) {
      if (!v || !/^[A-Za-z0-9_-]{11}$/.test(v.id) || seen.has(v.id)) throw new Error("Nieprawidłowy lub powtórzony identyfikator filmu.");
      seen.add(v.id);
      if (!['ok', 'unavailable', 'no_count'].includes(v.status) ||
          (v.status === 'ok' ? !Number.isSafeInteger(v.views) || (v.views as number) < 0 : v.views !== null)) {
        throw new Error("Nieprawidłowy licznik wyświetleń.");
      }
    }
  };
  if (data.version !== 1 || !Array.isArray(data.history) || data.history.length > 31) throw new Error("Nieobsługiwana wersja statystyk.");
  validateVideos(data.videos);
  if (data.fetchedAt === null) {
    if (data.videos.length || data.history.length) throw new Error("Statystyki bez daty pomiaru.");
    return EMPTY_SNAPSHOT;
  }
  if (!validTime(data.fetchedAt) || Date.parse(data.fetchedAt) > now + 5 * 60_000) throw new Error("Nieprawidłowy czas pomiaru.");
  const timestamps = new Set<string>();
  for (const entry of data.history) {
    if (!entry || !validTime(entry.fetchedAt) || Date.parse(entry.fetchedAt) >= Date.parse(data.fetchedAt) || timestamps.has(entry.fetchedAt)) {
      throw new Error("Nieprawidłowa historia pomiarów.");
    }
    timestamps.add(entry.fetchedAt);
    validateVideos(entry.videos);
  }
  return data;
}

/** Compare the same video IDs only. Tolerate scheduling drift of up to 12 hours. */
export function weeklyChange(snapshot: Snapshot, id: string): { value: number; from: string } | null {
  if (!snapshot.fetchedAt) return null;
  const current = snapshot.videos.find(v => v.id === id);
  if (current?.views == null) return null;
  const target = Date.parse(snapshot.fetchedAt) - 7 * DAY;
  const baseline = [...snapshot.history]
    .filter(h => Math.abs(Date.parse(h.fetchedAt) - target) <= DAY / 2)
    .sort((a, b) => Math.abs(Date.parse(a.fetchedAt) - target) - Math.abs(Date.parse(b.fetchedAt) - target))
    .find(h => h.videos.some(v => v.id === id && v.views !== null));
  const previous = baseline?.videos.find(v => v.id === id);
  return baseline && previous?.views != null ? { value: current.views - previous.views, from: baseline.fetchedAt } : null;
}

/** Keep at most one prior observation per UTC day, for the preceding 14 days. */
export function makeSnapshot(previous: Snapshot, videos: VideoStat[], fetchedAt: string): Snapshot {
  if (previous.fetchedAt && Date.parse(fetchedAt) <= Date.parse(previous.fetchedAt)) throw new Error("Nowy pomiar musi być późniejszy.");
  const candidates: Observation[] = [...previous.history];
  if (previous.fetchedAt) candidates.push({ fetchedAt: previous.fetchedAt, videos: previous.videos });
  const days = new Map<string, Observation>();
  for (const item of candidates.sort((a,b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt))) {
    const age = Date.parse(fetchedAt) - Date.parse(item.fetchedAt);
    if (age > 0 && age <= 14 * DAY && item.fetchedAt.slice(0,10) !== fetchedAt.slice(0,10)) days.set(item.fetchedAt.slice(0,10), item);
  }
  return parseSnapshot({version: 1, fetchedAt, videos, history: [...days.values()]}, Date.parse(fetchedAt));
}

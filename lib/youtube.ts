import type { VideoStat } from "./statistics.ts";

async function describeApiError(response: Response, apiKey: string): Promise<string> {
  try {
    const body = await response.json() as { error?: {
      status?: unknown; message?: unknown;
      errors?: { reason?: unknown }[]; details?: { reason?: unknown }[];
    } } | null;
    const error = body?.error;
    // Only selected error fields, never request metadata, headers or the raw body.
    const reasons = [error?.status,
      ...(Array.isArray(error?.errors) ? error.errors.map((e: {reason?: unknown}) => e?.reason) : []),
      ...(Array.isArray(error?.details) ? error.details.map((e: {reason?: unknown}) => e?.reason) : []),
    ].filter((v): v is string => typeof v === "string" && /^[A-Za-z_]{1,64}$/.test(v));
    const message = typeof error?.message === "string" ? error.message : "";
    let detail = [...new Set(reasons), message].filter(Boolean).join(" — ");
    for (const secret of [apiKey, apiKey.trim(), encodeURIComponent(apiKey)]) {
      if (secret) detail = detail.replaceAll(secret, "[UKRYTO]");
    }
    return detail.replace(/AIza[A-Za-z0-9_-]+/g, "[UKRYTO]")
      .replace(/https?:\/\/\S+/g, "[URL]").replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 500);
  } catch { return ""; }
}

export function validateVideoIds(ids: string[]): void {
  if (!ids.length || ids.some(id => !/^[A-Za-z0-9_-]{11}$/.test(id))) throw new Error("Katalog zawiera nieprawidłowy identyfikator YouTube.");
  if (new Set(ids).size !== ids.length) throw new Error("Film występuje w katalogu więcej niż raz.");
}

/** Uses a server-side header: the API key never enters URLs, output files or the browser. */
export async function fetchVideoStatistics(ids: string[], apiKey: string, fetcher: typeof fetch = fetch): Promise<VideoStat[]> {
  validateVideoIds(ids);
  if (!apiKey.trim()) throw new Error("Brak YOUTUBE_API_KEY. Dodaj sekret w ustawieniach repozytorium GitHub.");
  apiKey = apiKey.trim();
  const result: VideoStat[] = [];
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.search = new URLSearchParams({part:"statistics",id:batch.join(","),fields:"items(id,statistics(viewCount))"}).toString();
    let response: Response;
    try {
      response = await fetcher(url, {headers:{"X-Goog-Api-Key":apiKey},signal:AbortSignal.timeout(20_000)});
    } catch {
      throw new Error("Nie udało się połączyć z YouTube. Poprzednie dane pozostają bez zmian.");
    }
    if (!response.ok) {
      const detail = await describeApiError(response, apiKey);
      throw new Error(`YouTube API: HTTP ${response.status}.${detail ? ` ${detail}.` : ""} Sprawdź klucz, aktywację API i limit zapytań. Poprzednie dane pozostają bez zmian.`);
    }
    const payload = await response.json() as {items?: {id:string;statistics?:{viewCount?:string}}[]};
    if (!Array.isArray(payload.items)) throw new Error("Nieprawidłowa odpowiedź YouTube API.");
    const items = new Map<string, {id:string;statistics?:{viewCount?:string}}>();
    for (const item of payload.items) {
      if (!item || !batch.includes(item.id) || items.has(item.id)) throw new Error("Niespójna odpowiedź YouTube API.");
      items.set(item.id, item);
    }
    for (const id of batch) {
      const item = items.get(id);
      if (!item) { result.push({id,views:null,status:"unavailable"}); continue; }
      const raw = item.statistics?.viewCount;
      if (raw === undefined) { result.push({id,views:null,status:"no_count"}); continue; }
      const views = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(views)) throw new Error("YouTube zwrócił nieprawidłowy licznik wyświetleń.");
      result.push({id,views,status:"ok"});
    }
  }
  return result;
}

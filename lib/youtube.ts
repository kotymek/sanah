import type { VideoStat } from "./statistics.ts";

export function validateVideoIds(ids: string[]): void {
  if (!ids.length || ids.some(id => !/^[A-Za-z0-9_-]{11}$/.test(id))) throw new Error("Katalog zawiera nieprawidłowy identyfikator YouTube.");
  if (new Set(ids).size !== ids.length) throw new Error("Film występuje w katalogu więcej niż raz.");
}

/** Uses a server-side header: the API key never enters URLs, output files or the browser. */
export async function fetchVideoStatistics(ids: string[], apiKey: string, fetcher: typeof fetch = fetch): Promise<VideoStat[]> {
  validateVideoIds(ids);
  if (!apiKey.trim()) throw new Error("Brak YOUTUBE_API_KEY. Dodaj sekret w ustawieniach repozytorium GitHub.");
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
      // Do not print the upstream body: it can contain request details or credentials.
      throw new Error(`YouTube API: HTTP ${response.status}. Sprawdź klucz, aktywację API i limit zapytań. Poprzednie dane pozostają bez zmian.`);
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

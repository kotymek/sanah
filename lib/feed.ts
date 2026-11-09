import { DAY, EMPTY_SNAPSHOT, parseSnapshot } from "./statistics.ts";
import type { RankingResponse } from "./ranking.ts";

const FEED = "https://raw.githubusercontent.com/kotymek/sanah/main/data/youtube.json";
export async function loadRanking(bundled: unknown, fetcher: typeof fetch = fetch, now = Date.now()) {
  let snapshot = EMPTY_SNAPSHOT;
  let source: RankingResponse["source"] = "none";
  let failed = false;
  try { snapshot = parseSnapshot(bundled,now); if (snapshot.fetchedAt) source = "bundled"; } catch { /* Safe empty fallback. */ }
  try {
    const response = await fetcher(FEED, {cache:"no-store",signal:AbortSignal.timeout(8_000)});
    if (!response.ok) throw new Error("Feed unavailable");
    if (Number(response.headers.get("content-length")) > 2_000_000) throw new Error("Feed too large");
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("Feed too large");
    const remote = parseSnapshot(JSON.parse(text),now);
    if (!snapshot.fetchedAt || (remote.fetchedAt && Date.parse(remote.fetchedAt) >= Date.parse(snapshot.fetchedAt))) {
      snapshot = remote; source = "github";
    }
  } catch { failed = true; }
  const age = snapshot.fetchedAt ? now - Date.parse(snapshot.fetchedAt) : null;
  const status: RankingResponse["status"] = age === null ? (failed ? "error" : "waiting") : age > 30*DAY ? "expired" : failed || age > 2*DAY ? "stale" : "ready";
  const body: RankingResponse = {snapshot:status==="expired"?EMPTY_SNAPSHOT:snapshot,status,source};
  return body;
}

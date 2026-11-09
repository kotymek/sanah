import catalog from "../data/catalog.json" with { type: "json" };
import demo from "../data/demo.json" with { type: "json" };
import { DAY, weeklyChange } from "./statistics.ts";
import type { Snapshot } from "./statistics.ts";

export type Platform = "all" | "youtube" | "spotify";
export type Song = typeof catalog[number] & {
  youtube: number | null; spotify: number | null; week: number | null;
  baselineAt: string | null; status: string;
};
export type RankingResponse = { snapshot: Snapshot; status: "ready" | "waiting" | "error" | "stale" | "expired"; source: "github" | "bundled" | "none" };

export function getSongs(mode: "demo" | "live", snapshot: Snapshot, now = Date.now()): Song[] {
  const expired = snapshot.fetchedAt && now - Date.parse(snapshot.fetchedAt) > 30 * DAY;
  return catalog.map(song => {
    if (mode === "demo") {
      const stats = demo[song.id as keyof typeof demo];
      return {...song,...stats,baselineAt:null,status:"demo"};
    }
    const video = snapshot.videos.find(v => v.id === song.youtubeId);
    const change = expired ? null : weeklyChange(snapshot, song.youtubeId);
    return {...song,youtube:expired?null:video?.views??null,spotify:null,week:change?.value??null,baselineAt:change?.from??null,status:expired?"expired":video?.status??"waiting"};
  });
}

/** Combined totals exist only when BOTH platform counts exist. */
export function value(song: Song, platform: Platform): number | null {
  if (platform !== "all") return song[platform];
  return song.youtube === null || song.spotify === null ? null : song.youtube + song.spotify;
}
export function rankSongs(songs: Song[], platform: Platform): Song[] {
  return [...songs].sort((a,b) => {
    const av = value(a,platform), bv = value(b,platform);
    if (av === null) return bv === null ? a.title.localeCompare(b.title,"pl") : 1;
    if (bv === null) return -1;
    return bv - av || a.title.localeCompare(b.title,"pl");
  });
}

import catalog from "../data/catalog.json" with { type: "json" };
import demo from "../data/demo.json" with { type: "json" };
import { DAY, weeklyChange } from "./statistics.ts";
import type { Snapshot } from "./statistics.ts";
import { recordingIds } from "./catalog.ts";
import type { CatalogSong } from "./catalog.ts";

export type Platform = "all" | "youtube" | "spotify";
export type Song = CatalogSong & {
  youtube: number | null; spotify: number | null; week: number | null;
  baselineAt: string | null; status: string;
};
export type RankingResponse = { snapshot: Snapshot; status: "ready" | "waiting" | "error" | "stale" | "expired"; source: "github" | "bundled" | "none" };

export function getSongs(mode: "demo" | "live", snapshot: Snapshot, now = Date.now()): Song[] {
  const expired = snapshot.fetchedAt && now - Date.parse(snapshot.fetchedAt) > 30 * DAY;
  return (catalog as CatalogSong[]).filter(song => mode !== "demo" || song.id in demo).map(song => {
    if (mode === "demo") {
      const stats = demo[song.id as keyof typeof demo];
      return {...song,...stats,baselineAt:null,status:"demo"};
    }
    const ids = recordingIds(song);
    const videos = ids.map(id => snapshot.videos.find(v => v.id === id));
    const known = videos.filter(v => v?.views != null);
    const changes = ids.map(id => expired ? null : weeklyChange(snapshot, id));
    // New or missing recordings must not create artificial weekly growth.
    const completeChange = changes.every(c => c !== null) && new Set(changes.map(c => c?.from)).size === 1;
    return {...song,youtube:expired||!known.length?null:known.reduce((sum,v)=>sum+(v?.views??0),0),spotify:null,
      week:completeChange?changes.reduce((sum,c)=>sum+(c?.value??0),0):null,
      baselineAt:completeChange?changes[0]?.from??null:null,
      status:expired?"expired":known.length===ids.length?"ok":known.length?"partial":videos[0]?.status??"waiting"};
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

import bundled from "../../../data/youtube.json" with { type: "json" };
import { loadRanking } from "../../../lib/feed.ts";
export async function GET() {
  const body = await loadRanking(bundled);
  return Response.json(body, {headers:{"Cache-Control":body.status==="error"?"no-store":"public, max-age=60, s-maxage=300"}});
}

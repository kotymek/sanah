export type Recording = { id: string; title: string; channel: string; kind: string };
export type CatalogSong = {
  id: string; title: string; album: string; guest?: string; color: string; mark: string;
  youtubeId: string; youtubeKind: string; recordings?: Recording[];
};

/** Keep factual release metadata; do not republish descriptions, lyrics or contact details. */
export function releaseMetadata(description: string, topic: boolean) {
  const parts = description.split(/\n\s*\n/);
  return {
    releaseAlbum: topic ? parts[2]?.trim() || null : null,
    collaborators: topic ? parts[1]?.split(' · ').slice(1).filter(a=>a.toLowerCase()!=='sanah').join(', ') || null : description.match(/^Artysta:\s*sanah,?\s*(.*)$/mi)?.[1]?.trim() || null,
    hasMusicCredits: /^Muzyka:/mi.test(description),
  };
}

export function recordingIds(song: CatalogSong): string[] {
  return [...new Set(song.recordings?.map(r => r.id) ?? [song.youtubeId])];
}

/** Keep punctuation/diacritics out of matching, but preserve words and version labels. */
export function titleKey(title: string): string {
  return title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/ł/g,'l').replace(/[^a-z0-9]+/g,' ').trim();
}

export function cleanTitle(title: string): string {
  let cleaned = title.normalize('NFC');
  const quoted = cleaned.match(/^sanah[^"„“]*["„“](.+?)["”](.*)$/i);
  if (quoted) cleaned = quoted[1] + quoted[2];
  else cleaned = cleaned.replace(/^.*?\bsanah\b[^–—-]*\s+[–—-]\s+/i, '');
  return cleaned.replace(/\s*[([](?:official\s+|vertical\s+)?(?:music\s+)?(?:video|audio|lyric(?:s)?(?:\s+video)?|teledysk)[^\])]*[)\]]/gi,'')
    .trim();
}

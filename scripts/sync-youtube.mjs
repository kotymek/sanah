import { readFile, writeFile, rename } from 'node:fs/promises';
import { fetchVideoStatistics } from '../lib/youtube.ts';
import { makeSnapshot, parseSnapshot } from '../lib/statistics.ts';
import { recordingIds } from '../lib/catalog.ts';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
try {
  const catalog = await readJson('data/catalog.json');
  const previous = parseSnapshot(await readJson('data/youtube.json'));
  const videos = await fetchVideoStatistics(catalog.flatMap(recordingIds), process.env.YOUTUBE_API_KEY || '');
  const snapshot = makeSnapshot(previous, videos, new Date().toISOString());
  // Only replace the last known snapshot after all batches and validation succeed.
  const destination = new URL('data/youtube.json', root);
  const temporary = new URL('data/youtube.json.tmp', root);
  await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
  await rename(temporary, destination);
  console.log(`Zapisano ${videos.filter(v => v.views !== null).length}/${videos.length} liczników YouTube. Pomiar: ${snapshot.fetchedAt}.`);
} catch (error) {
  // Only controlled adapter messages are emitted, never a raw network error/stack.
  const message = error instanceof Error ? error.message : 'Błąd aktualizacji.';
  const key = process.env.YOUTUBE_API_KEY;
  console.error(key ? message.replaceAll(key, '[REDACTED]') : message);
  process.exitCode = 1;
}

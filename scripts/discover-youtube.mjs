import { writeFile } from 'node:fs/promises';
import { releaseMetadata } from '../lib/catalog.ts';
const key = process.env.YOUTUBE_API_KEY?.trim();
if (!key) throw new Error('Brak YOUTUBE_API_KEY');
async function api(resource, params) {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`, {
    headers: {'X-Goog-Api-Key': key}, signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`YouTube ${resource}: HTTP ${response.status}`);
  const data = await response.json();
  if (!data.items && data.pageInfo?.totalResults === 0) data.items=[];
  if (!Array.isArray(data.items)) throw new Error(`Nieprawidłowa odpowiedź YouTube: ${resource}`);
  return data;
}
async function all(resource, params) {
  const items = [], seen = new Set();
  let pageToken = '';
  do {
    if (seen.has(pageToken) || seen.size >= 100) throw new Error('Nieprawidłowa paginacja');
    seen.add(pageToken);
    const data = await api(resource, {...params, maxResults:'50', ...(pageToken ? {pageToken} : {})});
    items.push(...data.items);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return items;
}
try {
  const channels = [];
  for (const handle of ['sanahmusic']) {
    let data = await api('channels', {part:'snippet,contentDetails', forHandle:handle});
    if (!data.items.length) data = await api('channels', {part:'snippet,contentDetails', forUsername:handle});
    if (data.items.length !== 1) throw new Error(`Nie znaleziono kanału ${handle}`);
    const c = data.items[0];
    channels.push({id:c.id, title:c.snippet.title, uploads:c.contentDetails.relatedPlaylists.uploads});
  }
  const seed = await api('videos', {part:'snippet',id:'S7sN-cFhwuk,ujYUUnYjuos'});
  for (const v of seed.items) {
    if (channels.some(c=>c.id===v.snippet.channelId)) continue;
    const data = await api('channels',{part:'snippet,contentDetails',id:v.snippet.channelId});
    for (const c of data.items) channels.push({id:c.id,title:c.snippet.title,uploads:c.contentDetails.relatedPlaylists.uploads});
  }
  const ids = new Set(), playlists = [];
  for (const channel of channels) {
    playlists.push({id:channel.uploads, title:'Uploads', channelId:channel.id});
    const found = await all('playlists', {part:'snippet', channelId:channel.id});
    for (const p of found) playlists.push({id:p.id,title:p.snippet.title,channelId:channel.id});
  }
  for (const p of playlists) {
    let items;
    try { items = await all('playlistItems', {part:'contentDetails',playlistId:p.id}); }
    catch (error) {
      if (!error.message.includes('HTTP 404') || p.title !== 'Uploads' || !channels.find(c=>c.id===p.channelId)?.title.includes('Topic')) throw error;
      const found = await all('search', {part:'id',channelId:p.channelId,type:'video',order:'date'});
      items = found.map(v=>({contentDetails:{videoId:v.id.videoId}}));
    }
    p.videoIds = items.map(item=>item.contentDetails.videoId);
    for (const item of items) ids.add(item.contentDetails.videoId);
  }
  // Verified collaboration published outside the artist's own channels.
  ids.add('DnePdjIA0wk');
  const videos = [], list = [...ids];
  for (let i=0;i<list.length;i+=50) {
    const data = await api('videos', {part:'snippet,contentDetails',id:list.slice(i,i+50).join(',')});
    for (const v of data.items) videos.push({id:v.id,title:v.snippet.title,channelId:v.snippet.channelId,channelTitle:v.snippet.channelTitle,publishedAt:v.snippet.publishedAt,duration:v.contentDetails.duration,...releaseMetadata(v.snippet.description||'',v.snippet.channelTitle==='sanah - Topic')});
  }
  videos.sort((a,b)=>a.id.localeCompare(b.id));
  await writeFile(new URL('../data/youtube-discovery.json',import.meta.url),JSON.stringify({channels,playlists,videos},null,2)+'\n');
  console.log(`Odczytano ${channels.length} kanały, ${playlists.length} playlist i ${videos.length} nagrań.`);
} catch (error) {
  console.error(error instanceof Error ? error.message.replaceAll(key,'[UKRYTO]') : 'Błąd katalogu');
  process.exitCode=1;
}

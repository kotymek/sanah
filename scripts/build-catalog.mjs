import { readFile, writeFile } from 'node:fs/promises';
import { cleanTitle, titleKey, recordingIds } from '../lib/catalog.ts';
const root=new URL('../data/',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
const source=await read('youtube-discovery.json');
const curated=await read('catalog-curated.json');
const previous=await read('catalog.json');
const overrides=await read('catalog-overrides.json');
const colors=['rose','sage','purple','blue'];
const groups=new Map(), excluded=[];
const playlistAlbums = new Map([
 ['PLHUwUmNEIQIH6HNZ8fGlpTJhv3AuAynPA','Dwoje ludzieńków'],
 ['PLHUwUmNEIQIGOC1JbA73t_SJjd6LPMLOl','Can you love me for who I am?'],
 ['PLHUwUmNEIQIHEs8ho_IC5nHjN_TlcdUrG','Pianinkowe Kaprysy'],
 ['PLHUwUmNEIQIG1DvR_ju81It1kYd8-2JCE','Kaprysy'],
 ['PLHUwUmNEIQIElEUIOxLsaM9dYQ9Dbc20N','sanah śpiewa Poezyje'],
 ['PLHUwUmNEIQIGTPQSTKf0kD2fIJB7YkIkC','Uczta'],
 ['PLHUwUmNEIQIH5MKmq-jIRO7ZNB-JujNfj','Irenka'],
 ['PLHUwUmNEIQIHlaTr8alQa7m7mFOJ5KjAX','Bujda'],
]);
function seconds(duration) {const m=duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0;}
function albumName(name) {
 return name.replace(/BUJDA - EP/i,'Bujda').replace(/\s*\((?:Deluxe|Deluxe Edition)\)/i,'').trim();
}
for (const v of source.videos) {
 const original=curated.find(s=>s.youtubeId===v.id);
 const automatic=v.channelTitle==='sanah - Topic';
 const albumPlaylist=source.playlists.find(p=>playlistAlbums.has(p.id)&&p.videoIds?.includes(v.id));
 const d=v.description||'';
 const duration=seconds(v.duration);
 let reason=overrides.exclude[v.id];
 if (!original && !reason) {
   if (/\[full (album|ep)\]/i.test(v.title)) reason='Cały album lub EP w jednym filmie';
   else if (duration===0 || duration>900) reason='Brak pełnego nagrania lub długi materiał';
   else if (duration<60 && !automatic && !/official audio/i.test(v.title) && !v.hasMusicCredits && !/^Muzyka:/mi.test(d)) reason='Krótki materiał promocyjny';
   else if (!automatic && !/^sanah\b/i.test(v.title)) reason='Materiał bez rozpoznanego tytułu utworu';
   else if (/^sanah\s*[–-]?\s*(?:z Bajki|transmisja)/i.test(v.title)) reason='Materiał promocyjny';
 }
 if (reason) {excluded.push({id:v.id,title:v.title,reason});continue;}
 const title=overrides.titles[v.id] || (original?.title) || cleanTitle(v.title);
 const key=titleKey(title);
 if (!key) throw new Error('Pusty tytuł');
 const autoParts=d.split(/\n\s*\n/);
 const autoAlbum=v.releaseAlbum || (automatic?autoParts[2]:undefined);
 const album=original?.album || (albumPlaylist?playlistAlbums.get(albumPlaylist.id):autoAlbum?albumName(autoAlbum):'Single i pozostałe nagrania');
 const priority=original?3:albumPlaylist?2:autoAlbum?1:0;
 const artistLine=v.collaborators || (automatic?autoParts[1]?.split(' · ').slice(1).filter(a=>a.toLowerCase()!=='sanah').join(', '):d.match(/^Artysta:\s*sanah,?\s*(.*)$/mi)?.[1] || v.title.match(/^sanah,\s*(.*?)\s+[–-]\s+/i)?.[1]);
 const kind=automatic?'Oficjalne audio':/live|at home|z trasy|narodowy/i.test(v.title)?'Nagranie koncertowe':/instrumental/i.test(v.title)?'Wersja instrumentalna':/audio/i.test(v.title)?'Oficjalne audio':/lyric/i.test(v.title)?'Lyric video':'Oficjalne nagranie';
 const recording={id:v.id,title:v.title,channel:v.channelTitle,kind};
 if (!groups.has(key)) groups.set(key,{id:original?.id||previous.find(s=>titleKey(s.title)===key)?.id||`yt-${v.id}`,title,album,color:original?.color||colors[groups.size%colors.length],mark:title.slice(0,2).toLowerCase(),...(original?.guest?{guest:original.guest}:{}),youtubeId:v.id,youtubeKind:kind,recordings:[],_albumPriority:priority});
 const song=groups.get(key);
 if (original) Object.assign(song,{...original,title,recordings:song.recordings});
 if (priority>song._albumPriority) {song.album=album;song._albumPriority=priority;}
 if (!song.guest && artistLine) song.guest=artistLine;
 song.recordings.push(recording);
}
// Retain already catalogued recordings if YouTube hides/deletes them; their counts become unavailable.
for(const old of previous) {
 const missing=(old.recordings||[{id:old.youtubeId,title:old.title,channel:'Źródło zweryfikowane',kind:old.youtubeKind}]).filter(r=>!source.videos.some(v=>v.id===r.id));
 if(!missing.length) continue;
 const key=titleKey(old.title);
 if(!groups.has(key)) groups.set(key,{...old,recordings:[]});
 groups.get(key).recordings.push(...missing);
}
const catalog=[...groups.values()].sort((a,b)=>a.title.localeCompare(b.title,'pl'));
for(const song of catalog) delete song._albumPriority;
const allIds=catalog.flatMap(recordingIds);
if(new Set(allIds).size!==allIds.length) throw new Error('Film przypisany do więcej niż jednego utworu');
if(catalog.length<curated.length) throw new Error('Katalog nie może utracić zweryfikowanych utworów');
await writeFile(new URL('catalog.json',root),JSON.stringify(catalog,null,2)+'\n');
await writeFile(new URL('catalog-excluded.json',root),JSON.stringify(excluded,null,2)+'\n');
console.log(`${catalog.length} pozycji, ${allIds.length} oficjalnych nagrań; pominięto ${excluded.length} materiałów.`);

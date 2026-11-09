import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/catalog.json' with {type:'json'};
import { cleanTitle, titleKey, recordingIds, releaseMetadata } from '../lib/catalog.ts';
import { getSongs } from '../lib/ranking.ts';
import { DAY } from '../lib/statistics.ts';

test('title matching merges technical labels, preserves different poems and versions',()=>{
  assert.equal(titleKey(cleanTitle('sanah - Szampan (Official Lyric Video)')),titleKey('Szampan'));
  assert.equal(cleanTitle('sanah i Igor Herbut „Mamo tyś płakała”'),'Mamo tyś płakała');
  assert.notEqual(titleKey('Eldorado'),titleKey('Eldorado (E. A. Poe)'));
  assert.notEqual(titleKey('Śrubka'),titleKey('Śrubka (pianinkowe)'));
  assert.equal(titleKey('Kiedy umrę kochanie'),titleKey('Kiedy umrę kochanie'));
});
test('each video appears in exactly one catalog position',()=>{
 const ids=catalog.flatMap(recordingIds);
 assert.equal(ids.length,new Set(ids).size);
 assert.equal(catalog.length,new Set(catalog.map(s=>s.id)).size);
 assert.ok(catalog.every(s=>recordingIds(s).includes(s.youtubeId)));
});
test('aggregate official recordings, disclose partial results and reject incomplete growth',()=>{
 const now=Date.now(), song=catalog.find(s=>s.id==='szampan'), ids=recordingIds(song);
 assert.ok(ids.length>1);
 const videos=ids.map((id,i)=>({id,views:100+i,status:'ok'}));
 const baseline={fetchedAt:new Date(now-7*DAY).toISOString(),videos:videos.map(v=>({...v,views:v.views-10}))};
 const snapshot={version:1,fetchedAt:new Date(now).toISOString(),videos,history:[baseline]};
 const result=getSongs('live',snapshot,now).find(s=>s.id==='szampan');
 assert.equal(result.youtube,videos.reduce((sum,v)=>sum+v.views,0));
 assert.equal(result.week,10*ids.length);
 const partial=getSongs('live',{...snapshot,videos:videos.slice(1)},now).find(s=>s.id==='szampan');
 assert.equal(partial.status,'partial');
 assert.equal(partial.youtube,result.youtube-100);
 assert.equal(partial.week,null);
 const added=getSongs('live',{...snapshot,history:[{...baseline,videos:baseline.videos.slice(1)}]},now).find(s=>s.id==='szampan');
 assert.equal(added.week,null);
});
test('release parsing keeps album metadata without publishing descriptions',()=>{
 const meta=releaseMetadata('Provided to YouTube by Label\n\nTitle · sanah · Guest\n\nAlbum\n\nLyrics and contacts',true);
 assert.equal(meta.releaseAlbum,'Album');assert.equal(meta.collaborators,'Guest');
 assert.equal(JSON.stringify(meta).includes('Lyrics'),false);
});

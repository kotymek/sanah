import test from 'node:test';
import assert from 'node:assert/strict';
import { getSongs, rankSongs, value } from '../lib/ranking.ts';
import { EMPTY_SNAPSHOT, DAY } from '../lib/statistics.ts';
import { loadRanking } from '../lib/feed.ts';
const now=Date.now();
const fresh={version:1,fetchedAt:new Date(now).toISOString(),videos:[{id:'S7sN-cFhwuk',views:0,status:'ok'}],history:[]};
test('live data never inherit demo Spotify, totals or growth',()=>{
  const songs=getSongs('live',fresh,now);
  const szampan=songs.find(s=>s.id==='szampan');
  assert.equal(szampan.youtube,0);
  assert.equal(szampan.spotify,null);
  assert.equal(szampan.week,null);
  assert.equal(value(szampan,'all'),null);
  assert.equal(rankSongs(songs,'youtube')[0].id,'szampan');
  assert.equal(songs.filter(s=>s.youtube!==null).length,1);
  assert.ok(getSongs('demo',EMPTY_SNAPSHOT).every(s=>s.spotify>0));
});
test('empty and expired snapshots produce no invented numbers',()=>{
  assert.ok(getSongs('live',EMPTY_SNAPSHOT,now).every(s=>s.youtube===null));
  assert.ok(getSongs('live',{...fresh,fetchedAt:new Date(now-31*DAY).toISOString()},now).every(s=>s.youtube===null));
});
test('API validates feed and exposes waiting/error/stale states',async()=>{
  const load = value => loadRanking(EMPTY_SNAPSHOT, async()=>Response.json(value), now);
  assert.equal((await load(fresh)).status,'ready');
  assert.equal((await load(EMPTY_SNAPSHOT)).status,'waiting');
  assert.equal((await load({...fresh,fetchedAt:new Date(now-3*DAY).toISOString()})).status,'stale');
  const expired=await load({...fresh,fetchedAt:new Date(now-31*DAY).toISOString()});
  assert.equal(expired.status,'expired'); assert.equal(expired.snapshot.fetchedAt,null);
  assert.equal((await load({...fresh,videos:[{id:'invalid',views:100,status:'ok'}]})).status,'error');
});
test('failed or older remote feed keeps the last known bundled observation',async()=>{
  const failed=await loadRanking(fresh,async()=>{throw new Error('network');},now);
  assert.equal(failed.status,'stale'); assert.equal(failed.snapshot.fetchedAt,fresh.fetchedAt);
  const older={...fresh,fetchedAt:new Date(now-DAY).toISOString()};
  const loaded=await loadRanking(fresh,async()=>Response.json(older),now);
  assert.equal(loaded.snapshot.fetchedAt,fresh.fetchedAt); assert.equal(loaded.source,'bundled');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, EMPTY_SNAPSHOT, makeSnapshot, parseSnapshot, weeklyChange } from '../lib/statistics.ts';
const id='S7sN-cFhwuk';
const now=Date.parse('2026-11-09T06:17:00.000Z');
const iso=days=>new Date(now-days*DAY).toISOString();
const video=(views=100)=>({id,views,status:views===null?'unavailable':'ok'});
const snapshot=(history=[])=>({version:1,fetchedAt:iso(0),videos:[video(150)],history});

test('reject invalid, negative, unsafe and duplicate counts; retain zero',()=>{
  assert.equal(parseSnapshot(snapshot(),now).videos[0].views,150);
  for(const views of [-1,1.5,Number.MAX_SAFE_INTEGER+1,'100']) assert.throws(()=>parseSnapshot({...snapshot(),videos:[video(views)]},now));
  assert.throws(()=>parseSnapshot({...snapshot(),videos:[video(),video()]},now));
  assert.throws(()=>parseSnapshot({...snapshot(),fetchedAt:iso(-1)},now));
  assert.equal(parseSnapshot({...snapshot(),videos:[video(0)]},now).videos[0].views,0);
  assert.equal(parseSnapshot({...snapshot(),videos:[video(null)]},now).videos[0].views,null);
});
test('unknown versions and counts with no timestamp are rejected',()=>{
  assert.throws(()=>parseSnapshot({...snapshot(),version:2},now));
  assert.throws(()=>parseSnapshot({...snapshot(),fetchedAt:null},now));
  assert.deepEqual(parseSnapshot(EMPTY_SNAPSHOT,now),EMPTY_SNAPSHOT);
});
test('weekly delta requires matching ID and a baseline within 12h',()=>{
  assert.equal(weeklyChange(snapshot(),id),null);
  assert.equal(weeklyChange(snapshot([{fetchedAt:iso(6),videos:[video()]}]),id),null);
  assert.equal(weeklyChange(snapshot([{fetchedAt:iso(7),videos:[{...video(),id:'hHb3owr6PQg'}]}]),id),null);
  assert.deepEqual(weeklyChange(snapshot([{fetchedAt:iso(7.1),videos:[video(100)]}]),id),{value:50,from:iso(7.1)});
});
test('nulls do not create growth, real zero and negative corrections do',()=>{
  assert.equal(weeklyChange(snapshot([{fetchedAt:iso(7),videos:[video(null)]}]),id),null);
  assert.equal(weeklyChange(snapshot([{fetchedAt:iso(7),videos:[video(0)]}]),id).value,150);
  assert.equal(weeklyChange(snapshot([{fetchedAt:iso(7),videos:[video(200)]}]),id).value,-50);
});
test('history keeps latest daily measurement, bounded to 14 days',()=>{
  const prior={version:1,fetchedAt:iso(1),videos:[video(120)],history:[{fetchedAt:iso(16),videos:[video(10)]},{fetchedAt:iso(7),videos:[video(100)]}]};
  const next=makeSnapshot(prior,[video(150)],iso(0));
  assert.deepEqual(next.history.map(h=>h.fetchedAt),[iso(7),iso(1)]);
  const sameDay=makeSnapshot(next,[video(151)],new Date(now+3600_000).toISOString());
  assert.equal(sameDay.history.length,2);
  assert.throws(()=>makeSnapshot(next,[video()],iso(1)));
});

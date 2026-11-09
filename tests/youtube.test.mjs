import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchVideoStatistics, validateVideoIds } from '../lib/youtube.ts';
const first='S7sN-cFhwuk', second='hHb3owr6PQg', third='rR001X7JQy8';
test('credential is header-only; response order is mapped by ID; zero is real',async()=>{
  const result=await fetchVideoStatistics([first,second,third],'test-secret',async(url,options)=>{
    assert.equal(options.headers['X-Goog-Api-Key'],'test-secret');
    assert.equal(url.searchParams.has('key'),false);
    return Response.json({items:[{id:second,statistics:{viewCount:'0'}},{id:first,statistics:{viewCount:'123'}}]});
  });
  assert.deepEqual(result,[{id:first,views:123,status:'ok'},{id:second,views:0,status:'ok'},{id:third,views:null,status:'unavailable'}]);
});
test('missing statistics differs from missing video',async()=>{
  const [result]=await fetchVideoStatistics([first],'key',async()=>Response.json({items:[{id:first}]}));
  assert.deepEqual(result,{id:first,views:null,status:'no_count'});
});
test('missing secret and duplicate IDs fail before network access',async()=>{
  const unexpected=()=>{throw new Error('Unexpected network call');};
  await assert.rejects(fetchVideoStatistics([first],'',unexpected),/Brak YOUTUBE_API_KEY/);
  assert.throws(()=>validateVideoIds([first,first]),/więcej niż raz/);
  assert.throws(()=>validateVideoIds(['bad']),/identyfikator/);
});
test('quota/network failures do not echo upstream details or return a partial result',async()=>{
  await assert.rejects(fetchVideoStatistics([first],'secret',async()=>new Response('secret',{status:403})),error=>error.message.includes('403')&&!error.message.includes('secret'));
  await assert.rejects(fetchVideoStatistics([first],'secret',async()=>{throw new Error('secret');}),error=>!error.message.includes('secret'));
  const ids=Array.from({length:51},(_,i)=>String(i).padStart(11,'0'));
  let calls=0;
  await assert.rejects(fetchVideoStatistics(ids,'key',async url=>{
    calls++;
    if(calls===2)return new Response('',{status:500});
    assert.equal(url.searchParams.get('id').split(',').length,50);
    return Response.json({items:ids.slice(0,50).map(id=>({id,statistics:{viewCount:'10'}}))});
  }),/500/);
  assert.equal(calls,2);
});
test('malformed responses and unsafe numeric counts fail',async()=>{
  for(const raw of ['oops','-1','1.5','9007199254740992']) await assert.rejects(fetchVideoStatistics([first],'key',async()=>Response.json({items:[{id:first,statistics:{viewCount:raw}}]})));
  await assert.rejects(fetchVideoStatistics([first],'key',async()=>Response.json({items:[{id:second,statistics:{viewCount:'3'}}]})));
});

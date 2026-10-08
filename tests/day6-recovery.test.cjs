const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {createSQLiteStorage}=require('../lib/ai/storage.cjs');
const {createJobService}=require('../lib/ai/jobs.cjs');
const {createMockProvider}=require('../lib/ai/mock-provider.cjs');
const owner={id:'00000000-0000-4000-8000-000000000001'};
const other={id:'00000000-0000-4000-8000-000000000002'};
const input={task:'gps',payload:{lat:0,lng:0,areaWah:100},idempotencyKey:'day6-synthetic'};
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'feasx-day6-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return join(dir,'jobs.sqlite')}
const service=(storage,options={})=>createJobService({storage,mockProvider:createMockProvider(),authorizeTask:async()=>true,retryDelayMs:0,...options});

test('expired claim cannot commit before recovery runs; restart completes only once',async t=>{
  const file=fixture(t);let db=createSQLiteStorage(file),clock=0,release;
  const s=service(db,{now:()=>clock,timeoutMs:10000,leaseMs:10000,mockProvider:{kind:'mock',execute:()=>new Promise(resolve=>{release=resolve})}});
  const job=await s.create(owner,input),running=s.runNext();await new Promise(resolve=>setImmediate(resolve));
  clock=10000;release(await createMockProvider().execute({task:'gps'}));
  assert.equal((await running).state,'processing');assert.equal(db.get(job.id).result,null);db.close();
  db=createSQLiteStorage(file);const restarted=service(db,{now:()=>clock});assert.equal(restarted.recover(),1);
  await restarted.runNext();assert.equal(restarted.recover(),0);assert.equal(await restarted.runNext(),null);
  const done=await restarted.get(owner,job.id);assert.equal(done.attempts,2);assert.equal(done.history.filter(h=>h.state==='completed').length,1);db.close();
});

test('failure between provider result and durable commit replays execution but stores one completion',async t=>{
  const file=fixture(t);let db=createSQLiteStorage(file),clock=0,calls=0;
  const provider={kind:'mock',execute:async args=>{calls++;return createMockProvider().execute(args)}};
  const wrapped={get:id=>db.get(id),values:()=>db.values(),set:job=>{db.set(job);if(job.state==='completed')throw Error('SYNTHETIC_COMMIT_INTERRUPTION')},get size(){return db.size},transaction:fn=>db.transaction(fn)};
  const s=service(wrapped,{now:()=>clock,mockProvider:provider,timeoutMs:100,leaseMs:100});const job=await s.create(owner,input);
  await assert.rejects(()=>s.runNext(),/SYNTHETIC_COMMIT_INTERRUPTION/);assert.equal(db.get(job.id).state,'processing');assert.equal(db.get(job.id).result,null);db.close();
  clock=101;db=createSQLiteStorage(file);const restarted=service(db,{now:()=>clock,mockProvider:provider});restarted.recover();await restarted.runNext();db.close();
  db=createSQLiteStorage(file);const replay=service(db);const done=await replay.create(owner,input);
  assert.equal(done.id,job.id);assert.equal(done.state,'completed');assert.equal(done.history.filter(h=>h.state==='completed').length,1);assert.equal(calls,2);assert.equal(await replay.runNext(),null);db.close();
});

test('retry deadline survives restart and prevents early execution',async t=>{
  const file=fixture(t);let db=createSQLiteStorage(file),clock=0;
  const s=service(db,{now:()=>clock,retryDelayMs:100,mockProvider:{kind:'mock',execute:async()=>{throw Error('synthetic retry')}}});const j=await s.create(owner,input);await s.runNext();db.close();
  db=createSQLiteStorage(file);const restarted=service(db,{now:()=>clock});clock=99;assert.equal(await restarted.runNext(),null);assert.equal((await restarted.get(owner,j.id)).attempts,1);
  clock=100;assert.equal((await restarted.runNext()).state,'completed');assert.equal((await restarted.get(owner,j.id)).attempts,2);db.close();
});

test('revoked sandbox authorization denies read and terminates queued processing without provider call',async t=>{
  const db=createSQLiteStorage(fixture(t));let allowed=true,calls=0;
  const s=service(db,{authorizeTask:async()=>allowed,mockProvider:{kind:'mock',execute:async args=>{calls++;return createMockProvider().execute(args)}}});const job=await s.create(owner,input);allowed=false;
  await assert.rejects(()=>s.get(owner,job.id),e=>e.code==='FORBIDDEN');const denied=await s.runNext();assert.equal(denied.state,'failed');assert.equal(denied.error,'FORBIDDEN');assert.equal(calls,0);assert.equal(await s.runNext(),null);db.close();
});

test('ownership survives recovery and completed restart without revealing another owner job',async t=>{
  const file=fixture(t);let db=createSQLiteStorage(file),clock=0;let s=service(db,{now:()=>clock});const j=await s.create(owner,input);
  db.transaction(()=>{const row=db.get(j.id);row.state='processing';row.attempts=1;row.leaseUntil=1;row.claimToken='synthetic-abandoned';db.set(row)});db.close();
  clock=2;db=createSQLiteStorage(file);s=service(db,{now:()=>clock});s.recover();await assert.rejects(()=>s.get(other,j.id),e=>e.status===404);await s.runNext();db.close();
  db=createSQLiteStorage(file);s=service(db);await assert.rejects(()=>s.get(other,j.id),e=>e.status===404);assert.equal((await s.get(owner,j.id)).state,'completed');assert.notEqual((await s.create(other,input)).id,j.id);db.close();
});

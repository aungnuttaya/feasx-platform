const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {readFileSync}=require('node:fs');
const container='feasx-day3-synthetic-postgres';
const args=sql=>['exec',container,'psql','-U','postgres','-d','feasx_synthetic','-At','-v','ON_ERROR_STOP=1','-c',sql];
const sql=s=>execFileSync('docker',args(s),{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const asyncSQL=s=>promisify(execFile)('docker',args(s),{encoding:'utf8'});
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const asUser=(id,s)=>`SET ROLE sandbox_authenticated; SET request.jwt.claim.sub='${id}'; ${s}`;
const last=s=>s.split('\n').at(-1);
test.before(()=>{
  // Reject any accidental connection to a production database/container.
  const network=execFileSync('docker',['inspect',container,'--format','{{.HostConfig.NetworkMode}}'],{encoding:'utf8'}).trim();
  assert.equal(network,'none');
  sql(readFileSync(__dirname+'/schema.sql','utf8'));
});
test('anonymous RLS exposes no usage/subscription rows',()=>{for(const table of ['usage_cycles','subscriptions'])assert.equal(last(sql(`SET ROLE sandbox_anon; SELECT count(*) FROM sandbox.${table}`)),'0')});
test('actual RLS isolates synthetic user A from user B',()=>{
  assert.equal(last(sql(asUser(A,'SELECT count(*) FROM sandbox.usage_cycles'))),'1');
  assert.equal(last(sql(asUser(A,`SELECT count(*) FROM sandbox.usage_cycles WHERE user_id='${B}'`))),'0');
  assert.equal(last(sql(asUser(B,'SELECT plan_id FROM sandbox.subscriptions'))),'synthetic-b');
});
test('client cannot directly mint credits or change plans',()=>{
  assert.throws(()=>sql(asUser(A,'UPDATE sandbox.usage_cycles SET credits_remaining=999')),/permission denied/);
  assert.throws(()=>sql(asUser(A,"UPDATE sandbox.subscriptions SET plan_id='pro'")),/permission denied/);
});
test('anonymous cannot execute credit RPC',()=>assert.throws(()=>sql("SET ROLE sandbox_anon; SELECT sandbox.consume_credit('10000000-0000-4000-8000-000000000001')"),/permission denied/));
test('credit RPC binds actor and replay is idempotent',()=>{
  const call=asUser(A,"SELECT sandbox.consume_credit('10000000-0000-4000-8000-000000000001')");
  assert.equal(last(sql(call)),'2');assert.equal(last(sql(call)),'2');
  assert.equal(last(sql(`SELECT credits_remaining FROM sandbox.usage_cycles WHERE user_id='${B}'`)),'2');
  assert.equal(last(sql(`SELECT count(*) FROM sandbox.credit_transactions WHERE user_id='${A}'`)),'1');
});
test('concurrent distinct debits cannot exceed remaining credits or go negative',async()=>{
  const runs=await Promise.allSettled(Array.from({length:8},(_,i)=>asyncSQL(asUser(B,`SELECT sandbox.consume_credit('20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}')`))));
  assert.equal(runs.filter(x=>x.status==='fulfilled').length,2);
  for(const r of runs.filter(x=>x.status==='rejected')) assert.match(r.reason.stderr,/no_credits/);
  assert.equal(last(sql(`SELECT credits_remaining FROM sandbox.usage_cycles WHERE user_id='${B}'`)),'0');
  assert.equal(last(sql(`SELECT count(*) FROM sandbox.credit_transactions WHERE user_id='${B}'`)),'2');
});
test('concurrent replay of same request debits exactly once',async()=>{
  const call=asUser(A,"SELECT sandbox.consume_credit('30000000-0000-4000-8000-000000000001')");
  await Promise.all(Array.from({length:5},()=>asyncSQL(call)));
  assert.equal(last(sql(`SELECT credits_remaining FROM sandbox.usage_cycles WHERE user_id='${A}'`)),'1');
});
test('RPC rollback restores both quota and ledger',()=>{
  sql(asUser(A,"BEGIN; SELECT sandbox.consume_credit('40000000-0000-4000-8000-000000000001'); ROLLBACK;"));
  assert.equal(last(sql(`SELECT credits_remaining FROM sandbox.usage_cycles WHERE user_id='${A}'`)),'1');
  assert.equal(last(sql("SELECT count(*) FROM sandbox.credit_transactions WHERE request_id='40000000-0000-4000-8000-000000000001'")),'0');
});

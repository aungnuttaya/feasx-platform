const test=require('node:test');
const assert=require('node:assert/strict');
const {fork}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {startSandboxRuntime,USERS}=require('../lib/sandbox-runtime.cjs');
async function credentials(){const {generateKeyPair,exportJWK,SignJWT}=await import('jose');const {privateKey,publicKey}=await generateKeyPair('ES256');const pub=await exportJWK(publicKey);pub.kid='synthetic-runtime';return {jwks:{keys:[pub]},token:(id=USERS[0])=>new SignJWT({role:'authenticated'}).setProtectedHeader({alg:'ES256',kid:pub.kid}).setSubject(id).setIssuer('https://synthetic.invalid/auth/v1').setAudience('authenticated').setIssuedAt().setExpirationTime('5m').sign(privateKey)}}
const body={task:'gps',payload:{lat:0,lng:0,areaWah:100}};
async function poll(url,token,id,state){for(let i=0;i<150;i++){const r=await fetch(url+'/jobs?id='+id,{headers:{Authorization:'Bearer '+token}});const data=await r.json();if(data.job?.state===state)return data.job;await new Promise(resolve=>setTimeout(resolve,20))}throw Error('Job state timeout: '+state)}
async function child(config){const process=fork(join(__dirname,'../scripts/sandbox-runtime.cjs'),[],{stdio:['ignore','pipe','pipe','ipc'],env:{PATH:processEnvPath(),LANG:'C.UTF-8'}});const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{process.kill('SIGKILL');reject(Error('Runtime startup timeout'))},10000);process.once('message',msg=>{clearTimeout(timer);msg.ready?resolve(msg.url):reject(Error(msg.error))});process.once('exit',()=>{clearTimeout(timer);reject(Error('Runtime exited before ready'))})});process.send(config);return {process,url:await ready}}
function processEnvPath(){return process.env.PATH}
function directory(t){const dir=mkdtempSync(join(tmpdir(),'feasx-runtime-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir}
test('actual local HTTP runtime validates JWT, idempotency, owner access and missing keys',async t=>{const keys=await credentials(),token=await keys.token(),directoryPath=directory(t);const runtime=await startSandboxRuntime({directory:directoryPath,jwks:keys.jwks});t.after(()=>runtime.close());
  for(const authorization of [undefined,'Bearer forged']){const r=await fetch(runtime.url+'/jobs',{method:'POST',headers:{'Content-Type':'application/json',...(authorization?{Authorization:authorization}:{})},body:JSON.stringify(body)});assert.equal(r.status,401)}
  const headers={'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':'runtime-create'};
  assert.equal((await fetch(runtime.url+'/jobs',{method:'POST',headers:{...headers,'Idempotency-Key':''},body:JSON.stringify(body)})).status,400);
  const first=await fetch(runtime.url+'/jobs',{method:'POST',headers,body:JSON.stringify({...body,userId:USERS[1]})});assert.equal(first.status,202);const job=(await first.json()).job;
  const replay=await fetch(runtime.url+'/jobs',{method:'POST',headers,body:JSON.stringify(body)});assert.equal((await replay.json()).job.id,job.id);
  assert.equal((await fetch(runtime.url+'/jobs?id='+job.id,{headers:{Authorization:'Bearer '+await keys.token(USERS[1])}})).status,404);
  const done=await poll(runtime.url,token,job.id,'completed');assert.equal(done.provenance.provider,'mock');
});
test('forced process restart recovers processing job and preserves completed output',async t=>{const keys=await credentials(),token=await keys.token(),dir=directory(t);let runtime=await child({directory:dir,jwks:keys.jwks,delayMs:500,timeoutMs:1000,leaseMs:1100});
  t.after(()=>{if(runtime.process.exitCode===null)runtime.process.kill('SIGKILL')});
  const created=await fetch(runtime.url+'/jobs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':'crash-key'},body:JSON.stringify(body)});const job=(await created.json()).job;
  await poll(runtime.url,token,job.id,'processing');runtime.process.kill('SIGKILL');await new Promise(resolve=>runtime.process.once('exit',resolve));
  runtime=await child({directory:dir,jwks:keys.jwks,timeoutMs:1000,leaseMs:1100});const done=await poll(runtime.url,token,job.id,'completed');assert.equal(done.attempts,2);
  runtime.process.send({stop:true});await new Promise(resolve=>runtime.process.once('exit',resolve));
  runtime=await child({directory:dir,jwks:keys.jwks});const replay=await fetch(runtime.url+'/jobs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':'crash-key'},body:JSON.stringify(body)});const restored=(await replay.json()).job;assert.equal(restored.id,job.id);assert.equal(restored.state,'completed');assert.equal(restored.attempts,2);runtime.process.send({stop:true});await new Promise(resolve=>runtime.process.once('exit',resolve));
});

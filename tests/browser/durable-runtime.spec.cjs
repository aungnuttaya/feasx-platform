const {test,expect}=require('@playwright/test');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {startSandboxRuntime,USERS}=require('../../lib/sandbox-runtime.cjs');
async function keys(){const {generateKeyPair,exportJWK,SignJWT}=await import('jose');const {privateKey,publicKey}=await generateKeyPair('ES256');const pub=await exportJWK(publicKey);pub.kid='synthetic-browser-runtime';return {jwks:{keys:[pub]},token:id=>new SignJWT({role:'authenticated'}).setProtectedHeader({alg:'ES256',kid:pub.kid}).setSubject(id).setIssuer('https://synthetic.invalid/auth/v1').setAudience('authenticated').setIssuedAt().setExpirationTime('5m').sign(privateKey)}}
async function read(page,token,id){return page.evaluate(async({token,id})=>{const response=await fetch('/jobs?id='+id,{headers:{Authorization:'Bearer '+token}});return {status:response.status,body:await response.json()}},{token,id})}
test('browser signed synthetic JWT creates owned idempotent job and reads after runtime restart',async({page})=>{
  const dir=mkdtempSync(join(tmpdir(),'feasx-browser-runtime-')),config=await keys();let runtime;
  try{
    const token=await config.token(USERS[0]),other=await config.token(USERS[1]);runtime=await startSandboxRuntime({directory:dir,jwks:config.jwks});await page.goto(runtime.url);
    const create=()=>page.evaluate(async token=>{const response=await fetch('/jobs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':'browser-synthetic-key'},body:JSON.stringify({task:'gps',payload:{lat:0,lng:0,areaWah:100}})});return {status:response.status,body:await response.json()}},token);
    const first=await create();expect(first.status).toBe(202);const id=first.body.job.id;expect((await create()).body.job.id).toBe(id);expect((await read(page,other,id)).status).toBe(404);
    await expect.poll(async()=> (await read(page,token,id)).body.job.state).toBe('completed');
    await runtime.close();runtime=await startSandboxRuntime({directory:dir,jwks:config.jwks});await page.goto(runtime.url);
    const restored=await read(page,token,id);expect(restored.body.job.state).toBe('completed');expect(restored.body.job.attempts).toBe(1);
  }finally{if(runtime)await runtime.close();rmSync(dir,{recursive:true,force:true})}
});
test('browser sees unauthorized denial and terminal timeout without false success',async({page})=>{
  const dir=mkdtempSync(join(tmpdir(),'feasx-browser-timeout-')),config=await keys();let runtime;
  try{
    runtime=await startSandboxRuntime({directory:dir,jwks:config.jwks,delayMs:100,timeoutMs:10,leaseMs:30});await page.goto(runtime.url);
    const denial=await page.evaluate(async()=>{const response=await fetch('/jobs');return response.status});expect(denial).toBe(401);
    const token=await config.token(USERS[0]);const job=await page.evaluate(async token=>{const response=await fetch('/jobs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':'timeout-synthetic-key'},body:JSON.stringify({task:'gps',payload:{lat:0,lng:0,areaWah:100}})});return (await response.json()).job},token);
    await expect.poll(async()=> (await read(page,token,job.id)).body.job.state).toBe('failed');
    const failed=(await read(page,token,job.id)).body.job;expect(failed.error).toBe('PROVIDER_TIMEOUT');expect(failed.result).toBe(null);expect(failed.attempts).toBe(2);
  }finally{if(runtime)await runtime.close();rmSync(dir,{recursive:true,force:true})}
});

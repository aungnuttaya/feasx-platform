const http=require('node:http');
const {mkdirSync,chmodSync,realpathSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {createIdentityVerifier}=require('./identity.cjs');
const {createJobService,createJobsHandler}=require('./ai/jobs.cjs');
const {createSQLiteStorage}=require('./ai/storage.cjs');
const {createMockProvider}=require('./ai/mock-provider.cjs');
const USERS=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
async function startSandboxRuntime({directory,jwks,port=0,delayMs=0,timeoutMs=1000,leaseMs=timeoutMs+250,pollMs=25}={}){
  // Trusted local configuration only; no environment bindings or token mint endpoint.
  if(typeof directory!=='string')throw Error('SANDBOX_DIRECTORY_REQUIRED');
  directory=resolve(directory);
  if(!directory.startsWith('/tmp/')&&!directory.startsWith('/workspace/'))throw Error('SANDBOX_DIRECTORY_REQUIRED');
  const verifyIdentity=await createIdentityVerifier({jwks,issuer:'https://synthetic.invalid/auth/v1',audience:'authenticated'});
  mkdirSync(directory,{recursive:true,mode:0o700});directory=realpathSync(directory);
  if(!directory.startsWith('/tmp/')&&!directory.startsWith('/workspace/'))throw Error('SANDBOX_DIRECTORY_REQUIRED');
  chmodSync(directory,0o700);
  const filename=join(directory,'jobs.sqlite'),storage=createSQLiteStorage(filename);chmodSync(filename,0o600);
  const service=createJobService({storage,mockProvider:createMockProvider({delayMs}),authorizeTask:async identity=>USERS.includes(identity.id),timeoutMs,leaseMs,retryDelayMs:25});
  const windows=new Map();
  const handler=createJobsHandler({verifyIdentity,service,requireIdempotency:true,allowRequest:async identity=>{
    if(!USERS.includes(identity.id))return false;
    const now=Date.now(),entry=windows.get(identity.id);
    if(!entry||now-entry.start>=60000){windows.set(identity.id,{start:now,count:1});return true}
    return ++entry.count<=240;
  }});
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    res.status=code=>{res.statusCode=code;return res};res.json=body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return res};
    if(url.pathname!=='/jobs'){res.status(404).json({ok:false,error:{code:'NOT_FOUND'}});return}
    req.query=Object.fromEntries(url.searchParams);let size=0,chunks=[];
    try{
      for await(const chunk of req){size+=chunk.length;if(size>65536){res.status(413).json({ok:false,error:{code:'PAYLOAD_TOO_LARGE'}});return}chunks.push(chunk)}
      req.body=size?JSON.parse(Buffer.concat(chunks).toString()):{};
    }catch{res.status(400).json({ok:false,error:{code:'INVALID_JSON'}});return}
    await handler(req,res);
  });
  let pending=null,stopping=false;
  const pump=()=>{
    if(pending||stopping)return;
    pending=(async()=>{service.recover();await service.runNext()})().catch(()=>{stopping=true}).finally(()=>{pending=null});
  };
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
  pump();const timer=setInterval(pump,pollMs);
  let closed=false;
  return {url:`http://127.0.0.1:${server.address().port}`,async close(){if(closed)return;closed=true;stopping=true;clearInterval(timer);await new Promise(resolve=>server.close(resolve));if(pending)await pending;storage.close()}};
}
module.exports={startSandboxRuntime,USERS};

const {randomUUID,createHash}=require('node:crypto');
const {createMemoryStorage}=require('./storage.cjs');
const {AIError,validatePayload}=require('./contract.cjs');
const {executeProvider}=require('./execution.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
function createJobService({mockProvider,authorizeTask=async()=>false,maxJobs=100,maxAttempts=2,timeoutMs=5000,retryDelayMs=100,now=Date.now,storage=createMemoryStorage(),leaseMs=timeoutMs+1000}={}) {
  if(mockProvider?.kind!=='mock'||typeof mockProvider.execute!=='function')throw new Error('MOCK_PROVIDER_REQUIRED');
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>1000||!Number.isFinite(retryDelayMs)||retryDelayMs<0||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('INVALID_JOB_CONFIG');
  if(!Number.isFinite(leaseMs)||leaseMs<timeoutMs)throw new Error('INVALID_LEASE_CONFIG');
  const jobs=storage;
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const transition=(job,state)=>{job.state=state;job.updatedAt=now();job.history.push({state,at:job.updatedAt,attempt:job.attempts})};
  const authenticate=identity=>{if(typeof identity?.id!=='string'||!identity.id)throw new AIError('UNAUTHENTICATED',401)};
  const view=job=>clone({id:job.id,task:job.task,state:job.state,attempts:job.attempts,error:job.error,result:job.result,history:job.history,createdAt:job.createdAt,updatedAt:job.updatedAt,provenance:{provider:'mock',humanReviewRequired:true}});
  return {
    async create(identity,{task,payload,idempotencyKey}={}) {
      authenticate(identity);
      if(!await authorizeTask(identity,task))throw new AIError('FORBIDDEN',403);
      if(typeof task!=='string'||task.length>64)throw new AIError('INVALID_REQUEST',400);
      if(idempotencyKey!==undefined && (typeof idempotencyKey!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey)))throw new AIError('INVALID_REQUEST',400);
      let serialized;try{serialized=JSON.stringify(payload)}catch{throw new AIError('INVALID_REQUEST',400)}
      if(!serialized||serialized.length>50000)throw new AIError('INVALID_REQUEST',400);
      const copy=JSON.parse(serialized),key=idempotencyKey??randomUUID();
      const fingerprint=createHash('sha256').update(JSON.stringify({task,payload:canonical(copy)})).digest('hex');
      return jobs.transaction(()=>{
        const previous=jobs.values().find(job=>job.ownerId===identity.id&&job.idempotencyKey===key);
        if(previous){if(previous.fingerprint!==fingerprint)throw new AIError('IDEMPOTENCY_CONFLICT',409);return view(previous)}
        if(jobs.size>=maxJobs)throw new AIError('QUEUE_CAPACITY',429);
        const job={id:randomUUID(),ownerId:identity.id,task,payload:copy,idempotencyKey:key,fingerprint,attempts:0,error:null,result:null,history:[],createdAt:now(),availableAt:now()};
        transition(job,'created');
        if(!validatePayload(task,job.payload)){job.error='INVALID_REQUEST';transition(job,'failed');jobs.set(job);return view(job)}
        transition(job,'validated');transition(job,'queued');jobs.set(job);return view(job);
      });
    },
    async get(identity,id) {
      authenticate(identity);const job=jobs.get(id);
      if(!job||job.ownerId!==identity.id)throw new AIError('JOB_NOT_FOUND',404);
      if(!await authorizeTask(identity,job.task))throw new AIError('FORBIDDEN',403);
      return view(job);
    },
    // Internal worker only: no HTTP processing/retry endpoint and no worker JWT.
    recover() {
      return jobs.transaction(()=>{
        let count=0;
        for(const job of jobs.values())if(job.state==='processing'&&job.leaseUntil<=now()){
          job.error='WORKER_INTERRUPTED';job.result=null;job.claimToken=null;transition(job,'failed');
          if(job.attempts<maxAttempts){job.availableAt=now()+retryDelayMs;transition(job,'queued')}
          jobs.set(job);count++;
        }
        return count;
      });
    },
    async runNext() {
      const job=jobs.transaction(()=>{
        const next=jobs.values().find(j=>j.state==='queued'&&j.availableAt<=now());
        if(!next)return null;
        next.attempts++;next.claimToken=randomUUID();next.leaseUntil=now()+leaseMs;transition(next,'processing');jobs.set(next);return next;
      });
      if(!job)return null;
      let result=null,errorCode=null;
      try {
        if(!await authorizeTask({id:job.ownerId},job.task))throw new AIError('FORBIDDEN',403);
        result=clone(await executeProvider({provider:mockProvider.execute,task:job.task,payload:clone(job.payload),identity:{id:job.ownerId},requestId:job.id,timeoutMs}));
      }catch(error){errorCode=error instanceof AIError&&['PROVIDER_TIMEOUT','INVALID_RESULT','FORBIDDEN'].includes(error.code)?error.code:'PROVIDER_FAILED'}
      return jobs.transaction(()=>{
        const current=jobs.get(job.id);
        // A stale worker cannot overwrite a recovered/reclaimed job.
        // Expired claims have lost authority even if recovery has not run yet.
        if(current.state!=='processing'||current.claimToken!==job.claimToken||current.leaseUntil<=now())return view(current);
        current.claimToken=null;current.leaseUntil=null;current.result=result;current.error=errorCode;
        transition(current,errorCode?'failed':'completed');
        if(['PROVIDER_TIMEOUT','PROVIDER_FAILED'].includes(errorCode)&&current.attempts<maxAttempts){current.availableAt=now()+retryDelayMs;transition(current,'queued')}
        jobs.set(current);return view(current);
      });
    },

  };
}
function createJobsHandler({verifyIdentity=async()=>null,service,allowRequest=async()=>false,requireIdempotency=false}={}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');const requestId=randomUUID();
    const fail=(status,code)=>res.status(status).json({ok:false,error:{code},requestId});
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return fail(405,'METHOD_NOT_ALLOWED')}
    let identity;try{identity=await verifyIdentity(req)}catch{return fail(401,'UNAUTHENTICATED')}
    if(typeof identity?.id!=='string'||!identity.id)return fail(401,'UNAUTHENTICATED');
    if(!service)return fail(503,'JOBS_NOT_CONFIGURED');
    try {
      if(!await allowRequest(identity))return fail(429,'RATE_LIMITED');
      if(req.method==='GET'){
        if(typeof req.query?.id!=='string')return fail(400,'INVALID_REQUEST');
        return res.status(200).json({ok:true,job:await service.get(identity,req.query.id),requestId});
      }
      const key=req.headers?.['idempotency-key'];
      if(requireIdempotency&&typeof key!=='string')return fail(400,'IDEMPOTENCY_KEY_REQUIRED');
      const job=await service.create(identity,{...req.body,idempotencyKey:key??req.body?.idempotencyKey});
      return res.status(job.state==='failed'?400:202).json({ok:job.state!=='failed',job,requestId});
    }catch(error){
      const known=error instanceof AIError&&['UNAUTHENTICATED','FORBIDDEN','QUEUE_CAPACITY','INVALID_REQUEST','JOB_NOT_FOUND','IDEMPOTENCY_CONFLICT'].includes(error.code);
      return fail(known?error.status:500,known?error.code:'JOB_OPERATION_FAILED');
    }
  };
}
module.exports={createJobService,createJobsHandler};

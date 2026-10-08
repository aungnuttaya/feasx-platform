const {randomUUID}=require('node:crypto');
const {AIError,validatePayload}=require('./contract.cjs');
const {executeProvider}=require('./execution.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
function createJobService({mockProvider,authorizeTask=async()=>false,maxJobs=100,maxAttempts=2,timeoutMs=5000,retryDelayMs=100,now=Date.now}={}) {
  if(mockProvider?.kind!=='mock'||typeof mockProvider.execute!=='function')throw new Error('MOCK_PROVIDER_REQUIRED');
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>1000||!Number.isFinite(retryDelayMs)||retryDelayMs<0||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('INVALID_JOB_CONFIG');
  const jobs=new Map();
  const transition=(job,state)=>{job.state=state;job.updatedAt=now();job.history.push({state,at:job.updatedAt,attempt:job.attempts})};
  const authenticate=identity=>{if(typeof identity?.id!=='string'||!identity.id)throw new AIError('UNAUTHENTICATED',401)};
  const view=job=>clone({id:job.id,task:job.task,state:job.state,attempts:job.attempts,error:job.error,result:job.result,history:job.history,createdAt:job.createdAt,updatedAt:job.updatedAt,provenance:{provider:'mock',humanReviewRequired:true}});
  return {
    async create(identity,{task,payload}={}) {
      authenticate(identity);
      if(!await authorizeTask(identity,task))throw new AIError('FORBIDDEN',403);
      if(jobs.size>=maxJobs)throw new AIError('QUEUE_CAPACITY',429);
      let serialized;try{serialized=JSON.stringify(payload)}catch{throw new AIError('INVALID_REQUEST',400)}
      if(!serialized||serialized.length>50000)throw new AIError('INVALID_REQUEST',400);
      const job={id:randomUUID(),ownerId:identity.id,task,payload:clone(payload),attempts:0,error:null,result:null,history:[],createdAt:now(),availableAt:now()};
      transition(job,'created');jobs.set(job.id,job);
      if(!validatePayload(task,job.payload)){job.error='INVALID_REQUEST';transition(job,'failed');return view(job)}
      transition(job,'validated');transition(job,'queued');return view(job);
    },
    async get(identity,id) {
      authenticate(identity);const job=jobs.get(id);
      if(!job||job.ownerId!==identity.id)throw new AIError('JOB_NOT_FOUND',404);
      if(!await authorizeTask(identity,job.task))throw new AIError('FORBIDDEN',403);
      return view(job);
    },
    // Internal worker only: no HTTP processing/retry endpoint and no worker JWT.
    async runNext() {
      const job=[...jobs.values()].find(j=>j.state==='queued'&&j.availableAt<=now());
      if(!job)return null;
      job.attempts++;transition(job,'processing');
      try {
        if(!await authorizeTask({id:job.ownerId},job.task))throw new AIError('FORBIDDEN',403);
        job.result=clone(await executeProvider({provider:mockProvider.execute,task:job.task,payload:clone(job.payload),identity:{id:job.ownerId},requestId:job.id,timeoutMs}));
        job.error=null;transition(job,'completed');
      }catch(error){
        job.result=null;job.error=error instanceof AIError&&['PROVIDER_TIMEOUT','INVALID_RESULT','FORBIDDEN'].includes(error.code)?error.code:'PROVIDER_FAILED';transition(job,'failed');
        if(['PROVIDER_TIMEOUT','PROVIDER_FAILED'].includes(job.error)&&job.attempts<maxAttempts){job.availableAt=now()+retryDelayMs;transition(job,'queued')}
      }
      return view(job);
    },
  };
}
function createJobsHandler({verifyIdentity=async()=>null,service,allowRequest=async()=>false}={}) {
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
      const job=await service.create(identity,req.body);
      return res.status(job.state==='failed'?400:202).json({ok:job.state!=='failed',job,requestId});
    }catch(error){
      const known=error instanceof AIError&&['UNAUTHENTICATED','FORBIDDEN','QUEUE_CAPACITY','INVALID_REQUEST','JOB_NOT_FOUND'].includes(error.code);
      return fail(known?error.status:500,known?error.code:'JOB_OPERATION_FAILED');
    }
  };
}
module.exports={createJobService,createJobsHandler};

const {randomUUID}=require('node:crypto');
const {AIError,validatePayload}=require('./contract.cjs');
const {executeProvider}=require('./execution.cjs');
// Dependencies are injected by offline tests. The public route deliberately
// has no authenticator/provider binding and cannot execute a paid operation.
function createGateway({verifyIdentity=async()=>null,provider,allowRequest,authorizeTask,timeoutMs=5000}={}) {
  return async function handler(req,res) {
    const requestId=randomUUID();
    res.setHeader('Cache-Control','no-store');
    const fail=(status,code)=>res.status(status).json({ok:false,error:{code},requestId});
    if(req.method!=='POST') {res.setHeader('Allow','POST');return fail(405,'METHOD_NOT_ALLOWED');}
    let identity;
    try {identity=await verifyIdentity(req);} catch {return fail(401,'UNAUTHENTICATED');}
    if(!identity || typeof identity.id!=='string' || !identity.id) return fail(401,'UNAUTHENTICATED');
    const {task,payload}=req.body||{};
    if(!['report','ocr','gps'].includes(task)||!payload||typeof payload!=='object'||Array.isArray(payload)) return fail(400,'INVALID_REQUEST');
    let serialized;
    try {serialized=JSON.stringify(payload);} catch {return fail(400,'INVALID_REQUEST');}
    if(serialized.length>50000) return fail(413,'PAYLOAD_TOO_LARGE');
    if(!validatePayload(task,payload)) return fail(400,'INVALID_REQUEST');
    if(!provider||!allowRequest||!authorizeTask) return fail(503,'GATEWAY_NOT_CONFIGURED');
    try {
      if(!await authorizeTask(identity,task)) return fail(403,'FORBIDDEN');
      if(!await allowRequest(identity)) return fail(429,'RATE_LIMITED');
      const result=await executeProvider({provider,task,payload,identity,requestId,timeoutMs});
      return res.status(200).json({ok:true,result,requestId,provenance:{provider:'mock',humanReviewRequired:true}});
    } catch(error) {return fail(error instanceof AIError?error.status:502,error instanceof AIError?error.code:'PROVIDER_FAILED');}
  };
}
module.exports={createGateway};

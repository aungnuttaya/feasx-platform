const {AIError,validateResult}=require('./contract.cjs');
async function requestAI(task,payload,{fetchImpl=globalThis.fetch,timeoutMs=7000}={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetchImpl('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,payload}),signal:controller.signal});
    if(!response.ok) throw new AIError('AI_REQUEST_FAILED',response.status);
    const body=await response.json();
    if(body.ok!==true||!body.provenance||body.provenance.humanReviewRequired!==true) throw new AIError('INVALID_RESPONSE');
    return validateResult(task,body.result);
  } finally {clearTimeout(timer);}
}
module.exports={requestAI};

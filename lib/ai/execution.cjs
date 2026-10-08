const {AIError,validateResult}=require('./contract.cjs');
// Shared by the existing synchronous gateway and the sandbox job worker.
async function executeProvider({provider,task,payload,identity,requestId,timeoutMs=5000}) {
  const controller=new AbortController();let timer;
  try {
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new AIError('PROVIDER_TIMEOUT',504))},timeoutMs)});
    const output=await Promise.race([Promise.resolve().then(()=>provider({task,payload,identity,requestId,signal:controller.signal})),timeout]);
    let serialized;
    try{serialized=JSON.stringify(output)}catch{throw new AIError('INVALID_RESULT')}
    if(!serialized||serialized.length>50000)throw new AIError('INVALID_RESULT');
    return validateResult(task,JSON.parse(serialized));
  } finally {clearTimeout(timer);}
}
module.exports={executeProvider};

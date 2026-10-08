const {startSandboxRuntime}=require('../lib/sandbox-runtime.cjs');
// Test harness forks this child and supplies only public synthetic JWKS over IPC.
if(!process.send)throw Error('Sandbox harness IPC required; no production CLI mode');
let runtime;
process.once('message',async config=>{
  try{runtime=await startSandboxRuntime(config);process.send({ready:true,url:runtime.url})}
  catch{process.send({ready:false,error:'SANDBOX_START_FAILED'});process.exitCode=1;process.disconnect()}
});
process.on('message',async message=>{if(message.stop&&runtime){await runtime.close();process.exit(0)}});

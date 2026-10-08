const {execFileSync,spawnSync}=require('node:child_process');
const name='feasx-day3-synthetic-postgres';
const image='postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24';
// Refuse to reuse or remove any pre-existing container with this name.
if(spawnSync('docker',['inspect',name],{stdio:'ignore'}).status===0) {
  console.error('Synthetic test container already exists; inspect it before rerunning.');process.exit(1);
}
(async()=>{
  let created=false;
  try {
    execFileSync('docker',['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=feasx_synthetic',image],{stdio:'pipe'});created=true;
    let ready=false;
    for(let attempt=0;attempt<80;attempt++) {
      // The init server listens only on Unix sockets. TCP readiness waits
      // for the final server, avoiding the init shutdown/restart race.
      if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!ready) throw Error('Synthetic database startup timed out');
    process.exitCode=spawnSync(process.execPath,['--test','tests/sandbox/rls.test.cjs'],{stdio:'inherit'}).status??1;
  } catch(error) {console.error(error.message);process.exitCode=1;}
  finally {if(created)execFileSync('docker',['rm','--force',name],{stdio:'pipe'});}
})();

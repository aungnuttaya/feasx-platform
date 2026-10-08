const test=require('node:test');
const assert=require('node:assert/strict');
const {createIdentityVerifier}=require('../lib/identity.cjs');
const {createGateway}=require('../lib/ai/gateway.cjs');
const issuer='https://synthetic.invalid/auth/v1',audience='authenticated';
const userA='00000000-0000-4000-8000-000000000001',userB='00000000-0000-4000-8000-000000000002';
async function setup(){
  const {generateKeyPair,exportJWK,SignJWT}=await import('jose');
  const {privateKey,publicKey}=await generateKeyPair('ES256');
  const jwk=await exportJWK(publicKey);jwk.kid='synthetic-test-key';
  const verify=await createIdentityVerifier({jwks:{keys:[jwk]},issuer,audience});
  const token=(claims={},key=privateKey)=>{
    const jwt=new SignJWT({role:'authenticated',...claims}).setProtectedHeader({alg:'ES256',kid:'synthetic-test-key'}).setIssuer(claims.iss||issuer).setAudience(claims.aud||audience).setSubject(claims.sub||userA).setIssuedAt(claims.iat??Math.floor(Date.now()/1000));
    if(claims.exp!==null)jwt.setExpirationTime(claims.exp||'5m');
    return jwt.sign(key);
  };
  return {verify,token,generateKeyPair};
}
test('verified signature binds identity to subject, never body userId',async()=>{const {verify,token}=await setup();assert.deepEqual(await verify({headers:{authorization:'Bearer '+await token()},body:{userId:userB}}),{id:userA})});
test('missing/forged authorization fails closed',async()=>{const {verify}=await setup();for(const authorization of [undefined,'Bearer forged','Basic fake','Bearer a b'])assert.equal(await verify({headers:{authorization}}),null)});
test('wrong issuer, audience, expired/not-yet-valid/stale token, role, or invalid subject rejected',async()=>{const {verify,token}=await setup();for(const claims of [{iss:'https://other.invalid'},{aud:'other'},{exp:1},{exp:null},{iat:Math.floor(Date.now()/1000)+600},{iat:Math.floor(Date.now()/1000)-7200},{nbf:Math.floor(Date.now()/1000)+600},{role:'service_role'},{sub:'not-a-uuid'}])assert.equal(await verify({headers:{authorization:'Bearer '+await token(claims)}}),null)});
test('unconfigured or symmetric/private key configuration rejected',async()=>{await assert.rejects(()=>createIdentityVerifier(),/IDENTITY_NOT_CONFIGURED/);await assert.rejects(()=>createIdentityVerifier({issuer,audience,jwks:{keys:[{kty:'oct',k:'synthetic-only'}]}}),/IDENTITY_NOT_CONFIGURED/)});
test('signature by different synthetic key is rejected',async()=>{const {verify,token,generateKeyPair}=await setup();const other=await generateKeyPair('ES256');assert.equal(await verify({headers:{authorization:'Bearer '+await token({},other.privateKey)}}),null)});
test('two verified identities reach task authorization independently',async()=>{
  const {verify,token}=await setup();const seen=[];
  const handler=createGateway({verifyIdentity:verify,authorizeTask:async identity=>{seen.push(identity.id);return false},provider:async()=>{throw Error('must not run')},allowRequest:async()=>true});
  for(const id of [userA,userB]){const res={setHeader(){},status(n){this.code=n;return this},json(){}};await handler({method:'POST',headers:{authorization:'Bearer '+await token({sub:id})},body:{task:'report',payload:{prompt:'synthetic'},userId:'forged'}},res);assert.equal(res.code,403)}
  assert.deepEqual(seen,[userA,userB]);
});

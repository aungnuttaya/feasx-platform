// Verify against explicitly supplied public JWKS only. No remote JWKS fetch,
// environment credentials or user-selected issuer. Production binding is absent.
async function createIdentityVerifier({jwks,issuer,audience,algorithms=['ES256']}={}) {
  if(!issuer || !audience || !Array.isArray(jwks?.keys) || !jwks.keys.length || !Array.isArray(algorithms) || !algorithms.length || algorithms.some(a=>!['ES256','RS256'].includes(a)) || jwks.keys.some(key=>!['EC','RSA'].includes(key.kty)||['d','p','q','dp','dq','qi','oth','k'].some(field=>field in key))) throw new Error('IDENTITY_NOT_CONFIGURED');
  const {createLocalJWKSet,jwtVerify}=await import('jose');
  const keys=createLocalJWKSet(jwks);
  return async req=>{
    const header=req.headers?.authorization;
    if(typeof header!=='string'||header.length>8192||!/^Bearer \S+$/.test(header)) return null;
    try {
      const {payload}=await jwtVerify(header.slice(7),keys,{issuer,audience,algorithms,requiredClaims:['exp','iat','sub'],maxTokenAge:'1h'});
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)||payload.role!=='authenticated') return null;
      return {id:payload.sub};
    } catch {return null;}
  };
}
module.exports={createIdentityVerifier};

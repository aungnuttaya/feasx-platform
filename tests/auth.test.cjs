const test=require('node:test');
const assert=require('node:assert/strict');
const {loadEntitlements}=require('../lib/auth.cjs');
function client(rows){return {from(table){return {select(){return this},eq(column,id){this.id=id;return this},async maybeSingle(){return rows[this.id]?.[table]||{data:null,error:null}}}}}}
test('DB errors remain errors rather than silently granting free credits',async()=>{await assert.rejects(()=>loadEntitlements(client({a:{subscriptions:{error:{message:'mock db failure'}}}}),'a'),/ENTITLEMENTS_UNAVAILABLE/)});
test('canceled subscription grants no active entitlement',async()=>{const state=await loadEntitlements(client({a:{subscriptions:{data:{status:'canceled',plan_id:'plus'}},usage_cycles:{data:{credits_remaining:15,reports_remaining:1}}}}),'a');assert.deepEqual(state,{plan:'free',credits:0,reports:0})});
test('mock reads maintain separate user filters; this does not validate real RLS',async()=>{const c=client({a:{subscriptions:{data:{status:'active',plan_id:'plus'}},usage_cycles:{data:{credits_remaining:5,reports_remaining:1}}},b:{subscriptions:{data:{status:'active',plan_id:'basic'}},usage_cycles:{data:{credits_remaining:2,reports_remaining:0}}}});assert.equal((await loadEntitlements(c,'a')).credits,5);assert.equal((await loadEntitlements(c,'b')).credits,2)});
test('active subscription with corrupt usage fails closed',async()=>{await assert.rejects(()=>loadEntitlements(client({a:{subscriptions:{data:{status:'active',plan_id:'plus'}},usage_cycles:{data:{credits_remaining:-1,reports_remaining:1}}}}),'a'),/ENTITLEMENTS_INVALID/)});

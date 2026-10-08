async function loadEntitlements(client,userId) {
  const [subscription,usage]=await Promise.all([
    client.from('subscriptions').select('plan_id,status').eq('user_id',userId).maybeSingle(),
    client.from('usage_cycles').select('credits_remaining,reports_remaining').eq('user_id',userId).maybeSingle(),
  ]);
  if(subscription.error||usage.error) throw new Error('ENTITLEMENTS_UNAVAILABLE');
  const active=subscription.data?.status==='active';
  const credits=usage.data?.credits_remaining,reports=usage.data?.reports_remaining;
  if(active && (![credits,reports].every(Number.isFinite)||credits<0||reports<0)) throw new Error('ENTITLEMENTS_INVALID');
  return {plan:active?subscription.data.plan_id:'free',credits:active?credits:0,reports:active?reports:0};
}
module.exports={loadEntitlements};

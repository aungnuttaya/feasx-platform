// pages/api/stripe-webhook.js
//
// Receives Stripe subscription lifecycle events and writes the result
// into Supabase using the service_role key (bypasses RLS — this is
// the ONLY place in the whole app allowed to grant/reset credits or
// change a user's plan; the client can never do this directly).
//
// Setup:
//   1. Deploy this file, then in Stripe Dashboard → Developers → Webhooks
//      add an endpoint pointing to https://yourdomain.com/api/stripe-webhook
//      and subscribe to: checkout.session.completed,
//      invoice.payment_succeeded, customer.subscription.updated,
//      customer.subscription.deleted
//   2. Copy the "Signing secret" (whsec_...) into the
//      STRIPE_WEBHOOK_SECRET env var on Vercel.
//
// Required environment variables:
//   STRIPE_SECRET_KEY            — sk_live_/sk_test_
//   STRIPE_WEBHOOK_SECRET         — whsec_...
//   SUPABASE_URL                  — same project URL as the client uses
//   SUPABASE_SERVICE_ROLE_KEY     — service_role key from Supabase
//                                   Settings → API. NEVER expose this
//                                   to the browser — server-side only.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe requires the raw request body (unparsed) to verify the signature
export const config = { api: { bodyParser: false } };

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

// Map a Stripe Price ID back to our internal plan id.
// Keep in sync with STRIPE_PRICE_IDS in create-checkout-session.js
// and the `plans` table in Supabase.
const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_BASIC || "price_1Tvc9xBLcC4t9RmmMGje8BVO"]: "basic",
  [process.env.STRIPE_PRICE_PLUS  || "price_1TvcIFBLcC4t9RmmDMV0V2R3"]:  "plus",
  [process.env.STRIPE_PRICE_PRO   || "price_1TvcN6BLcC4t9Rmm9KkQRLKf"]:   "pro",
};

const PLAN_QUOTAS = {
  free:  { credits: 1,   reports: 0 },
  basic: { credits: 5,   reports: 0 },
  plus:  { credits: 15,  reports: 1 },
  pro:   { credits: 999, reports: 999 },
};

async function grantPlan(userId, planId, stripeCustomerId, stripeSubscriptionId, periodStart, periodEnd) {
  const quota = PLAN_QUOTAS[planId] || PLAN_QUOTAS.free;

  await supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    plan_id: planId,
    status: "active",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  });

  // New billing cycle → credits/reports refill to the plan's monthly quota
  await supabaseAdmin.from("usage_cycles").upsert({
    user_id: userId,
    credits_remaining: quota.credits,
    reports_remaining: quota.reports,
    period_end: periodEnd,
    updated_at: new Date().toISOString(),
  });

  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    kind: "grant_monthly",
    amount: quota.credits,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");

  let event;
  try {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: skip if we've already processed this event id
  const { data: already } = await supabaseAdmin
    .from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (already) return res.status(200).json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id;
        if (userId && planId) {
          // Subscription details (period dates) get filled in properly
          // by the invoice.payment_succeeded event that follows; here
          // we just record the Stripe customer/subscription linkage.
          await supabaseAdmin.from("subscriptions").upsert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = sub.metadata?.supabase_user_id;
          const planId = sub.metadata?.plan_id || PRICE_TO_PLAN[sub.items?.data?.[0]?.price?.id];
          if (userId && planId) {
            await grantPlan(
              userId, planId, sub.customer, sub.id,
              new Date(sub.current_period_start * 1000).toISOString(),
              new Date(sub.current_period_end * 1000).toISOString()
            );
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin.from("subscriptions").update({
            status: sub.status, // active | past_due | canceled | ...
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin.from("subscriptions").update({
            plan_id: "free",
            status: "canceled",
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
          const quota = PLAN_QUOTAS.free;
          await supabaseAdmin.from("usage_cycles").update({
            credits_remaining: quota.credits,
            reports_remaining: quota.reports,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 anyway once signature is verified so Stripe doesn't
    // retry forever on a bug we need to fix server-side — but log it.
    return res.status(200).json({ received: true, error: err.message });
  }
}

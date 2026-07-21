// pages/api/create-checkout-session.js
//
// Creates a Stripe Checkout Session for a monthly subscription plan
// and returns the URL to redirect the user to. Called from FeasX.jsx
// (handleSubscribe) as: POST /api/create-checkout-session
//   body: { planId: 'basic'|'plus'|'pro', userId, email }
//
// Required environment variables (set in Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY        — starts with sk_live_ or sk_test_ (NEVER expose to client)
//   NEXT_PUBLIC_SITE_URL     — e.g. https://feasx-platform.vercel.app (used for redirect URLs)
//
// This file must stay under /pages/api/ — anything in there runs
// server-side only on Vercel and never ships to the browser bundle,
// which is why it's safe to use the Stripe *secret* key here.

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Map our internal plan ids to Stripe Price IDs.
// Replace these with the real Price IDs from your Stripe Dashboard
// (Product catalog → Basic/Plus/Pro → copy the recurring Price ID).
// Keep this list in sync with the `plans` table in Supabase.
const STRIPE_PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC || "price_1Tvc9xBLcC4t9RmmMGje8BVO",
  plus:  process.env.STRIPE_PRICE_PLUS  || "price_1TvcIFBLcC4t9RmmDMV0V2R3",
  pro:   process.env.STRIPE_PRICE_PRO   || "price_1TvcN6BLcC4t9Rmm9KkQRLKf",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { planId, userId, email } = req.body || {};

    if (!planId || !userId || !email) {
      return res.status(400).json({ error: "Missing planId, userId, or email" });
    }

    const priceId = STRIPE_PRICE_IDS[planId];
    if (!priceId) {
      return res.status(400).json({ error: `Unknown planId: ${planId}` });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      // statement_descriptor_suffix shows on the customer's card
      // statement alongside your account's descriptor — e.g. "FEASX* PLUS"
      subscription_data: {
        metadata: { supabase_user_id: userId, plan_id: planId },
      },
      metadata: { supabase_user_id: userId, plan_id: planId },
      success_url: `${siteUrl}/?checkout=success&plan=${planId}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

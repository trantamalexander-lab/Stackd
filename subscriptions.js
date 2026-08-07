import 'dotenv/config';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Backend Supabase client using the SECRET service_role key — bypasses RLS so
// the webhook can write subscription status. Never expose this to the frontend.
// Missing env must NOT crash the whole server: without it, auth/subscription
// routes return a clear error while scanning and the rest of the app keep working.
const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!supabaseConfigured) {
  console.warn('[Stackd] ⚠️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — login & subscriptions are disabled until they are.');
}
export const supabaseAdmin = supabaseConfigured
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Map a Stripe price ID → our plan name.
export function planForPrice(priceId) {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return 'premium';
  return 'free';
}
export function priceForPlan(plan) {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO;
  if (plan === 'premium') return process.env.STRIPE_PRICE_PREMIUM;
  return null;
}

// Verify a Supabase JWT (sent by the app) and return the logged-in user, or null.
export async function getUserFromToken(authHeader) {
  const token = (authHeader || '').replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

// Ensure the user has a Stripe customer; store its id on their profile.
export async function getOrCreateCustomer(user) {
  if (!supabaseAdmin) throw new Error('Subscriptions unavailable — Supabase is not configured.');
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('stripe_customer_id').eq('id', user.id).single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  });
  await supabaseAdmin.from('profiles')
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  return customer.id;
}

// Write a Stripe subscription's state onto the matching profile row.
export async function syncSubscriptionToProfile(subscription) {
  if (!supabaseAdmin) { console.error('[Stripe] cannot sync — Supabase not configured'); return null; }
  const customerId = subscription.customer;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const active = ['active', 'trialing'].includes(subscription.status);

  const update = {
    plan: active ? planForPrice(priceId) : 'free',
    status: subscription.status,
    stripe_subscription_id: subscription.id,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('profiles').update(update).eq('stripe_customer_id', customerId);
  if (error) console.error('[Stripe] profile sync failed:', error.message);
  return update;
}

/**
 * [FAKE] Payment Methods Rate Limiter Middleware
 * [COD-56] — Shared rate limiting for Mobile Money endpoints
 */

import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@0.4.4";
import { Redis } from "https://esm.sh/@upstash/redis@1.22.0";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// 20 payment initiations per minute per organization
export const paymentInitRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "ratelimit:payment:init",
  analytics: true,
});

// 60 payment status checks per minute per organization
export const paymentStatusRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "ratelimit:payment:status",
  analytics: true,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for payment initiation
 */
export async function checkPaymentInitLimit(organizationId: string): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await paymentInitRatelimit.limit(organizationId);
    return { success, limit, remaining, reset };
  } catch (error) {
    console.error("[Payment RateLimit] Redis error:", error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/**
 * Check rate limit for payment status checks
 */
export async function checkPaymentStatusLimit(organizationId: string): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await paymentStatusRatelimit.limit(organizationId);
    return { success, limit, remaining, reset };
  } catch (error) {
    console.error("[Payment RateLimit] Redis error:", error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/**
 * Create rate limit error response for payments
 */
export function paymentRateLimitResponse(limit: number, remaining: number, reset: number) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-organization-id",
  };

  return new Response(
    JSON.stringify({
      error: "PAYMENT_RATE_LIMIT_EXCEEDED",
      message: `Trop de requêtes de paiement. Limite: ${limit}/minute. Réessayez dans ${Math.ceil((reset - Date.now()) / 1000)} secondes.`,
      limit,
      remaining,
      resetAt: new Date(reset).toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    }
  );
}

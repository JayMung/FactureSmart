/**
 * [FAKE] DGI Rate Limiter Middleware
 * [COD-56] — Shared rate limiting for DGI endpoints
 */

import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@0.4.4";
import { Redis } from "https://esm.sh/@upstash/redis@1.22.0";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// 10 DGI submissions per minute per organization
export const dgiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:dgi",
  analytics: true,
});

// 30 DGI queries (verify/status) per minute per organization
export const dgiQueryRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:dgi:query",
  analytics: true,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for DGI submission operations
 */
export async function checkDgiSubmitLimit(organizationId: string): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await dgiRatelimit.limit(organizationId);
    return { success, limit, remaining, reset };
  } catch (error) {
    // If Redis is unavailable, allow the request (fail-open)
    console.error("[DGI RateLimit] Redis error:", error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/**
 * Check rate limit for DGI query operations (verify/status)
 */
export async function checkDgiQueryLimit(organizationId: string): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await dgiQueryRatelimit.limit(organizationId);
    return { success, limit, remaining, reset };
  } catch (error) {
    console.error("[DGI RateLimit] Redis error:", error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(limit: number, remaining: number, reset: number) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-organization-id",
  };

  return new Response(
    JSON.stringify({
      error: "RATE_LIMIT_EXCEEDED",
      message: `Trop de requêtes DGI. Limite: ${limit}/minute. Réessayez dans ${Math.ceil((reset - Date.now()) / 1000)} secondes.`,
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

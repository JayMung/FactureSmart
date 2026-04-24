/**
 * [FAKE] Airtel Money Payment Mock
 * POST /api/payments/airtel-money/initiate
 * POST /api/payments/airtel-money/verify
 * 
 * Simulates Airtel Money API for RDC.
 * Logic similar to Orange Money but with different success rate (68% vs 70%).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  randomDelay,
  generateTxId,
  normalizePhone,
  isValidRdcPhone,
  successResponse,
  errorResponse,
  shouldSimulateError,
  periodicCleanup,
  mockTransactionStore,
} from "../_shared/mock-common.ts";
import { checkPaymentInitLimit, checkPaymentStatusLimit, paymentRateLimitResponse } from "../_shared/ratelimit-payment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-organization-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const amPendingTransactions = new Map<string, {
  createdAt: number;
  expiresAt: number;
  data: Record<string, unknown>;
}>();

function simulatePaymentResult(transactionId: string): "pending" | "success" | "failed" | "expired" {
  const stored = mockTransactionStore.get(transactionId);
  if (stored) return stored.data.status as "pending" | "success" | "failed" | "expired";

  const pending = amPendingTransactions.get(transactionId);
  if (!pending) return "pending";

  const elapsedMs = Date.now() - pending.createdAt;

  if (elapsedMs < 30000) return "pending";

  if (elapsedMs < 90000) {
    const rand = Math.random();
    if (rand < 0.68) { // 68% success rate for Airtel
      const result = "success";
      mockTransactionStore.set(transactionId, {
        status: result,
        createdAt: Date.now(),
        data: { status: result, confirmedAt: new Date().toISOString(), operatorReference: `AM-${Date.now()}` },
      });
      return result;
    }
    return "pending";
  }

  if (stored) return stored.data.status as "pending" | "success" | "failed" | "expired";

  const rand = Math.random();
  const result = rand < 0.80 ? "expired" : "failed";
  mockTransactionStore.set(transactionId, { status: result, createdAt: Date.now(), data: { status: result } });
  amPendingTransactions.delete(transactionId);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop() ?? "";
  if (req.method !== "POST") {
    return new Response(JSON.stringify(errorResponse("METHOD_NOT_ALLOWED", "Only POST supported")), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // [COD-56] Rate limiting — get organization from header
  const organizationId = req.headers.get("x-organization-id") || "anonymous";
  const rateLimitCheck = action === "initiate"
    ? await checkPaymentInitLimit(organizationId)
    : await checkPaymentStatusLimit(organizationId);
  if (!rateLimitCheck.success) {
    return paymentRateLimitResponse(rateLimitCheck.limit, rateLimitCheck.remaining, rateLimitCheck.reset);
  }

  periodicCleanup();
  const startTime = Date.now();

  if (shouldSimulateError(0.05)) {
    await randomDelay(200, 500);
    return new Response(JSON.stringify(errorResponse("SERVER_ERROR", "Erreur serveur Airtel Money")), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json();

  if (action === "initiate") {
    const { amount, currency = "CDF", merchantReference, customerPhone, description } = body;

    if (typeof amount !== "number" || amount <= 0 || amount > 100000000) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "amount doit être un nombre positif ≤ 100 000 000")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!customerPhone) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "customerPhone est requis")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedPhone = normalizePhone(customerPhone);
    if (!isValidRdcPhone(normalizedPhone)) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "Format téléphone RDC invalide — attendu: +243XXXXXXXXX")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await randomDelay(500, 1500);
    const transactionId = generateTxId("AM-TX");
    const now = Date.now();
    amPendingTransactions.set(transactionId, { createdAt: now, expiresAt: now + 15 * 60000, data: { amount, currency, customerPhone: normalizedPhone, merchantReference, description } });

    return new Response(
      JSON.stringify({
        ...successResponse({
          transactionId, status: "pending",
          statusMessage: "En attente de confirmation du client",
          amount, currency, customerPhone: normalizedPhone,
          merchantReference: merchantReference || null,
          expiresAt: new Date(now + 15 * 60000).toISOString(),
          simulatedPrompt: "Le client doit valider le paiement sur son téléphone Airtel Money",
        }),
        responseTimeMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (action === "verify") {
    const { transactionId } = body;
    if (!transactionId) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "transactionId est requis")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (shouldSimulateError(0.05)) {
      await randomDelay(3000, 5000);
      return new Response(JSON.stringify(errorResponse("TIMEOUT", "Délai de vérification dépassé")), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await randomDelay(200, 500);
    const pending = amPendingTransactions.get(transactionId);
    const status = simulatePaymentResult(transactionId);
    if (status === "expired" && pending) amPendingTransactions.delete(transactionId);

    return new Response(
      JSON.stringify({
        ...successResponse({
          transactionId, status,
          amount: pending?.data.amount || 0,
          currency: (pending?.data.currency as string) || "CDF",
          customerPhone: pending?.data.customerPhone as string || null,
          confirmedAt: status === "success" ? new Date().toISOString() : null,
          operatorReference: status === "success" ? `AM-${Date.now()}` : null,
        }),
        responseTimeMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(errorResponse("NOT_FOUND", "Utilisez /initiate ou /verify")), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

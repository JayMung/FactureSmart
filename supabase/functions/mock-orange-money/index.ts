/**
 * [FAKE] Orange Money Payment Mock
 * POST /api/payments/orange-money/initiate
 * POST /api/payments/orange-money/verify
 * 
 * Simulates Orange Money API for RDC.
 * Replace with real Orange Money API once merchant credentials are activated.
 * 
 * Logic:
 * - Initiate: returns pending, waits 30-90s
 * - Verify: 70% success, 20% expired, 10% failed
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

// Track Orange Money pending transactions
const omPendingTransactions = new Map<string, {
  createdAt: number;
  expiresAt: number;
  data: Record<string, unknown>;
}>();

function simulatePaymentResult(transactionId: string): "pending" | "success" | "failed" | "expired" {
  const stored = mockTransactionStore.get(transactionId);

  if (stored) {
    return stored.data.status as "pending" | "success" | "failed" | "expired";
  }

  const pending = omPendingTransactions.get(transactionId);
  if (!pending) {
    return "pending";
  }

  const elapsedMs = Date.now() - pending.createdAt;

  // Within 30-90 seconds: 70% success, 30% still pending
  if (elapsedMs < 30000) {
    return "pending";
  }

  if (elapsedMs < 90000) {
    const rand = Math.random();
    if (rand < 0.70) {
      const result = "success";
      mockTransactionStore.set(transactionId, {
        status: result,
        createdAt: Date.now(),
        data: { status: result, confirmedAt: new Date().toISOString(), operatorReference: `OM-${Date.now()}` },
      });
      return result;
    }
    return "pending";
  }

  // After 90s: check if already resolved
  if (stored) {
    return stored.data.status as "pending" | "success" | "failed" | "expired";
  }

  // 80% expired, 20% failed
  const rand = Math.random();
  const result = rand < 0.80 ? "expired" : "failed";
  mockTransactionStore.set(transactionId, {
    status: result,
    createdAt: Date.now(),
    data: { status: result },
  });
  omPendingTransactions.delete(transactionId);
  return result;
}

// Validate amount (positive number in CDF or USD)
function validateAmount(amount: unknown): string | null {
  if (typeof amount !== "number" || isNaN(amount)) return "amount doit être un nombre";
  if (amount <= 0) return "amount doit être supérieur à 0";
  if (amount > 100000000) return "amount ne peut pas dépasser 100 000 000 CDF";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const action = pathParts[pathParts.length - 1]; // "initiate" or "verify"

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify(errorResponse("METHOD_NOT_ALLOWED", "Only POST is supported")),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

  // Simulate random server error (5%)
  if (shouldSimulateError(0.05)) {
    await randomDelay(200, 500);
    return new Response(
      JSON.stringify(errorResponse("SERVER_ERROR", "Erreur serveur Orange Money")),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();

  // ========== INITIATE ==========
  if (action === "initiate") {
    const { amount, currency = "CDF", merchantReference, customerPhone, description } = body;

    // Validate
    const amountError = validateAmount(amount);
    if (amountError) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", amountError)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customerPhone) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "customerPhone est requis")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhone(customerPhone);
    if (!isValidRdcPhone(normalizedPhone)) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "Format téléphone RDC invalide — attendu: +243XXXXXXXXX")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await randomDelay(500, 1500);

    const transactionId = generateTxId("OM-TX");
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes

    omPendingTransactions.set(transactionId, {
      createdAt: now,
      expiresAt,
      data: { amount, currency, customerPhone: normalizedPhone, merchantReference, description },
    });

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...successResponse({
          transactionId,
          status: "pending",
          statusMessage: "En attente de confirmation du client",
          amount,
          currency,
          customerPhone: normalizedPhone,
          merchantReference: merchantReference || null,
          expiresAt: new Date(expiresAt).toISOString(),
          simulatedPrompt: "Le client doit valider le paiement sur son téléphone Orange Money",
        }),
        responseTimeMs: responseTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ========== VERIFY ==========
  if (action === "verify") {
    const { transactionId } = body;

    if (!transactionId) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "transactionId est requis")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate timeout on verify (5%)
    if (shouldSimulateError(0.05)) {
      await randomDelay(3000, 5000);
      return new Response(
        JSON.stringify(errorResponse("TIMEOUT", "Délai de vérification dépassé")),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await randomDelay(200, 500);

    const pending = omPendingTransactions.get(transactionId);
    const status = simulatePaymentResult(transactionId);

    // If expired, clean up
    if (status === "expired" && pending) {
      omPendingTransactions.delete(transactionId);
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...successResponse({
          transactionId,
          status,
          amount: pending?.data.amount || 0,
          currency: (pending?.data.currency as string) || "CDF",
          customerPhone: pending?.data.customerPhone as string || null,
          merchantReference: pending?.data.merchantReference as string || null,
          confirmedAt: status === "success" ? new Date().toISOString() : null,
          operatorReference: status === "success" ? `OM-${Date.now()}` : null,
          failureReason: status === "failed" ? "Paiement refusé par le client" : null,
        }),
        responseTimeMs: responseTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(errorResponse("NOT_FOUND", "Endpoint non trouvé — utilisez /initiate ou /verify")),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

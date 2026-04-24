/**
 * [FAKE] M-Pesa Payment Mock (Vodacom RDC)
 * POST /api/payments/mpesa/initiate  (C2B)
 * POST /api/payments/mpesa/verify     (B2C)
 * 
 * Simulates M-Pesa API for RDC.
 * Logic: 65% success after 45-90s, 25% expired, 10% failed.
 * Generally slower than Orange/Airtel (higher latency simulation).
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

const mpPendingTransactions = new Map<string, {
  createdAt: number;
  checkoutRequestId: string;
  data: Record<string, unknown>;
}>();

function generateCheckoutRequestId(): string {
  return `ws_co_${Date.now()}${Math.random().toString().slice(2, 12)}`;
}

function simulateMpesaResult(transactionId: string): "pending" | "success" | "failed" | "expired" {
  const stored = mockTransactionStore.get(transactionId);
  if (stored) return stored.data.status as "pending" | "success" | "failed" | "expired";

  const pending = mpPendingTransactions.get(transactionId);
  if (!pending) return "pending";

  const elapsedMs = Date.now() - pending.createdAt;

  // M-Pesa takes longer: 45-120s
  if (elapsedMs < 45000) return "pending";

  if (elapsedMs < 120000) {
    const rand = Math.random();
    if (rand < 0.65) { // 65% success rate
      const result = "success";
      mockTransactionStore.set(transactionId, {
        status: result,
        createdAt: Date.now(),
        data: { status: result, confirmedAt: new Date().toISOString(), operatorReference: `ND${Math.floor(Math.random() * 9) + 1}${Date.now().toString().slice(-8)}` },
      });
      return result;
    }
    return "pending";
  }

  if (stored) return stored.data.status as "pending" | "success" | "failed" | "expired";

  const rand = Math.random();
  const result = rand < 0.70 ? "expired" : "failed"; // 70% expired, 30% failed
  mockTransactionStore.set(transactionId, { status: result, createdAt: Date.now(), data: { status: result } });
  mpPendingTransactions.delete(transactionId);
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
    await randomDelay(500, 1500);
    return new Response(JSON.stringify(errorResponse("SERVER_ERROR", "Erreur serveur M-Pesa")), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json();

  if (action === "initiate") {
    const { amount, currency = "CDF", merchantReference, customerPhone, description } = body;

    if (typeof amount !== "number" || amount <= 0 || amount > 50000000) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "amount doit être un nombre positif ≤ 50 000 000 CDF (limite M-Pesa)")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!customerPhone) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "customerPhone est requis")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedPhone = normalizePhone(customerPhone);
    if (!isValidRdcPhone(normalizedPhone)) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "Format téléphone RDC invalide — attendu: +243XXXXXXXXX")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // M-Pesa has higher latency
    await randomDelay(800, 2000);
    const transactionId = generateTxId("MP-TX");
    const checkoutRequestId = generateCheckoutRequestId();
    const now = Date.now();
    mpPendingTransactions.set(transactionId, {
      createdAt: now,
      checkoutRequestId,
      data: { amount, currency, customerPhone: normalizedPhone, merchantReference, description },
    });

    return new Response(
      JSON.stringify({
        ...successResponse({
          transactionId,
          status: "pending",
          checkoutRequestId,
          statusMessage: "En attente de confirmation sur le téléphone M-Pesa",
          amount,
          currency,
          customerPhone: normalizedPhone,
          merchantReference: merchantReference || null,
          expiresAt: new Date(now + 15 * 60000).toISOString(),
          isMock: true,
        }),
        responseTimeMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (action === "verify") {
    const { transactionId, checkoutRequestId } = body;
    if (!transactionId) {
      return new Response(JSON.stringify(errorResponse("VALIDATION_ERROR", "transactionId est requis")), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await randomDelay(300, 1000);
    const pending = mpPendingTransactions.get(transactionId);
    const status = simulateMpesaResult(transactionId);
    if (status === "expired" && pending) mpPendingTransactions.delete(transactionId);

    return new Response(
      JSON.stringify({
        ...successResponse({
          transactionId,
          checkoutRequestId: checkoutRequestId || pending?.checkoutRequestId || null,
          status,
          amount: pending?.data.amount || 0,
          currency: (pending?.data.currency as string) || "CDF",
          customerPhone: pending?.data.customerPhone as string || null,
          confirmedAt: status === "success" ? new Date().toISOString() : null,
          operatorReference: status === "success" ? `ND${Math.floor(Math.random() * 9) + 1}${Date.now().toString().slice(-8)}` : null,
          receiverName: status === "success" ? "FactureSmart Merchant" : null,
        }),
        responseTimeMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(errorResponse("NOT_FOUND", "Utilisez /initiate ou /verify")), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

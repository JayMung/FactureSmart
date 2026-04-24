/**
 * [FAKE] DGI Invoice Status Mock
 * GET /api/dgi/status/:transmissionId
 * Query: ?numeroDgi=...
 * 
 * Simulates the DGI invoice status check API.
 * Logic: pending for 30-60s after submission, then 85% validated / 15% rejected.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  randomDelay,
  successResponse,
  errorResponse,
  shouldSimulateError,
  periodicCleanup,
  mockTransactionStore,
} from "../_shared/mock-common.ts";
import { checkDgiQueryLimit, rateLimitResponse } from "../_shared/ratelimit-dgi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-organization-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Track DGI submission timestamps
const dgiSubmissionTimestamps = new Map<string, number>();

function getDgiStatus(transmissionId: string): {
  status: "pending" | "validated" | "rejected";
  rejectionReason?: string;
} {
  const submittedAt = dgiSubmissionTimestamps.get(transmissionId);

  if (!submittedAt) {
    // New transaction — starts as pending
    dgiSubmissionTimestamps.set(transmissionId, Date.now());
    return { status: "pending" };
  }

  const elapsedSeconds = (Date.now() - submittedAt) / 1000;

  if (elapsedSeconds < 30) {
    // Still pending (30-60s pending window)
    return { status: "pending" };
  }

  // After pending window: 85% validated, 15% rejected
  const stored = mockTransactionStore.get(transmissionId);
  if (stored) {
    return stored.data.status as "pending" | "validated" | "rejected";
  }

  const rand = Math.random();
  if (rand < 0.85) {
    mockTransactionStore.set(transmissionId, {
      status: "validated",
      createdAt: Date.now(),
      data: { status: "validated" },
    });
    return { status: "validated" };
  } else {
    mockTransactionStore.set(transmissionId, {
      status: "rejected",
      createdAt: Date.now(),
      data: {
        status: "rejected",
        rejectionReason: "Montant TVA incorrect — vérification manuelles requise par la DGI",
      },
    });
    return {
      status: "rejected",
      rejectionReason: "Montant TVA incorrect — vérification manuelle requise par la DGI",
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify(errorResponse("METHOD_NOT_ALLOWED", "Only GET or POST is supported")),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // [COD-56] Rate limiting — get organization from header
  const organizationId = req.headers.get("x-organization-id") || "anonymous";
  const { success, limit, remaining, reset } = await checkDgiQueryLimit(organizationId);
  if (!success) {
    return rateLimitResponse(limit, remaining, reset);
  }

  periodicCleanup();
  const startTime = Date.now();

  try {
    // Simulate random error (5%)
    if (shouldSimulateError(0.05)) {
      await randomDelay(200, 800);
      return new Response(
        JSON.stringify(errorResponse("SERVER_ERROR", "Erreur serveur DGI")),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract transmissionId / numeroDgi
    let transmissionId: string | null = null;
    let numeroDgi: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      transmissionId = url.searchParams.get("transmissionId");
      numeroDgi = url.searchParams.get("numeroDgi");
    } else {
      const body = await req.json();
      transmissionId = body.transmissionId || null;
      numeroDgi = body.numeroDgi || null;
    }

    if (!transmissionId && !numeroDgi) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "transmissionId ou numeroDgi est requis")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await randomDelay(200, 800);

    // Use transmissionId as key (or numeroDgi if no transmissionId)
    const lookupKey = transmissionId || numeroDgi;

    // First call: initialize as pending
    if (!dgiSubmissionTimestamps.has(lookupKey!) && !mockTransactionStore.has(lookupKey!)) {
      dgiSubmissionTimestamps.set(lookupKey!, Date.now());
    }

    const statusResult = getDgiStatus(lookupKey!);
    const submittedAt = dgiSubmissionTimestamps.get(lookupKey!);

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...successResponse({
          transmissionId: lookupKey,
          numeroDgi: numeroDgi || `DGI-${lookupKey!.slice(-8)}`,
          status: statusResult.status,
          submittedAt: submittedAt ? new Date(submittedAt).toISOString() : new Date().toISOString(),
          validatedAt: statusResult.status === "validated" ? new Date().toISOString() : null,
          receiptUrl: statusResult.status === "validated"
            ? `https://dgi.gouv.cd/receipts/${numeroDgi || lookupKey}.pdf`
            : null,
          rejectionReason: statusResult.rejectionReason || null,
        }),
        responseTimeMs: responseTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify(errorResponse("PARSE_ERROR", `Erreur de parsing: ${err.message}`)),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

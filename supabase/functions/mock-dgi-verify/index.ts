/**
 * [FAKE] DGI NIF Verification Mock
 * POST /api/dgi/verify-nif
 * 
 * Simulates the DGI RDC NIF verification API.
 * Replace with real API once DGI sandbox credentials are available.
 * 
 * Status codes: verified, pending, not_found
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  randomDelay,
  isValidNif,
  normalizePhone,
  isValidRdcPhone,
  MOCK_NIF_DATABASE,
  successResponse,
  errorResponse,
  shouldSimulateError,
  periodicCleanup,
} from "../_shared/mock-common.ts";
import { checkDgiQueryLimit, rateLimitResponse } from "../_shared/ratelimit-dgi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-organization-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify(errorResponse("METHOD_NOT_ALLOWED", "Only POST is supported")),
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
    // Simulate random server error (5%)
    if (shouldSimulateError(0.05)) {
      await randomDelay(100, 500);
      return new Response(
        JSON.stringify(errorResponse("SERVER_ERROR", "Erreur serveur DGI — veuillez réessayer")),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { nif, companyName, email, phone } = body;

    // Validate NIF required
    if (!nif) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "Le champ nif est requis")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate NIF format (15 digits)
    if (!isValidNif(nif)) {
      await randomDelay(800, 1500);
      return new Response(
        JSON.stringify({
          success: false,
          status: "rejected",
          nif,
          error: "Format NIF invalide — 15 chiffres requis",
          isMock: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone if provided
    if (phone && !isValidRdcPhone(phone)) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "Format téléphone RDC invalide — attendu: +243XXXXXXXXX")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate network latency
    await randomDelay(800, 2000);

    const responseTime = Date.now() - startTime;

    // Check mock database for known NIFs
    const mockData = MOCK_NIF_DATABASE[nif];
    if (mockData) {
      return new Response(
        JSON.stringify({
          ...successResponse({
            status: "verified",
            nif,
            companyName: mockData.companyName,
            rccm: mockData.rccm,
            idNat: mockData.idNat,
            address: mockData.address,
            verifiedAt: new Date().toISOString(),
          }),
          responseTimeMs: responseTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For unknown NIFs, simulate random verification result
    // 70% verified (auto-generated), 15% pending, 15% not_found
    const rand = Math.random();

    if (rand < 0.70) {
      // Verified with auto-generated data
      return new Response(
        JSON.stringify({
          ...successResponse({
            status: "verified",
            nif,
            companyName: companyName || `Entreprise-${nif.slice(-4)}`,
            rccm: `RCCM/CD/KIN/2024/${nif.slice(-5)}`,
            idNat: `01-${nif.slice(-4)}-${nif.slice(-5)}`,
            address: "Kinshasa, RDC",
            verifiedAt: new Date().toISOString(),
          }),
          responseTimeMs: responseTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (rand < 0.85) {
      // Pending
      return new Response(
        JSON.stringify({
          ...successResponse({
            status: "pending",
            nif,
            error: "Vérification en cours — la DGI analyse votre dossier",
            verifiedAt: null,
          }),
          responseTimeMs: responseTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Not found
      return new Response(
        JSON.stringify({
          success: false,
          status: "not_found",
          nif,
          error: "NIF non trouvé dans les registres de la DGI",
          isMock: true,
          responseTimeMs: responseTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    return new Response(
      JSON.stringify(errorResponse("PARSE_ERROR", `Erreur de parsing: ${err.message}`)),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

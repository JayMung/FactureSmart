/**
 * [FAKE] DGI Invoice Submission Mock
 * POST /api/dgi/submit
 * 
 * Simulates the DGI RDC invoice submission API.
 * Returns a DGI number, authorization code, and QR code data.
 * Replace with real API once DGI sandbox credentials are available.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  randomDelay,
  generateCode,
  generateTxId,
  successResponse,
  errorResponse,
  shouldSimulateError,
  periodicCleanup,
} from "../_shared/mock-common.ts";
import { checkDgiSubmitLimit, rateLimitResponse } from "../_shared/ratelimit-dgi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-organization-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TVA_RATES: Record<string, number> = { A: 0, B: 0.08, C: 0.16 };
const TVA_LABELS: Record<string, string> = { A: "Exonéré (0%)", B: "Réduit (8%)", C: "Standard (16%)" };
const DGI_INVOICE_TYPES = ["FV", "EV", "FT", "ET", "FA", "EA"];
const DGI_TVA_GROUPS = ["A", "B", "C"];

// Generate DGI number: TYPE-YYMM-NNNNNNNN
function generateDgiNumber(type: string): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const yearShort = now.getFullYear().toString().slice(-2);
  const seq = Math.floor(Math.random() * 99999999).toString().padStart(8, "0");
  return `${type}-${yearShort}${month}-${seq}`;
}

// Generate QR code data string
function generateQrCodeData(payload: {
  companyName: string;
  nif: string;
  factureNumber: string;
  dgiNumber: string;
  totalTtc: number;
  date: string;
  itemsCount: number;
}): string {
  return [
    payload.companyName,
    payload.nif,
    payload.factureNumber,
    payload.dgiNumber,
    payload.totalTtc.toFixed(2),
    payload.date,
    `${payload.itemsCount} articles`,
  ].join("|");
}

// Validate invoice data
function validateInvoice(data: {
  factureId?: string;
  typeDgi?: string;
  groupeTva?: string;
  items?: unknown[];
  clientNom?: string;
  dateFacture?: string;
}): string[] {
  const errors: string[] = [];

  if (!data.factureId) errors.push("factureId est requis");
  if (!data.typeDgi || !DGI_INVOICE_TYPES.includes(data.typeDgi)) {
    errors.push(`typeDgi doit être l'un de: ${DGI_INVOICE_TYPES.join(", ")}`);
  }
  if (!data.groupeTva || !DGI_TVA_GROUPS.includes(data.groupeTva)) {
    errors.push(`groupeTva doit être l'un de: ${DGI_TVA_GROUPS.join(", ")}`);
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("items doit contenir au moins 1 élément");
  }
  if (!data.clientNom || data.clientNom.trim().length < 2) {
    errors.push("clientNom est requis (minimum 2 caractères)");
  }
  if (!data.dateFacture) {
    errors.push("dateFacture est requis");
  } else {
    const date = new Date(data.dateFacture);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) errors.push("La date de facture ne peut pas être antérieure à 30 jours");
    if (diffDays < -1) errors.push("La date de facture ne peut pas être dans le futur");
  }

  return errors;
}

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
  const { success, limit, remaining, reset } = await checkDgiSubmitLimit(organizationId);
  if (!success) {
    return rateLimitResponse(limit, remaining, reset);
  }

  periodicCleanup();
  const startTime = Date.now();

  try {
    // Simulate random server error (5%)
    if (shouldSimulateError(0.05)) {
      await randomDelay(1000, 3000);
      return new Response(
        JSON.stringify(errorResponse("DGI_SERVER_ERROR", "Erreur lors de la soumission à la DGI")),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate timeout (3%)
    if (shouldSimulateError(0.03)) {
      await randomDelay(6000, 8000);
      return new Response(
        JSON.stringify(errorResponse("DGI_TIMEOUT", "Délai d'attente dépassé — la DGI ne répond pas")),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      factureId,
      typeDgi = "FV",
      groupeTva = "C",
      items,
      clientNom,
      dateFacture,
      totalHtva,
      tauxTva,
      montantTva,
      totalTtc,
      companyName = "Entreprise déclarée",
      companyNif = "000000000000000",
    } = body;

    // Validate
    const validationErrors = validateInvoice({ factureId, typeDgi, groupeTva, items, clientNom, dateFacture });
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify(errorResponse("VALIDATION_ERROR", "Données invalides", validationErrors)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate totals if not provided
    const safeTauxTva = tauxTva ?? TVA_RATES[groupeTva] ?? 0.18;
    const safeTotalHtva = totalHtva ?? (items as Array<{ montantTotal?: number }>).reduce((s, i) => s + (i.montantTotal || 0), 0);
    const safeMontantTva = montantTva ?? safeTotalHtva * safeTauxTva;
    const safeTotalTtc = totalTtc ?? safeTotalHtva + safeMontantTva;

    // Simulate network latency
    await randomDelay(1000, 3000);

    // Generate DGI number
    const numeroDgi = generateDgiNumber(typeDgi);
    const codeAuth = generateCode(8);
    const transmissionId = generateTxId("DGI-TX");
    const qrCodeData = generateQrCodeData({
      companyName,
      nif: companyNif,
      factureNumber: `INV-${factureId?.slice(0, 8) || "UNKNOWN"}`,
      dgiNumber: numeroDgi,
      totalTtc: safeTotalTtc,
      date: dateFacture,
      itemsCount: (items as unknown[]).length,
    });

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...successResponse({
          numeroDgi,
          codeAuth,
          qrCodeData,
          transmissionId,
          dgiApiAccepted: true,
          dgiSignature: `SIM-${codeAuth}`,
          dgiApiError: null,
          totals: {
            htva: safeTotalHtva,
            tauxTva: safeTauxTva,
            tva: safeMontantTva,
            ttc: safeTotalTtc,
          },
          compliance: {
            typeDgi,
            groupeTva,
            tvaRate: `${safeTauxTva * 100}%`,
            tvaLabel: TVA_LABELS[groupeTva] || "Standard (16%)",
            itemsCount: (items as unknown[]).length,
            dgiNumberFormat: "FV-YYMM-NNNNNNNN",
          },
        }),
        responseTimeMs: responseTime,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify(errorResponse("PARSE_ERROR", `Erreur de parsing: ${err.message}`)),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

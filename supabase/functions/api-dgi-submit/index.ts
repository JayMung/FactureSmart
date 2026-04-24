/**
 * API Endpoint: POST /api-dgi-submit
 * Submit a facture to the DGI invoice registry and optionally to the DGI-RDC API.
 * 
 * Invoice Types DGI (RDC):
 *   FV = Facture de Vente (standard sales invoice)
 *   EV = Facture d'Avoir (credit note - goods returned)
 *   FT = Facture de Travail (service/labor invoice)
 *   ET = Export Tax invoice
 *   FA = Facture d'Acompte (advance payment invoice)
 *   EA = Facture Encaissement Anticipé (cash/advance receipt)
 *
 * TVA Groups (RDC DGI):
 *   A = 0%  (exempt)
 *   B = 8%
 *   C = 16%
 *
 * DGI Numbering: AAMM-NNNNNNNN (8 digits after year-month prefix)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractApiKey } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// DGI API endpoint (RDC) — configure via environment
const DGI_API_URL = Deno.env.get('DGI_API_URL') || 'https://dgi.example.cd/api/v1';
const DGI_API_KEY = Deno.env.get('DGI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-organization-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// DRC TVA rates by group
const TVA_RATES: Record<string, number> = {
  A: 0,
  B: 0.08,
  C: 0.16,
};

// DGI invoice type codes
export type DgiInvoiceType = 'FV' | 'EV' | 'FT' | 'ET' | 'FA' | 'EA';
export type TvaGroup = 'A' | 'B' | 'C';

const DGI_INVOICE_TYPES: DgiInvoiceType[] = ['FV', 'EV', 'FT', 'ET', 'FA', 'EA'];

/**
 * Validate DGI invoice data for RDC compliance
 */
function validateDgiCompliance(data: {
  type_dgi?: string;
  groupe_tva?: string;
  montant_ht?: number;
  items?: Array<{ description: string; quantite: number; prix_unitaire: number; montant_total: number }>;
  client_nom?: string;
  date_emission?: string;
}) {
  const errors: string[] = [];

  // Validate type_dgi
  if (data.type_dgi && !DGI_INVOICE_TYPES.includes(data.type_dgi as DgiInvoiceType)) {
    errors.push(`type_dgi must be one of: ${DGI_INVOICE_TYPES.join(', ')}`);
  }

  // Validate groupe_tva
  if (data.groupe_tva && !['A', 'B', 'C'].includes(data.groupe_tva)) {
    errors.push('groupe_tva must be A, B, or C');
  }

  // Validate amounts
  if (data.montant_ht !== undefined && data.montant_ht < 0) {
    errors.push('montant_ht cannot be negative');
  }

  // Validate items
  if (data.items && data.items.length === 0) {
    errors.push('At least one item is required for DGI compliance');
  }

  // Validate client name
  if (!data.client_nom || data.client_nom.trim().length < 2) {
    errors.push('Client name is required for DGI compliance');
  }

  // Validate date
  if (data.date_emission) {
    const date = new Date(data.date_emission);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      errors.push('Invoice date cannot be more than 30 days in the past');
    }
    if (diffDays < -1) {
      errors.push('Invoice date cannot be in the future');
    }
  }

  return errors;
}

/**
 * Generate next sequential DGI invoice number
 * Format: {TYPE}-{AAMM}-{NNNNNNNN}  e.g. FV-2604-00000001
 */
async function generateDgiNumber(
  supabase: ReturnType<typeof createClient>,
  typeDgi: string
): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearShort = now.getFullYear().toString().slice(-2);
  const prefix = `${typeDgi}-${yearShort}${month}-`;

  // Count existing DGI numbers for this month and type
  const { data, error } = await supabase
    .from('dgi_invoice_registry')
    .select('numero_dgi')
    .like('numero_dgi', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0 && data[0].numero_dgi) {
    const lastNum = data[0].numero_dgi;
    const match = lastNum.match(`${prefix}(\\d+)`);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${nextNum.toString().padStart(8, '0')}`;
}

/**
 * Generate authorization code (8 alphanumeric characters)
 */
function generateCodeAuth(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate QR code data payload for DGI verification
 * Format: companyName|nif|factureNumber|dgiNumber|totalTtc|date|itemsSummary
 */
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
  ].join('|');
}

/**
 * Submit invoice to DGI-RDC API (if configured)
 * Returns: { accepted: boolean, signature?: string, error?: string }
 */
async function submitToDgiApi(payload: {
  numero_dgi: string;
  code_auth: string;
  qr_code_data: string;
  facture_number: string;
  date_facture: string;
  client_nom: string;
  type_facture_dgi?: string;
  groupe_tva?: string;
  total_htva: number;
  taux_tva: number;
  montant_tva: number;
  total_ttc: number;
  items: Array<{ description: string; quantite: number; prix_unitaire: number; montant_total: number }>;
  declarant: { raison_sociale: string; nif: string; rccm: string; adresse: string };
}): Promise<{ accepted: boolean; signature?: string; error?: string }> {
  if (!DGI_API_KEY || DGI_API_URL === 'https://dgi.example.cd/api/v1') {
    // [FAKE] Use mock DGI endpoint when no real API is configured
    try {
      const mockResponse = await fetch(`${SUPABASE_URL}/functions/v1/mock-dgi-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          factureId: payload.facture_number,
          typeDgi: payload.type_facture_dgi || 'FV',
          groupeTva: payload.groupe_tva || 'C',
          items: payload.items,
          clientNom: payload.client_nom,
          dateFacture: payload.date_facture,
          totalHtva: payload.total_htva,
          tauxTva: payload.taux_tva,
          montantTva: payload.montant_tva,
          totalTtc: payload.total_ttc,
          companyName: payload.declarant?.raison_sociale,
          companyNif: payload.declarant?.nif,
        }),
      });

      if (mockResponse.ok) {
        const mockData = await mockResponse.json();
        return {
          accepted: true,
          signature: mockData.data?.dgiSignature || `SIM-${generateCodeAuth()}`,
        };
      }
    } catch (mockError) {
      console.error('Mock DGI call failed, using fallback:', mockError);
    }

    // Fallback si mock échoue aussi
    return {
      accepted: true,
      signature: `SIM-${generateCodeAuth()}`,
    };
  }

  try {
    const response = await fetch(`${DGI_API_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DGI_API_KEY}`,
        'X-API-Key': DGI_API_KEY,
      },
      body: JSON.stringify({
        numero_dgi: payload.numero_dgi,
        code_autorisation: payload.code_auth,
        qr_data: payload.qr_code_data,
        facture_number: payload.facture_number,
        date_facture: payload.date_facture,
        client: {
          nom: payload.client_nom,
        },
        lignes: payload.items.map((item, idx) => ({
          numero: idx + 1,
          description: item.description,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          montant_total: item.montant_total,
        })),
        totaux: {
          htva: payload.total_htva,
          taux_tva: payload.taux_tva,
          tva: payload.montant_tva,
          ttc: payload.total_ttc,
        },
       Declarant: payload.declarant,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { accepted: false, error: `DGI API error ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return {
      accepted: result.accepted ?? true,
      signature: result.signature || result.code,
    };
  } catch (err) {
    return { accepted: false, error: `Network error: ${err.message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();

  try {
    // Authenticate
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return new Response(
        JSON.stringify(Errors.UNAUTHORIZED()),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*, organization_id')
      .eq('key_hash', apiKey.startsWith('sk_') ? apiKey : btoa(apiKey))
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify(Errors.UNAUTHORIZED()),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      facture_id,
      type_dgi = 'FV',
      groupe_tva = 'C',
      items,
      client_nom,
      date_facture,
    } = body;

    // Validate required fields
    if (!facture_id) {
      return new Response(
        JSON.stringify(Errors.VALIDATION_ERROR('facture_id is required')),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify(Errors.VALIDATION_ERROR('items array is required')),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the facture
    const { data: facture, error: factureError } = await supabase
      .from('factures')
      .select('*')
      .eq('id', facture_id)
      .single();

    if (factureError || !facture) {
      return new Response(
        JSON.stringify(Errors.NOT_FOUND('Facture')),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate DGI compliance
    const complianceErrors = validateDgiCompliance({
      type_dgi,
      groupe_tva,
      montant_ht: facture.montant_ht || facture.subtotal,
      items,
      client_nom: client_nom || facture.client?.nom,
      date_emission: date_facture || facture.date_emission,
    });

    if (complianceErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'DGI_COMPLIANCE_ERROR', message: 'DGI compliance validation failed', details: complianceErrors }
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate totals
    const tauxTva = TVA_RATES[groupe_tva] || 0.16;
    const totalHtva = items.reduce((sum: number, item: any) => sum + (item.montant_total || 0), 0);
    const montantTva = totalHtva * tauxTva;
    const totalTtc = totalHtva + montantTva;

    // Generate DGI number
    const numero_dgi = await generateDgiNumber(supabase, type_dgi);

    // Generate code auth
    const code_auth = generateCodeAuth();

    // Get declarant info
    const { data: declarant } = await supabase
      .from('declarants')
      .select('raison_sociale, nif, rccm, adresse')
      .eq('actif', true)
      .limit(1)
      .single();

    // Generate QR data
    const qr_code_data = generateQrCodeData({
      companyName: declarant?.raison_sociale || 'Entreprise',
      nif: declarant?.nif || '',
      factureNumber: facture.facture_number,
      dgiNumber: numero_dgi,
      totalTtc,
      date: date_facture || new Date().toISOString().split('T')[0],
      itemsCount: items.length,
    });

    // Submit to DGI API
    const dgiResult = await submitToDgiApi({
      numero_dgi,
      code_auth,
      qr_code_data,
      facture_number: facture.facture_number,
      date_facture: date_facture || new Date().toISOString().split('T')[0],
      client_nom: client_nom || 'Client anonyme',
      total_htva: totalHtva,
      taux_tva: tauxTva,
      montant_tva: montantTva,
      total_ttc: totalTtc,
      items,
      declarant: declarant || { raison_sociale: 'Entreprise', nif: '', rccm: '', adresse: '' },
    });

    // Register in DGI invoice registry
    const { data: registryEntry, error: registryError } = await supabase
      .from('dgi_invoice_registry')
      .insert({
        facture_id,
        numero_dgi,
        code_auth,
        qr_code_data,
        date_facture: date_facture || new Date().toISOString().split('T')[0],
        client_nom: client_nom || 'Client anonyme',
        total_htva: totalHtva,
        taux_tva: tauxTva,
        montant_tva: montantTva,
        total_ttc: totalTtc,
        content_hash: `${facture.facture_number}-${Date.now()}`,
        statut: 'declared',
        created_by: keyData.created_by,
      })
      .select()
      .single();

    if (registryError) {
      console.error('DGI registry error:', registryError);
      return new Response(
        JSON.stringify(Errors.INTERNAL_ERROR('Failed to register invoice with DGI')),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update facture with DGI info
    await supabase
      .from('factures')
      .update({
        numero_dgi,
        code_auth,
        qr_code_data,
        type_dgi,
        groupe_tva,
        montant_ht: totalHtva,
        montant_tva: montantTva,
        montant_ttc: totalTtc,
        date_validation: new Date().toISOString(),
      })
      .eq('id', facture_id);

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify(successResponse({
        dgi_submission: {
          numero_dgi,
          code_auth,
          qr_code_data,
          registry_id: registryEntry.id,
          dgi_api_accepted: dgiResult.accepted,
          dgi_signature: dgiResult.signature,
          dgi_api_error: dgiResult.error || null,
          totals: {
            htva: totalHtva,
            taux_tva: tauxTva,
            tva: montantTva,
            ttc: totalTtc,
          },
          compliance: {
            type_dgi,
            groupe_tva,
            tva_rate: `${tauxTva * 100}%`,
            items_count: items.length,
            dgi_number_format: numero_dgi,
          },
        },
      }, { response_time_ms: responseTime })),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify(Errors.INTERNAL_ERROR(error.message)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

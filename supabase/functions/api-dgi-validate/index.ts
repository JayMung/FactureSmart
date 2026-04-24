/**
 * API Endpoint: POST /api-dgi-validate
 * Validate an authorization code and QR code data from DGI invoice registry.
 * Also used to check the status of a DGI-submitted invoice.
 *
 * GET params:
 *   facture_id - UUID of the facture
 *   numero_dgi - DGI invoice number (optional, can use facture_id)
 *   code_auth  - Authorization code to validate (optional)
 *
 * POST body (alternative):
 *   { facture_id, numero_dgi?, code_auth? }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractApiKey } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-organization-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// DRC TVA rates
const TVA_RATES: Record<string, number> = { A: 0, B: 0.08, C: 0.16 };
const TVA_LABELS: Record<string, string> = { A: 'Exonéré (0%)', B: 'Réduit (8%)', C: 'Standard (16%)' };

/**
 * Verify that a DGI number matches the expected format
 * Format: {TYPE}-{YYMM}-{NNNNNNNN}
 */
function validateDgiNumberFormat(numeroDgi: string): { valid: boolean; type?: string; year?: string; month?: string; sequence?: string } {
  const match = numeroDgi.match(/^([A-Z]{2})-(\d{4})-(\d{8})$/);
  if (!match) {
    return { valid: false };
  }
  return {
    valid: true,
    type: match[1],
    year: match[2].slice(0, 2),
    month: match[2].slice(2, 4),
    sequence: match[3],
  };
}

/**
 * Validate authorization code format (8 alphanumeric)
 */
function validateCodeAuthFormat(codeAuth: string): boolean {
  return /^[A-Z0-9]{8}$/.test(codeAuth);
}

/**
 * Parse QR code data payload
 * Format: companyName|nif|factureNumber|dgiNumber|totalTtc|date|itemsSummary
 */
function parseQrCodeData(qrData: string): {
  companyName: string;
  nif: string;
  factureNumber: string;
  dgiNumber: string;
  totalTtc: string;
  date: string;
  itemsSummary: string;
} | null {
  const parts = qrData.split('|');
  if (parts.length < 7) return null;
  return {
    companyName: parts[0],
    nif: parts[1],
    factureNumber: parts[2],
    dgiNumber: parts[3],
    totalTtc: parts[4],
    date: parts[5],
    itemsSummary: parts.slice(6).join('|'),
  };
}

/**
 * Validate QR code integrity
 */
function validateQrIntegrity(
  qrData: string,
  expected: {
    companyName?: string;
    nif?: string;
    factureNumber?: string;
    totalTtc?: number;
    date?: string;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const parsed = parseQrCodeData(qrData);

  if (!parsed) {
    errors.push('QR code data is malformed');
    return { valid: false, errors };
  }

  if (expected.factureNumber && parsed.factureNumber !== expected.factureNumber) {
    errors.push(`Facture number mismatch: expected ${expected.factureNumber}, got ${parsed.factureNumber}`);
  }

  if (expected.totalTtc !== undefined) {
    const qrTotal = parseFloat(parsed.totalTtc);
    if (Math.abs(qrTotal - expected.totalTtc) > 0.01) {
      errors.push(`Total TTC mismatch: expected ${expected.totalTtc}, got ${qrTotal}`);
    }
  }

  if (expected.date && parsed.date !== expected.date) {
    errors.push(`Date mismatch: expected ${expected.date}, got ${parsed.date}`);
  }

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Authenticate
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return new Response(
        JSON.stringify(Errors.UNAUTHORIZED()),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Parse request
    let factureId: string | null = null;
    let numeroDgi: string | null = null;
    let codeAuth: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      factureId = url.searchParams.get('facture_id');
      numeroDgi = url.searchParams.get('numero_dgi');
      codeAuth = url.searchParams.get('code_auth');
    } else {
      const body = await req.json();
      factureId = body.facture_id || null;
      numeroDgi = body.numero_dgi || null;
      codeAuth = body.code_auth || null;
    }

    if (!factureId && !numeroDgi) {
      return new Response(
        JSON.stringify(Errors.VALIDATION_ERROR('facture_id or numero_dgi is required')),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch DGI registry entry
    let registryEntry: any = null;

    if (factureId) {
      const { data, error } = await supabase
        .from('dgi_invoice_registry')
        .select('*')
        .eq('facture_id', factureId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return new Response(
          JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch DGI registry')),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      registryEntry = data;
    } else if (numeroDgi) {
      const { data, error } = await supabase
        .from('dgi_invoice_registry')
        .select('*')
        .eq('numero_dgi', numeroDgi)
        .single();

      if (error && error.code !== 'PGRST116') {
        return new Response(
          JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch DGI registry')),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      registryEntry = data;
    }

    if (!registryEntry) {
      return new Response(
        JSON.stringify(Errors.NOT_FOUND('DGI Invoice Registry Entry')),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation results
    const validations: Record<string, { status: 'valid' | 'invalid' | 'warning'; message: string }> = {};

    // 1. DGI Number format validation
    const dgiFormat = validateDgiNumberFormat(registryEntry.numero_dgi);
    validations['dgi_number_format'] = {
      status: dgiFormat.valid ? 'valid' : 'invalid',
      message: dgiFormat.valid
        ? `Format valide: ${dgiFormat.type}-${dgiFormat.year}${dgiFormat.month}-${dgiFormat.sequence}`
        : 'Format DGI invalide (attendu: XX-YYMM-NNNNNNNN)',
    };

    // 2. Authorization code validation
    if (registryEntry.code_auth) {
      validations['code_auth_format'] = {
        status: validateCodeAuthFormat(registryEntry.code_auth) ? 'valid' : 'invalid',
        message: validateCodeAuthFormat(registryEntry.code_auth)
          ? `Code autorisation valide: ${registryEntry.code_auth}`
          : 'Format code autorisation invalide (attendu: 8 caractères alphanumériques)',
      };
    }

    // 3. QR code data validation
    if (registryEntry.qr_code_data) {
      const qrIntegrity = validateQrIntegrity(registryEntry.qr_code_data, {
        factureNumber: registryEntry.facture?.facture_number,
        totalTtc: registryEntry.total_ttc,
        date: registryEntry.date_facture,
      });
      validations['qr_code_integrity'] = {
        status: qrIntegrity.valid ? 'valid' : 'invalid',
        message: qrIntegrity.valid
          ? 'QR code data integrity verified'
          : `QR code data error: ${qrIntegrity.errors.join('; ')}`,
      };
    }

    // 4. TVA group validation
    const facture = registryEntry.facture_id
      ? (await supabase.from('factures').select('*, client:clients(nom)').eq('id', registryEntry.facture_id).single()).data
      : null;

    if (facture?.groupe_tva) {
      const tvaRate = TVA_RATES[facture.groupe_tva];
      validations['tva_compliance'] = {
        status: tvaRate !== undefined ? 'valid' : 'invalid',
        message: `Groupe TVA ${facture.groupe_tva}: ${TVA_LABELS[facture.groupe_tva] || 'Inconnu'}`,
      };
    }

    // 5. Amounts cross-check
    if (registryEntry.total_htva !== undefined && registryEntry.taux_tva !== undefined) {
      const expectedTva = registryEntry.total_htva * registryEntry.taux_tva;
      const tvaDiff = Math.abs(expectedTva - registryEntry.montant_tva);
      validations['amounts_crosscheck'] = {
        status: tvaDiff < 0.01 ? 'valid' : 'invalid',
        message: tvaDiff < 0.01
          ? `TVA vérifiée: ${registryEntry.total_htva} × ${registryEntry.taux_tva} = ${registryEntry.montant_tva}`
          : `Écart TVA detecté: attendu ${expectedTva}, enregistré ${registryEntry.montant_tva}`,
      };
    }

    // 6. DGI Number sequence check
    if (dgiFormat.valid && registryEntry.date_facture) {
      const invoiceDate = new Date(registryEntry.date_facture);
      const dgiMonth = `${invoiceDate.getFullYear().toString().slice(-2)}${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
      validations['dgi_number_date'] = {
        status: dgiFormat.year + dgiFormat.month === dgiMonth ? 'valid' : 'warning',
        message: dgiFormat.year + dgiFormat.month === dgiMonth
          ? `DGI number month matches invoice date (${dgiMonth})`
          : `Attention: DGI number month (${dgiFormat.year}${dgiFormat.month}) ne correspond pas à la date de facture (${dgiMonth})`,
      };
    }

    // Overall status
    const invalidCount = Object.values(validations).filter(v => v.status === 'invalid').length;
    const warningCount = Object.values(validations).filter(v => v.status === 'warning').length;
    const overallStatus = invalidCount > 0 ? 'rejected' : warningCount > 0 ? 'warning' : 'compliant';

    // Code auth specific validation (if provided)
    if (codeAuth && registryEntry.code_auth) {
      validations['code_auth_match'] = {
        status: codeAuth.toUpperCase() === registryEntry.code_auth.toUpperCase() ? 'valid' : 'invalid',
        message: codeAuth.toUpperCase() === registryEntry.code_auth.toUpperCase()
          ? 'Code autorisation confirmé'
          : 'Code autorisation ne correspond pas',
      };
    }

    return new Response(
      JSON.stringify(successResponse({
        validation: {
          registry_id: registryEntry.id,
          numero_dgi: registryEntry.numero_dgi,
          code_auth: registryEntry.code_auth,
          statut: registryEntry.statut,
          date_facture: registryEntry.date_facture,
          client_nom: registryEntry.client_nom,
          totals: {
            htva: parseFloat(registryEntry.total_htva),
            taux_tva: parseFloat(registryEntry.taux_tva),
            tva: parseFloat(registryEntry.montant_tva),
            ttc: parseFloat(registryEntry.total_ttc),
          },
          validations,
          overall: {
            status: overallStatus,
            compliant: overallStatus === 'compliant',
            invalid_count: invalidCount,
            warning_count: warningCount,
          },
        },
      }, { response_time_ms: Date.now() - startTime })),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify(Errors.INTERNAL_ERROR(error.message)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

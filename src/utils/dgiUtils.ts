import { supabase } from '@/integrations/supabase/client';
import type { Facture, Declarant } from '@/types';

// TVA rates by group (RDC DGI)
export const TVA_RATES: Record<string, number> = {
  A: 0,    // Exempt (0%)
  B: 0.08, // 8%
  C: 0.16, // 16%
};

/**
 * Get TVA rate for a groupe
 */
export const getTvaRate = (groupe: 'A' | 'B' | 'C'): number => {
  return TVA_RATES[groupe] ?? 0;
};

/**
 * Calculate TVA from HT amount
 */
export const calculateTva = (montantHt: number, groupe: 'A' | 'B' | 'C'): number => {
  return montantHt * getTvaRate(groupe);
};

/**
 * Calculate TTC from HT amount
 */
export const calculateTtc = (montantHt: number, groupe: 'A' | 'B' | 'C'): number => {
  return montantHt + calculateTva(montantHt, groupe);
};

/**
 * Generate next sequential DGI invoice number
 * Format: AAMM-NNNNNNNN (8 digits)
 */
export const generateNumeroDgi = async (): Promise<string> => {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearShort = now.getFullYear().toString().slice(-2);
  const prefix = `${yearShort}${month}-`;

  // Count existing DGI numbers for this month
  const { data, error } = await supabase
    .from('dgi_invoice_registry')
    .select('numero_dgi')
    .like('numero_dgi', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].numero_dgi;
    const match = lastNum?.match(`${prefix}(\\d+)`);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${nextNum.toString().padStart(8, '0')}`;
};

/**
 * Generate a simple authorization code (8 alphanumeric chars)
 */
export const generateCodeAuth = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Generate QR code data payload for DGI
 * Format: companyName|nif|factureNumber|totalTtc|date|itemsSummary
 */
export const generateQrCodeData = async (
  facture: Facture,
  declarant?: Declarant
): Promise<string> => {
  const companyName = declarant?.raison_sociale || 'Entreprise';
  const nif = declarant?.nif || '';
  const factureNumber = facture.facture_number;
  const totalTtc = facture.montant_ttc?.toFixed(2) || facture.total_general?.toFixed(2) || '0.00';
  const date = new Date(facture.date_emission).toISOString().split('T')[0];
  const itemsSummary = `${(facture.items?.length || 0)} articles`;

  return `${companyName}|${nif}|${factureNumber}|${totalTtc}|${date}|${itemsSummary}`;
};

/**
 * Register a facture in the DGI invoice registry
 */
export const registerFactureDgi = async (
  facture: Facture,
  declarant?: Declarant
): Promise<{ numero_dgi: string; code_auth: string; qr_code_data: string }> => {
  const [numero_dgi, code_auth, qr_code_data] = await Promise.all([
    generateNumeroDgi(),
    Promise.resolve(generateCodeAuth()),
    generateQrCodeData(facture, declarant),
  ]);

  // Calculate HTV/TVA/TTC
  const groupeTva = facture.groupe_tva || 'B';
  const tauxTva = getTvaRate(groupeTva);
  const totalHtva = facture.montant_ht || facture.subtotal || 0;
  const montantTva = totalHtva * tauxTva;
  const totalTtc = totalHtva + montantTva;

  // Get client name
  const clientNom = facture.client?.nom || facture.clients?.nom || 'Client anonyme';

  const { error } = await supabase
    .from('dgi_invoice_registry')
    .insert({
      numero_dgi,
      code_auth,
      qr_code_data,
      facture_id: facture.id,
      date_facture: new Date(facture.date_emission).toISOString().split('T')[0],
      client_nom: clientNom,
      total_htva: totalHtva,
      taux_tva: tauxTva,
      montant_tva: montantTva,
      total_ttc: totalTtc,
      content_hash: `${facture.facture_number}-${Date.now()}`,
      statut: 'declared',
    });

  if (error) throw error;

  return { numero_dgi, code_auth, qr_code_data };
};

/**
 * Get the DGI invoice registry entry for a facture
 */
export const getDgiRegistryEntry = async (factureId: string) => {
  const { data, error } = await supabase
    .from('dgi_invoice_registry')
    .select('*')
    .eq('facture_id', factureId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
};

/**
 * Get the active declarant (company) for DGI
 */
export const getActiveDeclarant = async (): Promise<Declarant | null> => {
  const { data, error } = await supabase
    .from('declarants')
    .select('*')
    .eq('actif', true)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') return null;
  return data || null;
};

/**
 * Format currency for display (USD)
 */
export const formatUsd = (value: number): string => {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format currency for display (CDF)
 */
export const formatCdf = (value: number): string => {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FC`;
};

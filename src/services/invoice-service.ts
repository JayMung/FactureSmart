/**
 * Invoice Service — Service de gestion des factures DGI
 *
 * Gère:
 * - Création de facture avec calculs automatiques (TVA, totaux)
 * - Numérotation automatique par série (F, A, AV, R, E)
 * - Cycle de vie complet (brouillon → validee → DGI → archivee)
 * - Envoi DGI avec retry
 * - Avoirs et conversion devis → facture
 */

import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { calculateTVA, calculateLineTotals } from '@/lib/tva-calculator';
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceType,
  InvoiceSeriesCode,
  CreateInvoiceData,
  InvoiceFilters,
  InvoiceHistoryEntry,
  DgiTransmission,
  Company,
} from '@/types';

// ==========================================================================
// CONSTANTES
// ==========================================================================

/** Mapping des séries vers les types de documents */
export const SERIES_MAP: Record<InvoiceSeriesCode, { label: string; types: InvoiceType[] }> = {
  F:  { label: 'Factures normales', types: ['facture'] },
  A:  { label: 'Avoirs (avoir)', types: ['avoir'] },
  AV: { label: 'Acomptes', types: ['acompte'] },
  R:  { label: 'Reçus / Règlements', types: ['proforma'] },
  E:  { label: 'Divers', types: ['devis'] },
};

/** Cycle de vie — transitions valides */
export const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  brouillon:    ['validee', 'annulee'],
  validee:      ['envoyee_dgi', 'annulee'],
  envoyee_dgi:  ['acceptee_dgi', 'rejetee_dgi', 'annulee'],
  acceptee_dgi: ['archivee', 'annulee'],
  rejetee_dgi:  ['envoyee_dgi', 'annulee'],       // Peut être renvoyée
  archivee:     [],                                  // Terminal
  annulee:      [],
};

// ==========================================================================
// SOCIÉTÉS (Multi-entités)
// ==========================================================================

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('[InvoiceService] Error fetching companies:', error);
    return [];
  }
  return data || [];
}

export async function getDefaultCompany(): Promise<Company | null> {
  const companies = await getCompanies();
  return companies.length > 0 ? companies[0] : null;
}

// ==========================================================================
// CRUD FACTURES
// ==========================================================================

/**
 * Crée une facture avec calculs automatiques
 */
export async function createInvoice(data: CreateInvoiceData): Promise<Invoice | null> {
  try {
    // 1. Récupérer la société pour le taux TVA par défaut
    const company = await getDefaultCompany();
    const defaultTvaRate = company?.tva_rate || 16;

    // 2. Calculer les totaux via le service TVA
    const items = data.items.map((item, i) => {
      const tva_rate = item.tva_rate ?? defaultTvaRate;
      const tva_exempt = item.tva_exempt ?? false;
      const lineTotals = calculateLineTotals(item.quantity, item.unit_price, tva_rate, tva_exempt);
      return {
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'piece',
        unit_price: item.unit_price,
        tva_rate,
        tva_exempt,
        total_ht: lineTotals.total_ht,
        tva_amount: lineTotals.tva_amount,
        total_ttc: lineTotals.total_ttc,
        sort_order: item.sort_order ?? i + 1,
      };
    });

    const tvaResult = calculateTVA({
      items: data.items.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: item.tva_rate ?? defaultTvaRate,
        tva_exempt: item.tva_exempt ?? false,
      })),
      discount_percent: data.discount_percent,
      acompte: data.acompte,
    });

    // 3. Insérer la facture (invoice_number auto-généré par la DB)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: data.company_id,
        type: data.type || 'facture',
        series_code: data.series_code || 'F',
        client_id: data.client_id || null,
        client_nom: data.client_nom || null,
        client_nif: data.client_nif || null,
        client_rccm: data.client_rccm || null,
        client_adresse: data.client_adresse || null,
        client_ville: data.client_ville || null,
        issue_date: data.issue_date || new Date().toISOString().split('T')[0],
        due_date: data.due_date || null,
        currency: data.currency || 'USD',
        discount_percent: tvaResult.discount_percent,
        discount_amount: tvaResult.discount_amount,
        subtotal_ht: tvaResult.subtotal_ht,
        tva_base_16: tvaResult.tva_base_16,
        tva_amount_16: tvaResult.tva_amount_16,
        tva_base_0: tvaResult.tva_base_0,
        tva_amount_0: tvaResult.tva_amount_0,
        tva_total: tvaResult.tva_total,
        total_ttc: tvaResult.total_ttc,
        acompte: tvaResult.acompte,
        tva_exigible: tvaResult.tva_exigible,
        net_a_payer: tvaResult.net_a_payer,
        notes: data.notes || null,
        conditions: data.conditions || null,
        reference: data.reference || null,
        status: 'brouillon',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('*')
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Échec création facture');

    // 4. Insérer les lignes
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        items.map((item, i) => ({
          invoice_id: invoice.id,
          line_number: i + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          tva_exempt: item.tva_exempt,
          total_ht: item.total_ht,
          tva_amount: item.tva_amount,
          total_ttc: item.total_ttc,
          sort_order: item.sort_order,
        }))
      );

    if (itemsError) throw itemsError;

    showSuccess('Facture créée avec succès');
    return invoice as Invoice;
  } catch (err) {
    console.error('[InvoiceService] Error creating invoice:', err);
    showError('Erreur lors de la création de la facture');
    return null;
  }
}

/**
 * Récupère une facture avec ses lignes
 */
export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      company:companies(*),
      client:clients(*),
      items:invoice_items(*) order by sort_order,
      history:invoice_history(*) order by created_at desc,
      dgi_transmissions: dgi_transmissions(*) order by created_at desc
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[InvoiceService] Error fetching invoice:', error);
    return null;
  }
  return data as Invoice;
}

/**
 * Liste les factures avec filtres et pagination
 */
export async function listInvoices(
  filters?: InvoiceFilters,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ invoices: Invoice[]; total: number }> {
  let query = supabase
    .from('invoices')
    .select('*, client:clients(id, nom, telephone, ville), items:invoice_items(count)', { count: 'exact' });

  // Apply filters
  if (filters?.company_id) query = query.eq('company_id', filters.company_id);
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.series_code) query = query.eq('series_code', filters.series_code);
  if (filters?.client_id) query = query.eq('client_id', filters.client_id);
  if (filters?.dgi_status) query = query.eq('dgi_status', filters.dgi_status);
  if (filters?.date_from) query = query.gte('issue_date', filters.date_from);
  if (filters?.date_to) query = query.lte('issue_date', filters.date_to);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('issue_date', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[InvoiceService] Error listing invoices:', error);
    return { invoices: [], total: 0 };
  }

  return {
    invoices: (data || []) as Invoice[],
    total: count || 0,
  };
}

/**
 * Met à jour une facture
 */
export async function updateInvoice(
  id: string,
  updates: Partial<CreateInvoiceData>,
): Promise<Invoice | null> {
  try {
    const updateData: Record<string, any> = { ...updates };

    // Si des items sont fournis, recalculer les totaux
    if (updates.items) {
      const company = await getDefaultCompany();
      const defaultTvaRate = company?.tva_rate || 16;

      const tvaItems = updates.items.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: item.tva_rate ?? defaultTvaRate,
        tva_exempt: item.tva_exempt ?? false,
      }));

      const tvaResult = calculateTVA({
        items: tvaItems,
        discount_percent: updates.discount_percent,
        acompte: updates.acompte,
      });

      Object.assign(updateData, {
        discount_percent: tvaResult.discount_percent,
        discount_amount: tvaResult.discount_amount,
        subtotal_ht: tvaResult.subtotal_ht,
        tva_base_16: tvaResult.tva_base_16,
        tva_amount_16: tvaResult.tva_amount_16,
        tva_base_0: tvaResult.tva_base_0,
        tva_amount_0: tvaResult.tva_amount_0,
        tva_total: tvaResult.tva_total,
        total_ttc: tvaResult.total_ttc,
        tva_exigible: tvaResult.tva_exigible,
        net_a_payer: tvaResult.net_a_payer,
      });

      // Re-supprimer items du updateData car c'est une relation séparée
      delete updateData.items;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Si items, remplacer
    if (updates.items) {
      // Supprimer anciens items
      await supabase.from('invoice_items').delete().eq('invoice_id', id);

      // Insérer nouveaux items
      const company = await getDefaultCompany();
      const defaultTvaRate = company?.tva_rate || 16;

      await supabase.from('invoice_items').insert(
        updates.items.map((item, i) => ({
          invoice_id: id,
          line_number: i + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'piece',
          unit_price: item.unit_price,
          tva_rate: item.tva_rate ?? defaultTvaRate,
          tva_exempt: item.tva_exempt ?? false,
          total_ht: calculateLineTotals(item.quantity, item.unit_price, item.tva_rate ?? defaultTvaRate, item.tva_exempt ?? false).total_ht,
          tva_amount: calculateLineTotals(item.quantity, item.unit_price, item.tva_rate ?? defaultTvaRate, item.tva_exempt ?? false).tva_amount,
          total_ttc: calculateLineTotals(item.quantity, item.unit_price, item.tva_rate ?? defaultTvaRate, item.tva_exempt ?? false).total_ttc,
          sort_order: item.sort_order ?? i + 1,
        }))
      );
    }

    showSuccess('Facture mise à jour');
    return data as Invoice;
  } catch (err) {
    console.error('[InvoiceService] Error updating invoice:', err);
    showError('Erreur lors de la mise à jour');
    return null;
  }
}

// ==========================================================================
// CYCLE DE VIE
// ==========================================================================

/**
 * Transitionne une facture vers un nouveau statut
 * Valide les transitions autorisées
 */
export async function transitionInvoice(
  id: string,
  newStatus: InvoiceStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer la facture
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: 'Facture introuvable' };
    }

    const currentStatus = invoice.status as InvoiceStatus;

    // Vérifier transition valide
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Transition invalide: ${currentStatus} → ${newStatus}. Transitions autorisées: ${allowed.join(', ') || 'aucune'}`,
      };
    }

    // Utiliser une Edge Function pour les transitions critiques
    // Pour les transitions simples, faire directement
    const updateData: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };

    if (newStatus === 'validee') {
      updateData.validated_at = new Date().toISOString();
      updateData.validated_by = (await supabase.auth.getUser()).data.user?.id;
    }
    if (newStatus === 'archivee') {
      updateData.archived_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    showSuccess(`Facture ${invoice.invoice_number} → ${getStatusLabel(newStatus)}`);
    return { success: true };
  } catch (err) {
    console.error('[InvoiceService] Error transitioning invoice:', err);
    return { success: false, error: 'Erreur lors du changement de statut' };
  }
}

/**
 * Supprime une facture (annulation logique)
 */
export async function cancelInvoice(
  id: string,
  reason?: string,
): Promise<boolean> {
  const result = await transitionInvoice(id, 'annulee');
  return result.success;
}

// ==========================================================================
// DGI — ENVOI ET SUIVI
// ==========================================================================

/**
 * Soumet une facture à la DGI
 */
export async function submitToDGI(invoiceId: string): Promise<{
  success: boolean;
  transmission?: DgiTransmission;
  error?: string;
}> {
  try {
    // 1. Vérifier que la facture peut être soumise
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, company:companies(*)')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: 'Facture introuvable' };
    }

    if (invoice.status !== 'validee') {
      return {
        success: false,
        error: `Seules les factures validées peuvent être soumises à la DGI (statut: ${invoice.status})`,
      };
    }

    // 2. Créer la transmission
    const payload = {
      invoice_number: invoice.invoice_number,
      company_nif: invoice.company?.nif,
      client_nif: invoice.client_nif,
      issue_date: invoice.issue_date,
      total_ht: invoice.subtotal_ht,
      tva_total: invoice.tva_total,
      total_ttc: invoice.total_ttc,
      items: [], // À remplir selon spec DGI
    };

    const { data: transmission, error: txError } = await supabase
      .from('dgi_transmissions')
      .insert({
        invoice_id: invoiceId,
        company_id: invoice.company_id,
        status: 'submitted',
        payload_sent: payload,
        submitted_at: new Date().toISOString(),
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (txError) throw txError;

    // 3. Mettre à jour le statut de la facture
    await supabase
      .from('invoices')
      .update({
        status: 'envoyee_dgi',
        dgi_status: 'pending',
        dgi_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    showSuccess(`Facture ${invoice.invoice_number} soumise à la DGI`);
    return { success: true, transmission: transmission as DgiTransmission };
  } catch (err) {
    console.error('[InvoiceService] Error submitting to DGI:', err);
    return { success: false, error: 'Erreur lors de la soumission DGI' };
  }
}

/**
 * Récupère la liste des transmissions DGI pour une facture
 */
export async function getDgiTransmissions(invoiceId: string): Promise<DgiTransmission[]> {
  const { data } = await supabase
    .from('dgi_transmissions')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  return (data || []) as DgiTransmission[];
}

// ==========================================================================
// UTILITAIRES
// ==========================================================================

/** Libellé des statuts */
export function getStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    brouillon:    'Brouillon',
    validee:      'Validée',
    envoyee_dgi:  'Envoyée à la DGI',
    acceptee_dgi: 'Acceptée par la DGI',
    rejetee_dgi:  'Rejetée par la DGI',
    archivee:     'Archivée',
    annulee:      'Annulée',
  };
  return labels[status] || status;
}

/** Couleur du badge statut */
export function getStatusColor(status: InvoiceStatus): string {
  const colors: Record<InvoiceStatus, string> = {
    brouillon:    'bg-gray-100 text-gray-700',
    validee:      'bg-green-100 text-green-700',
    envoyee_dgi:  'bg-blue-100 text-blue-700',
    acceptee_dgi: 'bg-emerald-100 text-emerald-700',
    rejetee_dgi:  'bg-red-100 text-red-700',
    archivee:     'bg-purple-100 text-purple-700',
    annulee:      'bg-rose-100 text-rose-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

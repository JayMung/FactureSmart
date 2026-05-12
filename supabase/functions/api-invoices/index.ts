/**
 * API Edge Function: /api-invoices
 *
 * API REST complète pour la gestion des factures DGI
 * Endpoints:
 *   GET    /api-invoices?status=&type=&client_id=...   — Liste filtrée
 *   GET    /api-invoices/:id                            — Détail facture + items
 *   POST   /api-invoices                                — Créer facture
 *   PUT    /api-invoices/:id                            — Mettre à jour
 *   DELETE /api-invoices/:id                            — Annuler facture
 *   POST   /api-invoices/:id/validate                   — Valider (brouillon → validee)
 *   POST   /api-invoices/:id/submit-dgi                 — Envoyer à la DGI
 *   POST   /api-invoices/:id/archive                    — Archiver
 *
 * Conforme au CDC FactureSmart DGI
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-company-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// ==========================================================================
// VALIDATION
// ==========================================================================

interface CreateInvoicePayload {
  company_id: string;
  client_id?: string;
  client_nom?: string;
  client_nif?: string;
  client_rccm?: string;
  client_adresse?: string;
  client_ville?: string;
  type?: string;
  series_code?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  discount_percent?: number;
  acompte?: number;
  notes?: string;
  conditions?: string;
  reference?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    tva_rate?: number;
    tva_exempt?: boolean;
    article_id?: string;
  }>;
}

function validateCreatePayload(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.company_id) errors.push('company_id requis');
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push('Au moins une ligne d\'article requise');
  }

  if (body.items) {
    body.items.forEach((item: any, i: number) => {
      if (!item.description) errors.push(`Item ${i + 1}: description requise`);
      if (item.quantity == null || item.quantity <= 0) errors.push(`Item ${i + 1}: quantité invalide`);
      if (item.unit_price == null || item.unit_price < 0) errors.push(`Item ${i + 1}: prix unitaire invalide`);
    });
  }

  if (body.currency && !['USD', 'CDF', 'EUR'].includes(body.currency)) {
    errors.push('Devise invalide (USD, CDF, EUR)');
  }

  if (body.series_code && !['F', 'A', 'AV', 'R', 'E'].includes(body.series_code)) {
    errors.push('Code série invalide (F, A, AV, R, E)');
  }

  if (body.type && !['facture', 'devis', 'avoir', 'acompte', 'proforma'].includes(body.type)) {
    errors.push('Type invalide');
  }

  return { valid: errors.length === 0, errors };
}

// ==========================================================================
// TVA CALCULATOR (Edge Function compatible)
// ==========================================================================

function calculateTVA(input: {
  items: Array<{ quantity: number; unit_price: number; tva_rate: number; tva_exempt: boolean }>;
  discount_percent: number;
  acompte: number;
}) {
  let subtotal_ht = 0;
  let tva_base_16 = 0;
  let tva_amount_16 = 0;
  let tva_base_0 = 0;

  for (const item of input.items) {
    const lineTotalHT = item.quantity * item.unit_price;
    subtotal_ht += lineTotalHT;

    if (item.tva_exempt || item.tva_rate === 0) {
      tva_base_0 += lineTotalHT;
    } else {
      tva_base_16 += lineTotalHT;
      tva_amount_16 += Math.round(lineTotalHT * item.tva_rate / 100 * 100) / 100;
    }
  }

  const discount_percent = input.discount_percent || 0;
  const discount_amount = Math.round(subtotal_ht * discount_percent / 100 * 100) / 100;
  const tva_total = Math.round(tva_amount_16 * 100) / 100;
  const total_ttc = Math.round((subtotal_ht - discount_amount + tva_total) * 100) / 100;
  const acompte = input.acompte || 0;

  let tva_exigible = tva_total;
  if (acompte > 0 && subtotal_ht > 0) {
    const tva_sur_acompte = Math.round(acompte * tva_total / subtotal_ht * 100) / 100;
    tva_exigible = Math.max(0, Math.round((tva_total - tva_sur_acompte) * 100) / 100);
  }

  return {
    subtotal_ht: Math.round(subtotal_ht * 100) / 100,
    discount_percent,
    discount_amount,
    tva_base_16: Math.round(tva_base_16 * 100) / 100,
    tva_amount_16,
    tva_base_0: Math.round(tva_base_0 * 100) / 100,
    tva_amount_0: 0,
    tva_total,
    total_ttc,
    acompte,
    tva_exigible,
    net_a_payer: Math.max(0, Math.round((total_ttc - acompte) * 100) / 100),
  };
}

// ==========================================================================
// REQUEST HANDLER
// ==========================================================================

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts[0] = "api-invoices", pathParts[1] = invoiceId, pathParts[2] = action

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Authentification
    const authHeader = req.headers.get('Authorization') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoiceId = pathParts[1];
    const action = pathParts[2];

    // ====================================================================
    // GET /api-invoices — Liste des factures
    // ====================================================================
    if (req.method === 'GET' && !invoiceId) {
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const series_code = url.searchParams.get('series_code');
      const company_id = url.searchParams.get('company_id');
      const client_id = url.searchParams.get('client_id');
      const date_from = url.searchParams.get('date_from');
      const date_to = url.searchParams.get('date_to');
      const dgi_status = url.searchParams.get('dgi_status');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

      let query = supabase
        .from('invoices')
        .select('*, client:clients(id, nom, telephone, ville)', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (type) query = query.eq('type', type);
      if (series_code) query = query.eq('series_code', series_code);
      if (company_id) query = query.eq('company_id', company_id);
      if (client_id) query = query.eq('client_id', client_id);
      if (dgi_status) query = query.eq('dgi_status', dgi_status);
      if (date_from) query = query.gte('issue_date', date_from);
      if (date_to) query = query.lte('issue_date', date_to);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .order('issue_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          has_more: (count || 0) > from + limit,
        },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ====================================================================
    // GET /api-invoices/:id — Détail facture
    // ====================================================================
    if (req.method === 'GET' && invoiceId && !action) {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(*),
          client:clients(*),
          items:invoice_items(*) order by sort_order,
          history:invoice_history(*) order by created_at desc,
          dgi_transmissions:dgi_transmissions(*) order by created_at desc
        `)
        .eq('id', invoiceId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Facture introuvable', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ====================================================================
    // POST /api-invoices — Créer facture
    // ====================================================================
    if (req.method === 'POST' && !invoiceId) {
      const body: CreateInvoicePayload = await req.json();

      // Valider
      const validation = validateCreatePayload(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.errors.join('; '), code: 'VALIDATION_ERROR' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculer TVA
      const company = await supabase
        .from('companies')
        .select('tva_rate')
        .eq('id', body.company_id)
        .single()
        .then(r => r.data);

      const defaultTvaRate = company?.tva_rate || 16;
      const tvaResult = calculateTVA({
        items: body.items.map(item => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate ?? defaultTvaRate,
          tva_exempt: item.tva_exempt ?? false,
        })),
        discount_percent: body.discount_percent || 0,
        acompte: body.acompte || 0,
      });

      // Générer numéro via fonction DB
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
        p_company_id: body.company_id,
        p_series_code: body.series_code || 'F',
      });

      // Créer la facture
      const { data: invoice, error: createError } = await supabase
        .from('invoices')
        .insert({
          company_id: body.company_id,
          invoice_number: invoiceNumber,
          series_code: body.series_code || 'F',
          type: body.type || 'facture',
          client_id: body.client_id || null,
          client_nom: body.client_nom || null,
          client_nif: body.client_nif || null,
          client_rccm: body.client_rccm || null,
          client_adresse: body.client_adresse || null,
          client_ville: body.client_ville || null,
          issue_date: body.issue_date || new Date().toISOString().split('T')[0],
          due_date: body.due_date || null,
          currency: body.currency || 'USD',
          ...tvaResult,
          notes: body.notes || null,
          conditions: body.conditions || null,
          reference: body.reference || null,
          status: 'brouillon',
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Insérer les lignes
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          body.items.map((item, i) => {
            const qty = item.quantity;
            const up = item.unit_price;
            const tr = item.tva_rate ?? defaultTvaRate;
            const te = item.tva_exempt ?? false;
            const ht = Math.round(qty * up * 100) / 100;
            const tva = te ? 0 : Math.round(ht * tr / 100 * 100) / 100;
            const ttc = Math.round((ht + tva) * 100) / 100;

            return {
              invoice_id: invoice.id,
              line_number: i + 1,
              description: item.description,
              quantity: qty,
              unit: item.unit || 'piece',
              unit_price: up,
              tva_rate: tr,
              tva_exempt: te,
              total_ht: ht,
              tva_amount: tva,
              total_ttc: ttc,
              sort_order: i + 1,
            };
          })
        );

      if (itemsError) throw itemsError;

      return new Response(JSON.stringify({
        success: true,
        data: invoice,
        message: `Facture ${invoice.invoice_number} créée`,
      }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ====================================================================
    // PUT /api-invoices/:id — Mettre à jour
    // ====================================================================
    if (req.method === 'PUT' && invoiceId && !action) {
      const body = await req.json();

      // Vérifier que la facture est modifiable
      const { data: existing } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoiceId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'Facture introuvable', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existing.status !== 'brouillon') {
        return new Response(
          JSON.stringify({ error: 'Seules les factures en brouillon sont modifiables', code: 'INVALID_STATE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Recalculer si items modifiés
      if (body.items) {
        const company = await supabase
          .from('companies')
          .select('tva_rate')
          .eq('id', body.company_id || existing.company_id)
          .single()
          .then(r => r.data);

        const defaultTvaRate = company?.tva_rate || 16;
        const tvaResult = calculateTVA({
          items: body.items.map((item: any) => ({
            quantity: item.quantity,
            unit_price: item.unit_price,
            tva_rate: item.tva_rate ?? defaultTvaRate,
            tva_exempt: item.tva_exempt ?? false,
          })),
          discount_percent: body.discount_percent || 0,
          acompte: body.acompte || 0,
        });

        Object.assign(body, tvaResult);
        delete body.items;
      }

      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Si items fournis, remplacer
      if (body.items) {
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

        const company = await supabase
          .from('companies')
          .select('tva_rate')
          .eq('id', body.company_id || existing.company_id)
          .single()
          .then(r => r.data);

        const defaultTvaRate = company?.tva_rate || 16;

        await supabase.from('invoice_items').insert(
          body.items.map((item: any, i: number) => {
            const ht = Math.round(item.quantity * item.unit_price * 100) / 100;
            const tr = item.tva_rate ?? defaultTvaRate;
            const te = item.tva_exempt ?? false;
            const tva = te ? 0 : Math.round(ht * tr / 100 * 100) / 100;

            return {
              invoice_id: invoiceId,
              line_number: i + 1,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || 'piece',
              unit_price: item.unit_price,
              tva_rate: tr,
              tva_exempt: te,
              total_ht: ht,
              tva_amount: tva,
              total_ttc: Math.round((ht + tva) * 100) / 100,
              sort_order: i + 1,
            };
          })
        );
      }

      return new Response(JSON.stringify({ success: true, data: updated }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ====================================================================
    // DELETE /api-invoices/:id — Annuler
    // ====================================================================
    if (req.method === 'DELETE' && invoiceId) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status, invoice_number')
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        return new Response(
          JSON.stringify({ error: 'Facture introuvable', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (invoice.status === 'annulee' || invoice.status === 'archivee') {
        return new Response(
          JSON.stringify({ error: 'Facture déjà annulée ou archivée', code: 'INVALID_STATE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'annulee',
          notes: supabase.rpc('concat', { a: 'ANNULÉE' }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `Facture ${invoice.invoice_number} annulée`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ====================================================================
    // POST /api-invoices/:id/validate — Valider
    // ====================================================================
    if (req.method === 'POST' && invoiceId && action === 'validate') {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status, invoice_number')
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        return new Response(
          JSON.stringify({ error: 'Facture introuvable', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (invoice.status !== 'brouillon') {
        return new Response(
          JSON.stringify({ error: `Seules les factures en brouillon peuvent être validées (statut: ${invoice.status})`, code: 'INVALID_STATE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'validee',
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `Facture ${invoice.invoice_number} validée`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ====================================================================
    // POST /api-invoices/:id/submit-dgi — Envoyer à la DGI
    // ====================================================================
    if (req.method === 'POST' && invoiceId && action === 'submit-dgi') {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*, company:companies(nif, name)')
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        return new Response(
          JSON.stringify({ error: 'Facture introuvable', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (invoice.status !== 'validee') {
        return new Response(
          JSON.stringify({ error: `Seules les factures validées peuvent être soumises à la DGI (statut: ${invoice.status})`, code: 'INVALID_STATE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Créer une transmission DGI
      const payload = {
        invoice_number: invoice.invoice_number,
        company_nif: invoice.company?.nif,
        company_name: invoice.company?.name,
        client_nif: invoice.client_nif,
        client_nom: invoice.client_nom,
        issue_date: invoice.issue_date,
        total_htva: invoice.subtotal_ht,
        tva_rate: 16,
        montant_tva: invoice.tva_total,
        total_ttc: invoice.total_ttc,
        net_a_payer: invoice.net_a_payer,
        currency: invoice.currency,
      };

      const { data: transmission, error: txError } = await supabase
        .from('dgi_transmissions')
        .insert({
          invoice_id: invoiceId,
          company_id: invoice.company_id,
          status: 'submitted',
          payload_sent: payload,
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Mettre à jour la facture
      await supabase
        .from('invoices')
        .update({
          status: 'envoyee_dgi',
          dgi_status: 'pending',
          dgi_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      return new Response(JSON.stringify({
        success: true,
        message: `Facture ${invoice.invoice_number} soumise à la DGI`,
        data: transmission,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ====================================================================
    // POST /api-invoices/:id/archive — Archiver
    // ====================================================================
    if (req.method === 'POST' && invoiceId && action === 'archive') {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status, invoice_number')
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        return new Response(
          JSON.stringify({ error: 'Facture introuvable', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['acceptee_dgi', 'annulee'].includes(invoice.status)) {
        return new Response(
          JSON.stringify({ error: `Seules les factures acceptées par la DGI ou annulées peuvent être archivées (statut: ${invoice.status})`, code: 'INVALID_STATE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'archivee',
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `Facture ${invoice.invoice_number} archivée`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ====================================================================
    // 404 — Route non trouvée
    // ====================================================================
    return new Response(
      JSON.stringify({ error: 'Endpoint non trouvé', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[api-invoices] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

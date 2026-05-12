/**
 * Webhook DGI — Traite les callbacks de la DGI
 *
 * Reçoit les notifications de la DGI pour:
 * - Confirmation de soumission (accepted)
 * - Rejet de soumission (rejected)
 *
 * Endpoint DGI:
 *   POST /webhook-dgi-callback
 *
 * Payload DGI:
 * {
 *   transmission_id: "uuid",
 *   status: "accepted" | "rejected",
 *   dgi_reference: "DGI-2026-XXXXX",
 *   error_message: "...",
 *   acknowledged_at: "2026-05-13T12:00:00Z"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DGI_WEBHOOK_SECRET = Deno.env.get('DGI_WEBHOOK_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  // Vérifier signature
  const signature = req.headers.get('x-webhook-signature');
  if (DGI_WEBHOOK_SECRET && signature !== DGI_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Signature invalide' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { transmission_id, status, dgi_reference, error_message, acknowledged_at } = body;

    if (!transmission_id || !status) {
      return new Response(
        JSON.stringify({ error: 'transmission_id et status requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la transmission
    const { data: transmission } = await supabase
      .from('dgi_transmissions')
      .select('id, invoice_id')
      .eq('id', transmission_id)
      .single();

    if (!transmission) {
      return new Response(
        JSON.stringify({ error: 'Transmission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (status === 'accepted') {
      // Mise à jour transmission
      await supabase
        .from('dgi_transmissions')
        .update({
          status: 'accepted',
          dgi_reference: dgi_reference || null,
          acknowledged_at: acknowledged_at || new Date().toISOString(),
        })
        .eq('id', transmission_id);

      // Mise à jour facture
      await supabase
        .from('invoices')
        .update({
          status: 'acceptee_dgi',
          dgi_status: 'validated',
          dgi_reference: dgi_reference || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transmission.invoice_id);

    } else if (status === 'rejected') {
      await supabase
        .from('dgi_transmissions')
        .update({
          status: 'rejected',
          error_message: error_message || 'Rejeté par la DGI',
          rejected_at: acknowledged_at || new Date().toISOString(),
        })
        .eq('id', transmission_id);

      await supabase
        .from('invoices')
        .update({
          status: 'rejetee_dgi',
          dgi_status: 'rejected',
          dgi_response: { error: error_message },
          updated_at: new Date().toISOString(),
        })
        .eq('id', transmission.invoice_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[webhook-dgi] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

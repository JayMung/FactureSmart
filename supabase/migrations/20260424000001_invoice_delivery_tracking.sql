-- Migration: COD-46 — Invoice Delivery Tracking
-- Date: 2026-04-24
-- Task: P0-4 Envoi email et WhatsApp facture
-- Tables: invoice_deliveries (trace tous les envois email + WhatsApp par facture)

-- ============================================
-- INVOICE DELIVERIES (COD-46)
-- Trace tous les envois email + WhatsApp
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  -- Canal: email | whatsapp
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  -- Destinataire
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  -- Contenu
  subject VARCHAR(500),                  -- Pour email
  body_preview TEXT,                     -- Premier texte (hors HTML)
  pdf_attachment_url TEXT,               -- URL du PDF en pièce jointe (si applicable)
  pdf_attached BOOLEAN DEFAULT FALSE,    -- True si PDF en pièce jointe
  download_token VARCHAR(255),           -- Token unique pour le lien de téléchargement
  download_expires_at TIMESTAMPTZ,       -- Expiration du lien (7 jours)
  -- Statut de livraison (trace API)
  -- Email: pending | sent | delivered | bounced | failed
  -- WhatsApp: pending | sent | delivered | read | failed
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'sent', 'delivered', 'read', 'bounced', 'failed', 'expired'
    )),
  -- Métadonnées de réponse API (webhook data)
  provider_message_id VARCHAR(255),       -- ID message retourné par Resend/WhatsApp API
  provider_response JSONB DEFAULT '{}',  -- Réponse brute de l'API
  -- Erreur si échec
  error_message TEXT,
  -- Suivi temporel
  sent_at TIMESTAMPTZ,                  -- Quand l'envoi a été demandé
  delivered_at TIMESTAMPTZ,              -- Quand la livraison est confirmée
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoice_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies: CRUD complet pour les owners de la facture + admins
-- Lecture: mêmes règles que factures
CREATE POLICY "invoice_deliveries_read" ON public.invoice_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.factures f
      WHERE f.id = invoice_deliveries.invoice_id
      AND (
        f.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
        )
      )
    )
  );

-- Insertion: creators + admins
CREATE POLICY "invoice_deliveries_insert" ON public.invoice_deliveries FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

-- Mise à jour du statut (webhook callbacks)
CREATE POLICY "invoice_deliveries_update" ON public.invoice_deliveries FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

CREATE INDEX idx_invoice_deliveries_invoice_id ON public.invoice_deliveries(invoice_id);
CREATE INDEX idx_invoice_deliveries_status ON public.invoice_deliveries(status);
CREATE INDEX idx_invoice_deliveries_channel ON public.invoice_deliveries(channel);
CREATE INDEX idx_invoice_deliveries_download_token ON public.invoice_deliveries(download_token);

-- Trigger updated_at
CREATE TRIGGER invoice_deliveries_updated_at
  BEFORE UPDATE ON public.invoice_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- FUNCTION: Générer un token de téléchargement
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_download_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Créer un enregistrement de livraison + token
-- ============================================
CREATE OR REPLACE FUNCTION public.create_invoice_delivery(
  p_invoice_id UUID,
  p_channel VARCHAR(20),
  p_recipient_email VARCHAR(255) DEFAULT NULL,
  p_recipient_phone VARCHAR(50) DEFAULT NULL,
  p_subject VARCHAR(500) DEFAULT NULL,
  p_body_preview TEXT DEFAULT NULL,
  p_pdf_attached BOOLEAN DEFAULT FALSE,
  p_created_by UUID
)
RETURNS public.invoice_deliveries AS $$
DECLARE
  v_record public.invoice_deliveries;
  v_token TEXT;
BEGIN
  v_token := public.generate_download_token();

  INSERT INTO public.invoice_deliveries (
    invoice_id, channel, recipient_email, recipient_phone,
    subject, body_preview, pdf_attached, download_token,
    download_expires_at, created_by
  ) VALUES (
    p_invoice_id, p_channel, p_recipient_email, p_recipient_phone,
    p_subject, p_body_preview, p_pdf_attached, v_token,
    NOW() + INTERVAL '7 days', p_created_by
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Mettre à jour le statut de livraison (appelé par webhook)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_invoice_delivery_status(
  p_id UUID,
  p_status VARCHAR(30),
  p_provider_message_id VARCHAR(255) DEFAULT NULL,
  p_provider_response JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL
)
RETURNS public.invoice_deliveries AS $$
DECLARE
  v_record public.invoice_deliveries;
BEGIN
  UPDATE public.invoice_deliveries SET
    status = p_status,
    provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
    provider_response = p_provider_response,
    error_message = p_error_message,
    delivered_at = CASE WHEN p_status IN ('delivered', 'read') AND delivered_at IS NULL
                        THEN NOW() ELSE delivered_at END
  WHERE id = p_id
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

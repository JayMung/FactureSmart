-- ============================================================================
-- MIGRATION: Core Facturation — Module FactureSmart DGI
-- Date: 2026-05-13
-- Sprint 2: Base de données, calculs TVA, API REST
--
-- Tables:
--   companies              — Multi-entités (sociétés déclarantes)
--   clients_b2b            — Clients professionnels avec NIF/RCCM
--   articles               — Articles/Prestations avec TVA par défaut
--   facture_series         — Numérotation par série (F, A, AV, R, E)
--   invoices               — Factures DGI (cycle de vie complet)
--   invoice_items          — Lignes de facture
--   dgi_transmissions      — Tracking envoi DGI
--   invoice_history        — Audit trail cycle de vie
-- ============================================================================

-- ============================================================================
-- 1. COMPANIES — Multi-entités (sociétés déclarantes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),              -- Raison sociale
  alias VARCHAR(100),                   -- Sigle / Nom court
  nif VARCHAR(50) UNIQUE,               -- Numéro d'Identification Fiscale
  rccm VARCHAR(50) UNIQUE,              -- Registre du Commerce
  idnat VARCHAR(50),                    -- ID Nationale
  address TEXT,
  city VARCHAR(100) DEFAULT 'Kinshasa',
  country VARCHAR(100) DEFAULT 'RDC',
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  -- Régime TVA
  tva_regime VARCHAR(20) DEFAULT 'normal' CHECK (tva_regime IN ('normal', 'simplifie', 'exonere')),
  tva_rate DECIMAL(5,2) DEFAULT 16.00,  -- Taux TVA par défaut (RDC: 16%)
  -- Déclarant DGI
  dgi_declarant_number VARCHAR(50),
  dgi_centre_impot VARCHAR(255),
  dgi_arrondissement VARCHAR(100),
  -- Statut
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_admin_all" ON public.companies FOR ALL TO authenticated
  USING (true);

CREATE INDEX idx_companies_nif ON public.companies(nif);
CREATE INDEX idx_companies_active ON public.companies(is_active);

-- ============================================================================
-- 2. CLIENTS B2B — Professionnels avec NIF/RCCM
-- ============================================================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pays VARCHAR(100) DEFAULT 'RDC';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS type_client VARCHAR(10) DEFAULT 'B2C'
  CHECK (type_client IN ('B2B', 'B2C'));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nif VARCHAR(50);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rccm VARCHAR(50);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assujetti_tva BOOLEAN DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS code_client VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_clients_type ON public.clients(type_client);
CREATE INDEX IF NOT EXISTS idx_clients_nif ON public.clients(nif);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_id);

-- ============================================================================
-- 3. ARTICLES — Amélioration avec TVA par défaut
-- ============================================================================
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS categorie VARCHAR(100);
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS tva_rate DECIMAL(5,2) DEFAULT 16.00;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS tva_exempt BOOLEAN DEFAULT false;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS unite_mesure VARCHAR(20) DEFAULT 'piece';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS stock DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_articles_company ON public.articles(company_id);
CREATE INDEX IF NOT EXISTS idx_articles_categorie ON public.articles(categorie);

-- Supprimer l'ancien CHECK pour groupe_tva qui est trop restrictif
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_groupe_tva_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_groupe_tva_check
  CHECK (groupe_tva IN ('A', 'B', 'C'));

-- ============================================================================
-- 4. FACTURE SERIES — Numérotation chronologique par série DGI
-- Série  | Usage                         | Format
-- F      | Factures normales             | F-2026-000001
-- A      | Avoirs (avoir)                | A-2026-000001
-- AV     | Acomptes (acomptes)           | AV-2026-000001
-- R      | Règlements (reçus)            | R-2026-000001
-- E      | Factures diverses / diverses  | E-2026-000001
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facture_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(5) NOT NULL CHECK (code IN ('F', 'A', 'AV', 'R', 'E')),
  label VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, code, year)
);

ALTER TABLE public.facture_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facture_series_all" ON public.facture_series FOR ALL TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_facture_series_company ON public.facture_series(company_id);

-- Seed series for each company (triggered on company creation)
CREATE OR REPLACE FUNCTION public.seed_facture_series()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.facture_series (company_id, code, label, prefix) VALUES
    (NEW.id, 'F',  'Factures normales',  'F'),
    (NEW.id, 'A',  'Avoirs',             'A'),
    (NEW.id, 'AV', 'Acomptes',           'AV'),
    (NEW.id, 'R',  'Reçus / Règlements', 'R'),
    (NEW.id, 'E',  'Divers',             'E');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. INVOICES — Table principale de facturation DGI
-- Cycle de vie: brouillon → validee → envoyee_dgi → acceptee_dgi / rejetee_dgi → archivee
-- ============================================================================
DROP TABLE IF EXISTS public.dgi_invoice_registry CASCADE;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Société
  company_id UUID NOT NULL REFERENCES public.companies(id),
  -- Numérotation
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  series_code VARCHAR(5) NOT NULL DEFAULT 'F'
    CHECK (series_code IN ('F', 'A', 'AV', 'R', 'E')),
  series_number INTEGER NOT NULL,       -- Numéro dans la série (année en cours)
  -- Type
  type VARCHAR(20) NOT NULL DEFAULT 'facture'
    CHECK (type IN ('facture', 'devis', 'avoir', 'acompte', 'proforma')),
  -- Client
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom VARCHAR(255),
  client_nif VARCHAR(50),
  client_rccm VARCHAR(50),
  client_adresse TEXT,
  client_ville VARCHAR(100),
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMP WITH TIME ZONE,
  -- Cycle de vie DGI
  status VARCHAR(20) NOT NULL DEFAULT 'brouillon'
    CHECK (status IN (
      'brouillon',       -- En cours d'édition
      'validee',         -- Validée en interne, prête pour DGI
      'envoyee_dgi',     -- Soumise à la DGI
      'acceptee_dgi',    -- Acceptée par la DGI
      'rejetee_dgi',     -- Rejetée par la DGI
      'archivee',        -- Archivée (fin de vie)
      'annulee'          -- Annulée / Supprimée
    )),
  dgi_status VARCHAR(20),               -- Détail statut DGI (pending, validated, rejected)
  dgi_reference VARCHAR(100),           -- Référence DGI retournée
  dgi_submitted_at TIMESTAMP WITH TIME ZONE,
  dgi_response JSONB,                   -- Réponse brute DGI
  -- Devise
  currency VARCHAR(3) NOT NULL DEFAULT 'USD'
    CHECK (currency IN ('USD', 'CDF', 'EUR')),
  -- Montants HT
  subtotal_ht DECIMAL(15,2) NOT NULL DEFAULT 0,     -- Total HT (hors TVA)
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  -- Calculs TVA détaillés
  tva_base_16 DECIMAL(15,2) DEFAULT 0,              -- Base soumise à 16%
  tva_amount_16 DECIMAL(15,2) DEFAULT 0,            -- TVA 16% calculée
  tva_base_0 DECIMAL(15,2) DEFAULT 0,               -- Base exonérée / 0%
  tva_amount_0 DECIMAL(15,2) DEFAULT 0,             -- TVA 0%
  tva_total DECIMAL(15,2) NOT NULL DEFAULT 0,       -- TVA totale
  -- Totaux
  total_ttc DECIMAL(15,2) NOT NULL DEFAULT 0,       -- TTC (subtotal_ht - discount + tva_total)
  acompte DECIMAL(15,2) DEFAULT 0,                   -- Acompte déjà versé
  tva_exigible DECIMAL(15,2) DEFAULT 0,              -- TVA à payer (tva_total - tva acompte)
  net_a_payer DECIMAL(15,2) NOT NULL DEFAULT 0,      -- Net à payer
  -- Métadonnées
  notes TEXT,
  conditions TEXT,
  reference TEXT,                                     -- Référence interne / bon de commande
  -- Liens
  parent_invoice_id UUID REFERENCES public.invoices(id),  -- Pour avoirs liés à facture
  converted_from_devis UUID,                             -- Devis converti en facture
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_all_crud" ON public.invoices FOR ALL TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_series ON public.invoices(series_code, series_number);

-- Trigger updated_at
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. INVOICE ITEMS — Lignes de facture avec TVA par ligne
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  -- Référence article (optionnel)
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  -- Description
  description TEXT NOT NULL,
  -- Quantités
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'piece',
  unit_price DECIMAL(15,2) NOT NULL,
  -- TVA par ligne
  tva_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00,     -- Taux TVA appliqué
  tva_exempt BOOLEAN DEFAULT false,
  -- Totaux ligne
  total_ht DECIMAL(15,2) NOT NULL,                   -- quantity * unit_price
  tva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,       -- total_ht * tva_rate / 100
  total_ttc DECIMAL(15,2) NOT NULL,                  -- total_ht + tva_amount
  -- Métadonnées
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_all_crud" ON public.invoice_items FOR ALL TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ============================================================================
-- 7. DGI TRANSMISSIONS — Suivi des envois DGI
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dgi_transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  -- Transmission
  dgi_reference VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected', 'error')),
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  -- Données
  payload_sent JSONB,                   -- Ce qui a été envoyé à la DGI
  response_received JSONB,              -- Réponse DGI
  error_message TEXT,
  -- Retry
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.dgi_transmissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgi_transmissions_all" ON public.dgi_transmissions FOR ALL TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_dgi_transmissions_invoice ON public.dgi_transmissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dgi_transmissions_status ON public.dgi_transmissions(status);

-- ============================================================================
-- 8. INVOICE HISTORY — Audit trail du cycle de vie
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,          -- created, validated, submitted_dgi, accepted_dgi, etc.
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  changes JSONB,                        -- Modifications détaillées (champs avant/après)
  metadata JSONB,                       -- Infos supplémentaires (IP, user-agent, etc.)
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_history_all" ON public.invoice_history FOR ALL TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice ON public.invoice_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_action ON public.invoice_history(action);

-- ============================================================================
-- 9. FONCTIONS — Génération de numéro de facture par série
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company_id UUID,
  p_series_code VARCHAR(5)
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
  v_series RECORD;
  v_result VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());

  -- Lock the series row to prevent race conditions
  SELECT * INTO v_series
  FROM public.facture_series
  WHERE company_id = p_company_id
    AND code = p_series_code
    AND year = v_year
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create series for this year if it doesn't exist
    INSERT INTO public.facture_series (company_id, code, label, year, prefix, current_number)
    VALUES (
      p_company_id,
      p_series_code,
      CASE p_series_code
        WHEN 'F' THEN 'Factures normales'
        WHEN 'A' THEN 'Avoirs'
        WHEN 'AV' THEN 'Acomptes'
        WHEN 'R' THEN 'Reçus / Règlements'
        WHEN 'E' THEN 'Divers'
      END,
      v_year,
      p_series_code,
      0
    )
    RETURNING * INTO v_series;
  END IF;

  v_next_number := COALESCE(v_series.current_number, 0) + 1;

  -- Format: F-2026-000001, AV-2026-000042, etc.
  v_result := UPPER(p_series_code) || '-' || v_year::TEXT || '-' ||
              LPAD(v_next_number::TEXT, 6, '0');

  -- Update counter
  UPDATE public.facture_series
  SET current_number = v_next_number,
      updated_at = NOW()
  WHERE id = v_series.id;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 10. FONCTIONS — Validation de facture (passe de brouillon → validee)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_invoice(p_invoice_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_has_items BOOLEAN;
BEGIN
  -- Check invoice exists
  SELECT * INTO v_invoice
  FROM public.invoices WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable' USING HINT = 'Invoice ID: %', p_invoice_id;
  END IF;

  IF v_invoice.status != 'brouillon' THEN
    RAISE EXCEPTION 'Seules les factures en brouillon peuvent être validées (statut actuel: %)', v_invoice.status;
  END IF;

  -- Check at least one item
  SELECT EXISTS(
    SELECT 1 FROM public.invoice_items WHERE invoice_id = p_invoice_id
  ) INTO v_has_items;

  IF NOT v_has_items THEN
    RAISE EXCEPTION 'La facture doit avoir au moins une ligne d''article';
  END IF;

  -- Validate client
  IF v_invoice.client_id IS NULL AND v_invoice.client_nom IS NULL THEN
    RAISE EXCEPTION 'La facture doit avoir un client';
  END IF;

  -- Update status
  UPDATE public.invoices SET
    status = 'validee',
    validated_at = NOW(),
    validated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  -- Log history
  INSERT INTO public.invoice_history (invoice_id, action, from_status, to_status, performed_by)
  VALUES (p_invoice_id, 'validated', 'brouillon', 'validee', p_user_id);

  RETURN true;
END;
$$;

-- ============================================================================
-- 11. FONCTIONS — Annulation de facture
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_invoice(p_invoice_id UUID, p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_old_status VARCHAR(20);
BEGIN
  SELECT * INTO v_invoice
  FROM public.invoices WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  -- Can't cancel an already cancelled or archived invoice
  IF v_invoice.status IN ('annulee', 'archivee') THEN
    RAISE EXCEPTION 'Impossible d''annuler une facture déjà %', v_invoice.status;
  END IF;

  v_old_status := v_invoice.status;

  UPDATE public.invoices SET
    status = 'annulee',
    notes = COALESCE(notes || E'\n', '') || 'ANNULÉE: ' || COALESCE(p_reason, 'Annulation manuelle'),
    updated_at = NOW()
  WHERE id = p_invoice_id;

  INSERT INTO public.invoice_history (invoice_id, action, from_status, to_status, metadata, performed_by)
  VALUES (
    p_invoice_id,
    'cancelled',
    v_old_status,
    'annulee',
    jsonb_build_object('reason', p_reason),
    p_user_id
  );

  RETURN true;
END;
$$;

-- ============================================================================
-- 12. FONCTIONS — Archiver une facture
-- ============================================================================
CREATE OR REPLACE FUNCTION public.archive_invoice(p_invoice_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  SELECT * INTO v_invoice
  FROM public.invoices WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  IF v_invoice.status NOT IN ('acceptee_dgi', 'annulee') THEN
    RAISE EXCEPTION 'Seules les factures acceptées par la DGI ou annulées peuvent être archivées (statut: %)', v_invoice.status;
  END IF;

  UPDATE public.invoices SET
    status = 'archivee',
    archived_at = NOW(),
    updated_at = NOW()
  WHERE id = p_invoice_id;

  INSERT INTO public.invoice_history (invoice_id, action, from_status, to_status, performed_by)
  VALUES (p_invoice_id, 'archived', v_invoice.status, 'archivee', p_user_id);

  RETURN true;
END;
$$;

-- ============================================================================
-- 13. FONCTIONS — Mise à jour des totaux TVA d'une facture
-- Calcule et met à jour les montants TVA depuis les lignes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals(p_invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal_ht DECIMAL(15,2) := 0;
  v_tva_base_16 DECIMAL(15,2) := 0;
  v_tva_amount_16 DECIMAL(15,2) := 0;
  v_tva_base_0 DECIMAL(15,2) := 0;
  v_tva_amount_0 DECIMAL(15,2) := 0;
  v_tva_total DECIMAL(15,2) := 0;
  v_total_ttc DECIMAL(15,2) := 0;
  v_discount_amount DECIMAL(15,2) := 0;
  v_acompte DECIMAL(15,2) := 0;
  v_invoice RECORD;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  -- Sum up item totals
  SELECT
    COALESCE(SUM(total_ht), 0),
    COALESCE(SUM(CASE WHEN tva_exempt = false AND tva_rate > 0 THEN total_ht ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tva_exempt = false AND tva_rate > 0 THEN tva_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tva_exempt = true OR tva_rate = 0 THEN total_ht ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tva_exempt = true OR tva_rate = 0 THEN tva_amount ELSE 0 END), 0),
    COALESCE(SUM(tva_amount), 0),
    COALESCE(SUM(total_ttc), 0)
  INTO
    v_subtotal_ht,
    v_tva_base_16,
    v_tva_amount_16,
    v_tva_base_0,
    v_tva_amount_0,
    v_tva_total,
    v_total_ttc
  FROM public.invoice_items
  WHERE invoice_id = p_invoice_id;

  -- Calculate discount
  IF v_invoice.discount_percent > 0 THEN
    v_discount_amount := ROUND(v_subtotal_ht * v_invoice.discount_percent / 100, 2);
  END IF;

  v_acompte := COALESCE(v_invoice.acompte, 0);

  -- Update invoice totals
  UPDATE public.invoices SET
    subtotal_ht = v_subtotal_ht,
    discount_amount = v_discount_amount,
    tva_base_16 = v_tva_base_16,
    tva_amount_16 = v_tva_amount_16,
    tva_base_0 = v_tva_base_0,
    tva_amount_0 = v_tva_amount_0,
    tva_total = v_tva_total,
    total_ttc = v_subtotal_ht - v_discount_amount + v_tva_total,
    tva_exigible = CASE
      WHEN v_acompte > 0 AND v_tva_total > 0
      THEN GREATEST(v_tva_total - ROUND(v_acompte * v_tva_total / v_subtotal_ht, 2), 0)
      ELSE v_tva_total
    END,
    net_a_payer = v_subtotal_ht - v_discount_amount + v_tva_total - v_acompte,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 14. TRIGGER — Auto-générer numéro de facture à l'insertion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := public.generate_invoice_number(
      NEW.company_id,
      COALESCE(NEW.series_code, 'F')
    );
    -- Extract the series_number from the generated invoice_number
    NEW.series_number := SPLIT_PART(SPLIT_PART(NEW.invoice_number, '-', 3), '-', 1)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_auto_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.auto_generate_invoice_number();

-- ============================================================================
-- 15. TRIGGER — Log history on status change
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.invoice_history (
      invoice_id, action, from_status, to_status, changes, performed_by
    ) VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'validee' THEN 'validated'
        WHEN 'envoyee_dgi' THEN 'submitted_dgi'
        WHEN 'acceptee_dgi' THEN 'accepted_dgi'
        WHEN 'rejetee_dgi' THEN 'rejected_dgi'
        WHEN 'archivee' THEN 'archived'
        WHEN 'annulee' THEN 'cancelled'
        ELSE 'status_changed'
      END,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE to_jsonb(OLD) ? key AND to_jsonb(OLD) ->> key IS DISTINCT FROM to_jsonb(NEW) ->> key
        )
      ),
      NEW.validated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_invoice_status_change ON public.invoices;
CREATE TRIGGER trg_log_invoice_status_change
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_status_change();

-- ============================================================================
-- 16. MIGRATION — Copier l'ancienne table factures vers invoices
-- Cette étape est manuelle : les données ne sont pas écrasées automatiquement
-- car le schéma est différent. On garde l'ancienne table pour référence.
-- ============================================================================

-- ============================================================================
-- 17. COMPANIES — Seed entreprise par défaut si aucune n'existe
-- ============================================================================
INSERT INTO public.companies (name, legal_name, alias, city, country, tva_regime, tva_rate)
SELECT 'FactureSmart', 'FactureSmart SARL', 'FACTURESMART', 'Kinshasa', 'RDC', 'normal', 16.00
WHERE NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1);

-- ============================================================================
-- 18. INDEX DE PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON public.invoices(status, issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created ON public.invoice_history(created_at);
CREATE INDEX IF NOT EXISTS idx_dgi_transmissions_history ON public.dgi_transmissions(created_at);

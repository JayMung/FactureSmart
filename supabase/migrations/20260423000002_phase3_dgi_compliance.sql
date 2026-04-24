-- ============================================================================
-- Phase 3: DGI Compliance - Invoice Types & API Integration
-- FactureSmart-DGI Plan Directeur
-- Date: 2026-04-23
-- ============================================================================
--
-- This migration adds:
--   1. DGI invoice type codes (FV/EV/FT/ET/FA/EA) to factures table
--   2. Article-level TVA group support for line-item compliance
--   3. DGI submission tracking in dgi_invoice_registry
--   4. Indexes for DGI query performance
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add DGI invoice type code to factures
-- ============================================================================
-- DGI invoice type codes (RDC):
--   FV = Facture de Vente (standard sales invoice)
--   EV = Facture d'Avoir (credit note - goods/services returned)
--   FT = Facture de Travail (service or labor invoice)
--   ET = Export Tax invoice
--   FA = Facture d'Acompte (advance payment invoice)
--   EA = Facture Encaissement Anticipé (cash/advance receipt)

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS type_facture_dgi VARCHAR(10)
    DEFAULT 'FV'
    CHECK (type_facture_dgi IN ('FV', 'EV', 'FT', 'ET', 'FA', 'EA'));

-- ============================================================================
-- PART 2: Add article-level TVA group for line-item compliance
-- ============================================================================

ALTER TABLE public.facture_items
  ADD COLUMN IF NOT EXISTS groupe_tva CHAR(1)
    DEFAULT 'C'
    CHECK (groupe_tva IN ('A', 'B', 'C'));

-- ============================================================================
-- PART 3: Add dgi_submission_id to track external DGI API submissions
-- ============================================================================

ALTER TABLE public.dgi_invoice_registry
  ADD COLUMN IF NOT EXISTS dgi_api_response JSONB,
  ADD COLUMN IF NOT EXISTS dgi_signature VARCHAR(100),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_endpoint VARCHAR(255);

-- ============================================================================
-- PART 4: Add missing columns to dgi_invoice_registry for full audit trail
-- ============================================================================

ALTER TABLE public.dgi_invoice_registry
  ADD COLUMN IF NOT EXISTS type_facture_dgi VARCHAR(10)
    DEFAULT 'FV'
    CHECK (type_facture_dgi IN ('FV', 'EV', 'FT', 'ET', 'FA', 'EA')),
  ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_nif VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_adresse VARCHAR(500),
  ADD COLUMN IF NOT EXISTS client_telephone VARCHAR(50);

-- ============================================================================
-- PART 5: Indexes for DGI query performance
-- ============================================================================

-- Index for fetching DGI invoices by month (for monthly declarations)
CREATE INDEX IF NOT EXISTS idx_dgi_invoice_date_facture
  ON public.dgi_invoice_registry(date_facture DESC);

-- Index for fetching DGI invoices by status
CREATE INDEX IF NOT EXISTS idx_dgi_invoice_statut
  ON public.dgi_invoice_registry(statut);

-- Index for fetching DGI invoices by declaration
CREATE INDEX IF NOT EXISTS idx_dgi_invoice_declaration
  ON public.dgi_invoice_registry(declaration_id)
  WHERE declaration_id IS NOT NULL;

-- Index for fetching DGI invoices by type
CREATE INDEX IF NOT EXISTS idx_dgi_invoice_type
  ON public.dgi_invoice_registry(type_facture_dgi);

-- Index for facture_items by TVA group
CREATE INDEX IF NOT EXISTS idx_facture_items_groupe_tva
  ON public.facture_items(groupe_tva);

-- ============================================================================
-- PART 6: Create DGI declarations table if not exists
-- (for monthly/quarterly VAT declarations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dgi_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declarant_id UUID REFERENCES public.declarants(id) ON DELETE CASCADE,
  -- Period
  mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee INTEGER NOT NULL,
  -- Document counts by type
  nombre_fv INTEGER DEFAULT 0,
  nombre_ev INTEGER DEFAULT 0,
  nombre_ft INTEGER DEFAULT 0,
  nombre_et INTEGER DEFAULT 0,
  nombre_fa INTEGER DEFAULT 0,
  nombre_ea INTEGER DEFAULT 0,
  nombre_total INTEGER DEFAULT 0,
  -- Financial totals
  total_htva DECIMAL(15,2) DEFAULT 0,
  total_tva_a DECIMAL(15,2) DEFAULT 0,
  total_tva_b DECIMAL(15,2) DEFAULT 0,
  total_tva_c DECIMAL(15,2) DEFAULT 0,
  total_tva DECIMAL(15,2) DEFAULT 0,
  total_ttc DECIMAL(15,2) DEFAULT 0,
  -- Status
  statut VARCHAR(20) DEFAULT 'draft'
    CHECK (statut IN ('draft', 'submitted', 'validated', 'rejected')),
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(declarant_id, mois, annee)
);

ALTER TABLE public.dgi_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgi_declarations_admin_all" ON public.dgi_declarations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin'))
);

CREATE INDEX IF NOT EXISTS idx_dgi_declarations_period
  ON public.dgi_declarations(annee DESC, mois DESC);

CREATE INDEX IF NOT EXISTS idx_dgi_declarations_declarant
  ON public.dgi_declarations(declarant_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS dgi_declarations_updated_at ON public.dgi_declarations;
CREATE TRIGGER dgi_declarations_updated_at
  BEFORE UPDATE ON public.dgi_declarations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 7: Create DGI API keys table for DGI API authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dgi_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  dgi_api_url VARCHAR(255) NOT NULL,
  dgi_api_key VARCHAR(255) NOT NULL,
  dgi_api_secret VARCHAR(255),
  is_production BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dgi_api_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgi_api_config_admin_all" ON public.dgi_api_config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin'))
);

-- ============================================================================
-- PART 8: Update trigger for dgi_invoice_registry
-- ============================================================================

DROP TRIGGER IF EXISTS dgi_invoice_registry_updated_at ON public.dgi_invoice_registry;
CREATE TRIGGER dgi_invoice_registry_updated_at
  BEFORE UPDATE ON public.dgi_invoice_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;

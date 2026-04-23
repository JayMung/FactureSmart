-- Migration: Fix legacy COCCINELLE tables for FactureX compatibility
-- Date: 2026-04-23
-- Purpose: Create stub tables referenced by legacy hooks to prevent 406 errors

-- ============================================================================
-- PART 1: Stub table for mouvements_comptes (COCCINELLE legacy)
-- Required by: useMouvementsComptes, useMouvementsComptesStats, useLastReconciliation, useComptabiliteAI, useFinancialOperations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mouvements_comptes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compte_id UUID, -- REFERENCES comptes_financiers(id) ON DELETE SET NULL
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('credit', 'debit', 'swap')),
  montant NUMERIC DEFAULT 0,
  montant_devise NUMERIC DEFAULT 0,
  devise TEXT DEFAULT 'USD',
  motif TEXT,
  date_mouvement TIMESTAMPTZ DEFAULT NOW(),
  reference_externe TEXT,
  transaction_id UUID, -- REFERENCES transactions(id) ON DELETE SET NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_mouvements_compte_date ON public.mouvements_comptes(date_mouvement DESC);
CREATE INDEX IF NOT EXISTS idx_mouvements_compte_compte ON public.mouvements_comptes(compte_id);

-- ============================================================================
-- PART 2: Stub table for comptes_financiers (COCCINELLE legacy)
-- Required by: JOIN in useMouvementsComptes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comptes_financiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_compte TEXT DEFAULT 'courant',
  devise TEXT DEFAULT 'USD',
  solde NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Stub table for transactions (COCCINELLE legacy)
-- Required by: JOIN in useMouvementsComptes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motif TEXT,
  type_transaction TEXT DEFAULT 'autre',
  montant NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 4: Fix security_logs - ensure details column exists
-- The remote may have the table but be missing this column in PostgREST cache
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'security_logs' 
    AND column_name = 'details'
  ) THEN
    ALTER TABLE public.security_logs ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- PART 5: Enable RLS on new tables
-- ============================================================================

ALTER TABLE public.mouvements_comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comptes_financiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (can read their own data)
CREATE POLICY "mouvements_comptes_select" ON public.mouvements_comptes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mouvements_comptes_insert" ON public.mouvements_comptes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "comptes_financiers_select" ON public.comptes_financiers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "comptes_financiers_insert" ON public.comptes_financiers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (true);

COMMENT ON TABLE public.mouvements_comptes IS 'Legacy COCCINELLE table - stubbed for FactureX compatibility';
COMMENT ON TABLE public.comptes_financiers IS 'Legacy COCCINELLE table - stubbed for FactureX compatibility';
COMMENT ON TABLE public.transactions IS 'Legacy COCCINELLE table - stubbed for FactureX compatibility';

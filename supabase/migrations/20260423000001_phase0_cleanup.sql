-- ============================================================================
-- Phase 0: Codebase & DB Foundation Cleanup
-- FactureSmart-DGI Plan Directeur
-- Date: 2026-04-23
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add DGI columns to factures
-- ============================================================================

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS type_dgi VARCHAR(20) DEFAULT 'standard' CHECK (type_dgi IN ('standard', 'simplifie', 'normal')),
  ADD COLUMN IF NOT EXISTS groupe_tva CHAR(1) DEFAULT 'C' CHECK (groupe_tva IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS montant_ht DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_tva DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_ttc DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_dgi VARCHAR(50),
  ADD COLUMN IF NOT EXISTS code_auth VARCHAR(100),
  ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

-- Update existing factures to calculate HT/TVA/TTC from existing subtotal/frais
UPDATE public.factures
SET
  montant_ht = subtotal,
  montant_tva = COALESCE(frais, 0),
  montant_ttc = total_general
WHERE montant_ht IS NULL OR montant_ht = 0;

-- ============================================================================
-- PART 2: Create transactions table (simplified, no CNY, no swap)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  motif TEXT,
  type_transaction TEXT DEFAULT 'revenue' CHECK (type_transaction IN ('revenue', 'depense', 'transfert')),
  montant DECIMAL(15,2) NOT NULL DEFAULT 0,
  devise VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (devise IN ('USD', 'CDF')),
  mode_paiement VARCHAR(50),
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'annule')),
  frais DECIMAL(10,2) DEFAULT 0,
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_all_crud" ON public.transactions FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date_paiement DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON public.transactions(client_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 3: Simplify profiles to 3 roles (admin, comptable, caissier)
-- ============================================================================

-- Update existing 'operateur' and 'super_admin' roles to 'caissier' and 'admin' respectively
UPDATE public.profiles
SET role = 'caissier'
WHERE role IN ('operateur', 'caissier');

UPDATE public.profiles
SET role = 'admin'
WHERE role IN ('super_admin', 'admin');

-- Update check constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'comptable', 'caissier'));

-- ============================================================================
-- PART 4: Remove CNY from factures devise check
-- ============================================================================

ALTER TABLE public.factures
  DROP CONSTRAINT IF EXISTS factures_devise_check,
  ADD CONSTRAINT factures_devise_check
  CHECK (devise IN ('USD', 'CDF'));

-- ============================================================================
-- PART 5: Drop obsolete tables
-- ============================================================================

DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.security_logs CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;

-- ============================================================================
-- PART 6: Update trigger for new user (simplified, 3 roles)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'caissier';
  END IF;

  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, assigned_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: Create index on articles for POS lookup
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_articles_code_barres ON public.articles(code_barres);

COMMIT;

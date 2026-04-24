-- Migration: Phase 1 — Fondations & Auth (COD-31)
-- Date: 2026-04-24
-- Sprint 1 Kickoff: https://multica.io/issue/55067a7f-c3c0-4ea7-8c45-9851a18c517e
-- Tables: companies, nif_verification, user_invitations, onboarding_progress
-- Stack: React + Supabase (local dev)

-- ============================================
-- COMPANIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rccm VARCHAR(100),
  id_nat VARCHAR(100),
  nif VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  logo_url TEXT,
  -- Géographie RDC
  province VARCHAR(100) DEFAULT 'Kinshasa',
  ville VARCHAR(100) DEFAULT 'Kinshasa',
  -- Statut vérification DGI
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Users can read their own company; admins can read all
CREATE POLICY "companies_self_read" ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "companies_self_insert" ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "companies_self_update" ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_nif ON public.companies(nif);

-- ============================================
-- NIF VERIFICATION
-- ============================================
CREATE TABLE IF NOT EXISTS public.nif_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nif VARCHAR(100) NOT NULL,
  -- Statut: pending | verifying | verified | rejected
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'rejected')),
  -- Réponse brute DGI (mock ou réelle)
  dgi_response JSONB DEFAULT '{}',
  -- Détails vérification
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

ALTER TABLE public.nif_verification ENABLE ROW LEVEL SECURITY;

-- Users can read/insert their own verification; admins can manage all
CREATE POLICY "nif_verification_self_read" ON public.nif_verification FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = nif_verification.company_id
    AND companies.user_id = auth.uid()
  ));

CREATE POLICY "nif_verification_self_insert" ON public.nif_verification FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = company_id
    AND companies.user_id = auth.uid()
  ));

CREATE POLICY "nif_verification_self_update" ON public.nif_verification FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = company_id
    AND companies.user_id = auth.uid()
  ));

CREATE POLICY "nif_verification_admin_all" ON public.nif_verification FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  ));

CREATE INDEX idx_nif_verification_company_id ON public.nif_verification(company_id);
CREATE INDEX idx_nif_verification_nif ON public.nif_verification(nif);

-- ============================================
-- USER INVITATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'operateur' CHECK (role IN ('admin', 'comptable', 'operateur', 'caissier')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  -- Token unique pour le lien d'invitation
  token VARCHAR(255) UNIQUE NOT NULL,
  -- Expiration du token (7 jours)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  -- Acceptation
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations for their company
CREATE POLICY "user_invitations_admin_all" ON public.user_invitations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.companies
    JOIN public.profiles ON profiles.id = companies.user_id
    WHERE companies.id = user_invitations.company_id
    AND companies.user_id = auth.uid()
    AND profiles.role = 'super_admin'
  ));

-- Invited users can accept (read their invitation by email/token)
CREATE POLICY "user_invitations_accept_read" ON public.user_invitations FOR SELECT
  USING (
    accepted_at IS NULL
    AND expires_at > NOW()
    AND auth.uid() IS NOT NULL
  );

CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_company_id ON public.user_invitations(company_id);

-- ============================================
-- ONBOARDING PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Étapes: step_company | step_nif | step_verification | step_onboarding | step_complete
  step_key VARCHAR(50) NOT NULL,
  -- Métadonnées step (données collectées à cette étape)
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_key)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_progress_self_all" ON public.onboarding_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "onboarding_progress_admin_read" ON public.onboarding_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  ));

CREATE INDEX idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_step ON public.onboarding_progress(step_key);

-- ============================================
-- TRIGGER: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER nif_verification_updated_at
  BEFORE UPDATE ON public.nif_verification
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SEED: Invite link generator function
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

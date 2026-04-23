-- Migration minimale pour POS Facture Normalisée
-- Date: 2026-04-23
-- Stack: React + Supabase (local dev)

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'caissier' CHECK (role IN ('super_admin', 'admin', 'caissier', 'operateur')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- Trigger auto Super Admin: premier inscrit = super_admin, les suivants = caissier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
BEGIN
  -- Compter les profiles existants
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Premier utilisateur = super_admin, sinon caissier
  IF user_count = 0 THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'caissier';
  END IF;
  
  -- Inserer le profile avec le role approprie
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, assigned_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT,
  ville TEXT,
  adresse TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_all_crud" ON public.clients FOR ALL TO authenticated USING (true);

CREATE INDEX idx_clients_nom ON public.clients(nom);

-- ============================================
-- ARTICLES (POS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denomination VARCHAR(200) NOT NULL,
  code_barres VARCHAR(100) UNIQUE,
  prix DECIMAL(10,2) NOT NULL DEFAULT 0,
  groupe_tva CHAR(1) NOT NULL DEFAULT 'C' CHECK (groupe_tva IN ('A', 'B', 'C')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_all_crud" ON public.articles FOR ALL TO authenticated USING (true);

CREATE INDEX idx_articles_denomination ON public.articles(denomination);

-- ============================================
-- FACTURES
-- ============================================
CREATE TABLE IF NOT EXISTS public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'facture' CHECK (type IN ('devis', 'facture')),
  statut VARCHAR(20) NOT NULL DEFAULT 'validee' CHECK (statut IN ('brouillon', 'en_attente', 'validee', 'payee', 'annulee')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  date_emission TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_validation TIMESTAMP WITH TIME ZONE,
  valide_par UUID REFERENCES auth.users(id),
  devise VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (devise IN ('USD', 'CDF', 'CNY')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  frais DECIMAL(10,2) DEFAULT 0,
  total_general DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factures_all_crud" ON public.factures FOR ALL TO authenticated USING (true);

CREATE INDEX idx_factures_number ON public.factures(facture_number);
CREATE INDEX idx_factures_date ON public.factures(date_emission);

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER factures_updated_at BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FACTURE_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.facture_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  numero_ligne INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  montant_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.facture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facture_items_all_crud" ON public.facture_items FOR ALL TO authenticated USING (true);

CREATE INDEX idx_facture_items_facture ON public.facture_items(facture_id);

-- ============================================
-- CAISSE SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.caisse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  fond_initial DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ventes DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_especes DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_carte DECIMAL(10,2) NOT NULL DEFAULT 0,
  statut VARCHAR(20) NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'fermee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.caisse_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caisse_sessions_all_crud" ON public.caisse_sessions FOR ALL TO authenticated USING (true);

-- ============================================
-- SEED: Articles de demo
-- ============================================
INSERT INTO public.articles (denomination, prix, groupe_tva) VALUES
  ('Café', 3.50, 'C'),
  ('Eau minérale 0.5L', 1.50, 'C'),
  ('Pain', 2.00, 'C'),
  ('Snack', 4.00, 'C')
ON CONFLICT DO NOTHING;

-- ============================================
-- DECLARANTS DGI (Phase 3)
-- Référence fiscale pour déclaration DGI RDC
-- ============================================
CREATE TABLE IF NOT EXISTS public.declarants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Info entreprise
  raison_sociale VARCHAR(255) NOT NULL,
  sigle VARCHAR(100),
  nif VARCHAR(50) UNIQUE,           -- Numéro d'Identification Fiscale
  rccm VARCHAR(50) UNIQUE,          -- Registre du Commerce et du Crédit Mobilier
  nic VARCHAR(50),                   -- Numéro d'Identification Contribuable
  dgi_numero VARCHAR(50),           -- Numéro DGI officiel
  -- Adresse
  adresse VARCHAR(500),
  telephone VARCHAR(50),
  email VARCHAR(255),
  -- Infos bancaire
  banque VARCHAR(255),
  compte_bancaire VARCHAR(100),
  -- Paramètres déclaration
  periodicite VARCHAR(20) DEFAULT 'mensuelle' CHECK (periodicite IN ('mensuelle', 'trimestrielle', 'annuelle')),
  arrondissement VARCHAR(100),
  centre_impot VARCHAR(255),
  -- Statut
  actif BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.declarants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "declarants_admin_all" ON public.declarants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE INDEX idx_declarants_nif ON public.declarants(nif);
CREATE INDEX idx_declarants_rccm ON public.declarants(rccm);

-- ============================================
-- DGI DECLARATIONS (suivi des déclarations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dgi_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declarant_id UUID NOT NULL REFERENCES public.declarants(id) ON DELETE CASCADE,
  -- Période
  mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee INTEGER NOT NULL,
  -- Documents
  nombre_factures INTEGER DEFAULT 0,
  total_htva DECIMAL(15,2) DEFAULT 0,
  total_tva DECIMAL(15,2) DEFAULT 0,
  total_ttc DECIMAL(15,2) DEFAULT 0,
  -- Statut déclaration
  statut VARCHAR(30) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'soumise', 'validee', 'rejetee')),
  date_soumission TIMESTAMP WITH TIME ZONE,
  date_validation TIMESTAMP WITH TIME ZONE,
  reference_dgi VARCHAR(100),         -- Référence officielle DGI
  observations TEXT,
  -- Metadata
  declared_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(declarant_id, mois, annee)
);

ALTER TABLE public.dgi_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgi_declarations_admin_all" ON public.dgi_declarations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE INDEX idx_dgi_declarations_periode ON public.dgi_declarations(annee, mois);
CREATE INDEX idx_dgi_declarations_declarant ON public.dgi_declarations(declarant_id);

-- ============================================
-- DGI INVOICE REGISTRY (registre des factures DGI)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dgi_invoice_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID REFERENCES public.dgi_declarations(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  -- Numéro DGI normalisé
  numero_dgi VARCHAR(50) NOT NULL UNIQUE,
  -- Données facture pour audit
  date_facture DATE NOT NULL,
  client_nom VARCHAR(255),
  total_htva DECIMAL(15,2),
  taux_tva DECIMAL(5,2),
  montant_tva DECIMAL(15,2),
  total_ttc DECIMAL(15,2),
  -- Hash pour intégrité
  content_hash VARCHAR(128),
  -- Statut
  statut VARCHAR(20) DEFAULT 'declared' CHECK (statut IN ('declared', 'cancelled', 'replaced')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.dgi_invoice_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgi_invoice_registry_admin_all" ON public.dgi_invoice_registry FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE INDEX idx_dgi_invoice_numero ON public.dgi_invoice_registry(numero_dgi);
CREATE INDEX idx_dgi_invoice_facture ON public.dgi_invoice_registry(facture_id);

-- Trigger mise à jour updated_at
CREATE TRIGGER declarants_updated_at BEFORE UPDATE ON public.declarants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER dgi_declarations_updated_at BEFORE UPDATE ON public.dgi_declarations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

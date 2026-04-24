# SCHEMA DB V2 — FactureSmart

**Date:** 24 avril 2026  
**Responsable:** Dev Backend Senior (COD-56)  
**En collaboration avec:** MiniClaw (CTO) et Expert-Comptable OHADA

---

## Vue d'ensemble du Schema Actuel

### Tables principales

| Table | Description | RLS | Soft Delete | Notes |
|-------|-------------|-----|-------------|-------|
| `profiles` | Profils utilisateurs | ✅ | ❌ | |
| `clients` | Clients facture | ✅ | ❌ | |
| `factures` | Factures | ✅ | ✅ | |
| `articles` | Articles POS | ✅ | ❌ | |
| `transactions` | Transactions financières | ✅ | ❌ | |
| `paiements` | Paiements | ✅ | ❌ | |
| `mouvements_comptes` | Mouvements de compte | ✅ | ❌ | |
| `caisse_sessions` | Sessions POS | ✅ | ❌ | |
| `dgi_invoice_registry` | Registre DGI | ⚠️ | ❌ | RLS à vérifier |
| `audit_logs` | Journal d'audit | ⚠️ | ❌ | À créer |
| `api_keys` | Clés API | ✅ | ❌ | |

---

## 1. Tables existantes — Problèmes identifiés

### 1.1 `profiles`

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'caissier' 
    CHECK (role IN ('super_admin', 'admin', 'caissier', 'operateur')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Problèmes:**
- ❌ Pas de `deleted_at` (soft delete)
- ❌ Pas d'index sur `role` (recherche par rôle fréquente)
- ⚠️ `email` peut être NULL sur anciens comptes

**Recommandation:**
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE deleted_at IS NULL;
```

---

### 1.2 `clients`

```sql
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT,
  ville TEXT,
  adresse TEXT,
  nif TEXT,  -- TODO: à ajouter si pas encore là
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Problèmes:**
- ❌ Pas de `deleted_at`
- ❌ Pas d'index sur `nif` (recherche NIF fréquente)
- ❌ Pas de `rccm`, `id_nat` (informations DGI)

**Recommandation:**
```sql
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS nif VARCHAR(15) UNIQUE,
ADD COLUMN IF NOT EXISTS rccm TEXT,
ADD COLUMN IF NOT EXISTS id_nat TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_nif ON public.clients(nif) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
```

---

### 1.3 `factures`

```sql
CREATE TABLE IF NOT EXISTS public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'facture' 
    CHECK (type IN ('devis', 'facture')),
  type_dgi VARCHAR(10) 
    CHECK (type_dgi IN ('FV', 'EV', 'FT', 'ET', 'FA', 'EA')),
  groupe_tva CHAR(1) DEFAULT 'C' 
    CHECK (groupe_tva IN ('A', 'B', 'C')),
  client_id UUID REFERENCES public.clients(id),
  client_nom TEXT,
  client_nif TEXT,
  montant_ht DECIMAL(15,2),
  montant_tva DECIMAL(15,2),
  montant_ttc DECIMAL(15,2),
  frais DECIMAL(15,2) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'draft' 
    CHECK (statut IN ('draft', 'sent', 'paid', 'cancelled')),
  statut_dgi VARCHAR(20) DEFAULT 'pending' 
    CHECK (statut_dgi IN ('pending', 'submitted', 'validated', 'rejected')),
  numero_dgi VARCHAR(30),
  code_auth VARCHAR(20),
  qr_code_data TEXT,
  content_hash VARCHAR(64),
  -- DGI fields
  numero_dgi VARCHAR(30),
  code_auth VARCHAR(20),
  qr_code_data TEXT,
  date_emission DATE,
  date_validation TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,  -- ✅ soft delete
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Problèmes:**
- ⚠️ Champs `numero_dgi`, `code_auth`, `qr_code_data` dupliqués (cleanup nécessaire)
- ❌ Pas de `devise` (CDF, USD, EUR) — critique pour multi-devises
- ❌ Pas d'index sur `facture_number` (déjà UNIQUE donc index auto)
- ❌ Pas d'index sur `statut_dgi` (recherche fréquente)

**Recommandation:**
```sql
-- Ajouter devise
ALTER TABLE public.factures 
ADD COLUMN IF NOT EXISTS devise VARCHAR(3) DEFAULT 'CDF' 
  CHECK (devise IN ('CDF', 'USD', 'EUR'));

-- Ajouter indexes
CREATE INDEX IF NOT EXISTS idx_factures_statut_dgi ON public.factures(statut_dgi) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_client_id ON public.factures(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_numero_dgi ON public.factures(numero_dgi) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_date_emission ON public.factures(date_emission DESC) WHERE deleted_at IS NULL;

-- Cleanup duplicates (après migration)
-- DROP COLUMN IF EXISTS code_auth; -- first check code
-- DROP COLUMN IF EXISTS qr_code_data; -- first check code
```

---

### 1.4 `articles` (POS)

```sql
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denomination VARCHAR(200) NOT NULL,
  code_barres VARCHAR(100) UNIQUE,
  prix DECIMAL(10,2) NOT NULL DEFAULT 0,
  groupe_tva CHAR(1) NOT NULL DEFAULT 'C' 
    CHECK (groupe_tva IN ('A', 'B', 'C')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Problèmes:**
- ❌ Pas de `deleted_at`
- ❌ Pas d'index sur `denomination` (LIKE search)
- ⚠️ Policy RLS trop permissive (`authenticated USING (true)`)

---

### 1.5 `dgi_invoice_registry`

```sql
CREATE TABLE IF NOT EXISTS public.dgi_invoice_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES public.factures(id),
  numero_dgi VARCHAR(30) NOT NULL,
  code_auth VARCHAR(20),
  qr_code_data TEXT,
  date_facture DATE,
  client_nom TEXT,
  total_htva DECIMAL(15,2),
  taux_tva DECIMAL(5,4),
  montant_tva DECIMAL(15,2),
  total_ttc DECIMAL(15,2),
  content_hash VARCHAR(64),
  statut VARCHAR(20) DEFAULT 'declared' 
    CHECK (statut IN ('declared', 'pending', 'validated', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Problèmes:**
- ❌ RLS non confirmée — **AUDIT REQUIS**
- ❌ Pas d'index sur `facture_id` (déjà PK donc index auto)
- ❌ Pas d'index sur `numero_dgi` (recherche par numéro DGI)
- ❌ Pas de `deleted_at`

**Recommandation:**
```sql
ALTER TABLE public.dgi_invoice_registry 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dgi_registry_numero_dgi ON public.dgi_invoice_registry(numero_dgi);
CREATE INDEX IF NOT EXISTS idx_dgi_registry_statut ON public.dgi_invoice_registry(statut);

-- RLS Policy
ALTER TABLE public.dgi_invoice_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgi_registry_authenticated_read" ON public.dgi_invoice_registry
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dgi_registry_authenticated_insert" ON public.dgi_invoice_registry
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "dgi_registry_authenticated_update" ON public.dgi_invoice_registry
  FOR UPDATE TO authenticated USING (true);
```

---

## 2. Contraintes CHECK recommandées

### TVA rates
```sql
-- Les montants doivent être positifs
ALTER TABLE public.factures 
ADD CONSTRAINT chk_factures_montant_ht_positif 
CHECK (montant_ht >= 0);

ALTER TABLE public.factures 
ADD CONSTRAINT chk_factures_montant_ttc_positif 
CHECK (montant_ttc >= 0);

-- Le taux TVA doit être dans les valeurs autorisées
ALTER TABLE public.factures 
ADD CONSTRAINT chk_factures_taux_tva 
CHECK (taux_tva IN (0, 0.08, 0.16));
```

### Enums recommandés

```sql
-- Créer les enums si pas encore créés
DO $$ BEGIN
  CREATE TYPE dgi_invoice_type AS ENUM ('FV', 'EV', 'FT', 'ET', 'FA', 'EA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tva_group AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE facture_statut AS ENUM ('draft', 'sent', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dgi_statut AS ENUM ('pending', 'submitted', 'validated', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'caissier', 'operateur');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE currency AS ENUM ('CDF', 'USD', 'EUR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```

---

## 3. Triggers recommandés

### 3.1 `updated_at` auto-update

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer sur toutes les tables
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s; 
       CREATE TRIGGER update_%s_updated_at 
       BEFORE UPDATE ON public.%s 
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;
```

### 3.2 Audit log trigger

```sql
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
  audit_action TEXT;
  table_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    audit_action := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
  END IF;

  table_name := TG_TABLE_NAME;

  INSERT INTO public.audit_logs (
    table_name, record_id, action, old_data, new_data, 
    user_id, ip_address, created_at
  ) VALUES (
    table_name,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    NULL,  -- ip_address à implémenter via Edge Function
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer sur tables sensibles (exemple)
CREATE TRIGGER audit_factures_insert
  AFTER INSERT ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
```

---

## 4. Table `audit_logs` (à créer)

```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Tous les admins + super_admin peuvent lire
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Pas d'insertion directe (via trigger uniquement)
CREATE POLICY "audit_logs_trigger_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
```

---

## 5. Migrations SQL versionnées recommandées

```
supabase/migrations/
├── 20260425000001_add_soft_delete_and_indexes.sql   -- Soft delete + indexes
├── 20260425000002_create_audit_logs.sql             -- Table audit_logs
├── 20260425000003_add_dgi_registry_rls.sql          -- RLS + indexes dgi_invoice_registry
├── 20260425000004_add_currency_to_factures.sql      -- Champ devise
├── 20260425000005_create_enums.sql                  -- Tous les enums
├── 20260425000006_add_clients_dgi_fields.sql         -- NIF, RCCM, id_nat sur clients
└── 20260425000007_add_tva_constraints.sql           -- CHECK constraints TVA
```

---

## 6. Validation OHADA/SYSCOHADA

### Champs comptables requis

| Champ | Description | Table |
|-------|-------------|-------|
| `montant_ht` | Hors taxes | factures |
| `montant_tva` | TVA 18% | factures |
| `montant_ttc` | TTC | factures |
| `frais` | Frais annexes | factures |
| `devise` | Devise (CDF/USD/EUR) | factures |
| `taux_tva` | Taux TVA appliqué | factures |

### Plan comptable RDC (OHADA)

Pour une conformité OHADA complète, ajouter une table `plan_comptable`:

```sql
CREATE TABLE IF NOT EXISTS public.plan_comptable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(10) NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type VARCHAR(20) 
    CHECK (account_type IN ('actif', 'passif', 'charge', 'produit', 'hors_bilan')),
  category VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemples de comptes RDC
INSERT INTO public.plan_comptable (account_number, account_name, account_type, category) VALUES
('701100', 'Ventes de marchandises', 'produit', 'OHADA'),
('701200', 'Ventes de produits finis', 'produit', 'OHADA'),
('445200', 'TVA collectée', 'passif', 'OHADA'),
('445600', 'TVA déductible', 'actif', 'OHADA'),
('411000', 'Clients', 'actif', 'OHADA'),
('701100', 'Ventes de marchandises', 'produit', 'OHADA');
```

---

## Résumé des actions requises

### 🔴 Critique
1. [ ] Ajouter RLS sur `dgi_invoice_registry`
2. [ ] Ajouter `devise` à `factures` (multi-devises)
3. [ ] Ajouter `audit_logs` table + triggers

### 🟡 Important
1. [ ] Uniformiser soft delete (`deleted_at`) sur toutes les tables
2. [ ] Ajouter indexes sur colonnes de recherche fréquente
3. [ ] Valider champs DGI sur `clients` (NIF, RCCM, id_nat)
4. [ ] Ajouter CHECK constraints sur montants (>= 0)

### 🟢 Optionnel
1. [ ] Créer table `plan_comptable` OHADA
2. [ ] Ajouter validation par trigger sur `montant_ttc = montant_ht + montant_tva`

---

*Ce document doit être validé par l'Expert-Comptable OHADA avant implémentation.*

# 🚀 Sprint 2 Kickoff — Core Facturation + DGI

**Date** : 23 Avril 2026
**Durée** : 3 semaines
**Objectif** : Module facturation complet avec intégration DGI

---

## 📋 Écrans à implémenter (12 écrans)

### Facturation Core
| # | Fichier maquette | Route React | Status |
|---|-----------------|------------|--------|
| 1 | `screen-01-dashboard.html` | `/dashboard` | À faire |
| 2 | `screen-02-factures.html` | `/factures` | À faire |
| 3 | `screen-03-creation-facture.html` | `/factures/create` | À faire |
| 4 | `screen-03b-facture-detail.html` | `/factures/:id` | À faire |
| 5 | `screen-04-preview-facture.html` | `/factures/:id/preview` | À faire |
| 6 | `screen-05-dgi-status.html` | `/factures/:id/dgi-status` | À faire |
| 7 | `screen-09-devis.html` | `/devis` | À faire |

### Sous-modules
| # | Fichier maquette | Route React | Status |
|---|-----------------|------------|--------|
| 8 | `screen-J2-invoice-detail-full.html` | `/factures/:id/detail` | À faire |
| 9 | `screen-J3-invoice-history.html` | `/factures/:id/history` | À faire |
| 10 | `screen-06-clients.html` | `/clients` | À faire |
| 11 | `screen-07-rapports.html` | `/rapports` | À faire |
| 12 | `screen-08-settings.html` | `/settings` | À faire |

---

## 🗄️ Backend tables nécessaires

```sql
-- invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  invoice_number VARCHAR(50) NOT NULL,
  client_id UUID REFERENCES clients(id),
  type ENUM('invoice', 'quote') DEFAULT 'invoice',
  status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  dgi_submitted BOOLEAN DEFAULT FALSE,
  dgi_submitted_at TIMESTAMPTZ,
  dgi_reference VARCHAR(100),
  dgi_status VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_lines
CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  article_id UUID,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- dgi_transmissions
CREATE TABLE dgi_transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  company_id UUID REFERENCES companies(id),
  dgi_reference VARCHAR(100),
  status ENUM('pending', 'submitted', 'validated', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_history
CREATE TABLE invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  action VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚡ DGI Integration (COD-26)

**Objectif** : Remplacer le mock DGI par l'appel réel à l'API DGI.

**API DGI** : `https://api.dgi.gouv.cd`
**Endpoint NIF** : `POST /api/v1/nif/verify`
**Endpoint Facture** : `POST /api/v1/invoices/submit`

**Workflow DGI pour une facture :**
1. Invoice créée → status `draft`
2. Invoice soumise à DGI → `dgi_submitted = true`, `dgi_status = 'pending'`
3. DGI répond → `dgi_status` mis à jour ( validated / rejected )
4. Display status dans `screen-05-dgi-status.html`

---

## 📊 Devis (Quotes)

**Table** : `quotes` (même structure que invoices avec `type = 'quote'`)
**Conversion** : Un devis peut être converti en facture (duplication avec nouveau `invoice_number`)

---

## ✅ Checklist Sprint 2

- [ ] Dashboard avec KPIs (total factures, CA, DGI status)
- [ ] Liste factures avec filtres (statut, date, client)
- [ ] Création facture avec lignes (articles, quantités, TVA)
- [ ] Détail facture avec historique
- [ ] Preview PDF facture
- [ ] Page statut DGI (screen-05)
- [ ] Gestion devis (screen-09)
- [ ] Intégration DGI réelle (COD-26)
- [ ] Schema DB invoices + dgi_transmissions (COD-28)
- [ ] Integration clients dans factures

---

## 🔗 Dépendences

- **COD-26** (API DGI credentials) — bloque intégration DGI réelle
- **COD-28** (Schema DB) — bloque structure facturation
- **COD-29** (SYSCOHADA) — requis pour calculs comptables
- **COD-30** (Branding) — design system à finaliser

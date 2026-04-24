# FactureSmart — Plan de Développement 62 Écrans

> Dernière mise à jour: 2026-04-24
> Branche: `main` — Sprint 2 en cours

---

## Phase 1 — Fondations & Auth ✅ LIVRÉ (Sprint 1)

| Écran | Fichier | Route | Status |
|-------|---------|-------|--------|
| screen-00-login | `Login.tsx` | `/login` | ✅ |
| screen-B-inscription | `Register.tsx` | `/register` | ✅ |
| screen-B4-inscription-verify | `Register.tsx` (step 4) | `/register` | ✅ |
| screen-A1-onboarding → A5 | `Onboarding.tsx` | `/onboarding` | ✅ |
| screen-B6-onboarding-post | `SetupWizard.tsx` | `/setup` | ✅ |

---

## Phase 2 — Core Facturation 🚧 EN COURS (Sprint 2)

| Écran | Fichier | Route | Backend | Status |
|-------|---------|-------|---------|--------|
| screen-01-dashboard | `Index-Protected.tsx` | `/` | Aggregations | ✅ |
| screen-02-factures | `Factures-Protected.tsx` | `/factures` | Table invoices | ✅ |
| screen-03-creation-facture | `Factures-Create.tsx` | `/factures/new` | CRUD invoice_lines | ✅ |
| screen-03b-facture-detail | `Factures-View.tsx` | `/factures/view/:id` | Invoice + paiements | ✅ |
| screen-04-preview-facture | `Factures-Preview.tsx` | `/factures/preview/:id` | PDF client | ✅ |
| screen-05-dgi-status | `DgiStatus.tsx` | `/factures/:id/dgi-status` | dgi_transmissions | ✅ |
| screen-09-devis | `Devis.tsx` | `/devis` | Table quotes | ✅ |
| screen-J2-invoice-detail-full | `InvoiceDetailFull.tsx` | `/factures/:id/detail` | Invoice complète | ❌ À créer |
| screen-J3-invoice-history | `InvoiceHistory.tsx` | `/factures/:id/history` | activity_logs | ❌ À créer |

**Tâches Sprint 2 restantes:**
- [ ] COD-26: DGI API credentials (Kimi en cours)
- [ ] COD-28: Schema DB `invoice_history`
- [ ] Écrans: InvoiceDetailFull, InvoiceHistory

---

## Phase 3 — Clients & Catalogue 📋 PLANIFIÉ

| Écran | Fichier | Route |
|-------|---------|-------|
| screen-06-clients | `Clients-Protected.tsx` | `/clients` |
| screen-J1-client-detail | — | `/clients/:id` |
| screen-08-settings (catalogue) | — | `/settings` |

---

## Phase 4 — POS & Caisse 📋 PLANIFIÉ

| Écran | Fichier | Route |
|-------|---------|-------|
| screen-G1-pos-caisse | `POS-Caisse.tsx` | `/pos` |
| screen-G2-pos-catalogue | — | `/pos/catalogue` |
| screen-G3-pos-checkout | — | `/pos/checkout` |
| screen-G4-pos-settings | — | `/pos/settings` |
| screen-G5-pos-recu | — | `/pos/recu/:id` |
| screen-G6-pos-historique | — | `/pos/historique` |
| screen-L1-ouverture-caisse | — | `/caisse/ouverture` |
| screen-L2-journal-caisse | — | `/caisse/journal` |
| screen-L3-fermeture-caisse | — | `/caisse/fermeture` |
| screen-L4-transfert-caisse-banque | — | `/caisse/transfert` |

---

## Phase 5 — Comptabilité OHADA 📋 PLANIFIÉ

| Écran | Table/Backend |
|-------|--------------|
| screen-K1-plan-comptable | `chart_of_accounts` (SYSCOHADA) |
| screen-K2-journal | `accounting_entries` |
| screen-K3-grand-livre | Requêtes par compte |
| screen-K4-balance | Aggregation périodique |
| screen-K5-compte-resultat | Calcul produits - charges |
| screen-K6-bilan | Actif / Passif |
| screen-K7-tresorerie | Suivi flux |
| screen-K8-releve-bancaire | Import + rapprochement |
| screen-K9-ohada-export | Export XML/PDF SYSCOHADA |

---

## Phase 6 — Rapports & Paramètres 📋 PLANIFIÉ

| Écran | Fichier |
|-------|---------|
| screen-07-rapports | `Finance-Statistics.tsx` |
| screen-08-settings | `Settings.tsx` |
| screen-E-roles | `Settings-Permissions.tsx` |
| screen-E3-user-edit | `UserEdit.tsx` ✅ |
| screen-E6-user-invite | `UserInvite.tsx` ✅ |
| screen-J4-settings-notifications | — |
| screen-J5-settings-integrations | — |
| screen-J6-settings-security | — |
| screen-J7-settings-export-advanced | — |
| screen-F-abonnement | — |
| screen-F4-payment-card | — |

---

## Phase 7 — Mobile & Modales 📋 PLANIFIÉ

| Écran | Notes |
|-------|-------|
| screen-H-mobile → H7 | Responsive mobile + PWA |
| screen-C-modales → C14 | Composants modales réutilisables |
| screen-D-notifications | Système notifications temps réel |
| screen-D4-mobile-notifications | Notifs mobile |

---

## Phase 8 — Landing & Marketing 📋 PLANIFIÉ

| Écran | Notes |
|-------|-------|
| landing.html | Site vitrine statique |

---

## Résumé Statut

| Phase | Total | ✅ Done | 🚧 In Progress | ❌ To Do |
|-------|-------|---------|----------------|---------|
| Phase 1 — Auth | 6 | 6 | 0 | 0 |
| Phase 2 — Facturation | 9 | 4 | 0 | 5 |
| Phase 3 — Clients | 3 | 1 | 0 | 2 |
| Phase 4 — POS | 10 | 1 | 0 | 9 |
| Phase 5 — OHADA | 9 | 0 | 0 | 9 |
| Phase 6 — Rapports | 11 | 5 | 0 | 6 |
| Phase 7 — Mobile | 6 | 0 | 0 | 6 |
| Phase 8 — Landing | 1 | 0 | 0 | 1 |
| **TOTAL** | **62** | **13** | **0** | **49** |

---

## Stack Technique

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth + DB + Edge Functions)
- **Auth**: Supabase Auth (email/NIF + OAuth Google/Microsoft mock)
- **Brand**: FactureSmart — vert émeraude (#10b981)
- **OAuth**: Mock en dev (`VITE_USE_MOCK_OAUTH`), réel via GCP/Azure AD (en attente Kimi)

## Branches Git

- `main` — branche stable ( Sprint 1 ✅ )
- `sprint-2-core-facturation` — Sprint 2 en cours

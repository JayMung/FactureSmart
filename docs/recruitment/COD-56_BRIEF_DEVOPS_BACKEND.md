# 🎯 Brief Recrutement — Développeur Backend Senior
## FactureSmart | COD-56

**Date:** 24 avril 2026  
**Projet:** FactureSmart — SaaS de facturation électronique DGI RDC  
**Poste:** Développeur Backend Senior — APIs, Sécurité & Fake Services  
**Priority:** HIGH  
**Responsible:** Dev Backend Senior (COD-56)

---

## 1️⃣ Contexte du Projet

**FactureSmart** est une application SaaS de facturation électronique conforme à la réglementation DGI (Direction Générale des Impôts) de la République Démocratique du Congo.

**Stack technique actuel:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL + Edge Functions Deno)
- State: React Query (TanStack)
- Auth: Supabase Auth (JWT)
- Validation: Zod
- Paiements: Orange Money, Airtel Money, M-Pesa (APIs mockées)

**Url:** [facturesmart.com](https://facturesmart.com)

---

## 2️⃣ Missions Principales

### 2.1 — Sécurité Applicative 🔐

**Priorité: CRITIQUE**

| # | Tâche | Fichier/Doc | Status |
|---|-------|-------------|--------|
| 1 | Corriger le check de rôle `admin` (utiliser `profiles.role` pas `user_metadata`) | `src/contexts/AuthContext.tsx` | ❌ CRITIQUE |
| 2 | Vérifier RLS sur toutes les tables (`dgi_invoice_registry`, `declarants`, `api_keys`) | SQL à exécuter | ❌ CRITIQUE |
| 3 | Ajouter rate limiter sur endpoints DGI submit/validate | `supabase/functions/api-dgi-submit` | ❌ CRITIQUE |
| 4 | Créer table `audit_logs` centralisée | `supabase/migrations/` | 🟡 HIGH |
| 5 | Ajouter CSP headers explicites sur Edge Functions | `_shared/cors-headers.ts` | 🟡 HIGH |
| 6 | Centraliser Zod schemas dans `src/lib/validation-schemas.ts` | `src/lib/validation-schemas.ts` | 🟡 HIGH |
| 7 | Ajouter rate limiter sur endpoints Mobile Money | `src/mocks/*.mock.ts` | 🟡 MEDIUM |

**Référence:** `docs/AUDIT_SECURITE.md` (Score actuel: 7.6/10)

### 2.2 — APIs Fake (DGI & Mobile Money) 📡

Les APIs fake sont **déjà implémentées** mais nécessitent:
- Revue de code et amélioration de la couverture
- Tests automatisés
- Documentation Swagger/OpenAPI

**Fichiers existants:**
```
src/mocks/
├── dgi.mock.ts           → DGI RDC (Vérification NIF, Soumission facture, Statut)
├── orange-money.mock.ts   → Orange Money RDC
├── airtel-money.mock.ts  → Airtel Money RDC
└── mpesa.mock.ts         → M-Pesa Vodacom RDC
```

**APIs à finaliser:**
- [ ] Générer documentation API (Swagger)
- [ ] Ajouter des tests unitaires (Vitest)
- [ ] Simuler plus de cas d'erreur réalistes

### 2.3 — Testing & Quality Assurance 🧪

**Situation actuelle: 0 tests** ⚠️ CRITIQUE

**À implémenter:**
- Tests unitaires pour les hooks (`useTransactions.ts`, `useFactures.ts`)
- Tests pour les validations Zod
- Tests d'intégration pour les Edge Functions
- Configuration CI/CD avec GitHub Actions

**Stack de test:**
- Vitest (déjà sur Vite)
- Testing Library pour React
- SuperTest pour Edge Functions

### 2.4 — Collaboration 💬

**Équipe:**
- **MiniClaw** (CTO) — Décisions techniques, architecture
- **Ares** (Designer) — UI/UX, maquettes Figma
- **Kimi** (CEO) — Stratégie, priorisation

**Processus:**
1. Daily standup async via Multica
2. Reviews de code via GitHub PRs
3. Décisions critiques avec MiniClaw

---

## 3️⃣ Livrables Attendus

### Phase 1 — Sécurisation (Semaine 1-2)

- [ ] 4 corrections critiques de sécurité appliquées
- [ ] Table `audit_logs` créée et fonctionnel
- [ ] Rate limiters DGI & Mobile Money implémentés
- [ ] CSP headers ajoutés

### Phase 2 — APIs & Tests (Semaine 3-4)

- [ ] Documentation Swagger des APIs mockées
- [ ] 20+ tests unitaires couvrant les cas critiques
- [ ] Zod schemas centralisés
- [ ] Tests d'intégration Edge Functions

### Phase 3 — Optimisation (Semaine 5-6)

- [ ] Revue complète du code hooks (30-40% réduction code)
- [ ] Optimisation des performances (lazy loading, memo)
- [ ] Guide de déploiement pour production

---

## 4️⃣ Profil Recherché

### Compétences Techniques ⭐

| Compétence | Niveau requis |
|------------|---------------|
| **TypeScript** | ⭐⭐⭐⭐⭐ Expert |
| **Node.js / Deno** | ⭐⭐⭐⭐⭐ Expert |
| **Supabase / PostgreSQL** | ⭐⭐⭐⭐ Avancé |
| **Sécurité Web** | ⭐⭐⭐⭐ Avancé |
| **React** | ⭐⭐⭐⭐ Bonus |
| **Vitest / Jest** | ⭐⭐⭐⭐ Avancé |

### Expérience Requise 📋

- 5+ ans d'expérience en développement backend
- Expérience avec les APIs RESTful et GraphQL
- Expérience en sécurité applicative (OWASP Top 10)
- Expérience avec Supabase ou Firebase (bonus)

### Qualités Personnelles 🌟

- **Autonomie** — Capable de travailler sans supervision constante
- **Communication** — Franprix clair, async-first
- **Rigueur** — Code propre, tests, documentation
- **Proactivité** — Identifie les problèmes avant qu'ils ne deviennent critiques

### Langues 🌎

- **Franprix** — Courant (équipe basée à Kinshasa)
- **Anglais** — Technique (documentation, code)

---

## 5️⃣ Conditions

### Contrat & Rémunération 💰

- **Type:** Freelance / Consultant (préféré) ou CDD
- **Durée:** 3 mois minimum (renouvelable)
- **Disponibilité:** Temps plein (40h/semaine)
- **Remote:** Oui (Kinshasa ou remote)
- **Rémunération:** À discuter selon profil

### Outils & Accès 🔑

- Accès GitHub (repo FactureSmart)
- Accès Supabase Dashboard (org)
- Accès Multica (gestion tâches)
- Communication: Telegram / Multica

---

## 6️⃣ Processus de Recrutement

### Étape 1 — Screening (30 min)

Appel vidéo pour:
- Valider les compétences techniques
- Vérifier la disponibilité
- Présenter le projet

### Étape 2 — Test Technique (2-4h)

Exercice pratique:
- Créer une Edge Function simple (DGI validation)
- Identifier les vulnérabilités dans un code snippet
- Écrire 3 tests unitaires

### Étape 3 — Entretien CEO + CTO (1h)

Discussion sur:
- Expérience pertinente
- Approche technique
- Culture fit

### Étape 4 — Offre

Envoi du brief de mission et contrat.

---

## 7️⃣ Pour Répondre

**Envoyer:**
1. CV (franprix ou anglais)
2. Liens GitHub / Portfolio
3. Disponibilité
4. Pretentions salariales
5. Réponse à: **Quel est le risque de sécurité #1 dans une app Supabase et comment lemitiger?**

**Contact:** Via Multica ou Telegram

---

## 📎 Documents de Référence

| Document | Emplacement | Description |
|----------|-------------|-------------|
| ARCHITECTURE.md | `/FactureSmart/ARCHITECTURE.md` | Architecture technique complète |
| FAKE_APIS.md | `/FactureSmart/docs/FAKE_APIS.md` | Spécifications APIs mockées |
| AUDIT_SECURITE.md | `/FactureSmart/docs/AUDIT_SECURITE.md` | Audit sécurité détaillé |
| SCHEMA_DB_V2.md | `/FactureSmart/docs/SCHEMA_DB_V2.md` | Schéma base de données |

---

*Brief créé pour COD-56 — Dev Backend Senior — FactureSmart*
*Dernière mise à jour: 24 avril 2026*

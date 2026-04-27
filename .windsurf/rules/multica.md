---
trigger: always_on
description: Règles Cascade pour FactureSmart — Multica, équipe agents IA, vision DGI/RDC, PRD V2
---

# Règles Cascade — FactureSmart

## 1. Sources de vérité (ordre de priorité)

| Source | Contenu | Localisation |
|---|---|---|
| **Multica** | Directives, décisions, état des tâches | CLI `multica.exe` + VPS `100.77.106.28:8080` |
| **Plan Directeur V1** | Architecture, audit modules, décisions techniques | `mockups-v2/📋 PRD — FactureSmart v2.0/FactureX-DGI — Plan Directeur.md` |
| **PRD V2** | État du produit, modules livrés/en cours, sprint | `mockups-v2/📋 PRD — FactureSmart v2.0/PRD - V2.md` |
| **GitHub `main`** | Code stable mergé | `JayMung/FactureSmart` |
| **Branches non-mergées** | Code des agents en attente de review | `sprint-2-core-facturation`, `fix/security-cod56`, etc. |

⚠️ **`main` n'est PAS représentatif du produit réel** — beaucoup de features des agents IA sont sur des branches non-mergées. Toujours cross-vérifier avec Multica + PRD V2.

**Avant tout travail substantiel :**
1. `git pull origin main` + `git fetch --all`
2. Lire issues Multica récentes (`[DIRECTIVE]`, `[MISSION]`, `📢`)
3. Consulter PRD V2 pour l'état des modules
4. Vérifier que la tâche n'a pas déjà été faite par un autre agent

## 2. Configuration Multica

- **CLI** : `C:\Users\PC\.multica\bin\multica.exe` (v0.2.16)
- **Server** : `http://100.77.106.28:8080` (VPS via Tailscale)
- **Workspace Codev** : `f656e2c9-b63d-492c-bc17-c39c92a2a8d1`
- **Workspace KALAKUTA DIGITAL** : `6386d5e3-b6eb-4733-bca4-ab404f00182c`
- **User** : Jeancy Mungedi — token dans `~/.multica/config.json`

⚠️ **Toujours wrapper avec `cmd /c`** — PowerShell traite stderr de Multica comme erreur :

```powershell
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue list --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue get COD-XX --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue comment list COD-XX --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1 --output json"
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue search 'query' --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"
cmd /c "C:\Users\PC\.multica\bin\multica.exe agent list --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"
```

## 3. Équipe agents IA (workspace Codev, VPS `vmi3075440`)

| Agent | Rôle | ID Multica |
|---|---|---|
| **Kimi - CEO** | Stratégie, Plan Directeur, décisions | `4bcef129-053a-491a-a814-b0d7afd210b2` |
| **MiniClaw - CTO** | Backend, API, Supabase, Edge Functions | `b5769ada-e5d5-41db-b80c-ecdc2871a1c2` |
| **Hermes - CMO** | Audit UX, monitoring des agents | `55c4ffde-4a37-428d-86f8-fbad6b136ec1` |
| **Ares - Designer** | Maquettes UI/UX, design system | `52cc0db1-fb20-4d21-bcc0-e20f52452e7a` |
| **Dev Backend Senior** | APIs, sécurité, fake services | `20b48ef7-297a-4211-9cd0-c9102cdf5b05` |
| **Expert-Comptable OHADA** | Comptabilité SYSCOHADA | `dbf98c31-a959-4570-869e-0ae86339e2fc` |
| **Cascade** (moi) | Refacto, review, fix, PRs — sur Windsurf laptop | N/A |

**Les agents Multica n'ont souvent pas d'auth GitHub sur le VPS** → Cascade peut créer leurs PRs via `gh pr create`.

## 4. Vision produit FactureSmart (Plan Directeur V1 + PRD V2)

**SaaS multi-tenant de facturation électronique conforme DGI/RDC** pour PME/PMI congolaises.
Stack : React 18 + TS 5+ + Vite 6 + **Tailwind 4** + shadcn/ui + Supabase (Auth, DB PostgreSQL, Edge Functions Deno, Realtime, Storage).

### Navigation plate — 8 items max
`Caisse · Factures · Clients · Articles · Déclarants · Rapports · Finances · Paramètres`

### Spécificités DGI (NON NÉGOCIABLES)
- **6 types factures** : `FV` (Vente), `EV` (Vente Export), `FT` (Prestation), `ET` (Prestation Export), `FA` (Avoir), `EA` (Avoir Export)
- **Groupes TVA** : `A`=0% exonéré, `B`=16% standard, `C`=0% non taxable
- **Format numéro** : `FN-YYYY-NNNNN`
- **Rapports POS** : X (session), Z (journalier — verrouillé après clôture), A (mensuel DGI)
- **Clients** : NIF + RCCM obligatoires pour assujettis
- **Articles** : codes-barres + groupe TVA DGI
- **DEF** (Dispositif Électronique Fiscal) : intégration future, clearance en temps réel

### 5 rôles RBAC (V2 — pas 3 comme en V1)
`super_admin` · `admin` · `operateur` · `comptable` · `declarant`

### Design system
- **Font** : **Plus Jakarta Sans** (pas Inter !)
- **Couleur** : Vert émeraude `#10B981`, glassmorphism
- **Icons** : Remix Icon (CDN)
- **Mockups** : `mockups-v2/` (50+ fichiers HTML)

### Modules à NE JAMAIS réintroduire ❌
Colis, transitaires, containers, fret maritime/aérien, multi-devises CNY, security enterprise custom (CSRF/XSS/rate-limiting — Supabase Auth+RLS suffit), permissions granulaires 14 modules, workflow approbation multi-niveaux, rapports financiers complexes (watermark/checksum), API keys, webhooks tiers, `scrape_leads.*`, `testsprite_tests/`, `docs/` (117 fichiers supprimés)

### Modules OHADA SYSCOHADA (V2 — pas dans V1)
Plan comptable (K1) ✅, Journal (K2) ❌, Grand Livre (K3) ❌, Balance (K4) ❌, Compte résultat (K5) ❌, Bilan (K6) ❌, Trésorerie (K7) ❌, Relevé bancaire (K8) ❌, Export XML/PDF (K9) ❌

## 5. État avancement PRD V2 (25 avril 2026)

- **27/62 tâches done** (44%), 35 restantes
- Sprint 2 (Core Facturation) en cours : `sprint-2-core-facturation`
  - ✅ Devis.tsx, DgiStatus.tsx (commit `74c27a8` — cherry-pick à faire)
  - ❌ COD-26 DGI API credentials, COD-28 schema `invoice_history`, J2 InvoiceDetailFull, J3 InvoiceHistory
- Sprint 3 à venir : POS complet G1-G6 + Caisse quotidienne L1-L4
- Sprint 4 à venir : OHADA K2-K9

### Branches non-mergées à cherry-picker (par ordre de priorité)
1. `74c27a8` (sprint-2) → `feat/devis-dgi-status` — Devis + DgiStatus
2. `e8c5d73` (fix/security-cod56) → `feat/admin-backoffice` — Backoffice admin (FACTURESMART-04)
3. `36e0555` (fix/security-cod56) → `feat/notification-hub` — PWA + Service Worker + Push
4. `d791211` (fix/security-cod56) → `feat/dgi-phase3` — DGI Phase 3
5. PR #11 déjà ouverte : `fix/security-cod56-clean` (sécurité COD-56)

### Dette technique critique (PRD V2)
- 🔴 47 hooks dupliqués → hook générique `useSupabaseQuery` (déjà créé dans sprint-1 mais revert)
- 🔴 0 tests automatisés → Vitest + GitHub Actions
- ⚠️ Validation éparpillée dans 7 fichiers → centraliser Zod

## 6. Workflow Git

- **Toujours `git pull origin main` + `git fetch --all`** avant de commencer
- **1 PR = 1 feature** (jamais de branche fourre-tout — leçon `fix/security-cod56` qui avait 6 features)
- **Cherry-pick ciblé** pour récupérer les features des branches divergées (pas merger toute la branche)
- **Commits référencent les COD-XX** quand pertinent
- **Conventional commits** : `feat(dgi):`, `fix(types):`, `chore(cleanup):`
- Branches : `feat/...`, `fix/...`, `chore/...`

## 7. Pièges PowerShell Windows

- `curl` → `Invoke-WebRequest` (alias) → utiliser `curl.exe` ou `cmd /c "curl ..."`
- Multica stderr → `NativeCommandError` (faux positif) → wrapper `cmd /c "... 2>&1"`
- `irm URL | iex` = équivalent PowerShell de `curl URL | sh`
- `cd` dans `run_command` → interdit, utiliser le paramètre `Cwd`

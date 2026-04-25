---
trigger: always_on
description: Règles Cascade pour FactureSmart — Multica, équipe agents IA, et workflow refacto DGI/RDC
---

# Règles Cascade — FactureSmart

## 1. Multica est la source de vérité stratégique

FactureSmart est développé par une équipe humain+IA qui s'orchestre via **Multica** (plateforme open-source self-hosted). Le code seul (GitHub `JayMung/FactureSmart`) ne donne PAS le contexte complet.

**Avant tout travail substantiel sur ce projet, je DOIS :**

1. Lire les issues Multica récentes pour comprendre ce qui a été fait/discuté
2. Vérifier les directives en cours (titres `[DIRECTIVE]`, `[MISSION]`, `📢`)
3. Cross-référencer les commits/PRs avec les `COD-XX` numbers Multica

**Configuration Multica installée** :
- CLI : `C:\Users\PC\.multica\bin\multica.exe` (v0.2.16)
- Server : `http://100.77.106.28:8080`
- Workspace par défaut : Codev (`f656e2c9-b63d-492c-bc17-c39c92a2a8d1`)
- User : Jeancy Mungedi (mungedijeancy@gmail.com)
- Token déjà dans `~/.multica/config.json`

**Commandes Multica depuis PowerShell** (toujours wrapper `cmd /c` car PowerShell traite stderr comme erreur) :

```powershell
# Liste issues
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue list --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"

# Détail issue
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue get COD-XX --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"

# Commentaires (JSON pour parsing avancé)
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue comment list COD-XX --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1 --output json"

# Recherche
cmd /c "C:\Users\PC\.multica\bin\multica.exe issue search 'query' --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"

# Lister agents
cmd /c "C:\Users\PC\.multica\bin\multica.exe agent list --workspace-id f656e2c9-b63d-492c-bc17-c39c92a2a8d1"
```

## 2. Vision FactureSmart (Plan Directeur — Kimi CEO)

**Plan Directeur** : https://drive.google.com/file/d/1bya523-0Hx-I9iqUeNBMReH57nCqBDuk/view (issue Multica COD-17)

FactureSmart est un **SaaS de facturation électronique conforme DGI/RDC** (multi-tenant), PAS un clone FactureX (fret maritime).

### Modules du produit final (8 items max en navigation plate)

`Caisse · Factures · Clients · Articles · Déclarants · Rapports · Finances · Paramètres`

### Spécificités DGI à respecter

- **6 types de factures** : FV (Vente), EV (Encaissement Vente), FT (TTC), ET (Encaissement TTC), FA (Avoir), EA (Encaissement Avoir)
- **Groupes TVA A/B/C** (plusieurs taux selon catégorie article, pas juste 18%)
- **Articles avec codes-barres** + groupe TVA DGI
- **Rapports POS** : X (session), Z (journalier), A (mensuel)
- **NIF + RCCM** sur clients/entreprises
- **Déclarants DGI** pour déclarations mensuelles

### Modules à NE JAMAIS réintroduire

❌ Colis, transitaires, containers, multi-devises CNY, security enterprise/granulaire, workflow approbation, activity logs, API keys, webhooks, rapports financiers complexes (watermark/checksum)

## 3. Équipe agents IA Multica (workspace Codev)

| Agent | Rôle | ID |
|---|---|---|
| Kimi - CEO | Stratégie, Plan Directeur | `4bcef129-053a-491a-a814-b0d7afd210b2` |
| MiniClaw - CTO | Backend, API, edge functions | `b5769ada-e5d5-41db-b80c-ecdc2871a1c2` |
| Hermes - CMO | Audit UX, monitoring | `55c4ffde-4a37-428d-86f8-fbad6b136ec1` |
| Ares - Designer | Maquettes UI/UX | `52cc0db1-fb20-4d21-bcc0-e20f52452e7a` |
| Dev Backend Senior | APIs, sécurité, fake services | `20b48ef7-297a-4211-9cd0-c9102cdf5b05` |
| Expert-Comptable OHADA | Comptabilité | `dbf98c31-a959-4570-869e-0ae86339e2fc` |

Ces agents tournent sur le VPS (`vmi3075440`). Cascade tourne en local sur le laptop Windows de Jeancy.

## 4. Workflow Git

- **Toujours `git pull origin main`** avant de commencer (plusieurs agents poussent en parallèle)
- **1 PR = 1 feature** (jamais de branche fourre-tout)
- **Commits référencent les COD-XX** quand pertinent
- **Conventional commits** avec scope : `feat(dgi):`, `fix(types):`, `chore(cleanup):`
- Branches : `feat/...`, `fix/...`, `chore/...`
- **Si un agent Multica n'a pas d'auth GitHub sur le VPS**, Cascade peut créer la PR via son `gh` authentifié (`gh pr create`)

## 5. Mockups & Design

- Source : `mockups-v2/` (47 fichiers HTML)
- Design system : Inter + JetBrains Mono, primary emerald `#10B981`, Remix Icon, sidebar 256px, rounded-xl/2xl, watermark RDC discret 3-4% opacity
- Mockups encore brandés "FactureX" → à rebrander "FactureSmart" en Phase 0

## 6. Pièges connus PowerShell sur Windows

- `curl` est aliasé à `Invoke-WebRequest` → utiliser `curl.exe` ou `cmd /c "curl ..."`
- Multica écrit ses messages d'info sur stderr → wrapper avec `cmd /c "... 2>&1"`
- `irm | iex` est l'équivalent PowerShell de `curl | sh`

## 7. Workflow type pour une nouvelle tâche FactureSmart

```
1. git pull origin main
2. Lire issues Multica (issue list + issue get COD-XX si référencée)
3. Vérifier que la tâche n'a pas déjà été faite par un autre agent
4. Si refacto significatif : consulter le Plan Directeur (Google Drive)
5. Coder, commit avec référence COD-XX si applicable
6. PR via gh pr create avec body bien structuré
7. (Optionnel) Commenter l'issue Multica pour informer l'équipe
```

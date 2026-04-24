# 🏗️ ARCHITECTURE FACTUREX

> Documentation technique du projet FactureSmart v1.0.2  
> Dernière mise à jour : 11 Février 2026

---

## 📁 Structure du Projet

```
FactureSmart/
├── src/
│   ├── components/          # 23 dossiers de composants UI
│   │   ├── activity/        # Logs d'activité
│   │   ├── admin/           # Composants d'administration
│   │   ├── auth/            # Authentification
│   │   ├── charts/          # Graphiques (Recharts)
│   │   ├── clients/         # Gestion clients
│   │   ├── colis-maritime/  # Suivi colis & containers
│   │   ├── comptes/         # Gestion comptes financiers
│   │   ├── dashboard/       # Tableaux de bord
│   │   ├── filters/         # Filtres réutilisables
│   │   ├── forms/           # Formulaires transaction
│   │   ├── layout/          # Layout principal
│   │   ├── modals/          # Modales réutilisables
│   │   ├── payments/        # Paiements
│   │   ├── permissions/     # Gestion permissions
│   │   ├── reports/         # Rapports financiers
│   │   ├── security/        # Composants sécurité
│   │   ├── settings/        # Paramètres
│   │   ├── transactions/    # Transactions financières
│   │   ├── ui/              # Composants shadcn/ui
│   │   └── workflow/        # Workflow validation
│   │
│   ├── hooks/               # 47 hooks React Query
│   │   ├── useTransactions.ts
│   │   ├── useColis.ts
│   │   ├── useClients.ts
│   │   ├── useFactures.ts
│   │   ├── useComptesFinanciers.ts
│   │   ├── usePaiements.ts
│   │   ├── useMouvementsComptes.ts
│   │   ├── usePermissions.ts
│   │   ├── useApprovalWorkflow.ts
│   │   ├── useFinancialOperations.ts
│   │   └── ... (37 autres hooks)
│   │
│   ├── pages/               # 32 pages principales
│   │   ├── Index.tsx                    # Dashboard principal
│   │   ├── Transactions-Protected.tsx   # Transactions
│   │   ├── Clients-Protected.tsx        # Gestion clients
│   │   ├── Factures-*.tsx               # 6 pages factures
│   │   ├── Colis-*.tsx                  # 3 pages colis
│   │   ├── Comptes.tsx                  # Comptes financiers
│   │   ├── Encaissements.tsx            # Encaissements
│   │   ├── Operations-Financieres.tsx   # Opérations
│   │   ├── Finance-Statistics.tsx       # Stats financières
│   │   ├── Settings.tsx                 # 5 pages settings
│   │   └── ... (autres pages)
│   │
│   ├── services/            # Services API
│   │   ├── supabase.ts      # Client Supabase principal
│   │   ├── supabase-extended.ts
│   │   ├── activityLogger.ts
│   │   ├── adminService.ts
│   │   ├── permissionsService.ts
│   │   └── securityLogger.ts
│   │
│   ├── integrations/
│   │   └── supabase/        # Configuration Supabase
│   │
│   ├── lib/                 # Utilitaires & validations
│   │   ├── security/        # Sécurité CSRF, XSS, Rate limiting
│   │   ├── validation.ts    # Validation Zod
│   │   ├── input-validation.ts
│   │   ├── password-validation.ts
│   │   ├── financial-validation-handler.ts
│   │   ├── rate-limit-server.ts
│   │   └── animations.ts
│   │
│   ├── contexts/            # React Contexts
│   ├── types/               # Types TypeScript
│   ├── utils/               # Utilitaires
│   └── styles/              # CSS global
│
├── supabase/
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── webhook-transaction/
│   │   ├── webhook-processor/
│   │   ├── agent-comptable/
│   │   ├── api-*/
│   │   └── _shared/
│   │
│   └── migrations/          # Migrations SQL
│
└── public/                  # Assets statiques
```

---

## 🎣 Principaux Hooks (Rôle & Responsabilité)

### 🔤 Transactions & Finance
| Hook | Rôle |
|------|------|
| `useTransactions.ts` | CRUD complet, pagination, filtres transactions |
| `useFinancialOperations.ts` | Opérations financières complexes (swap, transfert) |
| `useFinanceStatsByPeriod.ts` | Statistiques financières par période |
| `useMouvementsComptes.ts` | Historique mouvements comptes |
| `useFinanceCategories.ts` | Catégories financières |
| `useFinancialValidation.ts` | Validation montants financiers |
| `useFinancialReports.ts` | Génération rapports |

### 📦 Colis & Logistique
| Hook | Rôle |
|------|------|
| `useColis.ts` | CRUD colis aérien/maritime |
| `useColisList.ts` | Liste paginée colis |
| `useColisMaritime.ts` | Containers maritimes |
| `useDeleteColis.ts` | Suppression colis avec logs |
| `useUpdateColisStatut.ts` | Mise à jour statuts |

### 👥 Clients & Relations
| Hook | Rôle |
|------|------|
| `useClients.ts` | CRUD clients |
| `useClientHistory.ts` | Historique client |
| `useClientUnpaidFactures.ts` | Factures impayées client |

### 📄 Facturation
| Hook | Rôle |
|------|------|
| `useFactures.ts` | CRUD factures (19KB - complexe) |
| `usePaiements.ts` | Paiements & encaissements |
| `usePaymentMethods.ts` | Modes de paiement |

### 🔐 Sécurité & Permissions
| Hook | Rôle |
|------|------|
| `usePermissions.ts` | Permissions granulaires (11KB) |
| `useApprovalWorkflow.ts` | Workflow validation transactions |
| `useApiKeys.ts` | Gestion API keys |
| `useWebhooks.ts` | Configuration webhooks |
| `useRealTimeActivity.ts` | Logs temps réel |
| `useNotificationPreferences.ts` | Préférences notifications |

### 📊 Dashboard & Rapports
| Hook | Rôle |
|------|------|
| `useDashboard.ts` | Dashboard principal |
| `useDashboardAnalytics.ts` | Analytics dashboard |
| `useDashboardWithPermissions.ts` | Dashboard avec permissions |

### 🔧 Opérations
| Hook | Rôle |
|------|------|
| `useBulkOperations.ts` | Opérations en masse |
| `useExtendedBulkOperations.ts` | Opérations avancées |
| `useExtendedSelection.ts` | Sélection multiple |
| `useAutoSave.ts` | Sauvegarde automatique |
| `useFormValidation.ts` | Validation formulaires |

---

## 🧩 Rôle des Principaux Composants

### Layout & Navigation
- **`layout/MainLayout.tsx`** - Layout principal avec sidebar
- **`layout/Header.tsx`** - En-tête avec notifications
- **`layout/Sidebar.tsx`** - Navigation latérale

### Transactions
- **`transactions/TransactionList.tsx`** - Liste transactions
- **`transactions/TransactionForm.tsx`** - Formulaire création
- **`transactions/TransactionStats.tsx`** - Statistiques

### Finances
- **`comptes/CompteCard.tsx`** - Carte compte financier
- **`comptes/SoldeBadge.tsx`** - Badge solde
- **`charts/FinancialChart.tsx`** - Graphique financier

### Sécurité
- **`security/PermissionGuard.tsx`** - Garde permissions
- **`security/AuditLog.tsx`** - Journal d'audit
- **`auth/withProtection.tsx`** - HOC protection routes

---

## 🔴 Dette Technique Identifiée (3 points prioritaires)

### 1. **Duplication de code dans les Hooks** ⚠️ CRITIQUE

**Problème** : 
- 47 hooks avec beaucoup de logique dupliquée
- `useBulkOperations.ts` et `useExtendedBulkOperations.ts` → ~70% code commun
- `useColis.ts` et `useColisList.ts` → logique similaire
- Gestion error & loading duplicée

**Exemple de duplication** :
```typescript
// Dans useTransactions.ts, useColis.ts, useClients.ts, etc.
const { data, error, isLoading } = await supabase
  .from(table)
  .select()
  .eq('organization_id', orgId);

if (error) {
  toast.error(error.message);
  return { success: false, error };
}
```

**Solution recommandée** :
- Créer un **hook générique** `useSupabaseQuery(table, options)`
- Factoriser la gestion error/loading
- Réduire de 30-40% le code hooks

---

### 2. **Validation分散 (Fragmentée)** ⚠️ MOYEN

**Problème** :
- 7 fichiers de validation différents :
  - `lib/validation.ts` (12KB)
  - `lib/input-validation.ts` (11KB)
  - `lib/financial-validation-handler.ts`
  - `lib/password-validation.ts`
  - `lib/form-validation.ts`
  - `lib/xss-protection.ts`
  - `lib/csrf-protection.ts`
- Overlapping et redondance
- Pas de schéma Zod centralisé

**Solution recommandée** :
- Créer **un seul fichier** `lib/schemas.ts` avec tous les schémas Zod
- Utiliser `zod` pour validation unifiée frontend/backend
- Unifier `input-validation.ts` et `validation.ts`

---

### 3. **Absence de Tests Automatisés** ⚠️ CRITIQUE

**Problème** :
- **0 tests unitaires** dans le projet
- **0 tests d'intégration**
- Pas de CI/CD pour les tests
- Risque élevé de régression

**Solution recommandée** :
- Installer **Vitest** (déjà sur Vite)
- Créer tests pour :
  - `useTransactions.ts` (logique complexe)
  - `lib/validation.ts` (schémas)
  - Composants critiques (`TransactionForm.tsx`)
- Configurer GitHub Actions pour tests auto

---

## 📈 Métriques Techniques

| Métrique | Valeur |
|----------|--------|
| **Lignes de code** | ~30,000+ |
| **Composants** | 150+ |
| **Hooks** | 47 |
| **Pages** | 32 |
| **Edge Functions** | 15+ |
| **Tables DB** | 50+ |

---

## 🔗 Technologies Utilisées

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| UI | Tailwind CSS + shadcn/ui |
| State | React Query (TanStack) |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Validation | Zod |
| Charts | Recharts |
| Forms | React Hook Form |

---

## 📝 Conventions de Code

- **Hooks** : `use[Nom]` (camelCase)
- **Composants** : `[Nom].tsx` (PascalCase)
- **Pages** : `[Nom].tsx` (PascalCase)
- **Services** : `[Nom].ts` (camelCase)
- **Types** : `I[Nom]` ou `[Nom]Type`

---

*Document généré le 11/02/2026*

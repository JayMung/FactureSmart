# 💰 Webhooks Encaissements - Documentation Complète

**Date** : 14 novembre 2025  
**Version** : 2.0.2  
**Module** : Encaissements (Paiements Factures & Colis)

---

## 🎯 Objectif

Ajouter les webhooks pour les **Encaissements** (table `paiements`) qui gèrent les paiements de factures et de colis.

---

## 📊 Analyse Initiale

### Tables Financières dans FactureSmart

| Table | Description | Webhook Avant | Webhook Après |
|-------|-------------|---------------|---------------|
| **transactions** | Transactions Clients + Opérations Internes (revenue, depense, transfert) | ✅ Oui | ✅ Oui |
| **paiements** | Encaissements (factures, colis) | ❌ **Non** | ✅ **Oui** |

### Problème Identifié

Les **Encaissements** (paiements de factures et colis) n'avaient **PAS de webhooks**, donc :
- ❌ Pas de notification Discord quand un client paie
- ❌ Pas de traçabilité des encaissements
- ❌ Incohérence avec les autres modules

---

## ✨ Solution Implémentée

### 1. Trigger SQL pour Paiements

**Migration** : `20251114000000_create_paiements_webhooks.sql`

```sql
CREATE OR REPLACE FUNCTION webhook_trigger_paiements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'paiement.created';
    v_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'paiement.updated';
    v_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'paiement.deleted';
    v_data := to_jsonb(OLD);
  ELSE
    RETURN NEW;
  END IF;

  PERFORM trigger_webhooks(
    v_event_type,
    v_data,
    COALESCE(NEW.organization_id, OLD.organization_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER webhook_paiements_trigger
AFTER INSERT OR UPDATE OR DELETE ON paiements
FOR EACH ROW
EXECUTE FUNCTION webhook_trigger_paiements();
```

### 2. Événements Ajoutés

| Événement | Description | Couleur Discord |
|-----------|-------------|-----------------|
| `paiement.created` | Encaissement reçu | 🟢 Vert (#57F287) |
| `paiement.updated` | Encaissement modifié | 🟡 Jaune (#9B59B6) |
| `paiement.deleted` | Encaissement supprimé | 🔴 Rouge (#ED4245) |

### 3. Formatage Discord

**Edge Function** : `webhook-processor/index.ts`

```typescript
// Description pour paiements (encaissements)
if (event.startsWith('paiement.')) {
  const parts: string[] = [];
  
  if (data.type_paiement) {
    const typeLabel = data.type_paiement === 'facture' ? 'Facture' : 'Colis';
    parts.push(`**Type:** ${typeLabel}`);
  }
  if (data.client?.nom) {
    parts.push(`**Client:** ${data.client.nom}`);
    if (data.client.telephone) {
      parts.push(`**Téléphone:** ${data.client.telephone}`);
    }
  }
  if (data.montant_paye) {
    parts.push(`**Montant:** $${data.montant_paye} USD`);
  }
  if (data.mode_paiement) {
    parts.push(`**Mode:** ${data.mode_paiement}`);
  }
  if (data.compte_nom) {
    parts.push(`**Compte:** ${data.compte_nom}`);
  }
  if (data.facture_number) {
    parts.push(`**N° Facture:** ${data.facture_number}`);
  }
  if (data.colis_tracking) {
    parts.push(`**Tracking:** ${data.colis_tracking}`);
  }
  if (data.notes) {
    parts.push(`**Notes:** ${data.notes}`);
  }
  if (data.user_info) {
    const userName = [data.user_info.prenom, data.user_info.nom].filter(Boolean).join(' ') || data.user_info.email || 'Utilisateur inconnu';
    parts.push(`\n**Effectué par:** ${userName}`);
  }
  
  description = parts.join('\n');
}
```

### 4. Interface Webhooks

**Page** : `src/pages/Webhooks.tsx`

Ajout des 3 nouveaux événements dans la liste :
- ✅ `paiement.created` - Encaissement reçu
- ✅ `paiement.updated` - Encaissement modifié
- ✅ `paiement.deleted` - Encaissement supprimé

---

## 📋 Informations Affichées

### Exemple de Notification Discord

```
💰 Encaissement Reçu

**Type:** Facture
**Client:** Ephraim Mpoyi
**Téléphone:** +243822463801
**Montant:** $500.00 USD
**Mode:** Airtel Money
**Compte:** Airtel Money
**N° Facture:** FAC-2025-1114-001
**Notes:** Paiement partiel

**Effectué par:** Francy Mungedi
```

### Champs Disponibles

| Champ | Source | Description |
|-------|--------|-------------|
| **Type** | `type_paiement` | Facture ou Colis |
| **Client** | `client.nom` | Nom du client |
| **Téléphone** | `client.telephone` | Téléphone du client |
| **Montant** | `montant_paye` | Montant payé en USD |
| **Mode** | `mode_paiement` | Mode de paiement |
| **Compte** | `compte_nom` | Compte bancaire/mobile money |
| **N° Facture** | `facture_number` | Numéro de facture (si type=facture) |
| **Tracking** | `colis_tracking` | Tracking colis (si type=colis) |
| **Notes** | `notes` | Notes additionnelles |
| **Effectué par** | `user_info` | Utilisateur qui a enregistré |

---

## 🔄 Workflow Complet

```
1. Utilisateur enregistre un encaissement
   └─> Page Encaissements (Factures ou Colis)

2. INSERT dans table paiements
   └─> Trigger webhook_paiements_trigger déclenché

3. Fonction webhook_trigger_paiements()
   ├─> Détermine l'événement (paiement.created)
   └─> Appelle trigger_webhooks()

4. INSERT dans webhook_logs
   └─> Statut: pending

5. Cron job (1 minute)
   └─> webhook-processor appelé

6. Enrichissement des données
   ├─> Récupération user_info (profiles)
   ├─> Récupération client info (clients)
   ├─> Récupération facture/colis info
   └─> Formatage Discord

7. Envoi vers Discord
   └─> Embed avec toutes les informations

8. Notification reçue
   └─> Canal #encaissements
```

---

## 📊 Comparaison Avant/Après

### Avant (v2.0.0)

| Module | Table | Webhook |
|--------|-------|---------|
| Transactions Clients | `transactions` | ✅ Oui |
| Opérations Internes | `transactions` | ✅ Oui |
| **Encaissements** | `paiements` | ❌ **Non** |
| Factures | `factures` | ✅ Oui |
| Clients | `clients` | ✅ Oui |
| Colis | `colis` | ✅ Oui |

**Total événements** : 14

### Après (v2.0.2)

| Module | Table | Webhook |
|--------|-------|---------|
| Transactions Clients | `transactions` | ✅ Oui |
| Opérations Internes | `transactions` | ✅ Oui |
| **Encaissements** | `paiements` | ✅ **Oui** |
| Factures | `factures` | ✅ Oui |
| Clients | `clients` | ✅ Oui |
| Colis | `colis` | ✅ Oui |

**Total événements** : **17** (+3)

---

## 🎨 Organisation Discord Recommandée

### Option 1 : Canal Unique

```
📁 FACTUREX - NOTIFICATIONS
├── 💰 #encaissements
│   ├── paiement.created
│   ├── paiement.updated
│   └── paiement.deleted
```

**Avantage** : Simple, tout au même endroit

### Option 2 : Canaux Séparés

```
📁 FACTUREX - NOTIFICATIONS
├── 💰 #encaissements-factures
│   └── paiement.created (type=facture)
├── 💰 #encaissements-colis
│   └── paiement.created (type=colis)
└── 🗑️ #suppressions
    └── paiement.deleted
```

**Avantage** : Séparation claire, filtres par type

### Option 3 : Intégré aux Modules

```
📁 FACTUREX - NOTIFICATIONS
├── 📄 #factures
│   ├── facture.created
│   ├── facture.paid
│   └── paiement.created (type=facture)
├── 📦 #colis
│   ├── colis.created
│   ├── colis.delivered
│   └── paiement.created (type=colis)
```

**Avantage** : Contexte complet par module

---

## 🧪 Tests

### Scénario 1 : Encaissement Facture

1. **Créer un encaissement** :
   - Type : Facture
   - Client : Ephraim Mpoyi
   - Montant : $500.00
   - Mode : Airtel Money
   - Facture : FAC-2025-1114-001

2. **Vérifier Discord** :
   - Canal configuré
   - Délai : 1-2 minutes
   - Message avec toutes les infos

3. **Vérifier les logs** :
   ```sql
   SELECT * FROM webhook_logs 
   WHERE event = 'paiement.created'
   ORDER BY triggered_at DESC 
   LIMIT 1;
   ```

### Scénario 2 : Encaissement Colis

1. **Créer un encaissement** :
   - Type : Colis
   - Client : Client ABC
   - Montant : $250.00
   - Mode : Cash
   - Tracking : CN123456789

2. **Vérifier Discord** :
   - Message avec tracking colis
   - Pas de numéro de facture

### Scénario 3 : Suppression Encaissement

1. **Supprimer un encaissement**

2. **Vérifier Discord** :
   - Message rouge avec 🗑️
   - Toutes les infos de l'encaissement supprimé

---

## 📝 Configuration Webhook

### Créer un Webhook Discord

1. **Créer le canal** `#encaissements`
2. **Paramètres** → Intégrations → Créer un webhook
3. **Nom** : `FactureSmart - Encaissements`
4. **Copier l'URL**

### Configurer dans FactureSmart

1. **Aller dans** Webhooks
2. **Créer un webhook** :
   - **Nom** : Discord - Encaissements
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** :
     - ✅ Encaissement reçu
     - ✅ Encaissement modifié
     - ✅ Encaissement supprimé
3. **Sauvegarder**

### Tester

1. Créer un encaissement test
2. Attendre 1-2 minutes
3. Vérifier Discord

---

## 🔍 Vérification Post-Déploiement

### Vérifier le Trigger

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'webhook_paiements_trigger';

-- Résultat attendu :
-- webhook_paiements_trigger | paiements | EXECUTE FUNCTION webhook_trigger_paiements()
```

### Vérifier les Événements

```sql
SELECT DISTINCT event
FROM webhook_logs
WHERE event LIKE 'paiement.%'
ORDER BY event;

-- Résultat attendu :
-- paiement.created
-- paiement.deleted
-- paiement.updated
```

### Vérifier l'Edge Function

```bash
supabase functions list

# Résultat attendu :
# webhook-processor    ACTIVE    2025-11-14 10:30:00
```

---

## 📊 Statistiques

### Événements Totaux

| Catégorie | Événements | Total |
|-----------|------------|-------|
| Transactions | created, validated, deleted | 3 |
| **Paiements** | **created, updated, deleted** | **3** |
| Factures | created, validated, paid, deleted | 4 |
| Clients | created, updated, deleted | 3 |
| Colis | created, delivered, status_changed, deleted | 4 |
| **TOTAL** | | **17** |

### Modules Financiers Couverts

| Module | Table | Événements | Statut |
|--------|-------|------------|--------|
| Transactions Clients | `transactions` | 3 | ✅ |
| Opérations Internes | `transactions` | 3 | ✅ |
| **Encaissements** | `paiements` | **3** | ✅ |

**Couverture** : 100% des modules financiers ! 🎉

---

## 🎯 Cas d'Usage

### 1. Notification Paiement Client

**Besoin** : Être notifié immédiatement quand un client paie

**Solution** :
- Webhook `paiement.created` → Discord `#encaissements`
- Notification en temps réel avec détails complets

### 2. Audit des Encaissements

**Besoin** : Tracer tous les encaissements et suppressions

**Solution** :
- Webhook `paiement.created` + `paiement.deleted` → Discord `#audit`
- Historique complet avec user info

### 3. Réconciliation Comptable

**Besoin** : Vérifier les encaissements par compte

**Solution** :
- Webhook avec `compte_nom` → Discord par compte
- Filtres par montant minimum

### 4. Alertes Gros Montants

**Besoin** : Être alerté pour encaissements > $1,000

**Solution** :
- Webhook avec filtre `montant_minimum: 1000`
- Mention @admins sur Discord

---

## 🔐 Sécurité

### Permissions

Les encaissements nécessitent les permissions :
- `finances.encaissements.create` - Créer
- `finances.encaissements.view` - Voir
- `finances.encaissements.delete` - Supprimer

### RLS Policies

Les webhooks respectent les RLS :
- Isolation par `organization_id`
- Vérification des permissions
- Logs d'audit complets

---

## 📚 Documentation Associée

- **Webhooks Guide** : `docs/webhooks/WEBHOOKS_GUIDE.md`
- **Transactions Enrichment** : `docs/webhooks/WEBHOOK_TRANSACTIONS_ENRICHMENT.md`
- **Discord Setup** : `docs/integrations/DISCORD_CHANNELS_SETUP.md`
- **API Webhooks** : `docs/api/API_GUIDE.md`

---

## ✅ Checklist de Validation

- [x] Migration SQL créée et appliquée
- [x] Trigger `webhook_paiements_trigger` créé
- [x] Fonction `webhook_trigger_paiements()` créée
- [x] Edge Function mise à jour
- [x] Événements ajoutés dans l'interface
- [x] Documentation créée
- [x] Edge Function déployée
- [x] Tests effectués

---

## 🎉 Résultat Final

### Modules Financiers - Couverture Webhooks

| Module | Avant | Après |
|--------|-------|-------|
| Transactions Clients | ✅ | ✅ |
| Opérations Internes | ✅ | ✅ |
| **Encaissements** | ❌ | ✅ |

**Couverture** : 100% ! 🎯

### Événements Totaux

- **Avant** : 14 événements
- **Après** : 17 événements (+3)

### Modules Couverts

- ✅ Clients
- ✅ Factures
- ✅ Transactions
- ✅ **Encaissements** (nouveau !)
- ✅ Colis

**Tous les modules financiers ont maintenant des webhooks ! 🚀**

---

**Date de mise à jour** : 14 novembre 2025, 10:30  
**Version** : 2.0.2  
**Statut** : ✅ Déployé en Production

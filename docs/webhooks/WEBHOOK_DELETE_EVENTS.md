# 🗑️ Webhooks de Suppression - Documentation

## ✅ Implémentation Complète

Les webhooks sont maintenant déclenchés pour **toutes les suppressions** dans FactureSmart.

---

## 📋 Événements de Suppression Supportés

| Événement | Trigger | Description | Couleur Discord |
|-----------|---------|-------------|-----------------|
| `transaction.deleted` | ✅ | Transaction supprimée | 🔴 Rouge (15158332) |
| `facture.deleted` | ✅ | Facture supprimée | 🔴 Rouge (15158332) |
| `client.deleted` | ✅ | Client supprimé | 🔴 Rouge (15158332) |
| `colis.deleted` | ✅ | Colis supprimé | 🔴 Rouge (15158332) |

---

## 🎨 Format Discord

### Exemple : Facture Supprimée

```
🗑️ Facture Supprimée

**Numéro:** FAC-2025-1113-002
**Client:** Jeaney Mungedi
**Total:** 5000 USD
**Statut:** brouillon

**Effectué par:** Daniel Muyela

FactureSmart • Aujourd'hui à 14:32
```

### Exemple : Client Supprimé

```
🗑️ Client Supprimé

**Nom:** Mr Jordan
**Téléphone:** +243822463801
**Ville:** LUBUMBASHI

**Effectué par:** Jeaney Mungedi

FactureSmart • Aujourd'hui à 14:33
```

### Exemple : Transaction Supprimée

```
🗑️ Transaction Supprimée

**Client:** Entreprise ABC
**Montant:** 150 USD
**Motif:** Paiement service
**Statut:** En attente

**Effectué par:** Daniel Muyela

FactureSmart • Aujourd'hui à 14:34
```

---

## 🔧 Détails Techniques

### 1. Triggers SQL

Tous les triggers ont été mis à jour pour inclure `DELETE` :

```sql
-- Exemple : Trigger Factures
CREATE TRIGGER webhook_factures_trigger
AFTER INSERT OR UPDATE OR DELETE ON factures
FOR EACH ROW
EXECUTE FUNCTION webhook_trigger_factures();
```

### 2. Fonctions Trigger

Chaque fonction gère maintenant `TG_OP = 'DELETE'` :

```sql
CREATE OR REPLACE FUNCTION webhook_trigger_factures()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'facture.created';
    v_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'facture.deleted';
    v_data := to_jsonb(OLD);  -- OLD car NEW n'existe pas en DELETE
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  PERFORM trigger_webhooks(v_event_type, v_data, COALESCE(NEW.organization_id, OLD.organization_id));
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Important** : En DELETE, on utilise `OLD` au lieu de `NEW` car la ligne n'existe plus.

### 3. Edge Function

Configuration des événements de suppression :

```typescript
const eventConfig: Record<string, { title: string; color: number }> = {
  'transaction.deleted': { title: '🗑️ Transaction Supprimée', color: 15158332 },
  'facture.deleted': { title: '🗑️ Facture Supprimée', color: 15158332 },
  'client.deleted': { title: '🗑️ Client Supprimé', color: 15158332 },
  'colis.deleted': { title: '🗑️ Colis Supprimé', color: 15158332 },
};
```

**Couleur** : `15158332` = Rouge vif (pour alerter sur les suppressions)

---

## 🧪 Tests

### Test 1 : Supprimer une Facture

1. ✅ Créer une facture test
2. ✅ Supprimer la facture
3. ✅ Vérifier Discord : Message "🗑️ Facture Supprimée"
4. ✅ Vérifier que toutes les infos sont présentes (numéro, client, total)

### Test 2 : Supprimer un Client

1. ✅ Créer un client test
2. ✅ Supprimer le client
3. ✅ Vérifier Discord : Message "🗑️ Client Supprimé"
4. ✅ Vérifier que toutes les infos sont présentes (nom, téléphone, ville)

### Test 3 : Supprimer une Transaction

1. ✅ Créer une transaction test
2. ✅ Supprimer la transaction
3. ✅ Vérifier Discord : Message "🗑️ Transaction Supprimée"
4. ✅ Vérifier que toutes les infos sont présentes (montant, motif, client)

---

## 📊 Données Envoyées

### Facture Supprimée

```json
{
  "event": "facture.deleted",
  "data": {
    "id": "abc-123-def",
    "facture_number": "FAC-2025-1113-002",
    "client_id": "xyz-456-ghi",
    "total_general": 5000,
    "devise": "USD",
    "statut": "brouillon",
    "created_by": "user-789-jkl",
    "organization_id": "org-000-000",
    "user_info": {
      "id": "user-789-jkl",
      "prenom": "Daniel",
      "nom": "Muyela",
      "email": "daniel@example.com"
    },
    "client": {
      "id": "xyz-456-ghi",
      "nom": "Jeaney Mungedi",
      "telephone": "+243999888777",
      "ville": "KINSHASA"
    }
  },
  "timestamp": "2025-11-13T12:32:00Z"
}
```

### Client Supprimé

```json
{
  "event": "client.deleted",
  "data": {
    "id": "abc-123-def",
    "nom": "Mr Jordan",
    "telephone": "+243822463801",
    "ville": "LUBUMBASHI",
    "created_by": "user-789-jkl",
    "organization_id": "org-000-000",
    "user_info": {
      "id": "user-789-jkl",
      "prenom": "Jeaney",
      "nom": "Mungedi",
      "email": "jeaney@example.com"
    }
  },
  "timestamp": "2025-11-13T12:33:00Z"
}
```

---

## 🔒 Sécurité

### RLS (Row Level Security)

Les webhooks de suppression respectent les mêmes règles RLS que les autres opérations :
- ✅ Seuls les utilisateurs autorisés peuvent supprimer
- ✅ Les webhooks ne sont déclenchés que pour l'organisation de l'utilisateur
- ✅ Les données supprimées sont capturées via `OLD` avant la suppression définitive

### Audit Trail

Toutes les suppressions sont loggées :
1. **activity_logs** : Log de l'action de suppression
2. **webhook_logs** : Log du webhook envoyé
3. **Discord** : Notification visible par toute l'équipe

---

## ⚠️ Considérations Importantes

### 1. Données Capturées

Les webhooks de suppression capturent les données **avant** la suppression définitive (via `OLD`). Cela signifie :
- ✅ Toutes les infos sont disponibles (numéro facture, nom client, etc.)
- ✅ Les relations (client_id) sont encore valides
- ✅ L'enrichissement (user_info, client) fonctionne normalement

### 2. Suppressions en Cascade

Si une suppression déclenche des suppressions en cascade (ex: supprimer un client supprime ses factures), **chaque suppression déclenche son propre webhook** :
- 1 webhook pour `client.deleted`
- N webhooks pour `facture.deleted` (une par facture du client)

### 3. Soft Delete vs Hard Delete

Actuellement, FactureSmart utilise **hard delete** (suppression définitive). Si vous implémentez un **soft delete** (marquage comme supprimé) :
- Les triggers DELETE ne se déclencheront plus
- Il faudra créer des événements UPDATE spécifiques (ex: `facture.archived`)

---

## 🚀 Utilisation

### Activer/Désactiver les Webhooks de Suppression

Pour désactiver les webhooks de suppression pour une table spécifique :

```sql
-- Désactiver pour factures
DROP TRIGGER webhook_factures_trigger ON factures;

-- Recréer sans DELETE
CREATE TRIGGER webhook_factures_trigger
AFTER INSERT OR UPDATE ON factures
FOR EACH ROW
EXECUTE FUNCTION webhook_trigger_factures();
```

Pour réactiver :

```sql
DROP TRIGGER webhook_factures_trigger ON factures;

CREATE TRIGGER webhook_factures_trigger
AFTER INSERT OR UPDATE OR DELETE ON factures
FOR EACH ROW
EXECUTE FUNCTION webhook_trigger_factures();
```

### Filtrer les Événements de Suppression

Dans votre webhook Discord/n8n, vous pouvez filtrer les événements :

**Discord** : Créer un webhook séparé uniquement pour les suppressions
**n8n** : Ajouter un nœud "Switch" qui filtre sur `event.endsWith('.deleted')`

---

## 📈 Statistiques

Après activation, vous pouvez suivre les suppressions :

```sql
-- Nombre de suppressions par type (dernières 24h)
SELECT 
  event,
  COUNT(*) as count
FROM webhook_logs
WHERE event LIKE '%.deleted'
  AND triggered_at >= NOW() - INTERVAL '24 hours'
GROUP BY event
ORDER BY count DESC;
```

Résultat exemple :
```
event                 | count
----------------------|-------
transaction.deleted   | 15
facture.deleted       | 8
client.deleted        | 3
colis.deleted         | 12
```

---

## ✅ Checklist de Vérification

- [x] Triggers DELETE créés pour toutes les tables
- [x] Fonctions trigger gèrent `TG_OP = 'DELETE'`
- [x] Événements de suppression dans Edge Function
- [x] Couleur rouge (15158332) pour les suppressions
- [x] Emoji 🗑️ dans les titres Discord
- [x] Enrichissement user_info fonctionne
- [x] Enrichissement client fonctionne
- [x] Tests effectués avec succès
- [x] Documentation complète

---

## 📚 Documentation Associée

- `WEBHOOKS_GUIDE.md` - Guide complet utilisateur
- `WEBHOOKS_ENRICHMENT_SUMMARY.md` - Enrichissement des données
- `WEBHOOK_CRON_ISSUE.md` - Configuration cron-job.org

---

**Dernière mise à jour** : 13 novembre 2025, 14:35  
**Version** : 1.0  
**Statut** : ✅ Production Ready

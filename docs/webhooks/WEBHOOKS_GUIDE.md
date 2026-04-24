# 🔔 Guide Complet des Webhooks - FactureSmart

Guide détaillé sur le fonctionnement, la configuration et le test des webhooks dans FactureSmart.

## 📋 Table des Matières

- [Comment ça Fonctionne](#comment-ça-fonctionne)
- [Configuration](#configuration)
- [Tester les Webhooks](#tester-les-webhooks)
- [Événements Disponibles](#événements-disponibles)
- [Formats de Payload](#formats-de-payload)
- [Sécurité](#sécurité)
- [Troubleshooting](#troubleshooting)

---

## 🔄 Comment ça Fonctionne

### Architecture Complète

```
┌─────────────────────────────────────────────────────────────┐
│  1. Action dans FactureSmart                                    │
│     (Créer transaction, valider facture, livrer colis...)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Database Trigger PostgreSQL                             │
│     - trigger_webhooks() appelé automatiquement             │
│     - Vérifie les webhooks actifs pour cet événement        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Filtrage                                                │
│     - Montant minimum (ex: >= 500 USD)                      │
│     - Devise spécifique (ex: USD seulement)                 │
│     - Client spécifique (ex: client VIP)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Création du Log                                         │
│     - INSERT dans webhook_logs (status: pending)            │
│     - Payload formaté selon le format (JSON/Discord/etc)    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Edge Function (Traitement Asynchrone)                   │
│     - Récupère les logs "pending"                           │
│     - Formate selon le format choisi                        │
│     - Signe avec HMAC secret                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Envoi HTTP POST                                         │
│     - POST vers l'URL configurée                            │
│     - Headers: Content-Type, X-Webhook-Signature           │
│     - Body: Payload formaté                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Mise à Jour du Log                                      │
│     - Status: success/failed                                │
│     - Response status code                                  │
│     - Error message si échec                                │
│     - Retry automatique si échec (3 tentatives)             │
└─────────────────────────────────────────────────────────────┘
```

### Déclenchement Automatique

Les webhooks se déclenchent **automatiquement** grâce aux triggers PostgreSQL :

| Table | Trigger | Événements |
|-------|---------|------------|
| `transactions` | `webhook_transactions_trigger` | INSERT → `transaction.created`<br>UPDATE (statut=Servi) → `transaction.validated`<br>DELETE → `transaction.deleted` |
| `factures` | `webhook_factures_trigger` | INSERT → `facture.created`<br>UPDATE (statut=validee) → `facture.validated`<br>UPDATE (statut=payee) → `facture.paid` |
| `clients` | `webhook_clients_trigger` | INSERT → `client.created`<br>UPDATE → `client.updated` |
| `colis` | `webhook_colis_trigger` | INSERT → `colis.created`<br>UPDATE (statut=livre) → `colis.delivered`<br>UPDATE (statut changé) → `colis.status_changed` |

---

## ⚙️ Configuration

### 1. Via l'Interface FactureSmart (Recommandé)

1. **Accéder aux Webhooks**
   - Allez dans **Paramètres > Webhooks**
   - Ou cliquez sur l'onglet **Webhooks** dans les paramètres

2. **Créer un Nouveau Webhook**
   - Cliquez sur **"Nouveau Webhook"**
   - Remplissez le formulaire :

**Champs Requis** :
- **Nom** : `Discord Alertes` (pour identifier le webhook)
- **URL** : `https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN`
- **Format** : Sélectionnez `Discord`, `JSON`, `n8n`, ou `Slack`
- **Événements** : Cochez au moins un événement

**Champs Optionnels** :
- **Secret HMAC** : Laissez vide pour génération automatique
- **Filtres** :
  - Montant minimum : `500` (ne déclenche que si montant >= 500)
  - Devise : `USD` (ne déclenche que pour USD)
  - Client : Sélectionnez un client spécifique

3. **Activer le Webhook**
   - Le webhook est actif par défaut
   - Vous pouvez le désactiver/réactiver avec le toggle

### 2. Via l'API

```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Notifications",
    "url": "https://discord.com/api/webhooks/123/abc",
    "events": ["transaction.validated", "colis.delivered"],
    "format": "discord",
    "filters": {
      "montant_min": 500,
      "devise": "USD"
    }
  }'
```

---

## 🧪 Tester les Webhooks

### Méthode 1 : Test Automatique (SQL)

```sql
-- Tester un webhook spécifique
SELECT test_webhook('webhook_id_ici');

-- Résultat :
{
  "success": true,
  "webhook_id": "...",
  "event_type": "transaction.validated",
  "message": "Test webhook queued successfully",
  "test_data": { ... }
}
```

### Méthode 2 : Créer une Transaction de Test

1. **Via l'Interface FactureSmart** :
   - Allez dans **Finances > Opérations Financières**
   - Créez une nouvelle transaction
   - Montant : `1000 USD` (si vous avez un filtre >= 500)
   - Statut : `Servi`
   - Validez

2. **Le webhook se déclenche automatiquement** :
   - Vérifiez dans **Paramètres > Webhooks**
   - Regardez `last_triggered_at` (doit être récent)
   - Consultez les logs

### Méthode 3 : Webhook.site (Pour Tester l'URL)

1. Allez sur [https://webhook.site](https://webhook.site)
2. Copiez l'URL unique générée
3. Créez un webhook dans FactureSmart avec cette URL
4. Déclenchez un événement (créer transaction)
5. Retournez sur webhook.site pour voir le payload reçu

### Méthode 4 : Discord Test

1. **Créer un Webhook Discord** :
   - Ouvrez Discord
   - Paramètres du serveur > Intégrations > Webhooks
   - Créez un nouveau webhook
   - Copiez l'URL

2. **Configurer dans FactureSmart** :
   - Nom : `Test Discord`
   - URL : Collez l'URL Discord
   - Format : `Discord`
   - Événements : `transaction.validated`

3. **Tester** :
   - Créez une transaction et marquez-la comme "Servi"
   - Vérifiez Discord → vous devriez voir un embed riche

---

## 📊 Événements Disponibles

### Transactions (3 événements)

| Événement | Quand | Données Incluses |
|-----------|-------|------------------|
| `transaction.created` | Nouvelle transaction créée | montant, devise, client, motif, mode_paiement |
| `transaction.validated` | Transaction marquée "Servi" | Toutes les données + bénéfice |
| `transaction.deleted` | Transaction supprimée | ID, montant, client |

### Factures (3 événements)

| Événement | Quand | Données Incluses |
|-----------|-------|------------------|
| `facture.created` | Nouvelle facture/devis créé | numero, client, total, articles |
| `facture.validated` | Facture validée | Toutes les données |
| `facture.paid` | Facture marquée payée | Toutes les données + paiements |

### Clients (2 événements)

| Événement | Quand | Données Incluses |
|-----------|-------|------------------|
| `client.created` | Nouveau client ajouté | nom, téléphone, ville |
| `client.updated` | Client modifié | Toutes les données |

### Colis (3 événements)

| Événement | Quand | Données Incluses |
|-----------|-------|------------------|
| `colis.created` | Nouveau colis créé | type, poids, montant, tracking |
| `colis.delivered` | Colis marqué "livré" | Toutes les données |
| `colis.status_changed` | Statut changé | ancien_statut, nouveau_statut, toutes données |

---

## 📦 Formats de Payload

### Format JSON (Standard)

```json
{
  "event": "transaction.validated",
  "timestamp": "2025-01-13T12:00:00Z",
  "data": {
    "id": "uuid",
    "date_paiement": "2025-01-13",
    "montant": 1000,
    "devise": "USD",
    "motif": "Paiement client",
    "statut": "Servi",
    "benefice": 50,
    "client": {
      "nom": "John Doe",
      "telephone": "+243 123 456 789"
    }
  },
  "webhook_id": "uuid",
  "organization_id": "uuid"
}
```

### Format Discord

```json
{
  "embeds": [{
    "title": "💰 Transaction Servie",
    "color": 3066993,
    "fields": [
      {
        "name": "👤 Client",
        "value": "John Doe",
        "inline": true
      },
      {
        "name": "💵 Montant",
        "value": "1000 USD",
        "inline": true
      },
      {
        "name": "📊 Bénéfice",
        "value": "50 USD",
        "inline": true
      },
      {
        "name": "📝 Motif",
        "value": "Paiement client",
        "inline": false
      }
    ],
    "footer": {
      "text": "FactureSmart API"
    },
    "timestamp": "2025-01-13T12:00:00Z"
  }],
  "username": "FactureSmart Bot"
}
```

### Format n8n

```json
{
  "event": "transaction.validated",
  "timestamp": "2025-01-13T12:00:00Z",
  "data": { ... },
  "metadata": {
    "source": "facturex-api",
    "version": "1.0"
  }
}
```

### Format Slack

```json
{
  "text": "New transaction.validated event",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*transaction.validated*\n..."
      }
    }
  ]
}
```

---

## 🔒 Sécurité

### Signature HMAC

Chaque webhook est signé avec un secret HMAC pour vérifier l'authenticité.

**Header envoyé** :
```
X-Webhook-Signature: sha256=abc123...
```

**Vérification (Node.js)** :
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Utilisation
const isValid = verifyWebhook(
  req.body,
  req.headers['x-webhook-signature'],
  'votre_hmac_secret'
);
```

**Vérification (Python)** :
```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    digest = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, digest)
```

### Best Practices

- ✅ **Toujours vérifier la signature HMAC**
- ✅ **Utiliser HTTPS** pour l'URL du webhook
- ✅ **Limiter les tentatives** (rate limiting côté récepteur)
- ✅ **Logger les événements** pour audit
- ✅ **Timeout court** (5-10 secondes max)
- ✅ **Répondre rapidement** (200 OK) puis traiter en async

---

## 📈 Monitoring

### Voir les Logs d'un Webhook

```sql
-- Via SQL
SELECT * FROM get_webhook_logs('webhook_id', 10);

-- Résultat :
id | event_type | status | triggered_at | sent_at | response_status | error_message
---|------------|--------|--------------|---------|-----------------|---------------
...| transaction.validated | success | 2025-01-13 12:00 | 2025-01-13 12:00 | 200 | null
```

### Via l'Interface FactureSmart

1. Allez dans **Paramètres > Webhooks**
2. Cliquez sur un webhook
3. Consultez l'historique des déclenchements
4. Filtrez par statut (success/failed/pending)

### Statistiques

```sql
-- Nombre de webhooks déclenchés aujourd'hui
SELECT COUNT(*) 
FROM webhook_logs 
WHERE triggered_at >= CURRENT_DATE;

-- Taux de succès
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM webhook_logs
WHERE triggered_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status;
```

---

## 🐛 Troubleshooting

### Webhook ne se Déclenche Pas

**Vérifications** :
1. ✅ Le webhook est-il **actif** ? (toggle ON)
2. ✅ L'événement est-il **sélectionné** ?
3. ✅ Les **filtres** sont-ils trop restrictifs ?
   - Montant minimum trop élevé ?
   - Devise incorrecte ?
4. ✅ Vérifiez les logs : `SELECT * FROM webhook_logs ORDER BY triggered_at DESC LIMIT 10;`

### Webhook en Status "Pending"

**Cause** : L'Edge Function n'a pas encore traité le webhook

**Solution** :
- Attendez quelques secondes
- Vérifiez que l'Edge Function `api-webhooks` est déployée
- Consultez les logs Supabase

### Webhook en Status "Failed"

**Causes possibles** :
1. **URL invalide** : Vérifiez l'URL
2. **Timeout** : Le serveur distant ne répond pas assez vite
3. **Erreur 4xx/5xx** : Le serveur distant rejette la requête

**Solution** :
```sql
-- Voir l'erreur exacte
SELECT error_message, response_status
FROM webhook_logs
WHERE status = 'failed'
ORDER BY triggered_at DESC
LIMIT 1;
```

### Discord : Embed ne s'Affiche Pas

**Vérifications** :
1. ✅ Format sélectionné = `Discord`
2. ✅ URL Discord correcte (contient `/api/webhooks/`)
3. ✅ Permissions du webhook Discord (Envoyer des messages)
4. ✅ Testez avec webhook.site d'abord

---

## 📝 Exemples Pratiques

### Exemple 1 : Alertes Transactions VIP

**Objectif** : Notifier Discord pour chaque transaction > $1000

**Configuration** :
- Nom : `Alertes VIP`
- URL : `https://discord.com/api/webhooks/...`
- Format : `Discord`
- Événements : `transaction.validated`
- Filtres : Montant min = `1000`

### Exemple 2 : Synchronisation CRM

**Objectif** : Envoyer les nouveaux clients à un CRM externe

**Configuration** :
- Nom : `CRM Sync`
- URL : `https://votre-crm.com/api/webhooks`
- Format : `JSON`
- Événements : `client.created`
- Pas de filtres

### Exemple 3 : Workflow n8n

**Objectif** : Déclencher un workflow n8n complexe

**Configuration** :
- Nom : `n8n Workflow`
- URL : `https://votre-n8n.com/webhook/facturex`
- Format : `n8n`
- Événements : `transaction.validated`, `facture.paid`
- Filtres : Devise = `USD`

---

## 🎓 Ressources

- **[Guide API Complet](./API_README.md)**
- **[Intégration n8n](./N8N_INTEGRATION_GUIDE.md)**
- **[Guide des Clés API](./API_KEYS_INTERFACE_GUIDE.md)**

---

**Questions ? Besoin d'aide ?** Contactez le support FactureSmart ! 🚀

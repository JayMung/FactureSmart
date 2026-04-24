# 📚 FactureSmart API - Guide Complet

Guide complet pour utiliser l'API externe de FactureSmart avec n8n, Discord, et autres intégrations.

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Endpoints Disponibles](#endpoints-disponibles)
4. [Webhooks](#webhooks)
5. [Intégration n8n](#intégration-n8n)
6. [Intégration Discord](#intégration-discord)
7. [Exemples de Code](#exemples-de-code)
8. [Limites et Quotas](#limites-et-quotas)
9. [Gestion des Erreurs](#gestion-des-erreurs)

---

## 🎯 Introduction

L'API FactureSmart permet d'accéder à vos données de manière programmatique pour créer des automatisations, des dashboards personnalisés, ou des intégrations avec des outils tiers comme n8n, Discord, Slack, etc.

### Caractéristiques

- ✅ **RESTful** : Architecture REST standard
- ✅ **Sécurisée** : Authentification par clés API avec permissions granulaires
- ✅ **Rate Limited** : Protection contre les abus
- ✅ **Webhooks** : Notifications en temps réel
- ✅ **Multi-format** : JSON, Discord Embeds, n8n compatible

### Base URL

```
https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1
```

---

## 🔐 Authentification

### Types de Clés API

| Type | Préfixe | Permissions | Rate Limit | Usage |
|------|---------|-------------|------------|-------|
| **Public** | `pk_live_` | Lecture seule (stats) | 100/h | Dashboards publics |
| **Secret** | `sk_live_` | Lecture + Webhooks | 1000/h | Intégrations (n8n, Discord) |
| **Admin** | `ak_live_` | Accès complet | 5000/h | Administration |

### Créer une Clé API

1. Connectez-vous à FactureSmart
2. Allez dans **Paramètres** > **API**
3. Cliquez sur **Générer une clé**
4. Choisissez le type et les permissions
5. **Copiez la clé immédiatement** (elle ne sera plus affichée)

### Headers Requis

Toutes les requêtes doivent inclure ces headers :

```http
X-API-Key: sk_live_votre_clé_secrète
X-Organization-ID: org_votre_organisation_id
Content-Type: application/json
```

### Exemple de Requête

```bash
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?status=Servi&limit=10" \
  -H "X-API-Key: sk_live_abc123..." \
  -H "X-Organization-ID: org_xyz789..."
```

---

## 📡 Endpoints Disponibles

### 1. GET /api-transactions

Récupère les transactions avec filtres avancés.

**Permissions requises** : `read:transactions`

#### Query Parameters

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `status` | string | Statut de la transaction | `Servi`, `En attente` |
| `currency` | string | Devise | `USD`, `CDF` |
| `client_id` | UUID | ID du client | `abc-123-def` |
| `date_from` | date | Date de début | `2024-01-01` |
| `date_to` | date | Date de fin | `2024-12-31` |
| `min_amount` | number | Montant minimum | `100` |
| `max_amount` | number | Montant maximum | `10000` |
| `motif` | string | Recherche dans le motif | `Commande` |
| `type_transaction` | string | Type | `revenue`, `depense`, `transfert` |
| `limit` | number | Nombre de résultats (max 100) | `50` |
| `offset` | number | Pagination | `0` |

#### Exemple de Réponse

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_123",
        "date_paiement": "2024-01-15T10:30:00Z",
        "montant": 500,
        "devise": "USD",
        "motif": "Commande client",
        "frais": 25,
        "benefice": 10,
        "mode_paiement": "Mobile Money",
        "statut": "Servi",
        "type_transaction": "revenue",
        "client": {
          "id": "cli_456",
          "nom": "Jean Dupont",
          "telephone": "+243...",
          "ville": "Kinshasa"
        }
      }
    ]
  },
  "meta": {
    "generated_at": "2024-01-20T15:30:00Z",
    "organization_id": "org_789",
    "response_time_ms": 45
  },
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### 2. GET /api-clients

Récupère la liste des clients.

**Permissions requises** : `read:clients`

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | string | Recherche par nom/téléphone |
| `ville` | string | Filtre par ville |
| `has_transactions` | boolean | Clients avec transactions |
| `min_total` | number | Montant total minimum |
| `limit` | number | Nombre de résultats (max 100) |
| `offset` | number | Pagination |

#### Exemple de Réponse

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "cli_123",
        "nom": "Jean Dupont",
        "telephone": "+243...",
        "ville": "Kinshasa",
        "total_paye": 5000,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### 3. GET /api-factures

Récupère les factures et devis.

**Permissions requises** : `read:factures`

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `type` | string | `facture` ou `devis` |
| `statut` | string | `validee`, `en_attente`, `brouillon` |
| `client_id` | UUID | ID du client |
| `date_from` | date | Date de début |
| `date_to` | date | Date de fin |
| `include_items` | boolean | Inclure les articles |
| `limit` | number | Nombre de résultats |
| `offset` | number | Pagination |

### 4. GET /api-stats

Récupère les statistiques du tableau de bord.

**Permissions requises** : `read:stats`

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `period` | string | `24h`, `7d`, `30d`, `90d`, `custom` |
| `date_from` | date | Date de début (si custom) |
| `date_to` | date | Date de fin (si custom) |
| `group_by` | string | `day`, `week`, `month` |
| `currency` | string | `USD`, `CDF`, `both` |

#### Exemple de Réponse

```json
{
  "success": true,
  "data": {
    "stats": {
      "total_usd": 15000,
      "total_cdf": 5000000,
      "total_frais": 750,
      "total_benefice": 300,
      "nombre_transactions": 45,
      "nombre_clients": 12,
      "evolution": {
        "revenue_change": 15.5,
        "transaction_change": 8.2,
        "client_change": 3.1
      }
    },
    "graph_data": {
      "daily": [
        { "date": "2024-01-15", "revenue": 500, "transactions": 3 },
        { "date": "2024-01-16", "revenue": 750, "transactions": 5 }
      ]
    }
  }
}
```

---

## 🔔 Webhooks

Les webhooks permettent de recevoir des notifications en temps réel lorsque des événements se produisent dans FactureSmart.

### Événements Disponibles

| Événement | Description |
|-----------|-------------|
| `transaction.created` | Nouvelle transaction créée |
| `transaction.validated` | Transaction passée à "Servi" |
| `transaction.deleted` | Transaction supprimée |
| `facture.created` | Nouvelle facture/devis |
| `facture.validated` | Facture validée |
| `facture.paid` | Facture marquée comme payée |
| `client.created` | Nouveau client ajouté |
| `client.updated` | Client mis à jour |
| `colis.delivered` | Colis marqué comme livré |

### Créer un Webhook

#### Via l'Interface

1. Allez dans **Paramètres** > **Webhooks**
2. Cliquez sur **Nouveau Webhook**
3. Configurez :
   - **Nom** : Identifiant du webhook
   - **URL** : Votre endpoint (Discord, n8n, etc.)
   - **Événements** : Sélectionnez les événements
   - **Format** : `json`, `discord`, `slack`, `n8n`
   - **Filtres** : Conditions optionnelles

#### Via l'API

```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Transactions",
    "url": "https://discord.com/api/webhooks/...",
    "events": ["transaction.created", "transaction.validated"],
    "format": "discord",
    "filters": {
      "montant_min": 1000,
      "devise": "USD"
    }
  }'
```

### Payload Webhook

#### Format JSON

```json
{
  "event": "transaction.created",
  "timestamp": "2024-01-20T15:30:00Z",
  "organization_id": "org_123",
  "data": {
    "id": "txn_456",
    "montant": 500,
    "devise": "USD",
    "client": {
      "nom": "Jean Dupont"
    }
  },
  "signature": "sha256=abc123..." // HMAC signature
}
```

#### Format Discord

```json
{
  "embeds": [{
    "title": "💰 Transaction Servie",
    "color": 3066993,
    "fields": [
      {
        "name": "👤 Client",
        "value": "Jean Dupont",
        "inline": true
      },
      {
        "name": "💵 Montant",
        "value": "$500 USD",
        "inline": true
      }
    ],
    "timestamp": "2024-01-20T15:30:00Z"
  }]
}
```

### Vérification de Signature

Pour sécuriser vos webhooks, vérifiez la signature HMAC :

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

---

## 🔧 Intégration n8n

### Étape 1 : Configurer les Identifiants

1. Dans n8n, créez un nouveau **Credential**
2. Type : **HTTP Header Auth**
3. Ajoutez les headers :
   - `X-API-Key` : `sk_live_votre_clé`
   - `X-Organization-ID` : `org_votre_org`

### Étape 2 : Créer un Workflow

#### Exemple : Récupérer les Transactions du Jour

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions",
        "authentication": "headerAuth",
        "options": {
          "queryParameters": {
            "status": "Servi",
            "date_from": "={{ $today }}",
            "limit": "100"
          }
        }
      },
      "name": "Récupérer Transactions",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1
    },
    {
      "parameters": {
        "operation": "aggregate",
        "aggregate": "sum",
        "field": "data.transactions[].montant"
      },
      "name": "Calculer Total",
      "type": "n8n-nodes-base.aggregate"
    },
    {
      "parameters": {
        "webhookUrl": "https://discord.com/api/webhooks/...",
        "options": {
          "embeds": [{
            "title": "💰 Rapport du Jour",
            "description": "Total: $={{ $json.sum }}"
          }]
        }
      },
      "name": "Envoyer à Discord",
      "type": "n8n-nodes-base.discord"
    }
  ]
}
```

### Étape 3 : Webhook Entrant (Recevoir les Événements)

1. Créez un node **Webhook** dans n8n
2. Copiez l'URL du webhook
3. Configurez le webhook dans FactureSmart avec cette URL
4. Format : `n8n`

---

## 💬 Intégration Discord

### Étape 1 : Créer un Webhook Discord

1. Dans Discord, allez dans **Paramètres du Serveur** > **Intégrations**
2. Cliquez sur **Webhooks** > **Nouveau Webhook**
3. Nommez-le (ex: "FactureSmart Bot")
4. Copiez l'URL du webhook

### Étape 2 : Configurer dans FactureSmart

```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Alertes",
    "url": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN",
    "events": [
      "transaction.validated",
      "facture.paid"
    ],
    "format": "discord",
    "filters": {
      "montant_min": 500
    }
  }'
```

### Personnalisation des Embeds

Les embeds Discord sont automatiquement formatés avec :
- **Couleurs** : Vert (succès), Orange (en attente), Rouge (erreur)
- **Icônes** : 💰 (transactions), 📄 (factures), 👤 (clients)
- **Champs** : Client, Montant, Date, etc.

---

## 💻 Exemples de Code

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_KEY = 'sk_live_votre_clé';
const ORG_ID = 'org_votre_org';
const BASE_URL = 'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1';

async function getTransactions(filters = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/api-transactions`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Organization-ID': ORG_ID
      },
      params: filters
    });
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Utilisation
getTransactions({ status: 'Servi', limit: 10 })
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### Python

```python
import requests

API_KEY = 'sk_live_votre_clé'
ORG_ID = 'org_votre_org'
BASE_URL = 'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1'

def get_transactions(filters=None):
    headers = {
        'X-API-Key': API_KEY,
        'X-Organization-ID': ORG_ID
    }
    
    response = requests.get(
        f'{BASE_URL}/api-transactions',
        headers=headers,
        params=filters or {}
    )
    
    response.raise_for_status()
    return response.json()

# Utilisation
data = get_transactions({'status': 'Servi', 'limit': 10})
print(data)
```

### cURL

```bash
# Récupérer les transactions
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?status=Servi&limit=10" \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..."

# Récupérer les statistiques
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-stats?period=7d" \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..."
```

---

## ⚡ Limites et Quotas

### Rate Limits

| Type de Clé | Requêtes/Heure | Burst |
|-------------|----------------|-------|
| Public | 100 | 10/min |
| Secret | 1000 | 50/min |
| Admin | 5000 | 100/min |

### Headers de Rate Limit

Chaque réponse inclut ces headers :

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642694400
```

### Limites de Pagination

- **Limite maximale** : 100 résultats par requête
- **Limite par défaut** : 50 résultats
- Utilisez `offset` pour paginer

---

## ❌ Gestion des Erreurs

### Codes d'Erreur

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Clé API invalide ou manquante |
| `FORBIDDEN` | 403 | Permissions insuffisantes |
| `NOT_FOUND` | 404 | Ressource non trouvée |
| `VALIDATION_ERROR` | 400 | Paramètres invalides |
| `RATE_LIMIT_EXCEEDED` | 429 | Trop de requêtes |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

### Format d'Erreur

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 1000 requests per 1h",
    "details": {
      "limit": 1000,
      "window": "1h"
    }
  },
  "meta": {
    "generated_at": "2024-01-20T15:30:00Z",
    "organization_id": "org_123"
  }
}
```

### Retry Strategy

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = response.headers.get('Retry-After') || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## 📞 Support

- **Documentation** : https://facturex.docs
- **Email** : support@facturex.com
- **Discord** : https://discord.gg/facturex

---

## 🔄 Changelog

### v1.0.0 (2025-01-13)
- 🎉 Lancement initial de l'API
- ✅ Endpoints : transactions, clients, factures, stats
- ✅ Webhooks avec formats Discord, n8n, Slack
- ✅ Authentification par clés API
- ✅ Rate limiting
- ✅ Documentation complète

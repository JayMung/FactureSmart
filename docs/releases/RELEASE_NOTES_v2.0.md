# 🚀 FactureSmart v2.0 - Release Notes

**Date de sortie** : 14 novembre 2025  
**Version** : 2.0.0  
**Type** : Major Release  
**Statut** : ✅ Production Ready

---

## 🎯 Vue d'Ensemble

FactureSmart v2.0 est une mise à jour majeure qui introduit l'**API REST complète** et le **système de Webhooks** avec enrichissement des données. Cette version transforme FactureSmart en une plateforme intégrable et extensible.

---

## ✨ Nouvelles Fonctionnalités Majeures

### 🔌 API REST Complète

**5 Endpoints RESTful** avec authentification par clés API :

#### 1. `/api/clients`
- `GET /api/clients` - Liste des clients (pagination, filtres)
- `GET /api/clients/:id` - Détails d'un client
- `POST /api/clients` - Créer un client
- `PUT /api/clients/:id` - Modifier un client
- `DELETE /api/clients/:id` - Supprimer un client

#### 2. `/api/factures`
- `GET /api/factures` - Liste des factures (pagination, filtres)
- `GET /api/factures/:id` - Détails d'une facture avec articles
- `POST /api/factures` - Créer une facture
- `PUT /api/factures/:id` - Modifier une facture
- `DELETE /api/factures/:id` - Supprimer une facture

#### 3. `/api/transactions`
- `GET /api/transactions` - Liste des transactions
- `GET /api/transactions/:id` - Détails d'une transaction
- `POST /api/transactions` - Créer une transaction
- `PUT /api/transactions/:id` - Modifier une transaction
- `DELETE /api/transactions/:id` - Supprimer une transaction

#### 4. `/api/colis`
- `GET /api/colis` - Liste des colis
- `GET /api/colis/:id` - Détails d'un colis
- `POST /api/colis` - Créer un colis
- `PUT /api/colis/:id` - Modifier un colis
- `DELETE /api/colis/:id` - Supprimer un colis

#### 5. `/api/stats`
- `GET /api/stats/dashboard` - Statistiques globales
- `GET /api/stats/clients` - Statistiques clients
- `GET /api/stats/factures` - Statistiques factures
- `GET /api/stats/transactions` - Statistiques transactions
- `GET /api/stats/colis` - Statistiques colis

**Caractéristiques** :
- ✅ Authentification par clés API (Bearer token)
- ✅ Permissions granulaires par endpoint
- ✅ Rate limiting (100 requêtes/minute)
- ✅ Pagination automatique (50 items/page)
- ✅ Filtres avancés (dates, statuts, montants)
- ✅ Validation des données
- ✅ Gestion d'erreurs complète
- ✅ Documentation OpenAPI/Swagger

---

### 🔔 Système de Webhooks

**Notifications en temps réel** vers services externes :

#### Formats Supportés
- **Discord** - Embeds riches avec couleurs et emojis
- **Slack** - Messages formatés
- **n8n** - JSON pour workflows
- **JSON Standard** - Format universel

#### Événements Disponibles (14 événements)

**Clients** :
- `client.created` - Client créé
- `client.updated` - Client mis à jour
- `client.deleted` - Client supprimé 🗑️

**Factures** :
- `facture.created` - Facture créée
- `facture.validated` - Facture validée
- `facture.paid` - Facture payée
- `facture.deleted` - Facture supprimée 🗑️

**Transactions** :
- `transaction.created` - Transaction créée
- `transaction.validated` - Transaction validée
- `transaction.deleted` - Transaction supprimée 🗑️

**Colis** :
- `colis.created` - Colis créé
- `colis.delivered` - Colis livré
- `colis.status_changed` - Statut changé
- `colis.deleted` - Colis supprimé 🗑️

#### Enrichissement des Données ✨

**Chaque webhook inclut automatiquement** :
- **User Info** : Nom, prénom, email de l'utilisateur qui a effectué l'action
- **Client Info** : Nom, téléphone, ville du client concerné (si applicable)
- **Données complètes** : Toutes les informations de l'entité

**Exemple de payload Discord** :
```json
{
  "embeds": [{
    "title": "✅ Facture Créée",
    "color": 5763719,
    "fields": [
      {
        "name": "Numéro",
        "value": "FAC-2025-1114-001",
        "inline": true
      },
      {
        "name": "Client",
        "value": "Mr Jordan\n+243822463801\nLUBUMBASHI",
        "inline": true
      },
      {
        "name": "Montant",
        "value": "5,000 USD",
        "inline": true
      },
      {
        "name": "Effectué par",
        "value": "Jeaney Mungedi\nmungedijeancy@gmail.com"
      }
    ],
    "timestamp": "2025-11-14T07:56:00Z"
  }]
}
```

#### Fonctionnalités
- ✅ Filtres par événement
- ✅ Filtres par montant minimum
- ✅ Filtres par devise
- ✅ Retry automatique (3 tentatives)
- ✅ Logs détaillés
- ✅ Désactivation temporaire
- ✅ Test de webhook
- ✅ Statistiques d'envoi

---

### 🔗 Intégrations Tierces

#### Discord
- Configuration complète des canaux
- Organisation recommandée (6 canaux)
- Embeds avec couleurs et emojis
- Support des événements de suppression (rouge)
- Guide détaillé : `docs/integrations/DISCORD_CHANNELS_SETUP.md`

#### n8n
- Workflows automatisés
- Déclencheurs sur événements
- Exemples de scénarios
- Guide complet : `docs/integrations/N8N_INTEGRATION_GUIDE.md`

---

### 🔑 Gestion des Clés API

**Interface complète** dans FactureSmart :

#### Fonctionnalités
- ✅ Création de clés API
- ✅ Permissions granulaires par endpoint
- ✅ Expiration configurable
- ✅ Révocation instantanée
- ✅ Statistiques d'utilisation
- ✅ Dernière utilisation
- ✅ Régénération de clés
- ✅ Copie sécurisée

#### Permissions Disponibles
- `clients:read`, `clients:write`, `clients:delete`
- `factures:read`, `factures:write`, `factures:delete`
- `transactions:read`, `transactions:write`, `transactions:delete`
- `colis:read`, `colis:write`, `colis:delete`
- `stats:read`

#### Sécurité
- Clés hashées en base de données (SHA-256)
- Affichage unique à la création
- Rate limiting par clé
- Logs d'utilisation
- Révocation immédiate

---

## 📚 Documentation

### Nouveaux Documents (12 fichiers)

#### API REST
- `docs/api/API_README.md` - Guide principal
- `docs/api/API_GUIDE.md` - Guide détaillé
- `docs/api/API_IMPLEMENTATION_GUIDE.md` - Implémentation
- `docs/api/API_KEYS_INTERFACE_GUIDE.md` - Gestion des clés
- `docs/api/API_DEPLOYMENT_SUMMARY.md` - Déploiement
- `docs/api/API_FINAL_SUMMARY.md` - Résumé complet

#### Webhooks
- `docs/webhooks/WEBHOOKS_GUIDE.md` - Guide utilisateur
- `docs/webhooks/WEBHOOKS_IMPLEMENTATION_COMPLETE.md` - Technique
- `docs/webhooks/WEBHOOKS_ENRICHMENT_SUMMARY.md` - Enrichissement
- `docs/webhooks/WEBHOOK_DELETE_EVENTS.md` - Événements suppression

#### Intégrations
- `docs/integrations/DISCORD_CHANNELS_SETUP.md` - Configuration Discord
- `docs/integrations/N8N_INTEGRATION_GUIDE.md` - Intégration n8n

### Organisation de la Documentation
- ✅ Structure en sous-dossiers logiques
- ✅ INDEX.md avec index complet
- ✅ README.md mis à jour
- ✅ 120+ documents organisés en 20 catégories

---

## 🔧 Améliorations Techniques

### Edge Functions (7 nouvelles)
- `api-clients` - Endpoint clients
- `api-factures` - Endpoint factures
- `api-transactions` - Endpoint transactions
- `api-colis` - Endpoint colis
- `api-stats` - Endpoint statistiques
- `api-webhooks` - Gestion webhooks
- `webhook-processor` - Traitement webhooks

### Hooks React (2 nouveaux)
- `useApiKeys` - Gestion des clés API
- `useWebhooks` - Gestion des webhooks

### Pages (2 nouvelles)
- `/api-keys` - Interface de gestion des clés API
- `/webhooks` - Interface de gestion des webhooks

### Base de Données
- Table `api_keys` - Stockage sécurisé des clés
- Table `webhooks` - Configuration des webhooks
- Table `webhook_logs` - Logs d'envoi
- Triggers pour événements de suppression
- Fonction `trigger_webhooks()` pour notifications

### Sécurité
- ✅ Authentification par clés API
- ✅ Permissions granulaires
- ✅ Rate limiting (100 req/min)
- ✅ Validation des données
- ✅ Hashage des clés (SHA-256)
- ✅ RLS (Row Level Security)
- ✅ Logs d'audit

---

## 🐛 Corrections de Bugs

### Page Webhooks
- ✅ Ajout des événements de suppression manquants
- ✅ Liste complète des 14 événements

### Enrichissement Webhooks
- ✅ User info correctement récupéré
- ✅ Client info ajouté pour factures/transactions/colis
- ✅ Données complètes dans les payloads

### Triggers Base de Données
- ✅ Support des événements DELETE
- ✅ Utilisation de OLD pour données supprimées
- ✅ Triggers sur toutes les tables

---

## 📊 Statistiques de la Release

| Métrique | Valeur |
|----------|--------|
| **Fichiers modifiés** | 38 |
| **Lignes ajoutées** | 10,856 |
| **Nouveaux fichiers** | 29 |
| **Edge Functions** | 7 |
| **Endpoints API** | 25+ |
| **Événements Webhooks** | 14 |
| **Documentation** | 12 fichiers |
| **Commits** | 3 |

---

## 🚀 Migration depuis v1.0.3

### Étapes de Migration

#### 1. Base de Données
```sql
-- Exécuter la migration
-- Migration déjà appliquée : 20250113000000_create_api_keys_system.sql
```

#### 2. Edge Functions
```bash
# Déployer les nouvelles Edge Functions
supabase functions deploy api-clients
supabase functions deploy api-factures
supabase functions deploy api-transactions
supabase functions deploy api-colis
supabase functions deploy api-stats
supabase functions deploy api-webhooks
supabase functions deploy webhook-processor
```

#### 3. Configuration Webhooks (Optionnel)
```bash
# Configurer cron-job.org pour webhook-processor
# URL: https://[project-ref].supabase.co/functions/v1/webhook-processor
# Fréquence: Chaque minute
```

#### 4. Frontend
```bash
# Installer les dépendances (si nouvelles)
npm install

# Build
npm run build

# Déployer
```

### Compatibilité
- ✅ **Rétrocompatible** avec v1.0.3
- ✅ Aucune modification des fonctionnalités existantes
- ✅ Nouvelles fonctionnalités optionnelles
- ✅ Pas de breaking changes

---

## 📖 Guides de Démarrage Rapide

### Utiliser l'API REST

1. **Créer une clé API** :
   - Aller dans FactureSmart → API Keys
   - Cliquer sur "Créer une clé API"
   - Sélectionner les permissions
   - Copier la clé (affichée une seule fois)

2. **Faire une requête** :
   ```bash
   curl -X GET \
     'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-clients' \
     -H 'Authorization: Bearer YOUR_API_KEY'
   ```

3. **Consulter la documentation** :
   - Guide complet : `docs/api/API_GUIDE.md`
   - Exemples : `docs/api/API_README.md`

### Configurer les Webhooks

1. **Créer un webhook Discord** :
   - Discord → Paramètres du canal → Intégrations → Créer un webhook
   - Copier l'URL

2. **Configurer dans FactureSmart** :
   - Aller dans FactureSmart → Webhooks
   - Cliquer sur "Créer un webhook"
   - Coller l'URL Discord
   - Sélectionner format "Discord"
   - Choisir les événements
   - Sauvegarder

3. **Tester** :
   - Créer une facture test
   - Vérifier Discord (délai max 1-2 minutes)

4. **Guide complet** :
   - Configuration Discord : `docs/integrations/DISCORD_CHANNELS_SETUP.md`
   - Guide webhooks : `docs/webhooks/WEBHOOKS_GUIDE.md`

---

## 🎯 Cas d'Usage

### 1. Intégration Mobile App
```javascript
// Récupérer les factures depuis une app mobile
const response = await fetch(
  'https://[project-ref].supabase.co/functions/v1/api-factures?page=1&limit=20',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);
const data = await response.json();
```

### 2. Notifications Discord
- Créer un canal `#factures` sur Discord
- Configurer un webhook pour `facture.created`, `facture.paid`
- Recevoir des notifications en temps réel avec détails complets

### 3. Workflows n8n
- Déclencher un workflow quand une facture est payée
- Envoyer un email de confirmation au client
- Mettre à jour un Google Sheet
- Créer une tâche dans Notion

### 4. Synchronisation Externe
- Synchroniser les clients avec un CRM externe
- Exporter les factures vers un système comptable
- Importer des colis depuis un système logistique

---

## ⚠️ Notes Importantes

### Rate Limiting
- **Limite** : 100 requêtes par minute par clé API
- **Réponse** : HTTP 429 si dépassé
- **Header** : `X-RateLimit-Remaining` indique le nombre restant

### Webhooks
- **Délai** : 1-2 minutes (cron-job.org)
- **Retry** : 3 tentatives automatiques
- **Timeout** : 10 secondes par requête

### Sécurité
- **Clés API** : Affichées une seule fois à la création
- **Révocation** : Immédiate et définitive
- **Logs** : Toutes les actions sont loggées

---

## 🔮 Prochaines Étapes (v2.1)

### Fonctionnalités Prévues
- [ ] Webhooks en temps réel (WebSockets)
- [ ] API GraphQL
- [ ] Webhooks signatures (HMAC)
- [ ] Webhooks batch (groupés)
- [ ] API versioning (v2)
- [ ] Rate limiting configurable
- [ ] Webhooks conditionnels (filtres avancés)
- [ ] Intégration Zapier
- [ ] SDK JavaScript/TypeScript
- [ ] SDK Python

---

## 👥 Contributeurs

- **Jeaney Mungedi** - Développement principal
- **Équipe FactureSmart** - Tests et feedback

---

## 📞 Support

### Documentation
- API : `docs/api/`
- Webhooks : `docs/webhooks/`
- Intégrations : `docs/integrations/`
- Index complet : `docs/INDEX.md`

### Contact
- Email : support@facturex.com
- GitHub : https://github.com/JayMung/FactureSmart
- Discord : [Lien du serveur]

---

## 🎉 Remerciements

Merci à tous les utilisateurs qui ont testé et fourni des retours sur les versions beta de l'API et des webhooks.

---

**FactureSmart v2.0** - API REST & Webhooks 🚀

**Date de release** : 14 novembre 2025  
**Statut** : ✅ Production Ready  
**Télécharger** : [GitHub Releases](https://github.com/JayMung/FactureSmart/releases/tag/v2.0.0)

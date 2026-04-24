# 🚀 Guide d'Implémentation de l'API FactureSmart

Guide étape par étape pour déployer et utiliser l'API FactureSmart.

## 📋 Prérequis

- ✅ Compte Supabase actif
- ✅ Projet FactureSmart déployé
- ✅ Accès administrateur à FactureSmart
- ✅ (Optionnel) Compte Upstash Redis pour rate limiting avancé

---

## 🔧 Étape 1 : Appliquer la Migration SQL

### Via Supabase MCP (Recommandé)

```typescript
// Utiliser l'outil Supabase MCP dans Windsurf
mcp2_apply_migration({
  project_id: 'ddnxtuhswmewoxrwswzg',
  name: 'create_api_keys_system',
  query: '... contenu du fichier 20250113000000_create_api_keys_system.sql ...'
})
```

### Via Supabase CLI

```bash
cd c:\Users\jkmun\dyad-apps\FactureSmart
supabase db push
```

### Via Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez le contenu de `supabase/migrations/20250113000000_create_api_keys_system.sql`
5. Exécutez la requête

### Vérification

```sql
-- Vérifier que les tables sont créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_keys', 'webhooks', 'api_audit_logs', 'webhook_logs');

-- Devrait retourner 4 lignes
```

---

## 📦 Étape 2 : Déployer les Edge Functions

### Déployer toutes les fonctions

```bash
# Déployer la fonction api-transactions
supabase functions deploy api-transactions

# Déployer les autres fonctions (à créer)
supabase functions deploy api-clients
supabase functions deploy api-factures
supabase functions deploy api-stats
supabase functions deploy api-webhooks
```

### Configurer les Variables d'Environnement

```bash
# Variables Supabase (déjà configurées)
supabase secrets set SUPABASE_URL=https://ddnxtuhswmewoxrwswzg.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Variables Upstash Redis (optionnel, pour rate limiting)
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your_token
```

### Tester le Déploiement

```bash
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions" \
  -H "X-API-Key: test" \
  -H "X-Organization-ID: test"

# Devrait retourner une erreur 401 (normal, clé invalide)
```

---

## 🔑 Étape 3 : Créer votre Première Clé API

### Via l'Interface FactureSmart (À Développer)

1. Connectez-vous à FactureSmart
2. Allez dans **Paramètres** > **API**
3. Cliquez sur **Générer une clé**
4. Configurez :
   - **Nom** : "n8n Production"
   - **Type** : Secret
   - **Permissions** : `read:transactions`, `read:clients`, `write:webhooks`
   - **Expiration** : 90 jours
5. **Copiez la clé immédiatement**

### Via SQL (Temporaire)

```sql
-- Créer une clé API manuellement
WITH new_key AS (
  SELECT 
    'sk_live_' || encode(gen_random_bytes(32), 'hex') AS api_key
)
INSERT INTO api_keys (
  organization_id,
  name,
  key_hash,
  key_prefix,
  type,
  permissions,
  is_active,
  expires_at,
  created_by
)
SELECT 
  (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1),
  'Test API Key',
  encode(digest(api_key, 'sha256'), 'hex'),
  'sk_live_',
  'secret',
  ARRAY['read:transactions', 'read:clients', 'write:webhooks'],
  true,
  NOW() + INTERVAL '90 days',
  auth.uid()
FROM new_key
RETURNING 
  id,
  name,
  key_prefix || '...' AS key_preview,
  type,
  permissions;

-- ⚠️ IMPORTANT : La clé complète n'est pas retournée
-- Vous devez la générer via l'interface ou l'API
```

---

## 🧪 Étape 4 : Tester l'API

### Test 1 : Récupérer les Transactions

```bash
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?status=Servi&limit=5" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: votre_org_id"
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "transactions": [...]
  },
  "pagination": {
    "total": 150,
    "limit": 5,
    "offset": 0,
    "has_more": true
  }
}
```

### Test 2 : Vérifier les Permissions

```bash
# Avec une clé publique (devrait échouer)
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions" \
  -H "X-API-Key: pk_live_votre_clé_publique" \
  -H "X-Organization-ID: votre_org_id"

# Devrait retourner 403 Forbidden
```

### Test 3 : Vérifier le Rate Limiting

```bash
# Envoyer 10 requêtes rapidement
for i in {1..10}; do
  curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions" \
    -H "X-API-Key: sk_live_votre_clé" \
    -H "X-Organization-ID: votre_org_id"
done

# Les headers de réponse devraient inclure :
# X-RateLimit-Remaining: 990, 989, 988...
```

---

## 🔔 Étape 5 : Configurer un Webhook

### Webhook Discord

```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: votre_org_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Alertes Transactions",
    "url": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN",
    "events": ["transaction.validated"],
    "format": "discord",
    "filters": {
      "montant_min": 500,
      "devise": "USD"
    }
  }'
```

### Webhook n8n

```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: votre_org_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Workflow",
    "url": "https://your-n8n.com/webhook/facturex",
    "events": ["transaction.created", "facture.validated"],
    "format": "n8n"
  }'
```

### Tester le Webhook

1. Créez une transaction dans FactureSmart
2. Vérifiez que le webhook est déclenché
3. Consultez les logs dans `webhook_logs`

```sql
-- Voir les derniers webhooks déclenchés
SELECT 
  w.name,
  wl.event,
  wl.response_status,
  wl.error_message,
  wl.triggered_at
FROM webhook_logs wl
JOIN webhooks w ON w.id = wl.webhook_id
WHERE wl.organization_id = 'votre_org_id'
ORDER BY wl.triggered_at DESC
LIMIT 10;
```

---

## 📊 Étape 6 : Monitorer l'Utilisation

### Dashboard SQL

```sql
-- Statistiques d'utilisation API (dernières 24h)
SELECT * FROM get_api_usage_stats('votre_org_id', 24);

-- Clés API actives
SELECT 
  name,
  type,
  key_prefix,
  permissions,
  last_used_at,
  expires_at
FROM api_keys
WHERE organization_id = 'votre_org_id'
AND is_active = true
ORDER BY last_used_at DESC;

-- Webhooks actifs
SELECT 
  name,
  url,
  events,
  format,
  last_triggered_at,
  failure_count
FROM webhooks
WHERE organization_id = 'votre_org_id'
AND is_active = true;
```

### Logs d'Audit

```sql
-- Dernières requêtes API
SELECT 
  ak.name AS api_key_name,
  aal.endpoint,
  aal.method,
  aal.status_code,
  aal.response_time_ms,
  aal.created_at
FROM api_audit_logs aal
JOIN api_keys ak ON ak.id = aal.api_key_id
WHERE aal.organization_id = 'votre_org_id'
ORDER BY aal.created_at DESC
LIMIT 50;

-- Erreurs récentes
SELECT 
  endpoint,
  status_code,
  error_message,
  COUNT(*) as error_count
FROM api_audit_logs
WHERE organization_id = 'votre_org_id'
AND status_code >= 400
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, status_code, error_message
ORDER BY error_count DESC;
```

---

## 🔐 Étape 7 : Sécurité et Bonnes Pratiques

### Rotation des Clés

```sql
-- Désactiver une clé compromise
UPDATE api_keys
SET is_active = false
WHERE id = 'key_id'
AND organization_id = 'votre_org_id';

-- Créer une nouvelle clé de remplacement
-- (Utiliser l'interface ou l'API)
```

### Nettoyage Automatique

```sql
-- Créer un cron job pour nettoyer les clés expirées
SELECT cron.schedule(
  'cleanup-expired-api-keys',
  '0 2 * * *', -- Tous les jours à 2h du matin
  $$
  SELECT cleanup_expired_api_keys();
  $$
);

-- Nettoyer les vieux logs (> 90 jours)
SELECT cron.schedule(
  'cleanup-old-api-logs',
  '0 3 * * 0', -- Tous les dimanches à 3h
  $$
  DELETE FROM api_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
```

### Alertes de Sécurité

```sql
-- Créer une fonction pour détecter les abus
CREATE OR REPLACE FUNCTION detect_api_abuse()
RETURNS TABLE (
  api_key_id UUID,
  key_name TEXT,
  error_rate NUMERIC,
  request_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.api_key_id,
    ak.name,
    ROUND(
      (COUNT(*) FILTER (WHERE aal.status_code >= 400)::NUMERIC / COUNT(*)::NUMERIC) * 100,
      2
    ) as error_rate,
    COUNT(*) as request_count
  FROM api_audit_logs aal
  JOIN api_keys ak ON ak.id = aal.api_key_id
  WHERE aal.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY aal.api_key_id, ak.name
  HAVING COUNT(*) > 100 -- Plus de 100 requêtes/heure
  AND COUNT(*) FILTER (WHERE aal.status_code >= 400) > 50 -- Plus de 50 erreurs
  ORDER BY error_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la détection
SELECT * FROM detect_api_abuse();
```

---

## 🎯 Étape 8 : Intégrations Avancées

### n8n : Workflow Complet

Voir `docs/N8N_INTEGRATION.md` pour des exemples détaillés.

### Discord : Bot Personnalisé

Voir `docs/DISCORD_WEBHOOKS.md` pour la configuration avancée.

### Zapier : Connecteur Personnalisé

1. Créez un compte développeur Zapier
2. Utilisez les endpoints API comme actions/triggers
3. Publiez votre intégration

---

## 🐛 Dépannage

### Erreur 401 : Unauthorized

**Causes possibles** :
- Clé API invalide ou expirée
- Organization ID incorrect
- Clé désactivée

**Solution** :
```sql
-- Vérifier la clé
SELECT 
  name,
  is_active,
  expires_at,
  organization_id
FROM api_keys
WHERE key_prefix = 'sk_live_' -- Remplacer par votre préfixe
AND organization_id = 'votre_org_id';
```

### Erreur 403 : Forbidden

**Cause** : Permissions insuffisantes

**Solution** :
```sql
-- Vérifier les permissions
SELECT permissions
FROM api_keys
WHERE id = 'key_id';

-- Ajouter des permissions
UPDATE api_keys
SET permissions = array_append(permissions, 'read:transactions')
WHERE id = 'key_id';
```

### Erreur 429 : Rate Limit

**Cause** : Trop de requêtes

**Solution** :
- Attendre la fin de la fenêtre de rate limit
- Upgrader vers une clé Admin
- Implémenter un système de cache côté client

### Webhooks ne se déclenchent pas

**Vérifications** :
```sql
-- Vérifier que le webhook est actif
SELECT * FROM webhooks WHERE id = 'webhook_id';

-- Vérifier les logs d'erreur
SELECT * FROM webhook_logs 
WHERE webhook_id = 'webhook_id'
ORDER BY triggered_at DESC
LIMIT 10;
```

---

## 📚 Ressources

- **Documentation API** : `docs/API_GUIDE.md`
- **Intégration n8n** : `docs/N8N_INTEGRATION.md`
- **Webhooks Discord** : `docs/DISCORD_WEBHOOKS.md`
- **Support** : support@facturex.com

---

## ✅ Checklist de Déploiement

- [ ] Migration SQL appliquée
- [ ] Edge Functions déployées
- [ ] Variables d'environnement configurées
- [ ] Première clé API créée
- [ ] Tests API réussis
- [ ] Webhook configuré et testé
- [ ] Monitoring en place
- [ ] Documentation partagée avec l'équipe
- [ ] Rotation des clés planifiée
- [ ] Alertes de sécurité configurées

---

**Félicitations ! Votre API FactureSmart est prête à l'emploi ! 🎉**

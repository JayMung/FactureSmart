# 🚀 FactureSmart v2.0 - Guide de Déploiement

**Version** : 2.0.0  
**Date** : 14 novembre 2025  
**Statut** : Production Ready

---

## 📋 Pré-requis

### Environnement
- ✅ Node.js 18+
- ✅ npm ou pnpm
- ✅ Supabase CLI
- ✅ Git
- ✅ Compte Supabase (projet existant)

### Accès Requis
- ✅ Accès au projet Supabase
- ✅ Droits d'administration sur la base de données
- ✅ Accès au dépôt GitHub

---

## 🔄 Checklist de Déploiement

### Phase 1 : Préparation (15 min)

- [ ] Backup de la base de données
- [ ] Vérifier que v1.0.3 fonctionne correctement
- [ ] Lire les release notes complètes
- [ ] Préparer les clés API Discord/Slack (si webhooks)

### Phase 2 : Base de Données (10 min)

- [ ] Exécuter la migration `20250113000000_create_api_keys_system.sql`
- [ ] Vérifier les triggers de webhooks
- [ ] Tester les permissions RLS

### Phase 3 : Edge Functions (20 min)

- [ ] Déployer `api-clients`
- [ ] Déployer `api-factures`
- [ ] Déployer `api-transactions`
- [ ] Déployer `api-colis`
- [ ] Déployer `api-stats`
- [ ] Déployer `api-webhooks`
- [ ] Déployer `webhook-processor`

### Phase 4 : Frontend (15 min)

- [ ] Pull du code depuis GitHub
- [ ] Installer les dépendances
- [ ] Build de production
- [ ] Déployer sur l'hébergement

### Phase 5 : Configuration (10 min)

- [ ] Configurer cron-job.org pour webhooks
- [ ] Créer une clé API de test
- [ ] Tester les endpoints API
- [ ] Configurer un webhook Discord de test

### Phase 6 : Tests (20 min)

- [ ] Tester création de client via API
- [ ] Tester création de facture via UI
- [ ] Vérifier webhook Discord
- [ ] Tester permissions API
- [ ] Vérifier les logs

### Phase 7 : Documentation (5 min)

- [ ] Partager les release notes avec l'équipe
- [ ] Documenter les clés API créées
- [ ] Mettre à jour la documentation interne

---

## 📝 Instructions Détaillées

### 1. Backup de la Base de Données

```bash
# Via Supabase CLI
supabase db dump -f backup_v1.0.3_$(date +%Y%m%d).sql

# Ou via Dashboard Supabase
# Settings → Database → Backups → Create backup
```

---

### 2. Migration Base de Données

#### Option A : Via Supabase Dashboard

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. SQL Editor → New Query
4. Copier le contenu de `supabase/migrations/20250113000000_create_api_keys_system.sql`
5. Exécuter
6. Vérifier : `SELECT * FROM api_keys LIMIT 1;`

#### Option B : Via Supabase CLI

```bash
# Se connecter au projet
supabase link --project-ref ddnxtuhswmewoxrwswzg

# Appliquer la migration
supabase db push

# Vérifier
supabase db remote commit
```

#### Vérification

```sql
-- Vérifier les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_keys', 'webhooks', 'webhook_logs');

-- Résultat attendu : 3 tables

-- Vérifier les triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%webhook%';

-- Résultat attendu : 4 triggers (clients, factures, transactions, colis)
```

---

### 3. Déploiement des Edge Functions

```bash
# Se positionner dans le projet
cd c:\Users\jkmun\dyad-apps\FactureSmart

# Vérifier la connexion
supabase status

# Déployer toutes les fonctions
supabase functions deploy api-clients --no-verify-jwt
supabase functions deploy api-factures --no-verify-jwt
supabase functions deploy api-transactions --no-verify-jwt
supabase functions deploy api-colis --no-verify-jwt
supabase functions deploy api-stats --no-verify-jwt
supabase functions deploy api-webhooks --no-verify-jwt
supabase functions deploy webhook-processor --no-verify-jwt

# Vérifier le déploiement
supabase functions list
```

#### Résultat Attendu

```
┌──────────────────────┬─────────┬────────────────────────┐
│ NAME                 │ STATUS  │ UPDATED AT             │
├──────────────────────┼─────────┼────────────────────────┤
│ api-clients          │ ACTIVE  │ 2025-11-14 08:00:00    │
│ api-factures         │ ACTIVE  │ 2025-11-14 08:01:00    │
│ api-transactions     │ ACTIVE  │ 2025-11-14 08:02:00    │
│ api-colis            │ ACTIVE  │ 2025-11-14 08:03:00    │
│ api-stats            │ ACTIVE  │ 2025-11-14 08:04:00    │
│ api-webhooks         │ ACTIVE  │ 2025-11-14 08:05:00    │
│ webhook-processor    │ ACTIVE  │ 2025-11-14 08:06:00    │
└──────────────────────┴─────────┴────────────────────────┘
```

---

### 4. Déploiement Frontend

#### Pull du Code

```bash
# Vérifier la branche
git branch
# Devrait afficher : * dev

# Pull des dernières modifications
git pull origin dev

# Vérifier les fichiers
git log --oneline -5
```

#### Installation et Build

```bash
# Installer les dépendances
npm install
# ou
pnpm install

# Build de production
npm run build

# Vérifier le build
ls -la dist/
```

#### Déploiement

**Option A : Vercel/Netlify**
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

**Option B : Serveur Custom**
```bash
# Copier les fichiers dist/ vers le serveur
scp -r dist/* user@server:/var/www/facturex/

# Redémarrer le serveur web
ssh user@server "sudo systemctl restart nginx"
```

---

### 5. Configuration Webhooks (Optionnel)

#### Configurer cron-job.org

1. Aller sur https://cron-job.org
2. Créer un compte (gratuit)
3. Créer un nouveau cron job :
   - **Titre** : FactureSmart Webhook Processor
   - **URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/webhook-processor`
   - **Fréquence** : Chaque minute (`* * * * *`)
   - **Method** : POST
   - **Headers** : 
     ```
     Authorization: Bearer [SUPABASE_ANON_KEY]
     Content-Type: application/json
     ```
4. Sauvegarder et activer

#### Alternative : GitHub Actions

Le fichier `.github/workflows/webhook-processor.yml` est déjà configuré.

Pour l'activer :
```bash
# Vérifier le fichier
cat .github/workflows/webhook-processor.yml

# Push vers GitHub (si pas déjà fait)
git push origin dev

# Activer dans GitHub
# Settings → Actions → Enable workflows
```

---

### 6. Tests de Validation

#### Test 1 : API REST

```bash
# Créer une clé API via l'interface FactureSmart
# Puis tester :

# Test endpoint clients
curl -X GET \
  'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-clients?page=1&limit=5' \
  -H 'Authorization: Bearer YOUR_API_KEY'

# Résultat attendu : Liste des clients avec pagination
```

#### Test 2 : Webhooks

```bash
# 1. Créer un webhook Discord dans FactureSmart
# 2. Créer une facture test
# 3. Attendre 1-2 minutes
# 4. Vérifier Discord

# Vérifier les logs
SELECT * FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Test 3 : Permissions

```bash
# Créer une clé avec permissions limitées (clients:read uniquement)
# Tester lecture (devrait fonctionner)
curl -X GET \
  'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-clients' \
  -H 'Authorization: Bearer LIMITED_API_KEY'

# Tester écriture (devrait échouer avec 403)
curl -X POST \
  'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-clients' \
  -H 'Authorization: Bearer LIMITED_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"nom":"Test"}'

# Résultat attendu : {"error":"Forbidden","message":"Permission denied: clients:write"}
```

#### Test 4 : Rate Limiting

```bash
# Faire 101 requêtes rapidement
for i in {1..101}; do
  curl -X GET \
    'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-clients' \
    -H 'Authorization: Bearer YOUR_API_KEY'
done

# La 101ème devrait retourner 429 Too Many Requests
```

---

## 🔍 Vérifications Post-Déploiement

### Checklist de Vérification

- [ ] Dashboard FactureSmart accessible
- [ ] Page `/api-keys` fonctionne
- [ ] Page `/webhooks` fonctionne
- [ ] Création de clé API fonctionne
- [ ] Endpoints API répondent
- [ ] Webhooks s'envoient correctement
- [ ] Permissions API fonctionnent
- [ ] Rate limiting actif
- [ ] Logs d'audit enregistrés
- [ ] Aucune erreur dans la console

### Requêtes SQL de Vérification

```sql
-- Vérifier les clés API créées
SELECT 
  name, 
  permissions, 
  is_active, 
  expires_at,
  created_at
FROM api_keys
ORDER BY created_at DESC;

-- Vérifier les webhooks configurés
SELECT 
  name, 
  url, 
  format, 
  events, 
  is_active
FROM webhooks
ORDER BY created_at DESC;

-- Vérifier les logs de webhooks
SELECT 
  event_type,
  status,
  response_status,
  created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 20;

-- Vérifier les triggers
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%webhook%';
```

---

## 🐛 Dépannage

### Problème : Edge Functions ne déploient pas

**Solution** :
```bash
# Vérifier la connexion
supabase status

# Se reconnecter
supabase link --project-ref ddnxtuhswmewoxrwswzg

# Réessayer
supabase functions deploy [function-name] --no-verify-jwt
```

### Problème : Webhooks ne s'envoient pas

**Vérifications** :
1. Cron job actif sur cron-job.org ?
2. URL webhook correcte dans la config ?
3. Webhook actif (`is_active = true`) ?
4. Événements sélectionnés ?

**Debug** :
```sql
-- Vérifier les logs
SELECT * FROM webhook_logs 
WHERE status = 'error'
ORDER BY created_at DESC;

-- Vérifier la config
SELECT * FROM webhooks WHERE is_active = true;
```

### Problème : API retourne 401 Unauthorized

**Vérifications** :
1. Clé API valide ?
2. Clé API active (`is_active = true`) ?
3. Clé API non expirée ?
4. Header `Authorization: Bearer [KEY]` correct ?

**Debug** :
```sql
-- Vérifier la clé
SELECT 
  name,
  is_active,
  expires_at,
  last_used_at
FROM api_keys
WHERE key_hash = encode(digest('YOUR_KEY', 'sha256'), 'hex');
```

### Problème : Rate Limiting trop strict

**Solution** :
```sql
-- Augmenter la limite (temporaire)
-- Modifier dans le code de l'Edge Function api-auth.ts
-- Ligne : const MAX_REQUESTS = 100; // Augmenter à 200 par exemple
```

---

## 📊 Monitoring

### Métriques à Surveiller

1. **API Usage** :
   ```sql
   SELECT 
     DATE(last_used_at) as date,
     COUNT(*) as requests
   FROM api_keys
   WHERE last_used_at IS NOT NULL
   GROUP BY DATE(last_used_at)
   ORDER BY date DESC;
   ```

2. **Webhook Success Rate** :
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
   FROM webhook_logs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

3. **Erreurs** :
   ```sql
   SELECT 
     event_type,
     error_message,
     COUNT(*) as occurrences
   FROM webhook_logs
   WHERE status = 'error'
   AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY event_type, error_message
   ORDER BY occurrences DESC;
   ```

---

## 🔐 Sécurité Post-Déploiement

### Actions Recommandées

1. **Créer une clé API admin** :
   - Permissions complètes
   - Expiration : 1 an
   - Stocker en lieu sûr

2. **Créer une clé API read-only** :
   - Permissions : `*:read` uniquement
   - Pour monitoring externe

3. **Configurer les alertes** :
   - Webhook Discord pour erreurs critiques
   - Email pour tentatives d'accès non autorisées

4. **Backup réguliers** :
   - Automatiser les backups quotidiens
   - Tester la restauration

---

## 📞 Support

### En cas de problème

1. **Consulter la documentation** :
   - `docs/api/` - Documentation API
   - `docs/webhooks/` - Documentation Webhooks
   - `docs/troubleshooting/` - Dépannage

2. **Vérifier les logs** :
   - Supabase Dashboard → Logs
   - Table `webhook_logs`
   - Console navigateur

3. **Contacter le support** :
   - Email : support@facturex.com
   - GitHub Issues : https://github.com/JayMung/FactureSmart/issues

---

## ✅ Déploiement Réussi !

Si tous les tests passent, félicitations ! 🎉

FactureSmart v2.0 est maintenant en production avec :
- ✅ API REST complète
- ✅ Système de webhooks
- ✅ Intégrations Discord/n8n
- ✅ Documentation complète

**Prochaines étapes** :
1. Former l'équipe sur les nouvelles fonctionnalités
2. Créer des clés API pour les intégrations
3. Configurer les webhooks Discord
4. Monitorer les performances

---

**Date de déploiement** : 14 novembre 2025  
**Version** : 2.0.0  
**Statut** : ✅ Production

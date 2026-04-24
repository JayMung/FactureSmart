# Guide d'Application des Migrations de Sécurité

Ce guide vous explique comment appliquer les corrections de sécurité critiques (Task 2 et Task 3).

---

## 📋 Prérequis

- Accès au Supabase Dashboard
- Accès SQL Editor dans Supabase
- Backup de votre base de données (recommandé)

---

## 🔐 ÉTAPE 1 : Appliquer les Migrations SQL

### 1.1 Connexion à Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **FactureSmart**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### 1.2 Appliquer la Migration Admin Role

1. Ouvrez le fichier : `supabase/migrations/20250126_fix_admin_role_security.sql`
2. **Copiez tout le contenu** du fichier
3. Dans Supabase SQL Editor, **collez** le contenu
4. Cliquez sur **Run** (ou Ctrl+Enter)
5. Vérifiez qu'il n'y a pas d'erreurs

### 1.3 Appliquer la Migration Organizations

1. Ouvrez le fichier : `supabase/migrations/20250126_create_organizations_and_multi_tenancy.sql`
2. **Copiez tout le contenu** du fichier
3. Dans Supabase SQL Editor, **collez** le contenu
4. Cliquez sur **Run** (ou Ctrl+Enter)
5. Vérifiez qu'il n'y a pas d'erreurs

---

## 👤 ÉTAPE 2 : Créer votre Premier Admin

### 2.1 Identifier votre Email

Trouvez l'email que vous voulez promouvoir en admin :

```sql
-- Voir tous les utilisateurs
SELECT id, email, raw_app_meta_data 
FROM auth.users 
ORDER BY created_at DESC;
```

### 2.2 Promouvoir en Admin

Remplacez `votre-email@example.com` par votre email réel :

```sql
-- Promouvoir un utilisateur en admin
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'votre-email@example.com';
```

### 2.3 Vérifier le Rôle Admin

```sql
-- Vérifier que le rôle admin est bien défini
SELECT 
  id,
  email,
  raw_app_meta_data ->> 'role' as role
FROM auth.users
WHERE email = 'votre-email@example.com';
```

Vous devriez voir `role: admin` dans les résultats.

---

## 🏢 ÉTAPE 3 : Vérifier l'Organisation

### 3.1 Vérifier que l'Organisation Existe

```sql
-- Voir toutes les organisations
SELECT * FROM public.organizations;
```

Vous devriez voir une organisation "Default Organization".

### 3.2 Vérifier que les Profils sont Liés

```sql
-- Voir tous les profils avec leur organisation
SELECT 
  p.id,
  p.email,
  p.organization_id,
  o.name as organization_name
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id;
```

Tous les profils doivent avoir un `organization_id`.

### 3.3 Vérifier que les Données sont Liées

```sql
-- Vérifier les clients
SELECT COUNT(*) as total_clients, organization_id 
FROM public.clients 
GROUP BY organization_id;

-- Vérifier les transactions
SELECT COUNT(*) as total_transactions, organization_id 
FROM public.transactions 
GROUP BY organization_id;

-- Vérifier les factures
SELECT COUNT(*) as total_factures, organization_id 
FROM public.factures 
GROUP BY organization_id;
```

---

## 🧪 ÉTAPE 4 : Tester les Politiques RLS

### 4.1 Tester l'Isolation des Données

Créez un utilisateur de test pour vérifier l'isolation :

```sql
-- Créer une deuxième organisation de test
INSERT INTO public.organizations (name) 
VALUES ('Test Organization')
RETURNING id;

-- Notez l'ID retourné, par exemple: 12345678-1234-1234-1234-123456789012
```

Ensuite, créez un utilisateur de test et assignez-le à cette organisation :

1. Créez un compte via l'interface `/login` → S'inscrire
2. Trouvez l'ID du nouvel utilisateur :

```sql
SELECT id, email FROM auth.users 
WHERE email = 'test@example.com';
```

3. Assignez-le à la Test Organization :

```sql
UPDATE public.profiles 
SET organization_id = '12345678-1234-1234-1234-123456789012'
WHERE email = 'test@example.com';
```

4. **Connectez-vous avec ce compte de test**
5. Vérifiez que vous ne voyez **AUCUNE** donnée de l'organisation par défaut
6. Créez un client de test
7. **Reconnectez-vous avec votre compte admin**
8. Vérifiez que vous ne voyez **PAS** le client créé par le compte de test

✅ Si vous ne voyez pas les données de l'autre organisation, **l'isolation fonctionne !**

---

## 💻 ÉTAPE 5 : Mettre à Jour le Code de l'Application

### 5.1 Commit et Push

```bash
# Ajouter tous les fichiers modifiés
git add .

# Commit
git commit -m "security: fix admin role and implement multi-tenancy RLS"

# Push vers dev
git push origin dev

# Merge vers main
git checkout main
git merge dev
git push origin main
```

### 5.2 Redéployer

**Sur Vercel :**
- Les variables d'environnement sont déjà configurées
- Le redéploiement se fait automatiquement après le push

**Sur VPS :**
```bash
# Connectez-vous au VPS
ssh votre-user@votre-vps

# Pull les changements
cd /chemin/vers/FactureSmart
git pull origin main

# Rebuild
npm run build

# Restart
pm2 restart facturex
```

---

## ✅ ÉTAPE 6 : Vérification Finale

### 6.1 Checklist de Sécurité

- [ ] Migration admin role appliquée
- [ ] Migration organizations appliquée
- [ ] Au moins un admin créé
- [ ] Toutes les tables ont `organization_id`
- [ ] Les politiques RLS sont actives
- [ ] Test d'isolation réussi
- [ ] Code déployé en production
- [ ] Variables d'environnement configurées

### 6.2 Tests de Sécurité

1. **Test Admin :**
   - Connectez-vous avec le compte admin
   - Vérifiez que vous pouvez supprimer des clients/transactions
   - Vérifiez que vous voyez toutes les données de votre organisation

2. **Test Utilisateur Normal :**
   - Créez un compte utilisateur normal
   - Vérifiez qu'il ne peut PAS supprimer de clients/transactions
   - Vérifiez qu'il voit uniquement les données de son organisation

3. **Test Isolation :**
   - Créez 2 organisations différentes
   - Créez des utilisateurs dans chaque organisation
   - Vérifiez que les données sont complètement isolées

---

## 🚨 En Cas de Problème

### Erreur : "organization_id cannot be null"

Si vous voyez cette erreur lors de la création de données :

1. Vérifiez que votre profil a un `organization_id` :
```sql
SELECT id, email, organization_id 
FROM public.profiles 
WHERE id = auth.uid();
```

2. Si `organization_id` est NULL, assignez-le :
```sql
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE id = auth.uid();
```

### Erreur : "permission denied for table"

Vérifiez que RLS est activé et que les politiques existent :

```sql
-- Vérifier RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Voir les politiques
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Rollback en Cas de Problème Majeur

Si vous devez annuler les migrations :

```sql
-- ATTENTION : Ceci supprimera les colonnes organization_id
-- Utilisez uniquement en cas d'urgence

ALTER TABLE public.clients DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.factures DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.settings DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
DROP TABLE IF EXISTS public.organizations CASCADE;
```

---

## 📊 Résumé des Changements

| Composant | Avant | Après |
|-----------|-------|-------|
| **Admin Role** | `user_metadata` (client) | `app_metadata` (serveur) ✅ |
| **Route /admin-setup** | Publique | Désactivée en production ✅ |
| **Isolation données** | Aucune | Par organisation ✅ |
| **RLS Policies** | `USING (true)` | `USING (organization_id = ...)` ✅ |
| **Sécurité** | 🔴 Critique | 🟢 Sécurisé ✅ |

---

## 🎯 Prochaines Étapes

Une fois ces migrations appliquées, vous aurez corrigé **3 des 4 vulnérabilités CRITIQUES** :

- ✅ Task 1 : Credentials en variables d'environnement
- ✅ Task 2 : Admin role sécurisé
- ✅ Task 3 : RLS policies avec isolation

Il reste :
- ⏳ Task 4 : Fixer le CSP (Content Security Policy)
- ⏳ Tasks 5-10 : Vulnérabilités HIGH priority

Voulez-vous continuer avec la Task 4 (CSP) ou préférez-vous d'abord tester les migrations actuelles ?

---

**Date de création :** 26 janvier 2025  
**Version :** 1.0  
**Auteur :** Security Team

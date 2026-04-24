# Configuration des URLs d'emails Supabase

## 🚨 Problème
Les emails de confirmation redirigent vers `localhost:3000` au lieu de `https://facturex.coccinelledrc.com`

## ✅ Solution

### 1. Configurer l'URL du site dans Supabase Dashboard

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **FactureSmart**
3. Allez dans **Authentication** > **URL Configuration**
4. Configurez les URLs suivantes :

#### **Site URL**
```
https://facturex.coccinelledrc.com
```

#### **Redirect URLs** (ajoutez toutes ces URLs)
```
https://facturex.coccinelledrc.com/**
https://facturex.coccinelledrc.com/login
https://facturex.coccinelledrc.com/auth/callback
http://localhost:3000/** (pour le développement local)
```

### 2. Configuration des Email Templates

Dans **Authentication** > **Email Templates**, assurez-vous que les redirections utilisent :

#### Pour Confirm signup :
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

#### Pour Magic Link :
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
```

#### Pour Reset Password :
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery
```

#### Pour Invite User :
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite
```

### 3. Variables d'environnement (optionnel)

Si vous utilisez des variables d'environnement, vérifiez qu'elles pointent vers la bonne URL :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
VITE_SITE_URL=https://facturex.coccinelledrc.com
```

### 4. Vérification

Après configuration :
1. Testez l'inscription d'un nouvel utilisateur
2. Vérifiez que l'email reçu contient le bon lien
3. Cliquez sur le lien pour confirmer qu'il redirige vers `facturex.coccinelledrc.com`

## 📝 Notes importantes

- **Site URL** : C'est l'URL principale de votre application en production
- **Redirect URLs** : Liste des URLs autorisées pour les redirections OAuth
- Les wildcards `**` permettent toutes les routes sous ce domaine
- Gardez `localhost:3000` pour le développement local

## 🔒 Sécurité

- Ne supprimez jamais toutes les redirect URLs sans en ajouter de nouvelles
- Utilisez HTTPS en production
- Limitez les redirect URLs aux domaines que vous contrôlez

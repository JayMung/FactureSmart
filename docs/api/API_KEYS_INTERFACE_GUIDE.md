# 🎨 Interface de Gestion des Clés API - Guide Complet

## ✅ Ce qui a été créé

### 1. **Page de Gestion des Clés API** ✅
**Fichier** : `src/pages/ApiKeys.tsx`

**Fonctionnalités** :
- ✅ Liste de toutes les clés API
- ✅ Création de nouvelles clés
- ✅ Suppression de clés
- ✅ Affichage sécurisé (masquage/affichage)
- ✅ Copie dans le presse-papier
- ✅ Configuration des permissions
- ✅ Choix du type de clé (Public, Secret, Admin)
- ✅ Configuration de l'expiration
- ✅ Affichage des statistiques d'utilisation

### 2. **Hook useApiKeys** ✅
**Fichier** : `src/hooks/useApiKeys.ts`

**Fonctions** :
- `createApiKey()` - Créer une nouvelle clé API
- `deleteApiKey()` - Supprimer une clé
- `rotateApiKey()` - Roter une clé (créer nouvelle + désactiver ancienne)
- `refetch()` - Rafraîchir la liste

**Sécurité** :
- Génération de clés aléatoires (32 bytes)
- Hash SHA-256 avant stockage
- Jamais de stockage en clair
- Affichage unique lors de la création

### 3. **Route et Navigation** ✅
- Route : `/api-keys` (page dédiée)
- Onglet : Dans **Paramètres > Clés API** 🔑
- Protection : Accessible aux admins uniquement
- Bouton : "Gérer les Clés API" redirige vers `/api-keys`

---

## 🎯 Utilisation

### Accéder à la Page

**Option 1 : Via les Paramètres (Recommandé)**
1. Connectez-vous à FactureSmart
2. Cliquez sur **"Paramètres"** dans le menu de gauche
3. Sélectionnez l'onglet **"Clés API"** 🔑
4. Cliquez sur **"Gérer les Clés API"**

**Option 2 : Accès Direct**
1. Allez directement sur `/api-keys`
2. Vous verrez la liste de toutes vos clés API

### Créer une Nouvelle Clé

1. Cliquez sur **"Nouvelle Clé API"**
2. Remplissez le formulaire :
   - **Nom** : Ex: "n8n Production", "Discord Bot"
   - **Type** : 
     - Public (100 req/h) - Lecture seule des stats
     - Secret (1000 req/h) - Lecture + Webhooks
     - Admin (5000 req/h) - Accès complet
   - **Expiration** : 30j, 90j, 180j, 1 an, ou jamais
   - **Permissions** : Cochez les permissions nécessaires
3. Cliquez sur **"Créer la Clé"**
4. **IMPORTANT** : Copiez immédiatement la clé affichée
5. La clé ne sera plus jamais affichée !

### Permissions Disponibles

| Permission | Description |
|------------|-------------|
| `read:stats` | Lire les statistiques |
| `read:transactions` | Lire les transactions |
| `read:clients` | Lire les clients |
| `read:factures` | Lire les factures |
| `read:colis` | Lire les colis |
| `read:comptes` | Lire les comptes financiers |
| `read:mouvements` | Lire les mouvements de comptes |
| `write:webhooks` | Créer et gérer les webhooks |
| `write:transactions` | Créer des transactions |
| `admin:keys` | Gérer les clés API |
| `admin:webhooks` | Gérer tous les webhooks |
| `*` | Accès complet |

### Supprimer une Clé

1. Trouvez la clé dans la liste
2. Cliquez sur l'icône **Poubelle** 🗑️
3. Confirmez la suppression
4. ⚠️ Toutes les applications utilisant cette clé ne pourront plus accéder à l'API

---

## 🔐 Sécurité

### Génération des Clés

```typescript
// Préfixe selon le type
const prefix = type === 'public' ? 'pk_live_' : 
               type === 'secret' ? 'sk_live_' : 
               'ak_live_';

// Génération aléatoire (32 bytes)
const randomBytes = new Uint8Array(32);
crypto.getRandomValues(randomBytes);
const randomString = Array.from(randomBytes)
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

// Clé finale
const apiKey = `${prefix}${randomString}`;
```

### Stockage Sécurisé

- **Jamais en clair** : Seul le hash SHA-256 est stocké
- **Affichage unique** : La clé n'est affichée qu'une seule fois
- **Préfixe visible** : Seul le préfixe est visible dans la liste (ex: `sk_live_...`)

### Hash SHA-256

```typescript
const encoder = new TextEncoder();
const data = encoder.encode(apiKey);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
```

---

## 📊 Informations Affichées

Pour chaque clé API, vous verrez :

- **Nom** : Identifiant de la clé
- **Type** : Public, Secret, ou Admin (avec badge coloré)
- **Préfixe** : `pk_live_...`, `sk_live_...`, ou `ak_live_...`
- **Date de création**
- **Dernière utilisation** : Quand la clé a été utilisée pour la dernière fois
- **Date d'expiration** : Quand la clé expirera
- **Nombre de permissions** : Combien de permissions sont accordées
- **Liste des permissions** : Détail de chaque permission

---

## 🎨 Interface

### Cartes d'Information

**Carte Bleue (Important)** :
- Les clés API ne sont affichées qu'une seule fois
- Conservez vos clés en lieu sûr
- Ne les partagez jamais
- Différences entre les types de clés

### Dialogue de Création

**Champs** :
- Nom (requis)
- Type (Public/Secret/Admin)
- Expiration (30j à jamais)
- Permissions (checkboxes)

**Validation** :
- Nom obligatoire
- Au moins une permission requise

### Dialogue de Clé Générée

**Affichage** :
- Clé complète (masquée par défaut)
- Bouton pour afficher/masquer
- Bouton pour copier
- Avertissement de sécurité

**Actions** :
- Copier dans le presse-papier
- Confirmation "J'ai copié la clé"

---

## 🔄 Rotation de Clés (Futur)

La fonction `rotateApiKey()` est déjà implémentée et permet de :

1. Créer une nouvelle clé avec les mêmes paramètres
2. Désactiver l'ancienne clé
3. Retourner la nouvelle clé

**Utilisation future** :
```typescript
const { success, key } = await rotateApiKey(oldKeyId);
if (success) {
  // Nouvelle clé disponible dans `key`
  // Ancienne clé désactivée
}
```

---

## 📱 Responsive Design

L'interface est entièrement responsive :
- **Desktop** : Grille 4 colonnes pour les infos
- **Tablet** : Grille 2 colonnes
- **Mobile** : Grille 1 colonne

---

## 🎯 Prochaines Étapes

### Utiliser votre Clé API

Une fois votre clé créée, utilisez-la pour :

1. **Tester l'API** :
```bash
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?limit=5" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: votre_org_id"
```

2. **Configurer n8n** :
   - Créer un credential "HTTP Header Auth"
   - Ajouter `X-API-Key` et `X-Organization-ID`

3. **Configurer un Webhook Discord** :
```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: votre_org_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Alertes",
    "url": "https://discord.com/api/webhooks/...",
    "events": ["transaction.validated", "colis.delivered"],
    "format": "discord"
  }'
```

---

## 🔍 Trouver votre Organization ID

Pour obtenir votre `organization_id`, exécutez cette requête SQL dans Supabase :

```sql
SELECT organization_id 
FROM profiles 
WHERE id = auth.uid();
```

Ou consultez votre profil dans FactureSmart.

---

## 📝 Bonnes Pratiques

### ✅ À FAIRE

- Créer des clés avec des noms descriptifs
- Utiliser le type de clé approprié (ne pas donner plus de permissions que nécessaire)
- Définir une expiration pour les clés de test
- Copier et sauvegarder immédiatement les clés
- Supprimer les clés inutilisées
- Roter régulièrement les clés en production

### ❌ À NE PAS FAIRE

- Partager vos clés API
- Stocker les clés en clair dans le code
- Utiliser des clés Admin pour des intégrations tierces
- Laisser des clés expirées actives
- Créer trop de clés inutiles

---

## 🎉 Résumé

✅ **Interface complète de gestion des clés API**  
✅ **Sécurité renforcée (hash SHA-256)**  
✅ **Permissions granulaires**  
✅ **Affichage unique des clés**  
✅ **Copie dans le presse-papier**  
✅ **Responsive design**  
✅ **Intégré dans le menu principal**  

**Vous pouvez maintenant créer et gérer vos clés API directement depuis FactureSmart ! 🚀**

---

## 📚 Documentation Complémentaire

- **API Guide** : `docs/API_GUIDE.md`
- **Guide d'Implémentation** : `docs/API_IMPLEMENTATION_GUIDE.md`
- **Résumé du Déploiement** : `docs/API_DEPLOYMENT_SUMMARY.md`
- **README API** : `docs/API_README.md`

# Référence des Rôles - FactureSmart

## 📋 Vue d'ensemble

L'application FactureSmart utilise **3 rôles prédéfinis** pour gérer les permissions des utilisateurs :

1. **Super Admin** - Accès complet à tout
2. **Admin** - Gestion complète limitée  
3. **Opérateur** - Gestion quotidienne limitée

---

## 👑 1. Super Admin

**Description** : Accès complet et illimité à toutes les fonctionnalités de l'application.

### Permissions Complètes (13 modules)

| Module | Lire | Créer | Modifier | Supprimer |
|--------|------|-------|----------|-----------|
| Clients | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ✅ |
| Factures | ✅ | ✅ | ✅ | ✅ |
| Colis | ✅ | ✅ | ✅ | ✅ |
| Paramètres | ✅ | ✅ | ✅ | ✅ |
| Moyens de paiement | ✅ | ✅ | ✅ | ✅ |
| Taux de change | ✅ | ✅ | ✅ | ✅ |
| Frais de transaction | ✅ | ✅ | ✅ | ✅ |
| Logs d'activité | ✅ | ❌ | ❌ | ❌ |
| Utilisateurs | ✅ | ✅ | ✅ | ✅ |
| Profil | ✅ | ✅ | ✅ | ✅ |
| Rapports | ✅ | ✅ | ✅ | ✅ |
| Logs de sécurité | ✅ | ❌ | ❌ | ❌ |

### Capacités Spéciales
- ✅ Gérer tous les utilisateurs
- ✅ Supprimer des données
- ✅ Accéder aux logs de sécurité
- ✅ Modifier tous les paramètres système
- ✅ Créer d'autres administrateurs

---

## 🔧 2. Admin

**Description** : Gestion complète avec quelques limitations de sécurité.

### Permissions (13 modules)

| Module | Lire | Créer | Modifier | Supprimer |
|--------|------|-------|----------|-----------|
| Clients | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ✅ |
| Factures | ✅ | ✅ | ✅ | ✅ |
| Colis | ✅ | ✅ | ✅ | ❌ |
| Paramètres | ✅ | ✅ | ✅ | ❌ |
| Moyens de paiement | ✅ | ✅ | ✅ | ❌ |
| Taux de change | ✅ | ✅ | ✅ | ❌ |
| Frais de transaction | ✅ | ✅ | ✅ | ❌ |
| Logs d'activité | ✅ | ❌ | ❌ | ❌ |
| Utilisateurs | ✅ | ✅ | ✅ | ❌ |
| Profil | ✅ | ✅ | ✅ | ❌ |
| Rapports | ✅ | ✅ | ❌ | ❌ |
| Logs de sécurité | ❌ | ❌ | ❌ | ❌ |

### Limitations
- ❌ Ne peut pas supprimer les colis
- ❌ Ne peut pas supprimer les paramètres système
- ❌ Ne peut pas supprimer les utilisateurs
- ❌ Ne peut pas accéder aux logs de sécurité
- ❌ Ne peut pas modifier les rapports

---

## 👤 3. Opérateur

**Description** : Gestion quotidienne des opérations courantes.

### Permissions (13 modules)

| Module | Lire | Créer | Modifier | Supprimer |
|--------|------|-------|----------|-----------|
| Clients | ✅ | ✅ | ✅ | ❌ |
| Transactions | ✅ | ✅ | ✅ | ❌ |
| Factures | ✅ | ✅ | ✅ | ❌ |
| Colis | ✅ | ✅ | ❌ | ❌ |
| Paramètres | ❌ | ❌ | ❌ | ❌ |
| Moyens de paiement | ✅ | ❌ | ❌ | ❌ |
| Taux de change | ✅ | ❌ | ❌ | ❌ |
| Frais de transaction | ✅ | ❌ | ❌ | ❌ |
| Logs d'activité | ❌ | ❌ | ❌ | ❌ |
| Utilisateurs | ❌ | ❌ | ❌ | ❌ |
| Profil | ✅ | ❌ | ✅ | ❌ |
| Rapports | ✅ | ❌ | ❌ | ❌ |
| Logs de sécurité | ❌ | ❌ | ❌ | ❌ |

### Capacités
- ✅ Créer et modifier des clients
- ✅ Créer et modifier des transactions
- ✅ Créer et modifier des factures
- ✅ Créer des colis
- ✅ Consulter les rapports
- ✅ Modifier son propre profil

### Limitations
- ❌ Aucune suppression autorisée
- ❌ Pas d'accès aux paramètres
- ❌ Pas d'accès aux logs
- ❌ Pas de gestion des utilisateurs
- ❌ Ne peut pas modifier les colis

---

## 🔄 Application des Rôles

### Dans l'Interface
1. Aller dans **Paramètres** > **Utilisateurs**
2. Cliquer sur **Gérer les permissions** pour un utilisateur
3. Onglet **Rôles prédéfinis**
4. Sélectionner le rôle souhaité
5. Cliquer sur **Appliquer ce rôle**

### Rôles dans la Base de Données

Les rôles sont stockés dans :
- **`app_metadata.role`** (auth.users) - Source de vérité côté serveur
- **`admin_roles.role`** - Table dédiée aux admins
- **`user_permissions`** - Permissions détaillées par module

### Hiérarchie
```
Super Admin > Admin > Opérateur
```

---

## 🔐 Sécurité

### Principes
1. **Least Privilege** : Chaque rôle a le minimum de permissions nécessaires
2. **Séparation des Responsabilités** : Les rôles critiques sont séparés
3. **Audit Trail** : Toutes les actions sont enregistrées dans les logs

### Recommandations
- ⚠️ Limiter le nombre de Super Admins (2-3 maximum)
- ⚠️ Utiliser Admin pour la gestion quotidienne
- ⚠️ Attribuer Opérateur pour le personnel de saisie
- ⚠️ Réviser régulièrement les permissions

---

## 📝 Notes Techniques

### Fichiers de Configuration
- `src/types/permissions.ts` - Définitions des rôles
- `src/types/index.ts` - Export des constantes
- `src/components/permissions/PermissionsManager.tsx` - Interface de gestion

### Vérification des Permissions
```typescript
// Vérifier si l'utilisateur est admin
const { isAdmin } = usePermissions();

// Vérifier une permission spécifique
const { checkPermission } = usePermissions();
const canDelete = checkPermission('clients', 'delete');
```

---

## 📅 Historique

- **2025-11-01** : Ajout du rôle Super Admin, suppression du rôle Lecteur
- **2025-10-31** : Corrections des permissions pour francy et mungedijeancy
- **2025-10-26** : Création du système de permissions

---

## 🆘 Support

Pour toute question sur les rôles et permissions, contacter l'équipe technique.

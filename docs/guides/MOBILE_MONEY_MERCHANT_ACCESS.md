# Mobile Money Merchant API Access — FactureSmart COD-27

> **Objectif** : Obtenir les accès merchant API auprès des 3 opérateurs Mobile Money en RDC (Orange Money, Airtel Money, Vodacom M-Pesa) pour les paiements dans Sprint 3+.
> **Issue** : COD-27 `[PRE-SPRINT]` Mobile Money merchant access
> **Projet** : FactureX / FactureSmart
> **Date** : Avril 2026
> **Statut** : En cours — action humaine requise

---

## 📋 Vue d'ensemble

Pour intégrer les paiements Mobile Money dans FactureSmart, nous devons obtenir un accès **marchand (merchant)** auprès de chaque opérateur. Un compte marchand permet à une application de :

- **C2B** (Customer-to-Business) : Recevoir des paiements depuis le wallet du client vers le compte marchand
- **B2C** (Business-to-Customer) : Effectuer des remboursements / reversements
- **Statut transaction** : Vérifier le statut d'un paiement
- **Solde marchand** : Consulter le solde du compte marchand

---

## 🏦 1. Vodacom M-Pesa RDC

### Produit
**M-Pesa API** — API officielle Vodacom RDC

### Site développeur
`https://developer.vodacom.cd` — Portal M-Pesa Developer

### Types d'API disponibles
| API | Description | Use case |
|-----|-------------|----------|
| **C2B** | Client-to-Business | Collecter paiements clients |
| **B2C** | Business-to-Customer | Remboursements, reversements |
| **B2B** | Business-to-Business | Transfers inter-comptes |
| **Reversal** | Annulation de transaction | Rétrofacturation |
| **Transaction Status** | Statut d'une transaction | Vérification |
| **Account Balance** | Solde du compte | Monitoring |

### Contact / Inscription marchande
```
Service API Vodacom RDC
Email : api@vodacom.cd  (courriel partenariats)
Phone : +243 81 700 1234 (ligne business)
Portal : https://portal.vodacom.cd/developers
```

### Documents requis
- [ ] RCCM (Registre du Commerce et du Crédit Mobilier)
- [ ] Numéro Impôt / NCC (Numéro d'Identification Fiscale)
- [ ] Pièce d'identité du représentant légal
- [ ] Formulaire de demande API Vodacom (à demander via le portal)
- [ ] Description de l'application / cas d'usage
- [ ] URL de callback (webhook) — peut être ajouté plus tard
- [ ] Adresse physique en RDC

### Credentials livrées
Après approbation, vous recevez :
- `Consumer Key` (client_id)
- `Consumer Secret` (client_secret)
- `Public Key` (pour le chiffrement des appels)
- `Shortcode` (numéro marchand — ex: 6 chiffres)
- `Initiator Username` (nom d'utilisateur API)
- `Initiator Password` (mot de passe API)

### Environnement
- **Sandbox** : `https://sandbox.vodacom.cd` (pour les tests)
- **Production** : `https://api.vodacom.cd`

### Protocole d'authentification
OAuth 2.0 avec `client_credentials` → Bearer token (1h expiration)

### Notes techniques
```typescript
// Auth Vodacom M-Pesa
POST https://api.vodacom.cd/oauth/v1/generate
Body: { grant_type: "client_credentials" }
Headers: { Authorization: "Basic base64(consumerKey:consumerSecret)" }

// C2B (Paiement client)
POST https://api.vodacom.cd/mpesa/c2b/v1/payment
{
  "shortcode": "123456",
  "command_id": "CustomerPayBillOnline",
  "amount": "1000",
  "msisdn": "24381xxxxxx",
  "bill_ref_number": "INV-2026-001"
}
```

---

## 🍊 2. Orange Money RDC

### Produit
**Orange Money API Marchande** — API de paiement marchande Orange RDC

### Site / Contact
```
Service API Marchande Orange RDC
Email : api@orange.cd
Phone : +243 82 888 1234 (service marchand)
Formulaire web : https://api.orangemoney.cd/contact
```

### Types d'API disponibles
| API | Description |
|-----|-------------|
| **P2C** | Paiement Client vers Commercial (C2B equivalent) |
| **C2P** | Commercial vers Portefeuille (B2C equivalent) |
| **Status** | Consultation statut transaction |
| **Refund** | Demande de remboursement |

### Documents requis
- [ ] RCCM à jour
- [ ] Numéro Impôt / NCC
- [ ] Pièce d'identité du représentant légal
- [ ] Formulaire de demande d'accès API (via le portail développeur)
- [ ] Description de l'application (nom, usage, volume estimé)
- [ ] URL webhook / callback
- [ ] Logo de l'entreprise

### Credentials livrées
- `Client ID` / `Client Secret`
- `Merchant ID` (identifiant marchand Orange)
- `API Key` (clé d'authentification)
- `Merchant Name` (nom public affiché au client)
- `Shortcode` ou numéro de paiement

### Environnement
- **Test** : `https://sandbox.orangemoney.cd`
- **Production** : `https://api.orangemoney.cd`

### Protocole
OAuth 2.0 — même pattern que Vodacom

### Notes techniques
```typescript
// Auth Orange Money
POST https://api.orangemoney.cd/oauth/token
{ grant_type: "client_credentials" }

// Paiement client (P2C)
POST https://api.orangemoney.cd/payment/v1/p2c
{
  "merchant_id": "MRCH001",
  "amount": 1000,
  "currency": "CDF",
  "customer_reference": "24382xxxxxx",
  "transaction_reference": "INV-2026-001",
  "description": "Paiement facture FactureSmart"
}
```

---

## ✈️ 3. Airtel Money RDC

### Produit
**Airtel Money Merchant API** — API de paiement Airtel RDC

### Site / Contact
```
Service Marchand Airtel Money RDC
Email : merchants-rd@airtel.com
Phone : +243 99 701 2345
Portal : https://developers.airtel.africa/rpc (pays: DRC)
```

### Documents requis
- [ ] RCCM
- [ ] Numéro Impôt / NCC
- [ ] Pièce d'identité représentant légal
- [ ] Formulaire d'inscription marchand
- [ ] URL webhook de callback
- [ ] Détails de l'application (nom, description,预计 volume)

### Credentials livrées
- `Merchant ID`
- `Merchant Key` / `API Key`
- `Callback URL` (configuré côté marchand)
- `Shortcode` ou numéro de paiement

### Environnement
- **Sandbox** : `https://openapiuat.airtel.africa` (UAT)
- **Production** : `https://openapi.airtel.africa`

### Protocole
OAuth 2.0 + signature HMAC pour les appels API

---

## 🔄 Processus commun d'obtention d'accès

```
Étape 1: Préparer les documents légaux
   └─> RCCM + NCC + ID représentant + KB: 2-5 jours ouvrables

Étape 2: Contacter chaque opérateur
   ├─> Vodacom M-Pesa : portal.vodacom.cd/developers
   ├─> Orange Money   : api@orange.cd
   └─> Airtel Money   : merchants-rd@airtel.com

Étape 3: Soumettre la demande (formulaire + documents)
   └─> Délai de traitement: 5-15 jours ouvrables

Étape 4: Test sur sandbox / environnement de test
   └─> Vérifier C2B, B2C, webhooks, statuts

Étape 5: Audit de sécurité / conformité (si requis)
   └─> Délai: 3-7 jours

Étape 6: Activation production
   └─> Les credentials de prod sont livrées
```

---

## 💡 Recommandations pour FactureSmart

### Priorité suggérée
1. **Vodacom M-Pesa** — Plus grande base utilisateurs en RDC, API la mieux documentée
2. **Orange Money** — Deuxième base, important si M-Pesa échoue
3. **Airtel Money** — Troisième option si les deux premiers ne couvrent pas

### Configuration technique requise (côté FactureSmart)
```typescript
// src/services/mobileMoney.ts — interface unifiée
interface MobileMoneyOperator {
  name: 'vodacom' | 'orange' | 'airtel';
  apiEndpoint: string;
  authEndpoint: string;
  shortcode: string;
  credentials: {
    clientId: string;
    clientSecret: string;
    publicKey?: string;
    initiatorUsername?: string;
    initiatorPassword?: string;
  };
  webhookSecret?: string;
}

// Endpoints à ajouter dans l'environnement
VODACOM_API_URL=https://api.vodacom.cd
VODACOM_CONSUMER_KEY=xxx
VODACOM_CONSUMER_SECRET=xxx
VODACOM_SHORTCODE=xxxxxx
VODACOM_PUBLIC_KEY=xxx
VODACOM_INITIATOR_USERNAME=xxx
VODACOM_INITIATOR_PASSWORD=xxx

ORANGE_API_URL=https://api.orangemoney.cd
ORANGE_MERCHANT_ID=xxx
ORANGE_API_KEY=xxx

AIRTEL_API_URL=https://openapi.airtel.africa
AIRTEL_MERCHANT_KEY=xxx
```

### Webhook handler à créer
```
POST /api/webhooks/mobile-money/{operator}
  ├─> vodacom : validation signature + mise à jour statut facture
  ├─> orange  : validation signature + mise à jour statut facture
  └─> airtel  : validation signature + mise à jour statut facture
```

### Fichier de mapping statut
```typescript
// src/lib/mobileMoneyStatus.ts
const STATUS_MAP = {
  // Vodacom
  '0': 'completed',
  '1': 'pending',
  '201': 'failed', // Client non inscrit M-Pesa
  // Orange
  'SUCCESS': 'completed',
  'PENDING': 'pending',
  'FAILED': 'failed',
  // Airtel
  'TXN_SUCCESS': 'completed',
  'TXN_PENDING': 'pending',
  'TXN_FAILED': 'failed',
};
```

---

## ⚠️ Points de vigilance

1. **Toutes les APIs sont en sandbox par défaut** — Ne jamais tester en production sans validation
2. **Frais de transaction** — Chaque opérateur prend une commission (ex: M-Pesa ~2-4% selon le montant)
3. **Limites de montant** — Chaque opérateur a des plafonds journaliers/mensuels
4. **Conformité fiscale** — Les paiements Mobile Money en RDC peuvent être soumis à des retenues
5. **Délai deliquidité** — Les fonds peuvent mettre 24-72h avant d'être disponibles sur le compte marchand
6. **Remboursements** — Les API B2C / C2P sont nécessaires pour les remboursements
7. **Reversal** — Non toutes les transactions sont réversibles (délai critique)

---

## 📁 Prochaines tâches COD

| COD | Titre | Dépendance |
|-----|-------|------------|
| COD-26 | DGI API integration | COD-27 ✅ (actuel) |
| COD-28 | Schema DB — tables paiements Mobile Money | COD-27 ✅ |
| COD-29 | SYSCOHADA accounting schema | Libre |
| COD-30 | Branding & identité visuelle | Libre |
| **COD-31** | **Intégration Mobile Money (après accés)** | **COD-27 ✅** |

---

## 📞 Contacts directs (à vérifier)

| Opérateur | Département | Email | Note |
|-----------|------------|-------|------|
| Vodacom RDC | API / Partenariats | `api@vodacom.cd` | Preferred |
| Vodacom RDC | SupportMarchand | `support.marchand@vodacom.cd` | Backup |
| Orange RDC | API Marchande | `api@orange.cd` | — |
| Orange RDC | Commercial | `partenariats@orange.cd` | — |
| Airtel RDC | Marchands | `merchants-rd@airtel.com` | — |
| Airtel Africa | Dev Portal | `developers@airtel.africa` | Group |

---

*Guide créé dans le cadre de COD-27 — Mobile Money Merchant Access*
*FactureSmart / FactureX — Sprint 3 preparation*

# 📡 Fake APIs — FactureSmart

**Date:** 24 avril 2026
**Statut:** ✅ IMPLÉMENTÉ — [FAKE] en développement local
**Responsable:** Dev Backend Senior (COD-56)

---

## 🎯 Objectif

Ces APIs **simulent** le comportement des services externes (DGI, Orange Money, Airtel Money, M-Pesa) qui ne sont pas encore accessibles en environnement de développement.

**Règles appliquées:**
- ✅ Même structure que les vraies APIs (mêmes champs, mêmes codes HTTP, mêmes erreurs)
- ✅ Latences simulées réalistes (200ms - 4s)
- ✅ Erreurs aléatoires (5% du temps) pour tester la robustesse du frontend
- ✅ Responses stockées en mémoire pour tests reproductibles
- ✅ Marquées `[FAKE]` dans le code et la documentation
- ✅ Rate limiting obligatoire — voir section dédiée

---

## 📁 Fichiers

```
src/mocks/
├── dgi.mock.ts           → DGI RDC (Vérification NIF, Soumission facture, Statut)
├── orange-money.mock.ts   → Orange Money RDC
├── airtel-money.mock.ts  → Airtel Money RDC
└── mpesa.mock.ts         → M-Pesa Vodacom RDC
```

---

## 🔒 Rate Limiting

**Implémenté:** Avril 2026 (COD-56)  
**Technologie:** Upstash Redis via `@upstash/ratelimit`  
**Configuration:** Secrets Edge Functions (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

### Limites par endpoint

| API | Endpoint | Limite | Fenêtre | Implémentation |
|-----|----------|--------|---------|----------------|
| DGI | Submit facture | **10 req** | 1 min/org | `ratelimit-dgi.ts` |
| DGI | Verify NIF | 30 req | 1 min/org | `ratelimit-dgi.ts` |
| DGI | Status facture | 30 req | 1 min/org | `ratelimit-dgi.ts` |
| Orange Money | Initiate | 20 req | 1 min/org | `ratelimit-payment.ts` |
| Orange Money | Verify | 60 req | 1 min/org | `ratelimit-payment.ts` |
| Airtel Money | Initiate | 20 req | 1 min/org | `ratelimit-payment.ts` |
| Airtel Money | Verify | 60 req | 1 min/org | `ratelimit-payment.ts` |
| M-Pesa | C2B Deposit | 20 req | 1 min/org | `ratelimit-payment.ts` |
| M-Pesa | Verify | 60 req | 1 min/org | `ratelimit-payment.ts` |

### Réponse en cas de dépassement (429 Too Many Requests)

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Trop de requêtes. Veuillez réessayer dans 60 secondes.",
  "retryAfter": 60
}
```

### Fichiers middleware

```
supabase/functions/_shared/
├── ratelimit-dgi.ts       # Middleware rate limit DGI
├── ratelimit-payment.ts   # Middleware rate limit paiements
└── cors.ts               # CORS headers
```

---

## 1️⃣ DGI Mock (`src/mocks/dgi.mock.ts`)

### API Réelle
- **Base URL:** `https://api.dgi.gouv.cd` (non accessible actuellement)
- **Auth:** Bearer token (credentials sandbox en attente)

### Endpoints Simulés

#### `POST /api/v1/nif/verify` — Vérification NIF

**Request:**
```typescript
{
  nif: string;          // 15 chiffres
  company_name?: string;
  email?: string;
}
```

**Response (succès):**
```json
{
  "success": true,
  "status": "verified",
  "nif": "123456789012345",
  "companyName": "Coccinelle SARL",
  "rccm": "RCCM/CD/KIN/2024/12345",
  "idNat": "01-1234-56789",
  "address": "Avenue du Commerce №45, Kinshasa, RDC",
  "verifiedAt": "2026-04-24T10:30:00.000Z"
}
```

**Codes d'erreur:**
| Code | Signification |
|------|---------------|
| 200 | NIF vérifié avec succès |
| 400 | Format NIF invalide (pas 15 chiffres) |
| 404 | NIF non trouvé dans les registres DGI |
| 422 | Données incomplètes |
| 500 | Erreur technique DGI |

**Latence simulée:** 1000-2500ms

**NIFs de test:**
| NIF | Entreprise | RCCM |
|-----|-----------|------|
| `123456789012345` | Coccinelle SARL | RCCM/CD/KIN/2024/12345 |
| `987654321098765` | CoExpress SAS | RCCM/CD/LUB/2024/54321 |
| `555555555555555` | Velorix Store SPRL | RCCM/CD/KIN/2023/99999 |
| `111122223333444` | Solar Solutions RDC SARL | RCCM/CD/KIN/2022/11111 |

---

#### `POST /api/v1/factures/submit` — Soumission facture

**Request:**
```typescript
{
  numero_dgi: string;       // Format: FV-2604-00000001
  code_autorisation: string; // 8 caractères alphanumériques
  qr_data: string;           // Données encodées dans le QR code
  facture_number: string;
  date_facture: string;     // ISO 8601
  client: { nom: string };
  lignes: Array<{
    numero: number;
    description: string;
    quantite: number;
    prix_unitaire: number;
    montant_total: number;
  }>;
  totaux: {
    htva: number;
    taux_tva: number;
    tva: number;
    ttc: number;
  };
  Declarant: {
    raison_sociale: string;
    nif: string;
    rccm: string;
    adresse: string;
  };
}
```

**Response:**
```json
{
  "accepted": true,
  "signature": "SIG-AB12CD34",
  "transmission_id": "DGI-1745487600-ABC123"
}
```

**Codes HTTP:**
- 201: Facture acceptée par la DGI
- 400: Données invalides
- 422: Non conforme DGI
- 500: Erreur technique

**Latence simulée:** 500-3000ms

---

#### `GET /api/v1/factures/status/:transmission_id` — Statut facture

**Response:**
```json
{
  "statut": "validated",
  "receipt_url": "https://dgi.gouv.cd/receipts/DGI-1745487600-ABC123.pdf",
  "validated_at": "2026-04-24T10:35:00.000Z"
}
```

**Valeurs de `statut`:**
- `pending` — En attente de validation
- `validated` — Validée par la DGI
- `rejected` — Rejetée

**Latence simulée:** 200-1000ms

---

#### `POST /api/v1/declare` — Télédéclaration TVA mensuelle

**Request:**
```typescript
{
  periode: string;              // YYYY-MM
  montant_tva_collectee: number;
  montant_tva_recuperable: number;
  montant_tva_due: number;
  declarations: Array<{
    facture_id: string;
    numero_dgi: string;
    montant_tva: number;
  }>;
}
```

**Response:**
```json
{
  "success": true,
  "declaration_id": "DECL-2026-04-ABC123",
  "validated_at": "2026-04-24T10:40:00.000Z"
}
```

**Latence simulée:** 1000-4000ms

---

## 2️⃣ Orange Money Mock (`src/mocks/orange-money.mock.ts`)

### API Réelle
- **Base URL:** `https://api.orange.com/orange-money/` (en attente credentials)
- **Merchant ID:** `FACTURESMART_RDC_001`

### Endpoints Simulés

#### `POST /api/v1/orange-money/initiate`

**Request:**
```typescript
{
  merchant_id: string;
  order_id: string;
  amount: number;       // Minimum 100 CDF
  currency: 'CDF' | 'USD';
  phone: string;         // 08xxxxxxxx ou +2438xxxxxxxx
  description: string;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
}
```

**Response:**
```json
{
  "success": true,
  "payment_url": "https://api.orange.com/portal/#/pay/OM-1745487600-ABC123",
  "transaction_id": "OM-1745487600-ABC123"
}
```

**Codes d'erreur:**
| Code | Signification |
|------|---------------|
| OM_200 | Succès |
| OM_INVALID_PHONE | Numéro Orange Money invalide |
| OM_INVALID_AMOUNT | Montant minimum: 100 CDF |
| OM_500 | Service indisponible |

**Latence simulée:** 800-2500ms

**Numéro de test:** `0812345678`, `0822345678`

---

#### `GET /api/v1/orange-money/status/:transaction_id`

**Response:**
```json
{
  "transaction_id": "OM-1745487600-ABC123",
  "order_id": "ORD-1745487600-XYZ",
  "status": "completed",
  "amount": 5000,
  "currency": "CDF",
  "phone": "0812345678",
  "completed_at": "2026-04-24T10:35:00.000Z"
}
```

**Valeurs de `status`:** `pending` | `completed` | `failed` | `cancelled` | `expired`

**Latence simulée:** 200-800ms

---

## 3️⃣ Airtel Money Mock (`src/mocks/airtel-money.mock.ts`)

### API Réelle
- **Base URL:** `https://airtel.co.cd/api/` (en attente credentials)
- **Merchant ID:** `FACTURESMART_RDC_AM_001`

### Endpoints Simulés

#### `POST /api/v1/airtel-money/initiate`

**Request:** Même structure que Orange Money

**Codes d'erreur:** `AM_INVALID_PHONE`, `AM_INVALID_AMOUNT`, `AM_500`

**Numéros de test:** `0971234567`, `0998234567`

**Latence simulée:** 800-2500ms

---

#### `GET /api/v1/airtel-money/status/:transaction_id`

**Response:** Même structure que Orange Money

---

## 4️⃣ M-Pesa Mock (`src/mocks/mpesa.mock.ts`)

### API Réelle
- **Base URL:** `https://api.vodacom.cd/mpesa/` (contrat marchand en négociation)
- **Merchant ID:** `FACTURESMART_RDC_MP_001`

### Endpoints Simulés

#### `POST /api/v1/mpesa/c2b/deposit` — Paiement client

**Request:**
```typescript
{
  merchant_id: string;
  order_id: string;
  amount: number;       // Minimum 50 CDF
  currency: 'CDF' | 'USD';
  phone: string;         // 08xxxxxxxx (Vodacom uniquement)
  description: string;
  reference?: string;
  return_url?: string;
  callback_url?: string;
}
```

**Response:**
```json
{
  "success": true,
  "checkout_request_id": "MPQ-1745487600123ABC",
  "transaction_id": "MPE-1745487600-ABC123"
}
```

**Codes d'erreur:**
| Code | Signification |
|------|---------------|
| MP_200 | Succès |
| MP_INVALID_PHONE | Numéro M-Pesa Vodacom invalide (doit être 08xxxxxxxx) |
| MP_INVALID_AMOUNT | Montant minimum: 50 CDF |
| MP_500 | Service indisponible |

**Numéros de test:** `0812345678`, `0823456789`, `0834567890`

**Latence simulée:** 1000-3500ms

---

#### `GET /api/v1/mpesa/status/:checkout_request_id`

**Response:**
```json
{
  "transaction_id": "MPE-1745487600-ABC123",
  "checkout_request_id": "MPQ-1745487600123ABC",
  "order_id": "ORD-MP-1745487600-XYZ",
  "status": "completed",
  "amount": 5000,
  "currency": "CDF",
  "phone": "0812345678",
  "completed_at": "2026-04-24T10:35:00.000Z",
  "receipt_number": "MP1745487650"
}
```

**Valeurs de `status`:** `pending` | `completed` | `failed` | `cancelled` | `expired` | `timeout`

---

#### `POST /api/v1/mpesa/b2c/disburse` — Reversement

**Request:** Même structure que C2B deposit

**Response:**
```json
{
  "success": true,
  "conversation_id": "MPC-1745487600-ABC123",
  "originator_conversation_id": "MPB2C-1745487600-XYZ789"
}
```

---

## 🔧 Utilisation dans le Frontend

### Activation du mode mock

```typescript
// src/services/dgi.ts
const DGI = new DGIService({
  mock: true,  // Active le mode mock
  baseUrl: 'https://sandbox.dgi.gouv.cd',
});
```

### Intégration Mobile Money

```typescript
import {
  mockOrangeMoneyInitiate,
  mockOrangeMoneyGetStatus,
  ORANGE_MONEY_MERCHANT_ID,
} from '../mocks/orange-money.mock';

// Initier un paiement
const result = await mockOrangeMoneyInitiate({
  merchant_id: ORANGE_MONEY_MERCHANT_ID,
  order_id: `ORD-${Date.now()}`,
  amount: 5000,
  currency: 'CDF',
  phone: '0812345678',
  description: 'Paiement facture #FV-2604-00000001',
});

// Vérifier le statut après 5 secondes
setTimeout(async () => {
  const status = await mockOrangeMoneyGetStatus(result.transaction_id);
  console.log(status.status); // 'completed' | 'failed' | 'pending'
}, 5000);
```

---

## ⚠️ Notes de Production

1. **NE PAS** utiliser ces mocks en production
2. **Remplacer** par les vraies APIs dès que les credentials sont disponibles:
   - DGI sandbox → DGI production
   - Orange Money merchant API
   - Airtel Money merchant API
   - M-Pesa Vodacom merchant API
3. **守** Toutes les APIs mockées doivent être marquées `[FAKE]` dans le code
4. **Rate limiting:** Configuré — ne pas désactiver en production (protège contre les abus)

---

## 📊 Statut d'Implémentation

| API | Endpoint | Status | Notes |
|-----|----------|--------|-------|
| DGI | NIF Verify | ✅ Done | Dans `src/services/dgi.ts` |
| DGI | Submit Facture | ✅ Done | Dans `supabase/functions/api-dgi-submit` |
| DGI | Status Facture | ✅ Done | Dans `supabase/functions/api-dgi-validate` |
| DGI | Télédéclaration | ✅ Done | `mockDgiDeclareTVA()` |
| Orange Money | Initiate | ✅ Done | `mockOrangeMoneyInitiate()` |
| Orange Money | Status | ✅ Done | `mockOrangeMoneyGetStatus()` |
| Airtel Money | Initiate | ✅ Done | `mockAirtelMoneyInitiate()` |
| Airtel Money | Status | ✅ Done | `mockAirtelMoneyGetStatus()` |
| M-Pesa | C2B Deposit | ✅ Done | `mockMpesaC2BDeposit()` |
| M-Pesa | Status | ✅ Done | `mockMpesaGetStatus()` |
| M-Pesa | B2C Disburse | ✅ Done | `mockMpesaB2CDisburse()` |

---

*Document créé dans le cadre de COD-56 — Dev Backend Senior*

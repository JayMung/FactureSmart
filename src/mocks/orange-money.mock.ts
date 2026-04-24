/**
 * Orange Money Mock API — FactureSmart
 * [FAKE] Simulation de l'API Orange Money RDC pour développement local
 *
 * APIs simulées:
 * - POST /api/v1/orange-money/initiate  → Initier un paiement
 * - GET  /api/v1/orange-money/status/:id → Vérifier statut
 * - POST /api/v1/orange-money/callback    → Callback payment notification
 *
 * Docs Orange Money Merchant: https://developer.orange.com/
 */

export interface OrangeMoneyInitiateRequest {
  merchant_id: string;
  order_id: string;
  amount: number; // CDF ou USD selon configuration
  currency: 'CDF' | 'USD';
  phone: string; // Numéro Orange Money (format: 08xxxxxxxx ou +2438xxxxxxxx)
  description: string;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
}

export interface OrangeMoneyInitiateResponse {
  success: boolean;
  payment_url?: string;
  transaction_id?: string;
  error_code?: string;
  error_message?: string;
}

export interface OrangeMoneyStatusResponse {
  transaction_id: string;
  order_id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  phone: string;
  completed_at?: string;
  failure_reason?: string;
}

// ─────────────────────────────────────────────
// Stockage en mémoire
// ─────────────────────────────────────────────

interface MockOrangePayment {
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  phone: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';
  created_at: string;
  completed_at?: string;
  failure_reason?: string;
}

const mockPayments = new Map<string, MockOrangePayment>();

// ─────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────

function generateTransactionId(): string {
  return `OM-${Date.now()}-${Math.random().toString(36).slice(-8).toUpperCase()}`;
}

function generateOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`;
}

function randomDelay(min = 500, max = 3000): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

function validatePhone(phone: string): boolean {
  // Formats acceptés: 0812345678, 0822345678, +243812345678, 243812345678
  const cleaned = phone.replace(/\s/g, '').replace(/^\+/, '');
  return /^((243)|(0))[128]\d{8}$/.test(cleaned);
}

function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/orange-money/initiate
// ─────────────────────────────────────────────

export async function mockOrangeMoneyInitiate(
  request: OrangeMoneyInitiateRequest
): Promise<OrangeMoneyInitiateResponse> {
  await randomDelay(800, 2500);

  // Simuler erreur aléatoire (5%)
  if (shouldSimulateError()) {
    return {
      success: false,
      error_code: 'OM_500',
      error_message: 'Service Orange Money momentanément indisponible',
    };
  }

  // Validation du téléphone
  if (!validatePhone(request.phone)) {
    return {
      success: false,
      error_code: 'OM_INVALID_PHONE',
      error_message: 'Numéro de téléphone Orange Money invalide',
    };
  }

  // Validation du montant
  if (request.amount < 100) { // Minimum 100 CDF
    return {
      success: false,
      error_code: 'OM_INVALID_AMOUNT',
      error_message: 'Montant minimum: 100 CDF',
    };
  }

  const transactionId = generateTransactionId();
  const orderId = request.order_id || generateOrderId();

  // Enregistrer le paiement
  const payment: MockOrangePayment = {
    transaction_id: transactionId,
    order_id: orderId,
    merchant_id: request.merchant_id,
    amount: request.amount,
    currency: request.currency,
    phone: request.phone,
    description: request.description,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  mockPayments.set(transactionId, payment);

  // Simuler expiration après 15 minutes
  setTimeout(() => {
    const p = mockPayments.get(transactionId);
    if (p && p.status === 'pending') {
      p.status = 'expired';
    }
  }, 15 * 60 * 1000);

  // Simuler succès automatique après 3-8 secondes (comme un vrai paiement)
  setTimeout(() => {
    const p = mockPayments.get(transactionId);
    if (p && p.status === 'pending') {
      p.status = Math.random() < 0.9 ? 'completed' : 'failed';
      p.completed_at = new Date().toISOString();
      if (p.status === 'failed') {
        p.failure_reason = 'Paiement refusé par l\'utilisateur ou Solde insuffisant';
      }
    }
  }, 3000 + Math.random() * 5000);

  return {
    success: true,
    payment_url: `https://api.orange.com/portal/#/pay/${transactionId}`,
    transaction_id: transactionId,
  };
}

// ─────────────────────────────────────────────
// Mock: GET /api/v1/orange-money/status/:id
// ─────────────────────────────────────────────

export async function mockOrangeMoneyGetStatus(
  transactionId: string
): Promise<OrangeMoneyStatusResponse | null> {
  await randomDelay(200, 800);

  const payment = mockPayments.get(transactionId);
  if (!payment) {
    return null;
  }

  return {
    transaction_id: payment.transaction_id,
    order_id: payment.order_id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    phone: payment.phone,
    completed_at: payment.completed_at,
    failure_reason: payment.failure_reason,
  };
}

// ─────────────────────────────────────────────
// Mock: Simuler un succès/échec immédiat (pour tests)
// ─────────────────────────────────────────────

export async function mockOrangeMoneySimulateSuccess(
  transactionId: string
): Promise<void> {
  const payment = mockPayments.get(transactionId);
  if (payment && payment.status === 'pending') {
    payment.status = 'completed';
    payment.completed_at = new Date().toISOString();
  }
}

export async function mockOrangeMoneySimulateFailure(
  transactionId: string,
  reason = 'Paiement refusé'
): Promise<void> {
  const payment = mockPayments.get(transactionId);
  if (payment && payment.status === 'pending') {
    payment.status = 'failed';
    payment.completed_at = new Date().toISOString();
    payment.failure_reason = reason;
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function getMockOrangePayment(id: string): MockOrangePayment | undefined {
  return mockPayments.get(id);
}

export function clearMockOrangePayments(): void {
  mockPayments.clear();
}

export const ORANGE_MONEY_MERCHANT_ID = 'FACTURESMART_RDC_001';

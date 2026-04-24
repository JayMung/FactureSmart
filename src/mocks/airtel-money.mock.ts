/**
 * Airtel Money Mock API — FactureSmart
 * [FAKE] Simulation de l'API Airtel Money RDC pour développement local
 *
 * APIs simulées:
 * - POST /api/v1/airtel-money/initiate  → Initier un paiement
 * - GET  /api/v1/airtel-money/status/:id → Vérifier statut
 *
 * Note: API Airtel Money RDC encore en cours d'intégration.
 *       À remplacer par les vraies APIs une fois le contrat marchand signé.
 */

export interface AirtelMoneyInitiateRequest {
  merchant_id: string;
  order_id: string;
  amount: number;
  currency: 'CDF' | 'USD';
  phone: string; // Numéro Airtel Money (08xxxxxxxx ou +2438xxxxxxxx)
  email?: string;
  description: string;
  return_url?: string;
  callback_url?: string;
}

export interface AirtelMoneyInitiateResponse {
  success: boolean;
  payment_url?: string;
  transaction_id?: string;
  error_code?: string;
  error_message?: string;
}

export interface AirtelMoneyStatusResponse {
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

interface MockAirtelPayment {
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

const mockPayments = new Map<string, MockAirtelPayment>();

// ─────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────

function generateTransactionId(): string {
  return `AM-${Date.now()}-${Math.random().toString(36).slice(-8).toUpperCase()}`;
}

function generateOrderId(): string {
  return `ORD-AM-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`;
}

function randomDelay(min = 500, max = 3000): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

function validatePhone(phone: string): boolean {
  // Formats acceptés: 097xxxxxxx, 099xxxxxxx, +24397xxxxxxx, 24397xxxxxxx
  const cleaned = phone.replace(/\s/g, '').replace(/^\+/, '');
  return /^((243)|(0))[9][7-9]\d{7}$/.test(cleaned);
}

function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/airtel-money/initiate
// ─────────────────────────────────────────────

export async function mockAirtelMoneyInitiate(
  request: AirtelMoneyInitiateRequest
): Promise<AirtelMoneyInitiateResponse> {
  await randomDelay(800, 2500);

  if (shouldSimulateError()) {
    return {
      success: false,
      error_code: 'AM_500',
      error_message: 'Service Airtel Money momentanément indisponible',
    };
  }

  if (!validatePhone(request.phone)) {
    return {
      success: false,
      error_code: 'AM_INVALID_PHONE',
      error_message: 'Numéro de téléphone Airtel Money invalide',
    };
  }

  if (request.amount < 100) {
    return {
      success: false,
      error_code: 'AM_INVALID_AMOUNT',
      error_message: 'Montant minimum: 100 CDF',
    };
  }

  const transactionId = generateTransactionId();
  const orderId = request.order_id || generateOrderId();

  const payment: MockAirtelPayment = {
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

  // Expire after 15 min
  setTimeout(() => {
    const p = mockPayments.get(transactionId);
    if (p && p.status === 'pending') {
      p.status = 'expired';
    }
  }, 15 * 60 * 1000);

  // Simulate result after 4-9s
  setTimeout(() => {
    const p = mockPayments.get(transactionId);
    if (p && p.status === 'pending') {
      // Airtel has slightly higher failure rate in mock
      p.status = Math.random() < 0.85 ? 'completed' : 'failed';
      p.completed_at = new Date().toISOString();
      if (p.status === 'failed') {
        p.failure_reason = 'Transaction refusée par Airtel Money';
      }
    }
  }, 4000 + Math.random() * 5000);

  return {
    success: true,
    payment_url: `https://airtel.co.cd/portal/pay/${transactionId}`,
    transaction_id: transactionId,
  };
}

// ─────────────────────────────────────────────
// Mock: GET /api/v1/airtel-money/status/:id
// ─────────────────────────────────────────────

export async function mockAirtelMoneyGetStatus(
  transactionId: string
): Promise<AirtelMoneyStatusResponse | null> {
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
// Helpers
// ─────────────────────────────────────────────

export async function mockAirtelMoneySimulateSuccess(transactionId: string): Promise<void> {
  const payment = mockPayments.get(transactionId);
  if (payment && payment.status === 'pending') {
    payment.status = 'completed';
    payment.completed_at = new Date().toISOString();
  }
}

export async function mockAirtelMoneySimulateFailure(
  transactionId: string,
  reason = 'Transaction refusée'
): Promise<void> {
  const payment = mockPayments.get(transactionId);
  if (payment && payment.status === 'pending') {
    payment.status = 'failed';
    payment.completed_at = new Date().toISOString();
    payment.failure_reason = reason;
  }
}

export function getMockAirtelPayment(id: string): MockAirtelPayment | undefined {
  return mockPayments.get(id);
}

export function clearMockAirtelPayments(): void {
  mockPayments.clear();
}

export const AIRTEL_MONEY_MERCHANT_ID = 'FACTURESMART_RDC_AM_001';

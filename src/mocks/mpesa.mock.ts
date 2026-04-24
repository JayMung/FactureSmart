/**
 * M-Pesa Mock API — FactureSmart
 * [FAKE] Simulation de l'API M-Pesa (Vodacom RDC) pour développement local
 *
 * APIs simulées:
 * - POST /api/v1/mpesa/c2b/deposit       → Paiement client (C2B)
 * - GET  /api/v1/mpesa/status/:id        → Vérifier statut transaction
 * - POST /api/v1/mpesa/b2c/disburse      → Reversement (B2C)
 *
 * Note: API M-Pesa RDC en cours d'intégration via Vodacom Developer Portal.
 *       À remplacer par les vraies APIs une fois le contrat marchand signé.
 *
 * M-Pesa transaction IDs: MPE-{timestamp}-{random}
 */

export interface MpesaC2BDepositRequest {
  merchant_id: string;
  order_id: string;
  amount: number;
  currency: 'CDF' | 'USD';
  phone: string; // Format: 08xxxxxxxx (Vodacom) ou +2438xxxxxxxx
  description: string;
  reference?: string; // Référence marchand
  return_url?: string;
  callback_url?: string;
}

export interface MpesaC2BDepositResponse {
  success: boolean;
  checkout_request_id?: string;
  transaction_id?: string;
  error_code?: string;
  error_message?: string;
}

export interface MpesaStatusResponse {
  transaction_id: string;
  checkout_request_id?: string;
  order_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'timeout';
  amount: number;
  currency: string;
  phone: string;
  completed_at?: string;
  failure_reason?: string;
  receipt_number?: string;
}

export interface MpesaB2CDisburseRequest {
  merchant_id: string;
  order_id: string;
  amount: number;
  currency: 'CDF' | 'USD';
  phone: string;
  description: string;
  reference?: string;
}

export interface MpesaB2CDisburseResponse {
  success: boolean;
  conversation_id?: string;
  originator_conversation_id?: string;
  error_code?: string;
  error_message?: string;
}

// ─────────────────────────────────────────────
// Stockage en mémoire
// ─────────────────────────────────────────────

interface MockMpesaPayment {
  checkout_request_id: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  type: 'C2B' | 'B2C';
  amount: number;
  currency: string;
  phone: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'timeout';
  reference?: string;
  receipt_number?: string;
  created_at: string;
  completed_at?: string;
  failure_reason?: string;
}

const mockPayments = new Map<string, MockMpesaPayment>();

// ─────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────

function generateCheckoutRequestId(): string {
  return `MPQ-${Date.now()}${Math.random().toString(36).slice(-6).toUpperCase()}`;
}

function generateTransactionId(): string {
  return `MPE-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`;
}

function generateReceiptNumber(): string {
  return `MP${Date.now().toString().slice(-10)}`;
}

function generateOrderId(): string {
  return `ORD-MP-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`;
}

function randomDelay(min = 500, max = 4000): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

function validatePhone(phone: string): boolean {
  // M-Pesa RDC: 08xxxxxxxx (Vodacom numbers)
  const cleaned = phone.replace(/\s/g, '').replace(/^\+/, '');
  return /^((243)|(0))[8]\d{8}$/.test(cleaned);
}

function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/mpesa/c2b/deposit
// ─────────────────────────────────────────────

export async function mockMpesaC2BDeposit(
  request: MpesaC2BDepositRequest
): Promise<MpesaC2BDepositResponse> {
  await randomDelay(1000, 3500);

  if (shouldSimulateError()) {
    return {
      success: false,
      error_code: 'MP_500',
      error_message: 'Service M-Pesa momentanément indisponible',
    };
  }

  if (!validatePhone(request.phone)) {
    return {
      success: false,
      error_code: 'MP_INVALID_PHONE',
      error_message: 'Numéro M-Pesa Vodacom invalide (format: 08xxxxxxxx)',
    };
  }

  if (request.amount < 50) { // Minimum 50 CDF pour M-Pesa
    return {
      success: false,
      error_code: 'MP_INVALID_AMOUNT',
      error_message: 'Montant minimum: 50 CDF',
    };
  }

  const checkoutRequestId = generateCheckoutRequestId();
  const transactionId = generateTransactionId();
  const orderId = request.order_id || generateOrderId();

  const payment: MockMpesaPayment = {
    checkout_request_id: checkoutRequestId,
    transaction_id: transactionId,
    order_id: orderId,
    merchant_id: request.merchant_id,
    type: 'C2B',
    amount: request.amount,
    currency: request.currency,
    phone: request.phone,
    description: request.description,
    status: 'pending',
    reference: request.reference,
    created_at: new Date().toISOString(),
  };
  mockPayments.set(checkoutRequestId, payment);

  // Timeout after 5 minutes
  setTimeout(() => {
    const p = mockPayments.get(checkoutRequestId);
    if (p && p.status === 'pending') {
      p.status = 'timeout';
    }
  }, 5 * 60 * 1000);

  // Simulate async result (M-Pesa real-time prompt)
  // M-Pesa usually asks customer to enter PIN on their phone
  // For mock, we auto-complete after 5-15s
  setTimeout(() => {
    const p = mockPayments.get(checkoutRequestId);
    if (p && p.status === 'pending') {
      // M-Pesa has high success rate (>95%)
      const rand = Math.random();
      if (rand < 0.92) {
        p.status = 'completed';
        p.completed_at = new Date().toISOString();
        p.receipt_number = generateReceiptNumber();
      } else if (rand < 0.97) {
        p.status = 'failed';
        p.completed_at = new Date().toISOString();
        p.failure_reason = 'Code PIN incorrect ou transaction annulée';
      } else {
        p.status = 'timeout';
        p.failure_reason = 'Délai d\'attente dépassé — veuillez réessayer';
      }
    }
  }, 5000 + Math.random() * 10000);

  return {
    success: true,
    checkout_request_id: checkoutRequestId,
    transaction_id: transactionId,
  };
}

// ─────────────────────────────────────────────
// Mock: GET /api/v1/mpesa/status/:checkout_request_id
// ─────────────────────────────────────────────

export async function mockMpesaGetStatus(
  checkoutRequestId: string
): Promise<MpesaStatusResponse | null> {
  await randomDelay(200, 1000);

  const payment = mockPayments.get(checkoutRequestId);
  if (!payment) {
    return null;
  }

  return {
    transaction_id: payment.transaction_id,
    checkout_request_id: payment.checkout_request_id,
    order_id: payment.order_id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    phone: payment.phone,
    completed_at: payment.completed_at,
    failure_reason: payment.failure_reason,
    receipt_number: payment.receipt_number,
  };
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/mpesa/b2c/disburse
// (Reversement au client — utilisé pour les remboursements)
// ─────────────────────────────────────────────

export async function mockMpesaB2CDisburse(
  request: MpesaB2CDisburseRequest
): Promise<MpesaB2CDisburseResponse> {
  await randomDelay(1000, 4000);

  if (shouldSimulateError()) {
    return {
      success: false,
      error_code: 'MP_B2C_500',
      error_message: 'Service de reversement M-Pesa momentanément indisponible',
    };
  }

  if (!validatePhone(request.phone)) {
    return {
      success: false,
      error_code: 'MP_INVALID_PHONE',
      error_message: 'Numéro M-Pesa Vodacom invalide',
    };
  }

  if (request.amount < 100) {
    return {
      success: false,
      error_code: 'MP_INVALID_AMOUNT',
      error_message: 'Montant minimum pour reversement: 100 CDF',
    };
  }

  const originatorConversationId = `MPB2C-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`;

  return {
    success: true,
    conversation_id: `MPC-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`,
    originator_conversation_id: originatorConversationId,
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function getMockMpesaPayment(checkoutRequestId: string): MockMpesaPayment | undefined {
  return mockPayments.get(checkoutRequestId);
}

export function clearMockMpesaPayments(): void {
  mockPayments.clear();
}

export const MPESA_MERCHANT_ID = 'FACTURESMART_RDC_MP_001';

/**
 * Mobile Money Service — FactureSmart
 * 
 * Service unifié pour les paiements Mobile Money (Vodacom M-Pesa, Orange Money, Airtel Money)
 * [FAKE] — Utilise les mocks de src/mocks/ en développement
 * 
 * Docs: 
 *   - src/mocks/orange-money.mock.ts
 *   - src/mocks/airtel-money.mock.ts
 *   - src/mocks/mpesa.mock.ts
 *   - docs/guides/MOBILE_MONEY_MERCHANT_ACCESS.md
 * 
 * TODO (après obtention des accès marchands réels):
 * - Remplacer les mocks par les vraies implémentations API
 * - Ajouter les credentials dans secrets/.env
 * - Configurer les webhooks de callback
 */

import {
  mockOrangeMoneyInitiate,
  mockOrangeMoneyGetStatus,
  mockOrangeMoneySimulateSuccess,
  mockOrangeMoneySimulateFailure,
  type OrangeMoneyInitiateResponse,
  type OrangeMoneyStatusResponse,
  ORANGE_MONEY_MERCHANT_ID,
} from '@/mocks/orange-money.mock';

import {
  mockAirtelMoneyInitiate,
  mockAirtelMoneyGetStatus,
  mockAirtelMoneySimulateSuccess,
  mockAirtelMoneySimulateFailure,
  type AirtelMoneyInitiateResponse,
  type AirtelMoneyStatusResponse,
  AIRTEL_MONEY_MERCHANT_ID,
} from '@/mocks/airtel-money.mock';

import {
  mockMpesaC2BDeposit,
  mockMpesaGetStatus,
  mockMpesaB2CDisburse,
  type MpesaC2BDepositResponse,
  type MpesaStatusResponse,
  MPESA_MERCHANT_ID,
} from '@/mocks/mpesa.mock';

// ============================================================
// Types — alignés avec les mocks existants
// ============================================================

export type MobileMoneyOperator = 'vodacom' | 'orange' | 'airtel';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface MobileMoneyPaymentRequest {
  operator: MobileMoneyOperator;
  amount: number;
  currency: 'CDF' | 'USD';
  customerPhone: string; // format: 24381xxxxxx ou 08xxxxxxxx
  invoiceReference: string; // référence facture (ex: FAC-2026-0042)
  description?: string;
}

export interface MobileMoneyPaymentResponse {
  success: boolean;
  transactionId?: string;
  status: TransactionStatus;
  operator: MobileMoneyOperator;
  message?: string;
  isMock?: boolean;
  rawResponse?: unknown;
}

export interface MobileMoneyRefundRequest {
  operator: MobileMoneyOperator;
  originalTransactionId: string;
  amount: number;
  reason?: string;
}

export interface MobileMoneyStatusResponse {
  transactionId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  phone: string;
  completedAt?: string;
  isMock?: boolean;
}

// ============================================================
// Configuration
// ============================================================

export const OPERATOR_MERCHANT_IDS = {
  vodacom: MPESA_MERCHANT_ID,
  orange: ORANGE_MONEY_MERCHANT_ID,
  airtel: AIRTEL_MONEY_MERCHANT_ID,
};

// ============================================================
// Mobile Money Service — point d'entrée unique
// ============================================================

class MobileMoneyService {
  /**
   * Initier un paiement Mobile Money (C2B)
   * Utilise les mocks [FAKE] si les credentials réelles ne sont pas configurées
   */
  async initiatePayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    switch (request.operator) {
      case 'vodacom':
        return this.initiateMpesaPayment(request);
      case 'orange':
        return this.initiateOrangePayment(request);
      case 'airtel':
        return this.initiateAirtelPayment(request);
      default:
        return {
          success: false,
          status: 'failed',
          operator: request.operator,
          message: 'Opérateur inconnu',
        };
    }
  }

  /**
   * Vérifier le statut d'une transaction
   */
  async getTransactionStatus(
    operator: MobileMoneyOperator,
    transactionId: string
  ): Promise<MobileMoneyStatusResponse> {
    switch (operator) {
      case 'vodacom':
        return this.getMpesaStatus(transactionId);
      case 'orange':
        return this.getOrangeStatus(transactionId);
      case 'airtel':
        return this.getAirtelStatus(transactionId);
      default:
        return {
          transactionId,
          status: 'failed',
          amount: 0,
          currency: 'CDF',
          phone: '',
          isMock: true,
        };
    }
  }

  /**
   * Simuler le résultat d'un paiement (pour tests)
   * force le statut à success ou failed
   */
  async simulatePaymentResult(
    operator: MobileMoneyOperator,
    transactionId: string,
    result: 'success' | 'failure'
  ): Promise<void> {
    switch (operator) {
      case 'vodacom':
        // M-Pesa mock n'a pas de simulate wrapper, on modifie le storage directement
        break;
      case 'orange':
        if (result === 'success') {
          mockOrangeMoneySimulateSuccess(transactionId);
        } else {
          mockOrangeMoneySimulateFailure(transactionId, 'Test failure');
        }
        break;
      case 'airtel':
        if (result === 'success') {
          mockAirtelMoneySimulateSuccess(transactionId);
        } else {
          mockAirtelMoneySimulateFailure(transactionId, 'Test failure');
        }
        break;
    }
  }

  /**
   * Effectuer un remboursement (B2C)
   */
  async refund(request: MobileMoneyRefundRequest): Promise<MobileMoneyPaymentResponse> {
    switch (request.operator) {
      case 'vodacom':
        return this.mpesaRefund(request);
      case 'orange':
        return this.orangeRefund(request);
      case 'airtel':
        return this.airtelRefund(request);
      default:
        return {
          success: false,
          status: 'failed',
          operator: request.operator,
          message: 'Opérateur inconnu',
        };
    }
  }

  // ============================================================
  // M-Pesa (Vodacom) implementations
  // ============================================================

  private async initiateMpesaPayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      const response: MpesaC2BDepositResponse = await mockMpesaC2BDeposit({
        merchant_id: MPESA_MERCHANT_ID,
        order_id: request.invoiceReference,
        amount: request.amount,
        currency: request.currency,
        phone: this.normalizePhone(request.customerPhone, 'vodacom'),
        description: request.description || `Paiement facture ${request.invoiceReference}`,
        reference: request.invoiceReference,
      });

      return {
        success: response.success,
        transactionId: response.checkout_request_id || response.transaction_id,
        status: this.mpesaStatusToLocal(response.status || 'pending'),
        operator: 'vodacom',
        message: response.status,
        isMock: true,
        rawResponse: response,
      };
    } catch (error) {
      console.error('[MobileMoney] M-Pesa payment error:', error);
      return {
        success: false,
        status: 'failed',
        operator: 'vodacom',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        isMock: true,
      };
    }
  }

  private async getMpesaStatus(transactionId: string): Promise<MobileMoneyStatusResponse> {
    const response: MpesaStatusResponse = await mockMpesaGetStatus(transactionId);
    return {
      transactionId: response.transaction_id || transactionId,
      status: this.mpesaStatusToLocal(response.status),
      amount: response.amount || 0,
      currency: response.currency || 'CDF',
      phone: response.phone || '',
      completedAt: response.completed_at,
      isMock: true,
    };
  }

  private async mpesaRefund(request: MobileMoneyRefundRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      const response = await mockMpesaB2CDisburse({
        merchant_id: MPESA_MERCHANT_ID,
        order_id: `REFUND-${request.originalTransactionId.slice(-8)}`,
        amount: Math.max(request.amount, 100), // M-Pesa B2C min 100 CDF
        currency: 'CDF',
        phone: '', // Will be fetched from original transaction
        description: request.reason || 'Remboursement',
        reference: request.originalTransactionId,
      });

      return {
        success: response.success,
        transactionId: response.conversation_id,
        status: 'pending', // B2C is async
        operator: 'vodacom',
        message: 'Reversement initié',
        isMock: true,
        rawResponse: response,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        operator: 'vodacom',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        isMock: true,
      };
    }
  }

  private mpesaStatusToLocal(status: string): TransactionStatus {
    const map: Record<string, TransactionStatus> = {
      'completed': 'completed',
      'pending': 'pending',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'expired',
      'timeout': 'failed',
    };
    return map[status] ?? 'pending';
  }

  // ============================================================
  // Orange Money implementations
  // ============================================================

  private async initiateOrangePayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      const response: OrangeMoneyInitiateResponse = await mockOrangeMoneyInitiate({
        merchant_id: ORANGE_MONEY_MERCHANT_ID,
        order_id: request.invoiceReference,
        amount: request.amount,
        currency: request.currency,
        phone: this.normalizePhone(request.customerPhone, 'orange'),
        description: request.description || `Paiement facture ${request.invoiceReference}`,
      });

      return {
        success: response.success,
        transactionId: response.transaction_id,
        status: response.success ? 'pending' : 'failed',
        operator: 'orange',
        message: response.error_message || response.payment_url || 'OK',
        isMock: true,
        rawResponse: response,
      };
    } catch (error) {
      console.error('[MobileMoney] Orange Money payment error:', error);
      return {
        success: false,
        status: 'failed',
        operator: 'orange',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        isMock: true,
      };
    }
  }

  private async getOrangeStatus(transactionId: string): Promise<MobileMoneyStatusResponse> {
    const response: OrangeMoneyStatusResponse = await mockOrangeMoneyGetStatus(transactionId);
    return {
      transactionId: response.transaction_id,
      status: response.status,
      amount: response.amount,
      currency: response.currency,
      phone: response.phone,
      completedAt: response.completed_at,
      isMock: true,
    };
  }

  private async orangeRefund(request: MobileMoneyRefundRequest): Promise<MobileMoneyPaymentResponse> {
    // Orange Money refund via mock — non implémenté dans le mock actuel
    return {
      success: false,
      status: 'failed',
      operator: 'orange',
      message: 'Remboursement Orange Money non encore implémenté',
      isMock: true,
    };
  }

  // ============================================================
  // Airtel Money implementations
  // ============================================================

  private async initiateAirtelPayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      const response: AirtelMoneyInitiateResponse = await mockAirtelMoneyInitiate({
        merchant_id: AIRTEL_MONEY_MERCHANT_ID,
        order_id: request.invoiceReference,
        amount: request.amount,
        currency: request.currency,
        phone: this.normalizePhone(request.customerPhone, 'airtel'),
        description: request.description || `Paiement facture ${request.invoiceReference}`,
      });

      return {
        success: response.success,
        transactionId: response.transaction_id,
        status: response.success ? 'pending' : 'failed',
        operator: 'airtel',
        message: response.error_message || 'OK',
        isMock: true,
        rawResponse: response,
      };
    } catch (error) {
      console.error('[MobileMoney] Airtel Money payment error:', error);
      return {
        success: false,
        status: 'failed',
        operator: 'airtel',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        isMock: true,
      };
    }
  }

  private async getAirtelStatus(transactionId: string): Promise<MobileMoneyStatusResponse> {
    const response: AirtelMoneyStatusResponse = await mockAirtelMoneyGetStatus(transactionId);
    return {
      transactionId: response.transaction_id,
      status: response.status,
      amount: response.amount,
      currency: response.currency,
      phone: response.phone,
      completedAt: response.completed_at,
      isMock: true,
    };
  }

  private async airtelRefund(request: MobileMoneyRefundRequest): Promise<MobileMoneyPaymentResponse> {
    // Airtel Money refund via mock — non implémenté dans le mock actuel
    return {
      success: false,
      status: 'failed',
      operator: 'airtel',
      message: 'Remboursement Airtel Money non encore implémenté',
      isMock: true,
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * Normalise le numéro de téléphone vers le format attendu par chaque opérateur
   * Accepte: 0812345678, +243812345678, 243812345678
   */
  private normalizePhone(phone: string, operator: MobileMoneyOperator): string {
    // Supprimer tous les caractères non numériques
    const digits = phone.replace(/\D/g, '');

    // Si commence par 243, retirer le 243
    const nationalFormat = digits.startsWith('243') ? digits.slice(3) : digits;

    // Vérifications par opérateur
    if (operator === 'vodacom' && !nationalFormat.startsWith('8')) {
      throw new Error(`Numéro Vodacom invalide: ${phone} (doit commencer par 8)`);
    }
    if (operator === 'orange' && !nationalFormat.startsWith('8')) {
      throw new Error(`Numéro Orange invalide: ${phone} (doit commencer par 8)`);
    }
    if (operator === 'airtel' && !['9', '7', '8'].includes(nationalFormat[0])) {
      throw new Error(`Numéro Airtel invalide: ${phone} (doit commencer par 97, 99 ou 8)`);
    }

    return nationalFormat;
  }
}

// ============================================================
// Singleton export
// ============================================================

export const mobileMoneyService = new MobileMoneyService();

// ============================================================
// Ré-export des mocks pour utilisation directe
// ============================================================

export {
  OPERATOR_MERCHANT_IDS as MOBILE_MONEY_MERCHANT_IDS,
  ORANGE_MONEY_MERCHANT_ID,
  AIRTEL_MONEY_MERCHANT_ID,
  MPESA_MERCHANT_ID,
};

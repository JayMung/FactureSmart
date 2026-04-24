/**
 * [FAKE] Mock Payment Services — FactureSmart
 * 
 * These services call the mock Supabase Edge Functions.
 * They are used when real payment APIs (Orange Money, Airtel Money, M-Pesa)
 * are not yet configured.
 * 
 * IMPORTANT: These functions are for development/testing only.
 * Replace with real API calls once merchant credentials are activated.
 */

import { dgiService } from '@/services/dgi';

// ============================================================
// Types
// ============================================================

export type PaymentProvider = 'orange_money' | 'airtel_money' | 'mpesa';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface PaymentInitRequest {
  amount: number;
  currency?: 'CDF' | 'USD';
  merchantReference: string;
  customerPhone: string;
  description?: string;
}

export interface PaymentInitResponse {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  statusMessage: string;
  expiresAt?: string;
  isMock: boolean;
  responseTimeMs?: number;
  error?: { code: string; message: string };
}

export interface PaymentVerifyResponse {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  operatorReference?: string;
  confirmedAt?: string;
  failureReason?: string;
  isMock: boolean;
  responseTimeMs?: number;
  error?: { code: string; message: string };
}

// ============================================================
// Base fetch helper
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callMockEndpoint(
  path: string,
  body: Record<string, unknown>
): Promise<{ data: unknown; status: number }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${await getBearerToken()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { data, status: response.status };
}

async function getBearerToken(): Promise<string> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  } catch {
    return '';
  }
}

// ============================================================
// Payment Providers
// ============================================================

/**
 * Initiate Orange Money payment
 */
export async function initiateOrangeMoney(
  request: PaymentInitRequest
): Promise<PaymentInitResponse> {
  try {
    const { data, status } = await callMockEndpoint('mock-orange-money/initiate', {
      amount: request.amount,
      currency: request.currency || 'CDF',
      merchantReference: request.merchantReference,
      customerPhone: request.customerPhone,
      description: request.description,
    });

    const result = data as any;

    if (status >= 400) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        statusMessage: result.error?.message || 'Erreur Orange Money',
        error: result.error,
        isMock: true,
      };
    }

    return {
      success: true,
      transactionId: result.data?.transactionId || '',
      status: result.data?.status || 'pending',
      statusMessage: result.data?.statusMessage || '',
      expiresAt: result.data?.expiresAt,
      isMock: true,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (err: any) {
    return {
      success: false,
      transactionId: '',
      status: 'failed',
      statusMessage: `Erreur réseau: ${err.message}`,
      isMock: true,
    };
  }
}

/**
 * Verify Orange Money payment status
 */
export async function verifyOrangeMoney(transactionId: string): Promise<PaymentVerifyResponse> {
  try {
    const { data, status } = await callMockEndpoint('mock-orange-money/verify', { transactionId });
    const result = data as any;

    if (status >= 400) {
      return { success: false, transactionId, status: 'failed', error: result.error, isMock: true };
    }

    return {
      success: result.data?.status === 'success',
      transactionId,
      status: result.data?.status || 'pending',
      operatorReference: result.data?.operatorReference,
      confirmedAt: result.data?.confirmedAt,
      failureReason: result.data?.failureReason,
      isMock: true,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (err: any) {
    return { success: false, transactionId, status: 'failed', error: { code: 'NETWORK', message: err.message }, isMock: true };
  }
}

/**
 * Initiate Airtel Money payment
 */
export async function initiateAirtelMoney(request: PaymentInitRequest): Promise<PaymentInitResponse> {
  try {
    const { data, status } = await callMockEndpoint('mock-airtel-money/initiate', {
      amount: request.amount,
      currency: request.currency || 'CDF',
      merchantReference: request.merchantReference,
      customerPhone: request.customerPhone,
      description: request.description,
    });

    const result = data as any;

    if (status >= 400) {
      return {
        success: false, transactionId: '', status: 'failed',
        statusMessage: result.error?.message || 'Erreur Airtel Money', error: result.error, isMock: true,
      };
    }

    return {
      success: true,
      transactionId: result.data?.transactionId || '',
      status: result.data?.status || 'pending',
      statusMessage: result.data?.statusMessage || '',
      expiresAt: result.data?.expiresAt,
      isMock: true,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (err: any) {
    return { success: false, transactionId: '', status: 'failed', statusMessage: `Erreur réseau: ${err.message}`, isMock: true };
  }
}

/**
 * Verify Airtel Money payment
 */
export async function verifyAirtelMoney(transactionId: string): Promise<PaymentVerifyResponse> {
  try {
    const { data, status } = await callMockEndpoint('mock-airtel-money/verify', { transactionId });
    const result = data as any;

    if (status >= 400) {
      return { success: false, transactionId, status: 'failed', error: result.error, isMock: true };
    }

    return {
      success: result.data?.status === 'success',
      transactionId,
      status: result.data?.status || 'pending',
      operatorReference: result.data?.operatorReference,
      confirmedAt: result.data?.confirmedAt,
      isMock: true,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (err: any) {
    return { success: false, transactionId, status: 'failed', error: { code: 'NETWORK', message: err.message }, isMock: true };
  }
}

/**
 * Initiate M-Pesa payment
 */
export async function initiateMpesa(request: PaymentInitRequest): Promise<PaymentInitResponse> {
  try {
    const { data, status } = await callMockEndpoint('mock-mpesa/initiate', {
      amount: request.amount,
      currency: request.currency || 'CDF',
      merchantReference: request.merchantReference,
      customerPhone: request.customerPhone,
      description: request.description,
    });

    const result = data as any;

    if (status >= 400) {
      return {
        success: false, transactionId: '', status: 'failed',
        statusMessage: result.error?.message || 'Erreur M-Pesa', error: result.error, isMock: true,
      };
    }

    return {
      success: true,
      transactionId: result.data?.transactionId || '',
      checkoutRequestId: result.data?.checkoutRequestId,
      status: result.data?.status || 'pending',
      statusMessage: result.data?.statusMessage || '',
      expiresAt: result.data?.expiresAt,
      isMock: true,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (err: any) {
    return { success: false, transactionId: '', status: 'failed', statusMessage: `Erreur réseau: ${err.message}`, isMock: true };
  }
}

/**
 * Verify M-Pesa payment
 */
export async function verifyMpesa(transactionId: string, checkoutRequestId?: string): Promise<PaymentVerifyResponse> {
  try {
    const { data, status } = await callMockEndpoint('mock-mpesa/verify', { transactionId, checkoutRequestId });
    const result = data as any;

    if (status >= 400) {
      return { success: false, transactionId, status: 'failed', error: result.error, isMock: true };
    }

    return {
      success: result.data?.status === 'success',
      transactionId,
      status: result.data?.status || 'pending',
      operatorReference: result.data?.operatorReference,
      confirmedAt: result.data?.confirmedAt,
      receiverName: result.data?.receiverName,
      isMock: true,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (err: any) {
    return { success: false, transactionId, status: 'failed', error: { code: 'NETWORK', message: err.message }, isMock: true };
  }
}

// ============================================================
// Unified Payment API
// ============================================================

export interface UnifiedPaymentRequest {
  provider: PaymentProvider;
  amount: number;
  currency?: 'CDF' | 'USD';
  merchantReference: string;
  customerPhone: string;
  description?: string;
}

export type UnifiedPaymentResponse = PaymentInitResponse & { provider: PaymentProvider };

/**
 * Unified payment initiation for all providers
 */
export async function initiatePayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
  switch (request.provider) {
    case 'orange_money':
      return { ...(await initiateOrangeMoney(request)), provider: 'orange_money' };
    case 'airtel_money':
      return { ...(await initiateAirtelMoney(request)), provider: 'airtel_money' };
    case 'mpesa':
      return { ...(await initiateMpesa(request)), provider: 'mpesa' };
    default:
      return {
        success: false, transactionId: '', status: 'failed',
        statusMessage: `Provider ${request.provider} non supporté`, provider: request.provider, isMock: true,
      };
  }
}

// Export the DGI mock service (already implemented in dgi.ts)
export { dgiService };

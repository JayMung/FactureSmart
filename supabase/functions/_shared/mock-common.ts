/**
 * Shared utilities for Mock APIs
 * [FAKE] — Simulation only — not connected to real DGI or payment providers
 */

// Random delay between min and max ms
export function randomDelay(minMs = 200, maxMs = 2000): Promise<number> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise(resolve => setTimeout(() => resolve(delay), delay));
}

// Generate a random alphanumeric code
export function generateCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a transaction ID with prefix
export function generateTxId(prefix: string): string {
  return `${prefix}-${Date.now()}-${generateCode(6).toUpperCase()}`;
}

// Should simulate a random error (5% by default)
export function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

// Normalize RDC phone number to +243 format
export function normalizePhone(phone: string): string {
  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('0')) return '+243' + phone.slice(1);
  return '+243' + phone;
}

// Validate phone number format (RDC)
export function isValidRdcPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+243[0-9]{9}$/.test(normalized);
}

// Validate NIF format (15 digits)
export function isValidNif(nif: string): boolean {
  return /^\d{15}$/.test(nif);
}

// Mock NIF database
export const MOCK_NIF_DATABASE: Record<string, {
  companyName: string;
  rccm: string;
  idNat: string;
  address: string;
}> = {
  '123456789012345': {
    companyName: 'Coccinelle SARL',
    rccm: 'RCCM/CD/KIN/2024/12345',
    idNat: '01-1234-56789',
    address: 'Avenue du Commerce, Kinshasa, RDC',
  },
  '987654321098765': {
    companyName: 'CoExpress SAS',
    rccm: 'RCCM/CD/LUB/2024/54321',
    idNat: '02-9876-54321',
    address: 'Boulevard Liberation, Lubumbashi, RDC',
  },
  '555555555555555': {
    companyName: 'Velorix Store SPRL',
    rccm: 'RCCM/CD/KIN/2023/99999',
    idNat: '01-5555-55555',
    address: 'Rue des Usines, Goma, RDC',
  },
};

// In-memory store for transaction statuses (persists during Edge Function warm-up)
export const mockTransactionStore = new Map<string, {
  status: 'pending' | 'success' | 'failed' | 'expired';
  createdAt: number;
  data: Record<string, unknown>;
}>();

// Clean up old transactions (older than 1 hour)
export function cleanupOldTransactions(): void {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, value] of mockTransactionStore.entries()) {
    if (value.createdAt < oneHourAgo) {
      mockTransactionStore.delete(key);
    }
  }
}

// Run cleanup every 100 requests
let requestCount = 0;
export function periodicCleanup(): void {
  requestCount++;
  if (requestCount % 100 === 0) {
    cleanupOldTransactions();
    requestCount = 0;
  }
}

// Standard success response wrapper
export function successResponse(data: unknown, extra: Record<string, unknown> = {}) {
  return {
    success: true,
    data,
    isMock: true,
    ...extra,
  };
}

// Standard error response
export function errorResponse(code: string, message: string, details?: string[]) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    isMock: true,
  };
}

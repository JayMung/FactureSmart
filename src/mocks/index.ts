/**
 * Mock APIs Index — FactureSmart
 * [FAKE] Central export for all mock services
 *
 * Usage:
 * import { dgiMock, orangeMoneyMock, airtelMoneyMock, mpesaMock } from '../mocks';
 */

export {
  // DGI mocks
  mockDgiVerifyNIF,
  mockDgiSubmitFacture,
  mockDgiGetStatus,
  mockDgiDeclareTVA,
  clearMockSubmissions,
  getMockSubmission,
  getMockDeclaration,
  // Types
  type DGISubmitRequest,
  type DGISubmitResponse,
  type DGIStatusResponse,
  type DGINIFVerifyRequest,
  type DGIDeclareRequest,
} from './dgi.mock';

export {
  // Orange Money mocks
  mockOrangeMoneyInitiate,
  mockOrangeMoneyGetStatus,
  mockOrangeMoneySimulateSuccess,
  mockOrangeMoneySimulateFailure,
  getMockOrangePayment,
  clearMockOrangePayments,
  ORANGE_MONEY_MERCHANT_ID,
  type OrangeMoneyInitiateRequest,
  type OrangeMoneyInitiateResponse,
  type OrangeMoneyStatusResponse,
} from './orange-money.mock';

export {
  // Airtel Money mocks
  mockAirtelMoneyInitiate,
  mockAirtelMoneyGetStatus,
  mockAirtelMoneySimulateSuccess,
  mockAirtelMoneySimulateFailure,
  getMockAirtelPayment,
  clearMockAirtelPayments,
  AIRTEL_MONEY_MERCHANT_ID,
  type AirtelMoneyInitiateRequest,
  type AirtelMoneyInitiateResponse,
  type AirtelMoneyStatusResponse,
} from './airtel-money.mock';

export {
  // M-Pesa mocks
  mockMpesaC2BDeposit,
  mockMpesaGetStatus,
  mockMpesaB2CDisburse,
  getMockMpesaPayment,
  clearMockMpesaPayments,
  MPESA_MERCHANT_ID,
  type MpesaC2BDepositRequest,
  type MpesaC2BDepositResponse,
  type MpesaStatusResponse,
  type MpesaB2CDisburseRequest,
  type MpesaB2CDisburseResponse,
} from './mpesa.mock';

// ============================================================
// Edge Function Mocks (server-side) — appelle les Supabase Edge Functions
// Use these for integration testing with actual HTTP calls
// ============================================================

export {
  initiateOrangeMoney,
  verifyOrangeMoney,
  initiateAirtelMoney,
  verifyAirtelMoney,
  initiateMpesa,
  verifyMpesa,
  initiatePayment,
  dgiService,
  type PaymentProvider,
  type PaymentStatus,
  type PaymentInitRequest,
  type PaymentInitResponse,
  type PaymentVerifyResponse,
  type UnifiedPaymentRequest,
  type UnifiedPaymentResponse,
} from './payment-mocks';

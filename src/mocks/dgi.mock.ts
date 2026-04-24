/**
 * DGI Mock API — FactureSmart
 * [FAKE] Simulation des APIs DGI RDC pour développement local
 *
 * Ces endpoints SIMULENT le comportement de l'API DGI réelle.
 * À remplacer par les vraies APIs quand les credentials sandbox
 * seront disponibles (COD-26).
 *
 * APIs simulées:
 * - POST /api/v1/nif/verify       → Vérification NIF
 * - POST /api/v1/factures/submit  → Soumission facture
 * - GET  /api/v1/factures/status  → Statut facture
 * - POST /api/v1/declare          → Télédéclaration TVA
 */

import type { NIFVerifyResponse } from '../services/dgi';

// ─────────────────────────────────────────────
// Types partagés
// ─────────────────────────────────────────────

export interface DGISubmitRequest {
  numero_dgi: string;
  code_autorisation: string;
  qr_data: string;
  facture_number: string;
  date_facture: string;
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

export interface DGISubmitResponse {
  accepted: boolean;
  signature?: string;
  transmission_id?: string;
  error?: string;
}

export interface DGIStatusResponse {
  statut: 'pending' | 'validated' | 'rejected';
  receipt_url?: string;
  validated_at?: string;
  rejection_reason?: string;
}

export interface DGINIFVerifyRequest {
  nif: string;
  company_name?: string;
  email?: string;
}

export interface DGIDeclareRequest {
  periode: string; // YYYY-MM
  montant_tva_collectee: number;
  montant_tva_recuperable: number;
  montant_tva_due: number;
  declarations: Array<{
    facture_id: string;
    numero_dgi: string;
    montant_tva: number;
  }>;
}

// ─────────────────────────────────────────────
// Base de données mock de NIFs valides
// ─────────────────────────────────────────────

const MOCK_VALID_NIFS: Record<string, {
  companyName: string;
  rccm: string;
  idNat: string;
  address: string;
}> = {
  '123456789012345': {
    companyName: 'Coccinelle SARL',
    rccm: 'RCCM/CD/KIN/2024/12345',
    idNat: '01-1234-56789',
    address: 'Avenue du Commerce №45, Kinshasa, RDC',
  },
  '987654321098765': {
    companyName: 'CoExpress SAS',
    rccm: 'RCCM/CD/LUB/2024/54321',
    idNat: '02-9876-54321',
    address: 'Boulevard Liberation №12, Lubumbashi, RDC',
  },
  '555555555555555': {
    companyName: 'Velorix Store SPRL',
    rccm: 'RCCM/CD/KIN/2023/99999',
    idNat: '01-5555-55555',
    address: 'Rue des Usines №8, Goma, RDC',
  },
  '111122223333444': {
    companyName: 'Solar Solutions RDC SARL',
    rccm: 'RCCM/CD/KIN/2022/11111',
    idNat: '01-1111-22222',
    address: 'Avenue des Entreprises №3, Kinshasa, RDC',
  },
};

// ─────────────────────────────────────────────
// Stockage en mémoire pour les tests
// (en production, utiliser Supabase)
// ─────────────────────────────────────────────

interface MockSubmission {
  id: string;
  numero_dgi: string;
  code_auth: string;
  qr_data: string;
  statut: 'pending' | 'validated' | 'rejected';
  submitted_at: string;
  validated_at?: string;
  receipt_url?: string;
  rejection_reason?: string;
}

interface MockDeclaration {
  id: string;
  periode: string;
  statut: 'pending' | 'validated' | 'rejected';
  submitted_at: string;
  validated_at?: string;
  montant_tva_due: number;
}

// Stockage en mémoire (rafrîchi au redémarrage du serveur)
const mockSubmissions = new Map<string, MockSubmission>();
const mockDeclarations = new Map<string, MockDeclaration>();

// ─────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────

function generateCodeAuth(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateTransmissionId(): string {
  return `DGI-${Date.now()}-${Math.random().toString(36).slice(-6).toUpperCase()}`;
}

function randomDelay(min = 200, max = 2000): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/nif/verify
// ─────────────────────────────────────────────

export async function mockDgiVerifyNIF(
  request: DGINIFVerifyRequest
): Promise<NIFVerifyResponse> {
  await randomDelay(1000, 2500);

  // Simuler erreur aléatoire (5%)
  if (shouldSimulateError()) {
    return {
      success: false,
      status: 'rejected',
      nif: request.nif,
      error: 'Erreur technique DGI — veuillez réessayer',
    };
  }

  const { nif } = request;

  // Valider format NIF (15 chiffres pour RDC)
  if (!nif || !/^\d{15}$/.test(nif)) {
    return {
      success: false,
      status: 'rejected',
      nif,
      error: 'Format NIF invalide — 15 chiffres requis',
    };
  }

  // Vérifier base mock
  const mockData = MOCK_VALID_NIFS[nif];
  if (mockData) {
    return {
      success: true,
      status: 'verified',
      nif,
      companyName: mockData.companyName,
      rccm: mockData.rccm,
      idNat: mockData.idNat,
      address: mockData.address,
      verifiedAt: new Date().toISOString(),
    };
  }

  // Génération procédurale pour NIFs inconnus
  // 70% vérifié, 20% en attente, 10% non trouvé
  const rand = Math.random();
  if (rand < 0.7) {
    return {
      success: true,
      status: 'verified',
      nif,
      companyName: `Entreprise-${nif.slice(-4)} SARL`,
      rccm: `RCCM/CD/KIN/2024/${nif.slice(-5)}`,
      idNat: `01-${nif.slice(-4)}-${nif.slice(-5)}`,
      address: 'Kinshasa, RDC',
      verifiedAt: new Date().toISOString(),
    };
  } else if (rand < 0.9) {
    return {
      success: true,
      status: 'pending',
      nif,
      error: 'Vérification en cours — la DGI analyse votre dossier (délai: 24-48h)',
    };
  } else {
    return {
      success: false,
      status: 'not_found',
      nif,
      error: 'NIF non trouvé dans les registres de la DGI',
    };
  }
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/factures/submit
// ─────────────────────────────────────────────

export async function mockDgiSubmitFacture(
  payload: DGISubmitRequest
): Promise<DGISubmitResponse> {
  await randomDelay(500, 3000);

  // Simuler erreur aléatoire (5%)
  if (shouldSimulateError()) {
    return {
      accepted: false,
      error: 'Erreur technique DGI — veuillez réessayer',
    };
  }

  const transmissionId = generateTransmissionId();
  const codeAuth = payload.code_autorisation || generateCodeAuth();

  // Enregistrer la soumission
  const submission: MockSubmission = {
    id: transmissionId,
    numero_dgi: payload.numero_dgi,
    code_auth: codeAuth,
    qr_data: payload.qr_data,
    statut: 'pending',
    submitted_at: new Date().toISOString(),
  };
  mockSubmissions.set(transmissionId, submission);

  // Simuler validation automatique après un délai (pour les tests)
  // En réalité, la DGI valide manuellement
  setTimeout(() => {
    const sub = mockSubmissions.get(transmissionId);
    if (sub && sub.statut === 'pending') {
      sub.statut = 'validated';
      sub.validated_at = new Date().toISOString();
      sub.receipt_url = `https://dgi.gouv.cd/receipts/${transmissionId}.pdf`;
    }
  }, 10000); // Auto-validate after 10s for testing

  return {
    accepted: true,
    signature: `SIG-${codeAuth}`,
    transmission_id: transmissionId,
  };
}

// ─────────────────────────────────────────────
// Mock: GET /api/v1/factures/status/:id
// ─────────────────────────────────────────────

export async function mockDgiGetStatus(
  transmissionId: string
): Promise<DGIStatusResponse> {
  await randomDelay(200, 1000);

  // Simuler erreur aléatoire (3%)
  if (shouldSimulateError(0.03)) {
    return {
      statut: 'pending',
      error: 'Service DGI momentanément indisponible',
    };
  }

  const submission = mockSubmissions.get(transmissionId);
  if (!submission) {
    return {
      statut: 'rejected',
      rejection_reason: `Transmission ${transmissionId} non trouvée`,
    };
  }

  return {
    statut: submission.statut,
    receipt_url: submission.receipt_url,
    validated_at: submission.validated_at,
    rejection_reason: submission.rejection_reason,
  };
}

// ─────────────────────────────────────────────
// Mock: POST /api/v1/declare (Télédéclaration TVA)
// ─────────────────────────────────────────────

export async function mockDgiDeclareTVA(
  payload: DGIDeclareRequest
): Promise<{
  success: boolean;
  declaration_id?: string;
  validated_at?: string;
  error?: string;
}> {
  await randomDelay(1000, 4000);

  // Simuler erreur aléatoire (5%)
  if (shouldSimulateError()) {
    return {
      success: false,
      error: 'Erreur technique lors de la télédéclaration — veuillez réessayer',
    };
  }

  const declarationId = `DECL-${payload.periode}-${Date.now().toString(36).toUpperCase()}`;

  const declaration: MockDeclaration = {
    id: declarationId,
    periode: payload.periode,
    statut: 'pending',
    submitted_at: new Date().toISOString(),
    montant_tva_due: payload.montant_tva_due,
  };
  mockDeclarations.set(declarationId, declaration);

  // Auto-validate après 15s pour les tests
  setTimeout(() => {
    const decl = mockDeclarations.get(declarationId);
    if (decl && decl.statut === 'pending') {
      decl.statut = 'validated';
      decl.validated_at = new Date().toISOString();
    }
  }, 15000);

  return {
    success: true,
    declaration_id: declarationId,
    validated_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// Nettoyage (pour les tests)
// ─────────────────────────────────────────────

export function clearMockSubmissions(): void {
  mockSubmissions.clear();
  mockDeclarations.clear();
}

export function getMockSubmission(id: string): MockSubmission | undefined {
  return mockSubmissions.get(id);
}

export function getMockDeclaration(id: string): MockDeclaration | undefined {
  return mockDeclarations.get(id);
}

/**
 * Server-Side PDF Generation using Playwright
 * =============================================
 * Generates a PDF invoice from HTML template using Playwright's page.pdf().
 *
 * Design: matches screen-04-preview-facture.html (FactureSmart design system)
 * Metadata: NIF émetteur, NIF client, numéro facture, date
 *
 * Usage:
 *   npx tsx scripts/generate-facture-pdf.ts [output.pdf]
 *
 * Or import as a module:
 *   import { generateFacturePdf } from './scripts/generate-facture-pdf';
 *   const pdfBuffer = await generateFacturePdf(invoiceData);
 */

import { chromium, type Browser } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

export interface InvoicePdfData {
  // Invoice metadata
  facture_number: string;
  date_emission: string;
  devise: 'USD' | 'CDF';
  statut: string;

  // Issuer (déclarant/entreprise)
  raison_sociale: string;
  nif: string;           // NIF émetteur
  rccm?: string;
  adresse_lines: string[];

  // Client
  client_nom: string;
  client_nif?: string;   // NIF client
  client_adresse?: string;
  client_ville?: string;

  // Line items
  items: InvoiceItem[];

  // Financial totals
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  taux_tva?: number;     // e.g. 18 for 18%

  // DGI fields
  numero_dgi?: string;
  code_auth?: string;
  qr_code_data?: string;
  content_hash?: string;
  date_validation?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);

const fmtCurrency = (amount: number, currency = 'USD') =>
  currency === 'USD' ? `$${fmt(amount)}` : `${fmt(amount)} FC`;

function getDeviseSymbol(devise: string) {
  return devise === 'USD' ? '$' : 'CDF';
}

// Simple Mustache-style template renderer (no external deps)
function renderTemplate(html: string, data: Record<string, any>): string {
  let result = html;

  // Handle conditional blocks {{#if var}}...{{/if}}
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, key, content) => {
    const val = data[key];
    if (val && val !== false && val !== null && val !== undefined) {
      return content;
    }
    return '';
  });

  // Handle arrays {{#each arr}}...{{/each}}
  result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, key, content) => {
    const arr = data[key];
    if (!Array.isArray(arr)) return '';
    return arr.map((item: Record<string, any>, index: number) => {
      let row = content;
      // Handle @odd helper
      row = row.replace(/{{#if @odd}}([\s\S]*?){{\/if}}/g, (_, c) => (index % 2 === 1 ? c : ''));
      // Replace {{this}} in nested context
      row = row.replace(/\{\{this\}\}/g, String(item));
      // Replace field placeholders
      row = row.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        item[k] !== undefined && item[k] !== null ? String(item[k]) : ''
      );
      return row;
    }).join('');
  });

  // Replace simple variables
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    if (val !== undefined && val !== null) return String(val);
    return `{{${key}}}`;
  });

  return result;
}

// ─── HTML Generation ─────────────────────────────────────────────────────────

function buildHtml(data: InvoicePdfData): string {
  const templatePath = resolve(process.cwd(), 'templates/facture-pdf-template.html');
  let html = readFileSync(templatePath, 'utf-8');

  // Compute derived fields
  const tauxTva = data.taux_tva ?? (data.montant_tva && data.montant_ht
    ? Math.round((data.montant_tva / data.montant_ht) * 100)
    : 18);

  const totalHtFormatted = fmt(data.montant_ht);
  const totalTvaFormatted = fmt(data.montant_tva);
  const totalTtcFormatted = fmt(data.montant_ttc);
  const deviseSymbol = getDeviseSymbol(data.devise);

  // Format items
  const items = data.items.map(item => ({
    ...item,
    prix_unitaire_formatted: fmtCurrency(item.prix_unitaire, data.devise),
    montant_total_formatted: fmtCurrency(item.montant_total, data.devise),
  }));

  const codeAuth = data.code_auth
    ? `${data.facture_number}-${data.code_auth}`
    : `${data.facture_number}-AUTH`;

  const shortHash = data.content_hash
    ? `sha256:${data.content_hash.slice(0, 16)}...`
    : `sha256:${data.facture_number}-${Date.now().toString(16).slice(0, 16)}...`;

  const isDgiValid = data.statut === 'validee' || data.statut === 'payee';

  const qrCodeDataUrl = data.qr_code_data
    ? `data:image/png;base64,${data.qr_code_data}`
    : '';

  const renderData = {
    ...data,
    taux_tva: tauxTva,
    total_ht_formatted: totalHtFormatted,
    total_tva_formatted: totalTvaFormatted,
    total_ttc_formatted: totalTtcFormatted,
    devise_symbol: deviseSymbol,
    items,
    code_auth: codeAuth,
    content_hash: shortHash,
    dgi_status_valid: isDgiValid,
    qr_code_data_url: qrCodeDataUrl,
  };

  return renderTemplate(html, renderData);
}

// ─── Playwright PDF Generation ────────────────────────────────────────────────

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Generate a PDF buffer from invoice data using Playwright.
 * @param data Invoice data
 * @returns PDF as a Buffer
 */
export async function generateFacturePdf(data: InvoicePdfData): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Build HTML with data
    const html = buildHtml(data);

    // Set content and wait for network idle
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Wait for any fonts to load
    await page.waitForTimeout(500);

    // Generate PDF with A4 format
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Generate a PDF file from invoice data.
 * @param data Invoice data
 * @param outputPath File path to save the PDF
 */
export async function generateFacturePdfFile(data: InvoicePdfData, outputPath: string): Promise<void> {
  const buffer = await generateFacturePdf(data);
  writeFileSync(outputPath, buffer);
  console.log(`✅ PDF generated: ${outputPath}`);
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

async function main() {
  const outputPath = process.argv[2] || resolve(process.cwd(), 'dist/facture-preview.pdf');

  // ── Sample invoice data (matching COD-52 mockup) ─────────────────────────
  const sampleData: InvoicePdfData = {
    facture_number: 'FAC-2026-0142',
    date_emission: '22 Avril 2026',
    devise: 'CDF',
    statut: 'validee',

    raison_sociale: 'SARL Pambu & Fils',
    nif: '0XXXXXXXXX-RDC',
    rccm: 'RCCM/KIN/2024/12345',
    adresse_lines: [
      'Avenue du Commerce, Quartier Commercial',
      'Kinshasa, République Démocratique du Congo',
    ],

    client_nom: 'Congo Freight SPRL',
    client_nif: '0XXXXXXXXX1',
    client_adresse: '45 Avenue du Fleuve, Gombe',
    client_ville: 'Kinshasa',

    items: [
      {
        description: 'Services de transport routier — Course Kinshasa-Brazzaville',
        quantite: 10,
        prix_unitaire: 200000,
        montant_total: 2000000,
      },
      {
        description: 'Assurance marchandise',
        quantite: 10,
        prix_unitaire: 100000,
        montant_total: 1000000,
      },
      {
        description: 'Frais de douane et formalités administratives',
        quantite: 1,
        prix_unitaire: 500000,
        montant_total: 500000,
      },
    ],

    montant_ht: 3500000,
    montant_tva: 630000,
    montant_ttc: 4130000,
    taux_tva: 18,

    numero_dgi: 'DGI-2026-0142',
    code_auth: 'AUTH',
    qr_code_data: '',  // Will show placeholder
    content_hash: 'e3b0c44298fc1c149afb4c8996fb924',
    date_validation: '22 Avril 2026 à 14:32 UTC+2',
  };

  console.log('📄 Generating PDF with Playwright...');
  console.log(`   Invoice: ${sampleData.facture_number}`);
  console.log(`   Issuer: ${sampleData.raison_sociale} (NIF: ${sampleData.nif})`);
  console.log(`   Client: ${sampleData.client_nom} (NIF: ${sampleData.client_nif || 'N/A'})`);
  console.log(`   Total TTC: ${sampleData.devise} ${fmt(sampleData.montant_ttc)}`);

  await generateFacturePdfFile(sampleData, outputPath);

  console.log('\n📋 Metadata embedded:');
  console.log(`   NIF émetteur  : ${sampleData.nif}`);
  console.log(`   NIF client    : ${sampleData.client_nif || 'N/A'}`);
  console.log(`   N° facture    : ${sampleData.facture_number}`);
  console.log(`   Date émission : ${sampleData.date_emission}`);

  await closeBrowser();
}

// Run if executed directly
main().catch(err => {
  console.error('❌ PDF generation failed:', err);
  process.exit(1);
});

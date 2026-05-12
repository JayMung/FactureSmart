/**
 * TVA Calculator — Calculs de TVA conforme à la législation RDC
 *
 * RDC Standard: 16% (TVA normale)
 * RDC 0%:       Exonérations / exportations
 * Acomptes:     TVA exigible = TVA totale - (acompte × ratio TVA)
 *
 * Usage:
 *   const result = calculateTVA({ items: [...], discount_percent: 0, acompte: 0 });
 *   // => { tva_base_16, tva_amount_16, tva_base_0, tva_total, total_ttc, tva_exigible, net_a_payer }
 */

export interface TVAInput {
  items: TVAItem[];
  discount_percent?: number;
  acompte?: number;
}

export interface TVAItem {
  quantity: number;
  unit_price: number;
  tva_rate: number;
  tva_exempt: boolean;
}

export interface TVAResult {
  subtotal_ht: number;
  discount_percent: number;
  discount_amount: number;
  tva_base_16: number;
  tva_amount_16: number;
  tva_base_0: number;
  tva_amount_0: number;
  tva_total: number;
  total_ttc: number;
  acompte: number;
  tva_exigible: number;
  net_a_payer: number;
}

/**
 * Calcule la TVA selon les règles RDC
 *
 * Règles :
 * - TVA 16% : taux standard RDC pour biens et services
 * - TVA 0%  : exonérations (exportations, produits de base)
 * - Acompte : la TVA exigible est réduite proportionnellement
 * - Arrondi à 2 décimales (centimes)
 */
export function calculateTVA(input: TVAInput): TVAResult {
  let subtotal_ht = 0;
  let tva_base_16 = 0;
  let tva_amount_16 = 0;
  let tva_base_0 = 0;
  let tva_amount_0 = 0;

  for (const item of input.items) {
    const lineTotalHT = item.quantity * item.unit_price;
    subtotal_ht += lineTotalHT;

    if (item.tva_exempt || item.tva_rate === 0) {
      // TVA 0% (exonéré / exportation)
      tva_base_0 += lineTotalHT;
      tva_amount_0 += 0;
    } else {
      // TVA normale (16% par défaut en RDC)
      tva_base_16 += lineTotalHT;
      tva_amount_16 += round2(lineTotalHT * item.tva_rate / 100);
    }
  }

  const discount_percent = input.discount_percent || 0;
  const discount_amount = round2(subtotal_ht * discount_percent / 100);
  const tva_total = round2(tva_amount_16 + tva_amount_0);
  const total_ttc = round2(subtotal_ht - discount_amount + tva_total);
  const acompte = input.acompte || 0;

  // TVA exigible = TVA totale - TVA déjà payée via acompte
  // Prorata de l'acompte sur la base HT (hors discount pour simplifier)
  let tva_exigible = tva_total;
  if (acompte > 0 && subtotal_ht > 0) {
    const tva_sur_acompte = round2(acompte * tva_total / subtotal_ht);
    tva_exigible = Math.max(0, round2(tva_total - tva_sur_acompte));
  }

  const net_a_payer = round2(total_ttc - acompte);

  return {
    subtotal_ht: round2(subtotal_ht),
    discount_percent,
    discount_amount,
    tva_base_16: round2(tva_base_16),
    tva_amount_16: round2(tva_amount_16),
    tva_base_0: round2(tva_base_0),
    tva_amount_0: 0,
    tva_total,
    total_ttc,
    acompte,
    tva_exigible,
    net_a_payer: Math.max(0, net_a_payer),
  };
}

/** Calcule le total HT et TTC d'une ligne */
export function calculateLineTotals(
  quantity: number,
  unit_price: number,
  tva_rate: number,
  tva_exempt: boolean,
): { total_ht: number; tva_amount: number; total_ttc: number } {
  const total_ht = round2(quantity * unit_price);
  const tva_amount = tva_exempt ? 0 : round2(total_ht * tva_rate / 100);
  const total_ttc = round2(total_ht + tva_amount);
  return { total_ht, tva_amount, total_ttc };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

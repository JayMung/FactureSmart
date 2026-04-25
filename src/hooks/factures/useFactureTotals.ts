import { useMemo, useState } from 'react';
import { TVA_RATES } from '@/lib/dgi-constants';
import type { FactureItem } from '@/types';

interface TotalsConfig {
  items: FactureItem[];
  devise: 'USD' | 'CDF';
  mode_livraison?: 'aerien' | 'maritime';
  groupe_tva: string;
  defaultFraisPercentage: number;
  usdToCdfRate: number;
}

export interface TotalsResult {
  subtotal: number;
  totalPoids: number;
  frais: number;
  fraisPercentage: number;
  fraisTransportDouane: number;
  customTransportFee: number | null;
  totalGeneral: number;
  tauxConversion: number;
  tauxTva: number;
  groupeTva: string;
  montantTva: number;
  montantHt: number;
  montantTtc: number;
}

const AERIEN_RATE = 16; // USD per kg
const MARITIME_RATE = 450; // USD per CBM

export function useFactureTotals(config: TotalsConfig) {
  const [customFraisPercentage, setCustomFraisPercentage] = useState<number | null>(null);
  const [customTransportFee, setCustomTransportFee] = useState<number | null>(null);

  const totals = useMemo<TotalsResult>(() => {
    const subtotalUSD = config.items.reduce((sum, item) => sum + (item.montant_total || 0), 0);
    const totalPoids = config.items.reduce((sum, item) => sum + (item.poids || 0), 0);
    const fraisPercentage = customFraisPercentage ?? config.defaultFraisPercentage;
    const fraisUSD = subtotalUSD * (fraisPercentage / 100);

    const transportFeeUSD =
      customTransportFee !== null
        ? customTransportFee
        : config.mode_livraison === 'aerien'
          ? totalPoids * AERIEN_RATE
          : totalPoids * MARITIME_RATE;

    const tauxUSDtoCDF = config.usdToCdfRate || 2100;
    const conversionRate = config.devise === 'CDF' ? tauxUSDtoCDF : 1;
    const groupeTva = config.groupe_tva || 'C';
    const tauxTva = TVA_RATES[groupeTva] || 0.16;
    const montantTvaUSD = subtotalUSD * tauxTva;
    const totalGeneralUSD = subtotalUSD + fraisUSD + transportFeeUSD;

    return {
      subtotal: subtotalUSD * conversionRate,
      totalPoids,
      frais: fraisUSD * conversionRate,
      fraisPercentage,
      fraisTransportDouane: transportFeeUSD * conversionRate,
      customTransportFee,
      totalGeneral: totalGeneralUSD * conversionRate,
      tauxConversion: conversionRate,
      tauxTva,
      groupeTva,
      montantTva: montantTvaUSD * conversionRate,
      montantHt: subtotalUSD * conversionRate,
      montantTtc: (subtotalUSD + montantTvaUSD) * conversionRate,
    };
  }, [config.items, config.devise, config.mode_livraison, config.groupe_tva, config.defaultFraisPercentage, config.usdToCdfRate, customFraisPercentage, customTransportFee]);

  return {
    totals,
    customFraisPercentage,
    setCustomFraisPercentage,
    customTransportFee,
    setCustomTransportFee,
  };
}

// DGI TVA rates (RDC)
export const TVA_RATES: Record<string, number> = {
  A: 0,
  B: 0.08,
  C: 0.16,
};

export const TVA_LABELS: Record<string, string> = {
  A: 'Exonéré (0%)',
  B: 'Réduit (8%)',
  C: 'Standard (16%)',
};

// DGI invoice type codes (RDC)
export const DGI_INVOICE_TYPES = [
  { value: 'FV', label: 'FV — Facture de Vente' },
  { value: 'EV', label: 'EV — Facture d\'Avoir (retour)' },
  { value: 'FT', label: 'FT — Facture de Travail (service)' },
  { value: 'ET', label: 'ET — Export Tax' },
  { value: 'FA', label: 'FA — Facture d\'Acompte' },
  { value: 'EA', label: 'EA — Encaissement Anticipé' },
] as const;

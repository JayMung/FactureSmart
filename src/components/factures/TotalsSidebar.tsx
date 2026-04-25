import { QrCode, ShieldCheck, RotateCcw, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Button from '@/components/ui/button';
import { TVA_LABELS } from '@/lib/dgi-constants';
import type { TotalsResult } from '@/hooks/factures/useFactureTotals';
import type { FactureFormData } from '@/hooks/factures/useFactureForm';

interface TotalsSidebarProps {
  totals: TotalsResult;
  formData: FactureFormData;
  setFormData: (data: FactureFormData | ((prev: FactureFormData) => FactureFormData)) => void;
  isEditingFrais: boolean;
  setIsEditingFrais: (val: boolean) => void;
  isEditingTransport: boolean;
  setIsEditingTransport: (val: boolean) => void;
  tempTransportValue: string;
  setTempTransportValue: (val: string) => void;
  customFraisPercentage: number | null;
  setCustomFraisPercentage: (val: number | null) => void;
  resetCustomFrais: () => void;
}

export function TotalsSidebar({
  totals,
  formData,
  setFormData,
  isEditingFrais,
  setIsEditingFrais,
  isEditingTransport,
  setIsEditingTransport,
  tempTransportValue,
  setTempTransportValue,
  customFraisPercentage,
  resetCustomFrais,
}: TotalsSidebarProps) {
  const fmt = (val: number) =>
    `${formData.devise === 'USD' ? '$' : ''}${val.toFixed(2)}${formData.devise === 'CDF' ? ' CDF' : ''}`;

  return (
    <div className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-screen lg:overflow-visible">
      {/* Totals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Récapitulatif
            </CardTitle>
            {resetCustomFrais !== null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCustomFrais}
                className="h-8 w-8 p-0"
                title="Réinitialiser les calculs automatiques"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total:</span>
              <span className="font-medium">{fmt(totals.subtotal)}</span>
            </div>

            {/* Frais de services */}
            <div className="flex justify-between">
              {isEditingFrais ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Frais de services</span>
                  <Input
                    type="number"
                    value={customFraisPercentage ?? totals.fraisPercentage}
                    onChange={(e) => setCustomFraisPercentage(parseFloat(e.target.value) || 0)}
                    className="w-16 h-6 text-sm px-2"
                    autoFocus
                    onBlur={() => setIsEditingFrais(false)}
                  />
                  <span className="text-gray-600">%:</span>
                </div>
              ) : (
                <span
                  className="text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                  onDoubleClick={() => setIsEditingFrais(true)}
                  title="Double-cliquer pour modifier"
                >
                  Frais de services ({totals.fraisPercentage}%):
                </span>
              )}
              <span className="font-medium">{fmt(totals.frais)}</span>
            </div>

            {/* Frais transport */}
            <div className="flex justify-between">
              {isEditingTransport ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Frais transport & douane:</span>
                  <Input
                    type="number"
                    value={tempTransportValue}
                    onChange={(e) => setTempTransportValue(e.target.value)}
                    className="w-24 h-6 text-sm px-2"
                    autoFocus
                    onBlur={() => setIsEditingTransport(false)}
                  />
                </div>
              ) : (
                <span
                  className="text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                  onDoubleClick={() => {
                    setTempTransportValue(totals.fraisTransportDouane.toFixed(2));
                    setIsEditingTransport(true);
                  }}
                  title="Double-cliquer pour modifier (forfait)"
                >
                  Frais transport & douane:
                </span>
              )}
              <span className="font-medium">{fmt(totals.fraisTransportDouane)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Poids total:</span>
              <span className="font-medium text-green-600">
                {totals.totalPoids.toFixed(2)} {formData.mode_livraison === 'aerien' ? 'Kg' : 'CBM'}
              </span>
            </div>

            {/* DGI Section */}
            <div className="border-t pt-2 space-y-1">
              <div className="flex items-center gap-1 mb-1">
                <ShieldCheck className="h-3 w-3 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Conformité DGI RDC</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Groupe TVA:</span>
                <select
                  value={totals.groupeTva}
                  onChange={(e) => setFormData((prev: FactureFormData) => ({ ...prev, groupe_tva: e.target.value }))}
                  className="text-xs border rounded px-1 py-0.5 bg-green-50 border-green-200"
                >
                  <option value="A">A — Exonoré (0%)</option>
                  <option value="B">B — Réduit (8%)</option>
                  <option value="C">C — Standard (16%)</option>
                </select>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Montant HTVA:</span>
                <span className="font-medium">{fmt(totals.montantHt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA ({(totals.tauxTva * 100).toFixed(0)}%):</span>
                <span className="font-medium">{fmt(totals.montantTva)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-green-700">
                <span className="flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  Montant TTC:
                </span>
                <span>{fmt(totals.montantTtc)}</span>
              </div>
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total général:</span>
                <span className="text-green-500">{fmt(totals.totalGeneral)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

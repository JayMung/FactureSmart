// Finance & Taux de change Section
// Extracted from Settings-Permissions.tsx to reduce code cloning

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Button from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Save, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';

interface FinanceSectionProps {
  exchangeRates: { usdToCdf: number; usdToCny: number };
  setExchangeRates: (val: any | ((prev: any) => any)) => void;
  transactionFees: { transfert: number; commande: number; partenaire: number };
  setTransactionFees: (val: any | ((prev: any) => any)) => void;
  saving: boolean;
  isAdmin: boolean;
  saveExchangeRates: () => Promise<void>;
  saveFees: () => Promise<void>;
}

export function FinanceSection({
  exchangeRates,
  setExchangeRates,
  transactionFees,
  setTransactionFees,
  saving,
  isAdmin,
  saveExchangeRates,
  saveFees,
}: FinanceSectionProps) {
  return (
    <div className="space-y-6">
      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Taux de change
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usdToCdf">USD → CDF</Label>
              <Input
                id="usdToCdf"
                type="number"
                value={exchangeRates.usdToCdf}
                onChange={(e) => setExchangeRates((prev: any) => ({ ...prev, usdToCdf: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="1"
              />
            </div>
            <div>
              <Label htmlFor="usdToCny">USD → CNY</Label>
              <Input
                id="usdToCny"
                type="number"
                value={exchangeRates.usdToCny}
                onChange={(e) => setExchangeRates((prev: any) => ({ ...prev, usdToCny: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveExchangeRates} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les taux'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="mr-2 h-5 w-5" />
            Frais de transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="transfert">Frais transfert (%)</Label>
              <Input
                id="transfert"
                type="number"
                value={transactionFees.transfert}
                onChange={(e) => setTransactionFees((prev: any) => ({ ...prev, transfert: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="commande">Frais commande (%)</Label>
              <Input
                id="commande"
                type="number"
                value={transactionFees.commande}
                onChange={(e) => setTransactionFees((prev: any) => ({ ...prev, commande: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="partenaire">Frais partenaire (%)</Label>
              <Input
                id="partenaire"
                type="number"
                value={transactionFees.partenaire}
                onChange={(e) => setTransactionFees((prev: any) => ({ ...prev, partenaire: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.1"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveFees} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les frais'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

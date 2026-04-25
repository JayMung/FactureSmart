import { FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { DGI_INVOICE_TYPES, TVA_LABELS } from '@/lib/dgi-constants';
import type { FactureFormData } from '@/hooks/factures/useFactureForm';

interface BasicInfoCardProps {
  formData: FactureFormData;
  setFormData: (data: FactureFormData | ((prev: FactureFormData) => FactureFormData)) => void;
  clients: any[];
}

export function BasicInfoCard({ formData, setFormData, clients }: BasicInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Informations générales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'devis' | 'facture') =>
                setFormData((prev: FactureFormData) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="devis">Devis</SelectItem>
                <SelectItem value="facture">Facture</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="type_dgi" className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-600" />
              Type DGI
            </Label>
            <Select
              value={formData.type_facture_dgi || 'FV'}
              onValueChange={(value: string) =>
                setFormData((prev: FactureFormData) => ({ ...prev, type_facture_dgi: value }))
              }
            >
              <SelectTrigger className="border-green-200 bg-green-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DGI_INVOICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">
              Code DGI RDC — {TVA_LABELS[formData.groupe_tva || 'C']}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_emission">Date d'émission</Label>
            <Input
              id="date_emission"
              type="date"
              value={formData.date_emission}
              onChange={(e) =>
                setFormData((prev: FactureFormData) => ({ ...prev, date_emission: e.target.value }))
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="client_id">Client</Label>
          <ClientCombobox
            clients={clients}
            value={formData.client_id}
            onValueChange={(value: string) =>
              setFormData((prev: FactureFormData) => ({ ...prev, client_id: value }))
            }
            placeholder="Sélectionner un client"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mode_livraison">Mode de livraison</Label>
            <Select
              value={formData.mode_livraison}
              onValueChange={(value: 'aerien' | 'maritime') =>
                setFormData((prev: FactureFormData) => ({ ...prev, mode_livraison: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aerien">Aérien</SelectItem>
                <SelectItem value="maritime">Maritime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="devise">Devise</Label>
            <Select
              value={formData.devise}
              onValueChange={(value: 'USD' | 'CDF') =>
                setFormData((prev: FactureFormData) => ({ ...prev, devise: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CDF">CDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

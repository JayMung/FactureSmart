import { Plus, Package, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import ImagePreview from '@/components/ui/ImagePreview';
import type { FactureItem } from '@/types';

interface ItemsCardProps {
  items: FactureItem[];
  devise: 'USD' | 'CDF';
  addItem: () => void;
  updateItem: (tempId: string, field: keyof FactureItem, value: any) => void;
  removeItem: (tempId: string) => void;
  updateDisplayValue: (tempId: string, field: 'poids' | 'prix_unitaire', value: string) => void;
  getDisplayValue: (tempId: string, field: 'poids' | 'prix_unitaire', actualValue: number) => string;
}

export function ItemsCard({
  items,
  devise,
  addItem,
  updateItem,
  removeItem,
  updateDisplayValue,
  getDisplayValue,
}: ItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Articles
          </CardTitle>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un article
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun article ajouté</p>
            <p className="text-sm">Cliquez sur "Ajouter un article" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.tempId} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Article {item.numero_ligne}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.tempId!)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Quantité</Label>
                    <Input
                      type="number"
                      value={item.quantite}
                      onChange={(e) => updateItem(item.tempId!, 'quantite', parseInt(e.target.value) || 0)}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>Poids (kg)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={getDisplayValue(item.tempId!, 'poids', item.poids)}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                        updateDisplayValue(item.tempId!, 'poids', value);
                        const numValue = value === '' ? 0 : parseFloat(value);
                        updateItem(item.tempId!, 'poids', numValue);
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateItem(item.tempId!, 'poids', value);
                        updateDisplayValue(item.tempId!, 'poids', value.toString());
                      }}
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.tempId!, 'description', e.target.value)}
                    placeholder="Description de l'article"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Prix unitaire</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={getDisplayValue(item.tempId!, 'prix_unitaire', item.prix_unitaire)}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                        updateDisplayValue(item.tempId!, 'prix_unitaire', value);
                        const numValue = value === '' ? 0 : parseFloat(value);
                        updateItem(item.tempId!, 'prix_unitaire', numValue);
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateItem(item.tempId!, 'prix_unitaire', value);
                        updateDisplayValue(item.tempId!, 'prix_unitaire', value.toString());
                      }}
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Montant total</Label>
                    <Input
                      value={`${devise === 'USD' ? '$' : ''}${item.montant_total.toFixed(2)}${devise === 'CDF' ? ' CDF' : ''}`}
                      readOnly
                      className="bg-gray-50 font-semibold text-green-600 border-green-200"
                    />
                  </div>
                </div>

                <div>
                  <Label>URL de l'image (optionnel)</Label>
                  <Input
                    value={item.image_url || ''}
                    onChange={(e) => updateItem(item.tempId!, 'image_url', e.target.value.trim())}
                    placeholder="https://... (URL image)"
                    className="w-full text-xs"
                  />
                  {item.image_url && (
                    <div className="mt-2">
                      <ImagePreview
                        url={item.image_url}
                        alt={`Article ${item.numero_ligne}`}
                        size="md"
                        className="border rounded"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Lien du produit (interne)</Label>
                  <Input
                    value={item.product_url || ''}
                    onChange={(e) => updateItem(item.tempId!, 'product_url', e.target.value.trim())}
                    placeholder="https://... (URL produit - usage interne)"
                    className="w-full text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

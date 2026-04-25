"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Save, FileText, ShieldCheck, Calculator, RotateCcw } from 'lucide-react';
import { useFactureForm } from '@/hooks/factures/useFactureForm';
import { FactureFormHeader } from '@/components/factures/FactureFormHeader';
import { BasicInfoCard } from '@/components/factures/BasicInfoCard';
import { ItemsCard } from '@/components/factures/ItemsCard';
import { TotalsSidebar } from '@/components/factures/TotalsSidebar';
// DGI constants re-exported from shared lib
export { TVA_RATES, TVA_LABELS, DGI_INVOICE_TYPES } from '@/lib/dgi-constants';

export default function FacturesCreate() {
  usePageSetup({ pageTitle: 'Nouvelle Facture', pageDescription: 'Créer une facture' });
  const navigate = useNavigate();

  const {
    formData,
    setFormData,
    items,
    loading,
    loadingData,
    isEditMode,
    isEditingFrais,
    setIsEditingFrais,
    isEditingTransport,
    setIsEditingTransport,
    tempTransportValue,
    setTempTransportValue,
    clients,
    addItem,
    updateItem,
    removeItem,
    updateDisplayValue,
    getDisplayValue,
    totals,
    customFraisPercentage,
    setCustomFraisPercentage,
    customTransportFee,
    hasSavedData,
    clearSavedData,
    handleSubmit,
  } = useFactureForm();

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          <span className="ml-3 text-gray-600">Chargement de la facture...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <FactureFormHeader
          title={isEditMode ? 'Modifier la facture' : 'Nouvelle facture'}
          subtitle={isEditMode ? 'Modifiez les informations ci-dessous' : 'Créez une facture conforme DGI'}
          isEditMode={isEditMode}
          hasSavedData={hasSavedData}
          clearSavedData={clearSavedData}
          onBack={() => navigate('/factures')}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main form area */}
            <div className="lg:col-span-2 space-y-6">
              <BasicInfoCard
                formData={formData}
                setFormData={setFormData}
                clients={clients}
              />

              <ItemsCard
                items={items}
                devise={formData.devise}
                addItem={addItem}
                updateItem={updateItem}
                removeItem={removeItem}
                updateDisplayValue={updateDisplayValue}
                getDisplayValue={getDisplayValue}
              />

              {/* Notes & Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Notes et conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="conditions_vente">Conditions de vente</Label>
                    <Textarea
                      id="conditions_vente"
                      value={formData.conditions_vente}
                      onChange={(e) => setFormData({ ...formData, conditions_vente: e.target.value })}
                      placeholder="Conditions de vente"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes supplémentaires"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="informations_bancaires">Informations bancaires (optionnel)</Label>
                    <Textarea
                      id="informations_bancaires"
                      value={formData.informations_bancaires}
                      onChange={(e) => setFormData({ ...formData, informations_bancaires: e.target.value })}
                      placeholder="Afficher sur la facture (optionnel)"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: Totals & DGI */}
            <div className="lg:col-span-1">
              <TotalsSidebar
                totals={totals}
                formData={formData}
                setFormData={setFormData}
                isEditingFrais={isEditingFrais}
                setIsEditingFrais={setIsEditingFrais}
                isEditingTransport={isEditingTransport}
                setIsEditingTransport={setIsEditingTransport}
                tempTransportValue={tempTransportValue}
                setTempTransportValue={setTempTransportValue}
                customFraisPercentage={customFraisPercentage}
                setCustomFraisPercentage={setCustomFraisPercentage}
                resetCustomFrais={() => {
                  setCustomFraisPercentage(null);
                }}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={loading} className="min-w-[200px]">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Mettre à jour' : 'Enregistrer la facture'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAllClients } from '@/hooks/useClients';
import { useFactures } from '@/hooks/useFactures';
import { useFees, useExchangeRates } from '@/hooks/useSettings';
import { useAutoSave } from '@/hooks/useAutoSave';
import { showSuccess, showError } from '@/utils/toast';
import { useFactureItems } from './useFactureItems';
import { useFactureTotals } from './useFactureTotals';
import { DGI_INVOICE_TYPES } from '@/lib/dgi-constants';
import type { CreateFactureData } from '@/types';

export interface FactureFormData {
  client_id: string;
  type: 'devis' | 'facture';
  mode_livraison: 'aerien' | 'maritime';
  devise: 'USD' | 'CDF';
  date_emission: string;
  statut: 'brouillon' | 'en_attente' | 'validee' | 'annulee';
  conditions_vente: string;
  notes: string;
  informations_bancaires: string;
  type_facture_dgi?: string;
  groupe_tva?: string;
}

const initialFormData: FactureFormData = {
  client_id: '',
  type: 'facture',
  mode_livraison: 'aerien',
  devise: 'USD',
  date_emission: new Date().toISOString().split('T')[0],
  statut: 'brouillon',
  conditions_vente: '',
  notes: '',
  informations_bancaires: '',
  type_facture_dgi: 'FV',
  groupe_tva: 'C',
};

interface DefaultConditions {
  aerien: string;
  maritime: string;
}

const DEFAULT_CONDITIONS_AERIEN =
  'Délai de livraison : 21-30 jours ouvrés après départ Chine.\n' +
  'Transport aérien inclus dans le prix.\n' +
  'Les frais de douane et taxes locales sont à la charge du client.';

const DEFAULT_CONDITIONS_MARITIME =
  'Délai de livraison : 30-45 jours ouvrés après départ Chine.\n' +
  'Transport maritime inclus dans le prix.\n' +
  'Les frais de douane et taxes locales sont à la charge du client.';

export function useFactureForm(initialItems: any[] = []) {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = !!id;
  const { clients } = useAllClients();
  const { createFacture, updateFacture, getFactureWithItems, facture } = useFactures();
  const { fees } = useFees();
  const { rates } = useExchangeRates();

  const [formData, setFormData] = useState<FactureFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!isEditMode ? false : true);
  const [isEditingFrais, setIsEditingFrais] = useState(false);
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  const [tempTransportValue, setTempTransportValue] = useState('');

  const storageKey = `facture-draft-${formData.type}`;

  const { items, addItem, updateItem, removeItem, updateDisplayValue, getDisplayValue, resetItems } =
    useFactureItems(initialItems);

  const defaultConditions: DefaultConditions = {
    aerien: DEFAULT_CONDITIONS_AERIEN,
    maritime: DEFAULT_CONDITIONS_MARITIME,
  };

  const {
    totals,
    customFraisPercentage,
    setCustomFraisPercentage,
    customTransportFee,
    setCustomTransportFee,
  } = useFactureTotals({
    items,
    devise: formData.devise,
    mode_livraison: formData.mode_livraison,
    groupe_tva: formData.groupe_tva || 'C',
    defaultFraisPercentage: fees?.commande || 15,
    usdToCdfRate: rates?.usdToCdf || 2100,
  });

  const { hasSavedData, clearSavedData } = useAutoSave(storageKey);

  // Load saved data on mount (new invoices only)
  useEffect(() => {
    if (isEditMode) return;
    if (!hasSavedData()) return;

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed.formData) setFormData(parsed.formData);
      if (parsed.items) resetItems(parsed.items);
    } catch (e) {
      console.warn('Failed to restore auto-save:', e);
    }
  }, []);

  // Load default conditions
  useEffect(() => {
    if (!formData.conditions_vente) {
      const conditions =
        formData.mode_livraison === 'aerien'
          ? defaultConditions.aerien
          : defaultConditions.maritime;
      setFormData((prev) => ({ ...prev, conditions_vente: conditions }));
    }
  }, [formData.mode_livraison]);

  // Load existing invoice data (edit mode or duplicate)
  useEffect(() => {
    const loadFacture = async () => {
      if (!isEditMode && !id) return;

      const isDuplicate = window.location.pathname.includes('/factures/duplicate/');

      try {
        if (isDuplicate && id) {
          const facture = await getFactureWithItems(id);
          if (!facture) { navigate('/factures'); return; }

          // Set form with duplicated data
          setFormData((prev) => ({
            ...prev,
            client_id: facture.client_id,
            type: facture.type,
            mode_livraison: facture.mode_livraison,
            devise: facture.devise,
            date_emission: new Date().toISOString().split('T')[0],
            conditions_vente: facture.conditions_vente || '',
            notes: facture.notes || '',
            informations_bancaires: facture.informations_bancaires || '',
          }));

          const loadedItems = (facture.items || []).map((item: any) => ({
            tempId: Date.now().toString() + Math.random(),
            id: item.id,
            numero_ligne: item.numero_ligne,
            quantite: item.quantite,
            description: item.description || '',
            prix_unitaire: item.prix_unitaire,
            poids: item.poids,
            montant_total: item.montant_total,
            image_url: item.image_url,
            product_url: item.product_url,
          }));
          resetItems(loadedItems);

          if (facture.subtotal && facture.frais && facture.subtotal > 0) {
            const pct = (facture.frais / facture.subtotal) * 100;
            const def = fees?.commande || 15;
            if (Math.abs(pct - def) > 0.01) setCustomFraisPercentage(pct);
          }

          if (facture.frais_transport_douane && facture.subtotal) {
            const totalPoids = loadedItems.reduce((s: number, i: any) => s + i.poids, 0);
            const autoFee = facture.mode_livraison === 'aerien' ? totalPoids * 16 : totalPoids * 450;
            const conv = rates?.usdToCdf || 2100;
            const autoFeeConv = (facture.devise === 'CDF' ? conv : 1) * autoFee;
            if (Math.abs(facture.frais_transport_douane - autoFeeConv) > 0.01) {
              setCustomTransportFee(facture.frais_transport_douane / (facture.devise === 'CDF' ? conv : 1));
            }
          }

          showSuccess('Facture dupliquée ! Modifiez et enregistrez.');
          return;
        }

        if (!isEditMode || !id) return;
        setLoadingData(true);

        const facture = await getFactureWithItems(id);
        if (!facture) {
          showError('Facture introuvable');
          navigate('/factures');
          return;
        }

        setFormData({
          client_id: facture.client_id,
          type: facture.type as 'devis' | 'facture',
          mode_livraison: facture.mode_livraison,
          devise: facture.devise,
          date_emission: facture.date_emission.split('T')[0],
          statut: facture.statut as any,
          conditions_vente: facture.conditions_vente || '',
          notes: facture.notes || '',
          informations_bancaires: facture.informations_bancaires || '',
          type_facture_dgi: facture.type_facture_dgi || 'FV',
          groupe_tva: facture.groupe_tva || 'C',
        });

        const loadedItems = (facture.items || []).map((item: any) => ({
          tempId: item.id || Date.now().toString() + Math.random(),
          id: item.id,
          numero_ligne: item.numero_ligne,
          quantite: item.quantite,
          description: item.description || '',
          prix_unitaire: item.prix_unitaire,
          poids: item.poids,
          montant_total: item.montant_total,
          image_url: item.image_url,
          product_url: item.product_url,
        }));
        resetItems(loadedItems);

        if (facture.frais && facture.subtotal && facture.subtotal > 0) {
          const pct = (facture.frais / facture.subtotal) * 100;
          const def = fees?.commande || 15;
          if (Math.abs(pct - def) > 0.01) setCustomFraisPercentage(pct);
        }

        if (facture.frais_transport_douane && facture.subtotal) {
          const totalPoids = loadedItems.reduce((s: number, i: any) => s + i.poids, 0);
          const autoFee = facture.mode_livraison === 'aerien' ? totalPoids * 16 : totalPoids * 450;
          const conv = rates?.usdToCdf || 2100;
          const convRate = facture.devise === 'CDF' ? conv : 1;
          if (Math.abs(facture.frais_transport_douane - autoFee * convRate) > 0.01) {
            setCustomTransportFee(facture.frais_transport_douane / convRate);
          }
        }
      } catch (error) {
        console.error('Error loading facture:', error);
        if (isEditMode) navigate('/factures');
      } finally {
        setLoadingData(false);
      }
    };

    loadFacture();
  }, [id, isEditMode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.client_id) {
        showError('Veuillez sélectionner un client');
        return;
      }
      if (items.length === 0) {
        showError('Veuillez ajouter au moins un article');
        return;
      }
      if (!formData.groupe_tva) {
        showError('Groupe TVA DGI requis — sélectionnez A (exonéré), B (8%) ou C (16%)');
        return;
      }
      if (totals.subtotal <= 0) {
        showError('La base HT DGI doit être supérieure à 0');
        return;
      }

      setLoading(true);
      try {
        if (isEditMode && id) {
          await updateFacture(id, {
            ...formData,
            subtotal: totals.subtotal,
            frais: totals.frais,
            frais_transport_douane: totals.fraisTransportDouane,
            total_poids: totals.totalPoids,
            total_general: totals.totalGeneral,
            montant_ht: totals.montantHt,
            montant_tva: totals.montantTva,
            montant_ttc: totals.montantTtc,
            items: items.map(({ tempId, id: itemId, ...rest }) => rest),
          } as any);
          navigate(`/factures/preview/${id}`);
        } else {
          const result = await createFacture({
            ...formData,
            subtotal: totals.subtotal,
            frais: totals.frais,
            frais_transport_douane: totals.fraisTransportDouane,
            total_poids: totals.totalPoids,
            total_general: totals.totalGeneral,
            montant_ht: totals.montantHt,
            montant_tva: totals.montantTva,
            montant_ttc: totals.montantTtc,
            items: items.map(({ tempId, ...rest }) => rest),
          } as CreateFactureData);
          clearSavedData();
          navigate(`/factures/preview/${result.id}`);
        }
      } catch (error: any) {
        showError(error.message || 'Erreur lors de la sauvegarde');
      } finally {
        setLoading(false);
      }
    },
    [formData, items, totals, isEditMode, id, createFacture, updateFacture, navigate, clearSavedData],
  );

  return {
    // State
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
    // Hooks
    clients,
    fees,
    rates,
    // Items
    addItem,
    updateItem,
    removeItem,
    updateDisplayValue,
    getDisplayValue,
    resetItems,
    // Totals
    totals,
    customFraisPercentage,
    setCustomFraisPercentage,
    customTransportFee,
    setCustomTransportFee,
    // Auto-save
    hasSavedData,
    clearSavedData,
    // Submit
    handleSubmit,
  };
}

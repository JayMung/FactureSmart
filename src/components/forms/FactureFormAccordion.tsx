import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Trash2,
  Store,
  User,
  FileText,
  Calculator,
  Lock,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFactures } from '@/hooks/useFactures';
import type { Facture, FactureItem, Client, Declarant } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { validateFactureForm } from '@/lib/validation';
import { formatCurrency } from '@/utils/formatCurrency';

interface FactureFormAccordionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  facture?: Facture | null;
}

interface FactureItemForm extends Omit<FactureItem, 'id' | 'facture_id' | 'created_at'> {
  tempId: string;
}

const STEPS = [
  { number: 1, label: 'Vendeur', icon: Store },
  { number: 2, label: 'Client', icon: User },
  { number: 3, label: 'Lignes', icon: FileText },
  { number: 4, label: 'Totaux', icon: Calculator },
];

const FactureFormAccordion: React.FC<FactureFormAccordionProps> = ({ isOpen, onClose, onSuccess, facture }) => {
  const { createFacture, updateFacture } = useFactures();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [declarant, setDeclarant] = useState<Declarant | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['step-1', 'step-2', 'step-3', 'step-4']);
  const [defaultConditionsVente, setDefaultConditionsVente] = useState('');
  const [fraisTransport, setFraisTransport] = useState<number>(0);

  const [formData, setFormData] = useState({
    client_id: '',
    type: 'devis' as 'devis' | 'facture',
    mode_livraison: 'aerien' as 'aerien' | 'maritime',
    devise: 'USD' as 'USD' | 'CDF',
    conditions_vente: '',
    notes: '',
    date_emission: new Date().toISOString().split('T')[0],
    // Client fields
    client_nif: '',
    client_nom: '',
    client_adresse: '',
  });

  const [items, setItems] = useState<FactureItemForm[]>([
    {
      tempId: '1',
      numero_ligne: 1,
      image_url: '',
      product_url: '',
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0,
      taux_tva: 0.16, // Default to 16% (standard)
      remise_percent: 0
    }
  ]);

  // Charger les clients, le déclarant et les paramètres
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .order('nom');
        setClients(clientsData || []);

        // Charger le déclarant (vendor info)
        const { data: declarantData } = await supabase
          .from('declarants')
          .select('*')
          .eq('actif', true)
          .limit(1);
        if (declarantData && declarantData.length > 0) {
          setDeclarant(declarantData[0]);
        }

        // Charger les paramètres
        const { data: settingsData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .in('cle', ['conditions_vente_defaut']);

        if (settingsData) {
          const conditionsVente = settingsData.find(s => s.cle === 'conditions_vente_defaut');
          setDefaultConditionsVente(conditionsVente?.valeur || '');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Charger les données de la facture si mode édition
  useEffect(() => {
    if (facture && isOpen) {
      setFormData({
        client_id: facture.client_id || '',
        type: facture.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mode_livraison: (facture as any).mode_livraison || 'aerien',
        devise: facture.devise,
        conditions_vente: facture.conditions_vente || '',
        notes: facture.notes || '',
        date_emission: facture.date_emission,
        client_nif: '',
        client_nom: '',
        client_adresse: '',
      });

      // Charger les frais de transport
      setFraisTransport((facture as any).frais_transport_douane || 0);

      // Charger les items
      const loadItems = async () => {
        try {
          const { data: itemsData } = await supabase
            .from('facture_items')
            .select('*')
            .eq('facture_id', facture.id)
            .order('numero_ligne');

          if (itemsData && itemsData.length > 0) {
            const formattedItems = itemsData.map(item => ({
              tempId: item.id,
              numero_ligne: item.numero_ligne,
              image_url: item.image_url || '',
              product_url: item.product_url || '',
              quantite: item.quantite,
              description: item.description,
              prix_unitaire: item.prix_unitaire,
              poids: item.poids || 0,
              montant_total: item.montant_total,
              taux_tva: (item as any).taux_tva || 0.16,
              remise_percent: (item as any).remise_percent || 0
            }));
            setItems(formattedItems);
          } else {
            resetItems();
          }
        } catch (error) {
          console.error('Error loading items:', error);
        }
      };

      loadItems();
    } else if (!facture && isOpen) {
      // Reset form pour nouvelle facture
      setFormData({
        client_id: '',
        type: 'devis',
        mode_livraison: 'aerien',
        devise: 'USD',
        conditions_vente: defaultConditionsVente,
        notes: '',
        date_emission: new Date().toISOString().split('T')[0],
        client_nif: '',
        client_nom: '',
        client_adresse: '',
      });
      resetItems();
    }
  }, [facture, isOpen, defaultConditionsVente]);

  const resetItems = () => {
    setItems([{
      tempId: '1',
      numero_ligne: 1,
      image_url: '',
      product_url: '',
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0,
      taux_tva: 0.16,
      remise_percent: 0
    }]);
  };

  // Calculer les totaux
  const calculateTotals = () => {
    // Calculate HT, TVA, and TTC per line, then sum
    let totalHt = 0;
    let totalTva = 0;

    items.forEach(item => {
      // Apply discount first
      const montantApresRemise = item.montant_total * (1 - (item.remise_percent || 0) / 100);
      const tvaLigne = montantApresRemise * (item.taux_tva || 0.16);

      totalHt += montantApresRemise;
      totalTva += tvaLigne;
    });

    const totalTtc = totalHt + totalTva + fraisTransport;

    return {
      subtotal: totalHt,
      tva: totalTva,
      totalTtc,
      totalRemise: items.reduce((sum, item) => sum + (item.montant_total * (item.remise_percent || 0) / 100), 0),
      fraisTransport
    };
  };

  // Gérer le changement de client
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      client_nif: client?.nif || '',
      client_nom: client?.nom || '',
      client_adresse: client?.adresse || '',
    }));
  };

  // Ajouter un item
  const addItem = () => {
    const newItem: FactureItemForm = {
      tempId: Date.now().toString(),
      numero_ligne: items.length + 1,
      image_url: '',
      product_url: '',
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0,
      taux_tva: 0.16,
      remise_percent: 0
    };
    setItems([...items, newItem]);
  };

  // Supprimer un item
  const removeItem = (tempId: string) => {
    if (items.length > 1) {
      const updatedItems = items.filter(item => item.tempId !== tempId);
      const renumberedItems = updatedItems.map((item, index) => ({
        ...item,
        numero_ligne: index + 1
      }));
      setItems(renumberedItems);
    }
  };

  // Mettre à jour un item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (tempId: string, field: keyof FactureItemForm, value: any) => {
    const updatedItems = items.map(item => {
      if (item.tempId === tempId) {
        const updatedItem = { ...item, [field]: value };

        // Recalculer le montant total si prix ou quantité change
        if (field === 'prix_unitaire' || field === 'quantite') {
          updatedItem.montant_total = updatedItem.prix_unitaire * updatedItem.quantite;
        }

        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Sauvegarder la facture
  const handleSave = async () => {
    setLoading(true);
    try {
      const validationResult = validateFactureForm({
        ...formData,
        items: items
      });

      if (!validationResult.isValid) {
        showError(validationResult.errors?.[0] || 'Veuillez corriger les erreurs dans le formulaire');
        return;
      }

      const totals = calculateTotals();

      const factureData = {
        ...formData,
        items: items.map(item => ({
          numero_ligne: item.numero_ligne,
          image_url: item.image_url,
          product_url: item.product_url,
          quantite: item.quantite,
          description: item.description,
          prix_unitaire: item.prix_unitaire,
          poids: item.poids,
          montant_total: item.montant_total,
          taux_tva: item.taux_tva,
          remise_percent: item.remise_percent
        })),
        montant_ht: totals.subtotal,
        montant_tva: totals.tva,
        montant_ttc: totals.totalTtc,
        frais_transport_douane: fraisTransport,
      };

      if (facture) {
        await updateFacture(facture.id, factureData);
        showSuccess('Facture mise à jour avec succès');
      } else {
        await createFacture(factureData);
        showSuccess('Facture créée avec succès');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Error saving facture:', error);
      showError('Erreur lors de la sauvegarde de la facture');
    } finally {
      setLoading(false);
    }
  };

  // Toggle accordion section
  const toggleSection = (step: number) => {
    const sectionId = `step-${step}`;
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(s => s !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  const totals = calculateTotals();

  // Get step status for progress bar
  const getStepStatus = (step: number) => {
    if (currentStep > step) return 'completed';
    if (currentStep === step) return 'active';
    return 'pending';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {facture ? 'Modifier' : 'Créer'} {formData.type === 'devis' ? 'Devis' : 'Facture'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps Bar */}
          <div className="flex items-center gap-0 mb-8">
            {STEPS.map((step, index) => {
              const status = getStepStatus(step.number);
              const isLast = index === STEPS.length - 1;
              return (
                <React.Fragment key={step.number}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(step.number);
                      // Expand the clicked section
                      const sectionId = `step-${step.number}`;
                      if (!expandedSections.includes(sectionId)) {
                        setExpandedSections([...expandedSections, sectionId]);
                      }
                    }}
                    className="flex items-center cursor-pointer"
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${status === 'completed'
                          ? 'bg-green-600 text-white'
                          : status === 'active'
                            ? 'bg-green-600 text-white ring-4 ring-green-100'
                            : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                        }
                      `}
                    >
                      {status === 'completed' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium hidden sm:block ${
                        status === 'completed'
                          ? 'text-green-700'
                          : status === 'active'
                            ? 'text-green-700'
                            : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {!isLast && (
                    <div
                      className={`flex-1 h-px mx-4 ${
                        currentStep > step.number ? 'bg-green-300' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Accordion Sections */}
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="w-full space-y-4"
          >
            {/* Step 1: Vendeur */}
            <AccordionItem
              value="step-1"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <AccordionTrigger
                className="px-6 py-4 hover:no-underline"
                onClick={() => toggleSection(1)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Store className="text-green-600 w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Informations du vendeur</h3>
                    <p className="text-xs text-gray-400">Pré-remplies depuis votre profil</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Auto-rempli
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Raison sociale
                      </Label>
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                        {declarant?.raison_sociale || 'Non configuré'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        NIF
                      </Label>
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-mono">
                        {declarant?.nif || '—'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        RCCM
                      </Label>
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                        {declarant?.rccm || '—'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Adresse
                      </Label>
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                        {declarant?.adresse || '—'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Téléphone
                      </Label>
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                        {declarant?.telephone || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Client */}
            <AccordionItem
              value="step-2"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <AccordionTrigger
                className="px-6 py-4 hover:no-underline"
                onClick={() => toggleSection(2)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <User className="text-green-600 w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Informations du client</h3>
                    <p className="text-xs text-gray-400">
                      {selectedClient
                        ? `${selectedClient.nom} — ${selectedClient.ville}`
                        : 'Sélectionnez ou ajoutez un client'
                      }
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Client existant
                      </Label>
                      <ClientCombobox
                        clients={clients}
                        value={formData.client_id}
                        onValueChange={handleClientChange}
                        placeholder="Sélectionner un client"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        NIF Client
                      </Label>
                      <Input
                        type="text"
                        placeholder="NIF du client"
                        value={formData.client_nif}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_nif: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Nom / Raison sociale
                      </Label>
                      <Input
                        type="text"
                        placeholder="Nom du client"
                        value={formData.client_nom}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_nom: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Adresse
                      </Label>
                      <Input
                        type="text"
                        placeholder="Adresse du client"
                        value={formData.client_adresse}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_adresse: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Ajouter un nouveau client
                    </button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Lignes produits */}
            <AccordionItem
              value="step-3"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <AccordionTrigger
                className="px-6 py-4 hover:no-underline"
                onClick={() => toggleSection(3)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="text-green-600 w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Lignes de produits / services</h3>
                    <p className="text-xs text-gray-400">
                      {items.length} ligne{items.length > 1 ? 's' : ''} ajoutée{items.length > 1 ? 's' : ''} — Montant HT : {formatCurrency(totals.subtotal, formData.devise)}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-6">
                  {/* Lines table */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Désignation</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">TVA</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Qté</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Prix unitaire HT</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Rem. %</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Montant HT</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item) => (
                          <tr key={item.tempId} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-400 font-medium">
                              {item.numero_ligne}
                            </td>
                            <td className="px-4 py-3">
                              <Textarea
                                value={item.description}
                                onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                                placeholder="Description du produit"
                                rows={2}
                                className="resize-none w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-gray-900 placeholder-gray-300 p-0"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <select
                                value={item.taux_tva || 0.16}
                                onChange={(e) => updateItem(item.tempId, 'taux_tva', parseFloat(e.target.value))}
                                className="w-full text-xs border border-gray-200 rounded-lg p-1.5 text-center focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300"
                              >
                                <option value={0}>0%</option>
                                <option value={0.08}>8%</option>
                                <option value={0.16}>16%</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Input
                                type="number"
                                value={item.quantite}
                                onChange={(e) => updateItem(item.tempId, 'quantite', parseInt(e.target.value) || 0)}
                                min={1}
                                className="w-16 text-center mx-auto"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Input
                                type="number"
                                value={item.prix_unitaire}
                                onChange={(e) => updateItem(item.tempId, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full text-right font-mono"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Input
                                type="number"
                                value={item.remise_percent || 0}
                                onChange={(e) => updateItem(item.tempId, 'remise_percent', parseFloat(e.target.value) || 0)}
                                min={0}
                                max={100}
                                step={0.5}
                                className="w-20 text-right font-mono"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900 font-mono">
                                {formatCurrency(item.montant_total, formData.devise)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.tempId)}
                                disabled={items.length === 1}
                                className="text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter une ligne
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Totaux */}
            <AccordionItem
              value="step-4"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <AccordionTrigger
                className="px-6 py-4 hover:no-underline"
                onClick={() => toggleSection(4)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calculator className="text-green-600 w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Totaux automatiques</h3>
                    <p className="text-xs text-gray-400">Calculés en temps réel</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Type
                      </Label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'devis' | 'facture' }))}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300"
                      >
                        <option value="devis">Devis</option>
                        <option value="facture">Facture</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Devise
                      </Label>
                      <select
                        value={formData.devise}
                        onChange={(e) => setFormData(prev => ({ ...prev, devise: e.target.value as 'USD' | 'CDF' }))}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300"
                      >
                        <option value="USD">USD</option>
                        <option value="CDF">CDF</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-80 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total Remise</span>
                        <span className="text-sm font-semibold text-red-500 font-mono">
                          -{formatCurrency(totals.totalRemise, formData.devise)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total HT</span>
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          {formatCurrency(totals.subtotal, formData.devise)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">TVA</span>
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          {formatCurrency(totals.tva, formData.devise)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Frais transport</span>
                        <Input
                          type="number"
                          value={fraisTransport}
                          onChange={(e) => setFraisTransport(parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          className="w-32 text-right font-mono"
                        />
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                        <span className="text-base font-bold text-gray-900">Total TTC</span>
                        <span className="text-lg font-bold text-green-700 font-mono">
                          {formatCurrency(totals.totalTtc, formData.devise)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conditions de vente */}
                  <div className="mt-6">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Conditions de vente
                    </Label>
                    <Textarea
                      value={formData.conditions_vente}
                      onChange={(e) => setFormData(prev => ({ ...prev, conditions_vente: e.target.value }))}
                      placeholder="Conditions de vente..."
                      rows={3}
                    />
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Notes
                    </Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes..."
                      rows={2}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Sauvegarde...' : (facture ? 'Mettre à jour' : 'Créer la facture')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FactureFormAccordion;

"use client";

import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Calendar,
  User,
  Building2,
  MapPin,
  Phone,
  Download,
  Edit,
  Trash2,
  Send,
  Printer,
  ArrowLeft,
  ShieldCheck,
  QrCode,
  Clock,
  Package,
  Save,
  X,
  XCircle,
  Plus,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  History,
  Edit3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/utils/formatCurrency';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { useFactures } from '@/hooks/useFactures';
import { useFactureHistory, FactureHistoryEntry } from '@/hooks/useFactureHistory';
import { supabase } from '@/integrations/supabase/client';
import type { Facture, FactureItem } from '@/types';

const TVA_RATE = 0.16; // 16% TVA en RDC

const FacturesDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFactureWithItems, updateFacture, deleteFacture } = useFactures();
  const { history, loading: historyLoading, addHistoryEntry, refetch: refetchHistory } = useFactureHistory(id);

  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('Vendeur');
  const [dgiEntry, setDgiEntry] = useState<any>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [localItems, setLocalItems] = useState<(FactureItem & { tempId?: string })[]>([]);
  const [localStatut, setLocalStatut] = useState<string>('');
  const [localMontantHt, setLocalMontantHt] = useState(0);
  const [localMontantTva, setLocalMontantTva] = useState(0);
  const [localMontantTtc, setLocalMontantTtc] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  usePageSetup({
    title: facture ? `${facture.type === 'devis' ? 'Devis' : 'Facture'} #${facture.facture_number}` : 'Détail facture',
    subtitle: 'Vue complète avec historique des modifications'
  });

  const loadFacture = async () => {
    if (!id) {
      navigate('/factures');
      return;
    }

    setLoading(true);
    try {
      const data = await getFactureWithItems(id);
      if (!data) {
        showError('Facture introuvable');
        navigate('/factures');
        return;
      }
      setFacture(data);

      // Load DGI registry entry if it's a facture (not a devis)
      if (data.type === 'facture') {
        try {
          const { data: dgiData } = await supabase
            .from('dgi_invoice_registry')
            .select('*')
            .eq('facture_id', id)
            .single();
          setDgiEntry(dgiData || null);
        } catch {
          setDgiEntry(null);
        }
      }

      // Load creator name
      try {
        let creatorId = (data as any).created_by;
        if (!creatorId) {
          const { data: { user } } = await supabase.auth.getUser();
          creatorId = user?.id;
        }
        if (creatorId) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', creatorId)
            .single();
          if (!profileError && profileData) {
            const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
            setCreatorName(fullName || 'Vendeur');
          }
        }
      } catch {
        // Keep default "Vendeur"
      }
    } catch (error) {
      console.error('Error loading facture:', error);
      navigate('/factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacture();
  }, [id]);

  // ── Inline editing helpers ───────────────────────────────────────────────
  const recalculateTotals = useCallback((items: (FactureItem & { tempId?: string })[]) => {
    const ht = items.reduce((sum, item) => {
      const qty = Number(item.quantite) || 0;
      const pu = Number(item.prix_unitaire) || 0;
      return sum + qty * pu;
    }, 0);
    const tva = ht * TVA_RATE;
    const ttc = ht + tva;
    setLocalMontantHt(ht);
    setLocalMontantTva(tva);
    setLocalMontantTtc(ttc);
  }, []);

  const handleStartEdit = () => {
    if (!facture) return;
    const items = facture.items || [];
    setLocalItems(items.map(item => ({ ...item })));
    setLocalStatut(facture.statut);
    recalculateTotals(items);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setLocalItems([]);
    setLocalStatut('');
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof FactureItem,
    value: string | number
  ) => {
    setLocalItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantite' || field === 'prix_unitaire') {
        const qty = Number(field === 'quantite' ? value : updated[index].quantite) || 0;
        const pu = Number(field === 'prix_unitaire' ? value : updated[index].prix_unitaire) || 0;
        updated[index].montant_total = qty * pu;
      }
      return updated;
    });
    setTimeout(() => {
      setLocalItems(prev => {
        recalculateTotals(prev);
        return prev;
      });
    }, 0);
  };

  const handleAddItem = () => {
    const newItem: FactureItem & { tempId?: string } = {
      tempId: `temp-${Date.now()}`,
      numero_ligne: localItems.length + 1,
      description: '',
      quantite: 1,
      prix_unitaire: 0,
      montant_total: 0,
    };
    setLocalItems(prev => {
      const updated = [...prev, newItem];
      recalculateTotals(updated);
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLocalItems(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((item, i) => ({ ...item, numero_ligne: i + 1 }));
    });
    setTimeout(() => {
      setLocalItems(prev => {
        recalculateTotals(prev);
        return prev;
      });
    }, 0);
  };

  const handleSaveEdit = async () => {
    if (!facture) return;

    const validItems = localItems.filter(item => item.description.trim() !== '');
    if (validItems.length === 0) {
      showError('Ajoutez au moins une ligne avec une désignation');
      return;
    }

    // Track changes for history
    const oldItems = facture.items || [];
    if (oldItems.length !== validItems.length) {
      await addHistoryEntry({
        facture_id: facture.id,
        change_type: 'update',
        field_changed: 'items',
        old_value: `${oldItems.length} lignes`,
        new_value: `${validItems.length} lignes`,
        metadata: {},
      });
    }

    setIsSaving(true);
    try {
      const itemsForDb = validItems.map((item, index) => ({
        numero_ligne: index + 1,
        description: item.description,
        quantite: Number(item.quantite) || 0,
        prix_unitaire: Number(item.prix_unitaire) || 0,
        montant_total: (Number(item.quantite) || 0) * (Number(item.prix_unitaire) || 0),
      }));

      await updateFacture(facture.id, {
        statut: localStatut as any,
        items: itemsForDb,
        montant_ht: localMontantHt,
        montant_tva: localMontantTva,
        montant_ttc: localMontantTtc,
        subtotal: localMontantHt,
        total_general: localMontantTtc,
      });

      showSuccess('Modifications enregistrées');
      setIsEditing(false);
      await loadFacture();
    } catch (error) {
      console.error('Error saving edits:', error);
      showError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!facture) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) return;

    setActionLoading(true);
    try {
      await deleteFacture(facture.id);
      showSuccess('Facture supprimée');
      navigate('/factures');
    } catch (error) {
      console.error('Error deleting facture:', error);
      showError('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!facture) return;
    setGeneratingPDF(true);
    try {
      const pdfBlob = await generateFacturePDF(facture, true);
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setPdfDialogOpen(true);
        showSuccess('PDF généré');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfUrl || !facture) return;
    const clientName = facture.clients?.nom || facture.client?.nom || 'Client';
    const fileName = `${clientName} - ${facture.facture_number}.pdf`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('PDF téléchargé');
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setTimeout(() => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }, 100);
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      brouillon: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Brouillon' },
      en_attente: { className: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'En attente' },
      validee: { className: 'bg-green-50 text-green-700 border-green-200', label: 'Validée' },
      payee: { className: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Payée' },
      annulee: { className: 'bg-red-50 text-red-700 border-red-200', label: 'Annulée' }
    };
    const config = variants[statut] || variants.brouillon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          statut === 'validee' ? 'bg-green-500' :
          statut === 'brouillon' ? 'bg-gray-400' :
          statut === 'en_attente' ? 'bg-yellow-500' :
          statut === 'payee' ? 'bg-blue-500' : 'bg-red-500'
        }`}></span>
        {config.label}
      </span>
    );
  };

  const formatChangeType = (changeType: string) => {
    const labels: Record<string, string> = {
      create: 'Création',
      update: 'Modification',
      status_change: 'Changement de statut',
      delete: 'Suppression'
    };
    return labels[changeType] || changeType;
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'update': return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'status_change': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!facture) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600">Facture introuvable</p>
          </div>
        </div>
      </Layout>
    );
  }

  const items = facture.items || [];
  const clientName = facture.clients?.nom || facture.client?.nom || 'N/A';
  const clientNif = facture.clients?.nif || facture.client?.nif || 'N/A';
  const clientAddress = facture.clients?.adresse || facture.client?.adresse || facture.clients?.ville || facture.client?.ville || 'N/A';

  // Company info (from the user/company settings)
  const companyName = 'Coccinelle SARL';
  const companyNif = '1-23-A00001';
  const companyRccm = 'CD/KIN/2024/00123';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/factures')}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 font-mono">{facture.facture_number}</h1>
                {getStatutBadge(facture.statut)}
              </div>
              <p className="text-sm text-gray-500">{clientName} · Émise le {new Date(facture.date_emission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {facture.type === 'facture' && dgiEntry && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full mr-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs font-semibold text-green-700">Validée DGI</span>
              </div>
            )}

            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Enregistrement...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Enregistrer</>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleGeneratePDF}
                  disabled={generatingPDF}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
                <Button
                  onClick={handleStartEdit}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </>
            )}
          </div>
        </header>

        {/* ── Main Content ───────────────────────────────────────── */}
        <main className="p-6">
          <div className="max-w-6xl mx-auto fade-in">

            {/* ── Info Cards Row ───────────────────────────────── */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Émetteur Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Émetteur</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-0.5">{companyName}</p>
                <p className="text-xs text-gray-500">NIF: {companyNif}</p>
                <p className="text-xs text-gray-500">RCCM: {companyRccm}</p>
              </div>

              {/* Client Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-0.5">{clientName}</p>
                <p className="text-xs text-gray-500">NIF: {clientNif}</p>
                <p className="text-xs text-gray-500">{clientAddress}</p>
              </div>

              {/* Dates & Totaux Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dates</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Émission</span>
                    <span className="text-xs font-semibold text-gray-800">{new Date(facture.date_emission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {facture.date_validation && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Validation</span>
                      <span className="text-xs font-semibold text-gray-800">{new Date(facture.date_validation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                    <span className="text-xs text-gray-500">Total TTC</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(facture.total_general || facture.montant_ttc || 0, facture.devise)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lines + Sidebar ───────────────────────────────── */}
            <div className="grid grid-cols-3 gap-6">
              {/* Lines Table (col-span-2) */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">Lignes de facturation</h2>
                  <span className="text-xs text-gray-400">{isEditing ? localItems.length : items.length} article{items.length !== 1 ? 's' : ''}</span>
                </div>

                {isEditing ? (
                  /* Editable Table */
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Désignation</th>
                          <th className="text-center px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qté</th>
                          <th className="text-right px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">P.U. HT</th>
                          <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total HT</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {localItems.map((item, index) => (
                          <tr key={item.tempId || item.id || index}>
                            <td className="px-5 py-3">
                              <Input
                                value={item.description}
                                onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                                placeholder="Description..."
                                className="text-sm h-9"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantite}
                                onChange={(e) => handleItemFieldChange(index, 'quantite', parseFloat(e.target.value) || 0)}
                                className="text-sm h-9 w-16 text-center"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.prix_unitaire}
                                onChange={(e) => handleItemFieldChange(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                                className="text-sm h-9 w-24 text-right"
                              />
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(item.montant_total, facture.devise)}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colspan={4} className="px-5 py-2.5 text-sm text-gray-600 text-right">Total HT</td>
                          <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(localMontantHt, facture.devise)}</td>
                        </tr>
                        <tr>
                          <td colspan={4} className="px-5 py-2.5 text-sm text-gray-600 text-right">TVA (16%)</td>
                          <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(localMontantTva, facture.devise)}</td>
                        </tr>
                        <tr className="border-t-2 border-gray-200">
                          <td colspan={4} className="px-5 py-3 text-base font-bold text-gray-900 text-right">Total TTC</td>
                          <td className="px-5 py-3 text-base font-extrabold text-green-600 text-right">{formatCurrency(localMontantTtc, facture.devise)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    {localItems.length === 0 && (
                      <div className="text-center py-8">
                        <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Aucune ligne</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddItem}
                          className="mt-2 border-green-500 text-green-600 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
                        </Button>
                      </div>
                    )}
                    {localItems.length > 0 && (
                      <div className="p-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddItem}
                          className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
                        </Button>
                      </div>
                    )}
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun article dans cette facture</p>
                  </div>
                ) : (
                  /* Read-only Table */
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Désignation</th>
                        <th className="text-center px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qté</th>
                        <th className="text-right px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">P.U. HT</th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 text-sm text-gray-800">{item.description}</td>
                          <td className="px-3 py-3.5 text-sm text-gray-600 text-center">{item.quantite}</td>
                          <td className="px-3 py-3.5 text-sm text-gray-600 text-right">{formatCurrency(item.prix_unitaire, facture.devise)}</td>
                          <td className="px-5 py-3.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(item.montant_total, facture.devise)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colspan={3} className="px-5 py-2.5 text-sm text-gray-600 text-right">Total HT</td>
                        <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(facture.montant_ht || facture.subtotal || 0, facture.devise)}</td>
                      </tr>
                      <tr>
                        <td colspan={3} className="px-5 py-2.5 text-sm text-gray-600 text-right">TVA (16%)</td>
                        <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{formatCurrency(facture.montant_tva || 0, facture.devise)}</td>
                      </tr>
                      <tr className="border-t-2 border-gray-200">
                        <td colspan={3} className="px-5 py-3 text-base font-bold text-gray-900 text-right">Total TTC</td>
                        <td className="px-5 py-3 text-base font-extrabold text-green-600 text-right">{formatCurrency(facture.total_general || facture.montant_ttc || 0, facture.devise)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* DGI Status Card */}
                {facture.type === 'facture' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">Statut DGI</span>
                    </div>

                    {dgiEntry ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                          <span className="text-xs font-semibold text-green-700">Validée — Code reçu</span>
                        </div>
                        <p className="text-[10px] text-gray-400 ml-4">
                          Reçu le {dgiEntry.created_at ? new Date(dgiEntry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Code d'authentification</p>
                          <p className="text-xs font-mono font-bold text-gray-800 break-all">{dgiEntry.code_auth || 'N/A'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">En attente de validation DGI</p>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Code Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-gray-700" />
                  </div>
                  <p className="text-[10px] font-semibold text-gray-500">QR Code DGI</p>
                </div>

                {/* Actions Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Actions</p>
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={generatingPDF}
                    className="w-full bg-green-600 hover:bg-green-700 text-white justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" /> Télécharger PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Send className="h-4 w-4 mr-2" /> Envoyer au client
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => setHistoryDialogOpen(true)}
                  >
                    <History className="h-4 w-4 mr-2" /> Historique
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleDelete}
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── PDF Dialog ─────────────────────────────────────────────── */}
      <Dialog open={pdfDialogOpen} onOpenChange={handleClosePdfDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>PDF Généré</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-96 border rounded-lg" />
            ) : (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClosePdfDialog}>Fermer</Button>
            <Button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="h-4 w-4 mr-2" /> Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ────────────────────────────────────────── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              Historique des modifications
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun historique disponible</p>
              <p className="text-xs text-gray-400 mt-1">Les modifications apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {history.map((entry, index) => (
                <div key={entry.id || index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-0.5">{getChangeIcon(entry.change_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatChangeType(entry.change_type)}
                        {entry.field_changed && entry.change_type === 'update' && (
                          <span className="text-gray-500 font-normal"> — {entry.field_changed}</span>
                        )}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(entry.changed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {' à '}
                        {new Date(entry.changed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {entry.old_value && entry.new_value && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-red-500 line-through">{entry.old_value}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600">{entry.new_value}</span>
                      </div>
                    )}
                    {entry.changer_name && (
                      <p className="text-[10px] text-gray-400 mt-1">Par {entry.changer_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FacturesDetail;

"use client";

import React, { useState, useEffect } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Calendar,
  User,
  MapPin,
  Phone,
  Package,
  Calculator,
  Download,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  DollarSign,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { PaiementDialog } from '@/components/paiements/PaiementDialog';
import { formatCurrency } from '@/utils/formatCurrency';
import ImagePreview from '@/components/ui/ImagePreview';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { useFactures } from '../hooks/useFactures';
import PermissionGuard from '../components/auth/PermissionGuard';
import { supabase } from '@/integrations/supabase/client';
import { encodeHtml } from '@/lib/xss-protection';
import type { Facture } from '@/types';

const FacturesView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFactureWithItems, deleteFacture, convertToFacture } = useFactures();
  
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('Vendeur');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [paiementDialogOpen, setPaiementDialogOpen] = useState(false);
  const [dgiEntry, setDgiEntry] = useState<any>(null);

  usePageSetup({
    title: facture ? `${facture.type === 'devis' ? 'Devis' : 'Facture'} #${facture.facture_number}` : 'Détails',
    subtitle: 'Détails complets de la facture ou du devis'
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
      
      // Charger le DGI registry entry si c'est une facture (pas un devis)
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

      // Charger le nom du créateur (utiliser l'utilisateur actuel comme fallback)
      try {
        let creatorId = (data as any).created_by;
        
        // Si pas de created_by, utiliser l'utilisateur actuel
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
      } catch (profileError) {
        console.log('Could not load creator profile, using default');
        // Silently fail - keep default "Vendeur"
      }
    } catch (error) {
      console.error('Error loading facture:', error);
      // Ne pas afficher de toast pour éviter de polluer l'UI
      navigate('/factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacture();
  }, [id]);

  const handleConvertToFacture = async () => {
    if (!facture || facture.type !== 'devis') return;
    
    setActionLoading(true);
    try {
      await convertToFacture(facture.id);
      showSuccess('Devis converti en facture avec succès');
      // Reload facture data
      const updatedFacture = await getFactureWithItems(facture.id);
      setFacture(updatedFacture);
    } catch (error) {
      console.error('Error converting to facture:', error);
      showError('Erreur lors de la conversion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!facture) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) return;
    
    setActionLoading(true);
    try {
      await deleteFacture(facture.id);
      showSuccess('Facture supprimée avec succès');
      navigate('/factures');
    } catch (error) {
      console.error('Error deleting facture:', error);
      showError('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = () => {
    if (!facture) return;
    navigate(`/factures/edit/${facture.id}`);
  };

  const handleGeneratePDF = async () => {
    if (!facture) return;
    
    setGeneratingPDF(true);
    try {
      // Générer le PDF
      const pdfBlob = await generateFacturePDF(facture, true);
      
      if (pdfBlob) {
        // Créer une URL pour le blob
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setPdfDialogOpen(true);
        
        showSuccess('PDF généré avec succès');
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
    
    // Créer le nom du fichier: Nom du client - Numero facture
    const clientName = facture.clients?.nom || facture.client?.nom || 'Client';
    const factureNumber = facture.facture_number || 'FACTURE';
    const fileName = `${clientName} - ${factureNumber}.pdf`;
    
    // Télécharger le fichier
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('PDF téléchargé avec succès');
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    // Nettoyer l'URL du blob après un délai
    setTimeout(() => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }, 100);
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; className: string; label: string }> = {
      brouillon: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      en_attente: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      validee: { variant: 'default' as const, className: 'bg-green-500 text-white', label: 'Validée' },
      annulee: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', label: 'Annulée' }
    };
    
    const config = variants[statut] || variants.brouillon;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout><div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          </div></Layout>
    );
  }

  if (!facture) {
    return (
      <Layout><div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600">Facture introuvable</p>
            </div>
          </div></Layout>
    );
  }

  const items = facture.items || [];

  return (
    <Layout><div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/factures')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="p-2 bg-green-50 rounded-lg">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                {facture.type === 'devis' ? 'Devis' : 'Facture'} #{facture.facture_number}
              </h1>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <p className="text-sm font-medium">Vendeur: {creatorName}</p>
              </div>
            </div>

            {/* Actions principales */}
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 w-full lg:w-auto">
              <PermissionGuard module="factures" permission="update">
                <Button
                  variant="outline"
                  onClick={handleEdit}
                  className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </PermissionGuard>
              <Button
                onClick={() => setPaiementDialogOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Enregistrer paiement
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Générer PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    TYPE
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    STATUT
                  </label>
                  <div className="pt-1">
                    {getStatutBadge(facture.statut)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    DATE D'ÉMISSION
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-green-500" />
                    {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    NUMÉRO
                  </label>
                  <p className="text-base font-bold text-gray-900">
                    {facture.facture_number}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    MODE LIVRAISON
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {facture.mode_livraison === 'aerien' ? 'Aérien' : 'Maritime'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    DEVISE
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {facture.devise}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    NOM
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <User className="mr-2 h-4 w-4 text-green-500" />
                    {(facture as any).clients?.nom || (facture as any).client?.nom || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    TÉLÉPHONE
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <Phone className="mr-2 h-4 w-4 text-green-500" />
                    {(facture as any).clients?.telephone || (facture as any).client?.telephone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    VILLE
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <MapPin className="mr-2 h-4 w-4 text-green-500" />
                    {(facture as any).clients?.ville || (facture as any).client?.ville || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Articles ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun article dans cette facture</p>
                </div>
              ) : (
                <>
                  {/* Version Desktop - Tableau normal */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">N°</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Image</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Description</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Qté</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">P.U.</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Poids</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Total</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Lien</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={item.id || index} className="border-b hover:bg-gray-50 transition-colors bg-white">
                            <td className="py-3 px-3 font-medium text-center">{item.numero_ligne}</td>
                            <td className="py-3 px-3">
                              {item.image_url ? (
                                <div className="flex items-center justify-center">
                                  <ImagePreview 
                                    url={item.image_url} 
                                    alt={`Article ${item.numero_ligne}`}
                                    size="sm"
                                    className="border rounded"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 max-w-xs text-center">
                              <div className="line-clamp-2 inline-block" title={item.description}>
                                {encodeHtml(item.description || '-')}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-semibold">{item.quantite}</td>
                            <td className="py-3 px-3 text-center">
                              {formatCurrency(item.prix_unitaire, facture.devise)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono">
                                {item.poids} <span className="text-xs text-gray-500">kg</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-green-500">
                              {formatCurrency(item.montant_total, facture.devise)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.product_url ? (
                                <a
                                  href={item.product_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-500 hover:text-green-600 inline-flex items-center"
                                  title="Voir le produit"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Version Mobile - Cards */}
                  <div className="lg:hidden space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id || index} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        {/* Header avec numéro et image */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {item.numero_ligne}
                          </div>
                          <div className="flex-shrink-0">
                            {item.image_url ? (
                              <ImagePreview 
                                url={item.image_url} 
                                alt={`Article ${item.numero_ligne}`}
                                size="sm"
                                className="border rounded w-16 h-16"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-3" title={item.description}>
                              {encodeHtml(item.description || '-')}
                            </p>
                          </div>
                          {item.product_url && (
                            <div className="flex-shrink-0">
                              <a
                                href={item.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-600 p-1"
                                title="Voir le produit"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Détails en grille */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">Quantité</p>
                            <p className="font-semibold text-gray-900">{item.quantite}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">Prix unitaire</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(item.prix_unitaire, facture.devise)}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">Poids</p>
                            <p className="font-semibold text-gray-900 font-mono">
                              {item.poids} <span className="text-xs">kg</span>
                            </p>
                          </div>
                          <div className="bg-green-50 rounded p-2 border border-green-200">
                            <p className="text-xs text-green-600 mb-1">Total</p>
                            <p className="font-bold text-green-600">{formatCurrency(item.montant_total, facture.devise)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Récapitulatif */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3 max-w-md ml-auto">
                <div className="flex justify-between items-center pb-3 border-b-2 border-green-500">
                  <div className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5 text-green-600" />
                    <span className="font-bold text-lg text-green-600">Récapitulatif</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600 text-base">Sous-total</span>
                  <span className="font-semibold text-base">
                    {formatCurrency(facture.subtotal, facture.devise)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600 text-base">Frais de services</span>
                  <span className="font-semibold text-base">
                    {formatCurrency(facture.frais || 0, facture.devise)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600 text-base">Frais transport & douane</span>
                  <span className="font-semibold text-base">
                    {formatCurrency(facture.frais_transport_douane, facture.devise)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4">
                  <span className="font-bold text-lg text-green-600">Total général</span>
                  <span className="font-bold text-2xl text-green-600">
                    {formatCurrency(facture.total_general, facture.devise)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DGI Compliance Info */}
          {facture.type === 'facture' && dgiEntry && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg text-emerald-800">Conformité DGI</CardTitle>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      N° DGI
                    </label>
                    <p className="font-bold text-emerald-700 text-lg">{dgiEntry.numero_dgi}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Code d'autorisation
                    </label>
                    <p className="font-mono font-semibold text-gray-800">{dgiEntry.code_auth}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      QR Code
                    </label>
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-gray-400" />
                      <span className="text-xs text-gray-600 font-mono truncate max-w-[180px]">{dgiEntry.qr_code_data}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Total HTVA
                    </label>
                    <p className="font-semibold text-gray-800">{dgiEntry.total_htva?.toFixed(2)} $</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      TVA ({((dgiEntry.taux_tva || 0) * 100).toFixed(0)}%)
                    </label>
                    <p className="font-semibold text-gray-800">{dgiEntry.montant_tva?.toFixed(2)} $</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Total TTC
                    </label>
                    <p className="font-bold text-emerald-700">{dgiEntry.total_ttc?.toFixed(2)} $</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes et conditions */}
          {(facture.conditions_vente || facture.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes et conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {facture.conditions_vente && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Conditions de vente
                    </label>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {facture.conditions_vente}
                    </p>
                  </div>
                )}
                {facture.notes && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Notes
                    </label>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {facture.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="bg-white flex justify-center items-center pt-4 pb-4 border-t shadow-lg">
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 w-full sm:w-auto px-4 sm:px-0">
              {facture.type === 'devis' && facture.statut === 'brouillon' && (
                <PermissionGuard module="factures" permission="update">
                  <Button
                    onClick={handleConvertToFacture}
                    disabled={actionLoading}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Convertir en facture
                  </Button>
                </PermissionGuard>
              )}
              <PermissionGuard module="factures" permission="delete">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Dialogue Paiement */}
          <PaiementDialog
            open={paiementDialogOpen}
            onOpenChange={setPaiementDialogOpen}
            type="facture"
            factureId={facture.id}
            clientId={facture.client_id}
            clientNom={(facture as any).clients?.nom || (facture as any).client?.nom || 'N/A'}
            montantTotal={facture.total_general}
            montantRestant={facture.total_general - ((facture as any).montant_paye || 0)}
            numeroFacture={facture.facture_number}
            onSuccess={() => {
              // Recharger la facture pour mettre à jour le montant payé
              loadFacture();
            }}
          />

          {/* Dialogue PDF */}
          <Dialog open={pdfDialogOpen} onOpenChange={handleClosePdfDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  PDF généré avec succès
                </DialogTitle>
                <DialogDescription>
                  {facture?.clients?.nom || facture?.client?.nom || 'Client'} - {facture?.facture_number}
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Votre PDF est prêt à être téléchargé
                    </p>
                    <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                      {facture?.clients?.nom || facture?.client?.nom || 'Client'} - {facture?.facture_number}.pdf
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleDownloadPDF}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Télécharger le PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (pdfUrl) {
                      window.open(pdfUrl, '_blank');
                    }
                  }}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ouvrir dans un nouvel onglet
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClosePdfDialog}
                  className="w-full"
                >
                  Fermer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div></Layout>
  );
};

export default FacturesView;

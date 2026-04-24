"use client";

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpCircle,
} from 'lucide-react';
import { useFactures } from '@/hooks/useFactures';
import type { Facture, FactureFilters } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const Devis: React.FC = () => {
  usePageSetup({
    title: 'Devis',
    subtitle: 'Gérez vos devis et convertissez-les en factures',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const filters: FactureFilters = useMemo(() => ({
    search: searchTerm || undefined,
    type: 'devis',
    statut: statutFilter !== 'all' && statutFilter !== 'expire' ? statutFilter : undefined,
    clientId: clientFilter !== 'all' ? clientFilter : undefined,
  }), [searchTerm, statutFilter, clientFilter]);

  const { factures, pagination, isLoading, refetch } = useFactures(currentPage, filters);

  // Computed: devis is expired when date_echeance < today and not in a final state
  const isExpired = (devis: Facture) =>
    !!devis.date_echeance
    && new Date(devis.date_echeance) < new Date()
    && !['validee', 'payee', 'annulee'].includes(devis.statut);

  const getStatusBadge = (devis: Facture) => {
    if (isExpired(devis)) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 text-gray-600 border-gray-200">
          <Clock className="w-3 h-3" />Expiré
        </Badge>
      );
    }
    switch (devis.statut) {
      case 'en_attente':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3" />En attente
          </Badge>
        );
      case 'validee':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3" />Accepté
          </Badge>
        );
      case 'annulee':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3" />Refusé
          </Badge>
        );
      case 'payee':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <ArrowUpCircle className="w-3 h-3" />Converti
          </Badge>
        );
      case 'brouillon':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-600 border-gray-200">
            Brouillon
          </Badge>
        );
      default:
        return <Badge variant="outline">{devis.statut}</Badge>;
    }
  };

  const handleConvertToFacture = async (devis: Facture) => {
    try {
      const { error } = await supabase
        .from('factures')
        .update({ type: 'facture', statut: 'en_attente' })
        .eq('id', devis.id);

      if (error) throw error;

      showSuccess('Devis converti en facture');
      refetch();
    } catch (err) {
      showError('Erreur lors de la conversion');
    }
  };

  const handleRenew = async (devis: Facture) => {
    try {
      const newDateEcheance = new Date();
      newDateEcheance.setMonth(newDateEcheance.getMonth() + 1);
      const { error } = await supabase
        .from('factures')
        .update({ date_echeance: newDateEcheance.toISOString(), statut: 'en_attente' })
        .eq('id', devis.id);

      if (error) throw error;
      showSuccess('Devis renouvelé');
      refetch();
    } catch (err) {
      showError('Erreur lors du renouvellement');
    }
  };

  const handleDuplicate = async (devis: Facture) => {
    try {
      const { data: items } = await supabase
        .from('facture_items')
        .select('*')
        .eq('facture_id', devis.id);

      const now = new Date().toISOString();
      const newDateEcheance = new Date();
      newDateEcheance.setMonth(newDateEcheance.getMonth() + 1);

      const { data: newFacture, error: createError } = await supabase
        .from('factures')
        .insert({
          type: 'devis',
          statut: 'en_attente',
          client_id: devis.client_id,
          date_emission: now,
          date_echeance: newDateEcheance.toISOString(),
          devise: devis.devise,
          subtotal: devis.subtotal,
          total_general: devis.total_general,
          montant_ht: devis.montant_ht,
          montant_tva: devis.montant_tva,
          montant_ttc: devis.montant_ttc,
          notes: devis.notes,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (items && items.length > 0) {
        const newItems = items.map((item: any) => ({
          facture_id: newFacture.id,
          numero_ligne: item.numero_ligne,
          description: item.description,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          montant_total: item.montant_total,
        }));

        await supabase.from('facture_items').insert(newItems);
      }

      showSuccess('Devis dupliqué');
      refetch();
    } catch (err) {
      showError('Erreur lors de la duplication');
    }
  };

  const totalPages = pagination ? Math.ceil((pagination.count || 0) / (pagination.limit || 10)) : 1;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
            <p className="text-sm text-gray-500">{pagination?.count || 0} devis</p>
          </div>
          <Button onClick={() => navigate('/factures/new?type=devis')}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau devis
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <Input
                    placeholder="Rechercher un devis..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <select
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="validee">Accepté</option>
                <option value="annulee">Refusé</option>
                <option value="expire">Expiré</option>
                <option value="payee">Converti en facture</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">N° Devis</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validité</th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Montant HT</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {factures.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                            Aucun devis trouvé
                          </td>
                        </tr>
                      ) : (
                        factures
                          .filter((devis) => {
                            if (statutFilter === 'expire') return isExpired(devis);
                            return true;
                          })
                          .map((devis) => (
                          <tr key={devis.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/factures/view/${devis.id}`)}>
                            <td className="px-5 py-4">
                              <span className="text-sm font-bold text-gray-900 font-mono">{devis.facture_number}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-semibold text-gray-800">{(devis as any).clients?.nom || 'Client inconnu'}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm text-gray-600">
                                {new Date(devis.date_emission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-sm ${isExpired(devis) ? 'text-red-600' : 'text-gray-600'}`}>
                                {devis.date_echeance
                                  ? new Date(devis.date_echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : new Date(new Date(devis.date_emission).setMonth(new Date(devis.date_emission).getMonth() + 1)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-bold text-gray-900">
                                {formatCurrency(devis.montant_ht || devis.subtotal || 0, devis.devise)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {getStatusBadge(devis)}
                            </td>
                            <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/factures/view/${devis.id}`)} title="Voir">
                                  <Eye className="w-4 h-4 text-gray-400 hover:text-green-600" />
                                </Button>

                                {isExpired(devis) ? (
                                  // Renew button for expired devis
                                  <Button variant="ghost" size="icon" onClick={() => handleRenew(devis)} title="Renouveler">
                                    <RefreshCw className="w-4 h-4 text-gray-400 hover:text-green-600" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/factures/edit/${devis.id}`)} title="Modifier">
                                      <Edit className="w-4 h-4 text-gray-400 hover:text-green-600" />
                                    </Button>
                                    {devis.statut !== 'payee' && (
                                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(devis)} title="Dupliquer">
                                        <Copy className="w-4 h-4 text-gray-400 hover:text-green-600" />
                                      </Button>
                                    )}
                                    {devis.statut === 'validee' && (
                                      <Button variant="ghost" size="icon" onClick={() => handleConvertToFacture(devis)} title="Convertir en facture" className="hover:bg-green-50">
                                        <ArrowUpCircle className="w-4 h-4 text-green-600" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Affichage {factures.length} sur {pagination?.count || 0} devis
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <span className="text-xs">‹</span>
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? 'bg-green-600' : ''}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="text-xs">›</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Devis;

"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatCurrency';
import { showSuccess, showError } from '@/utils/toast';
import type { Facture } from '@/types';

type DevisStatus = 'brouillon' | 'soumis' | 'accepte' | 'refuse';

const STATUS_CONFIG: Record<DevisStatus, { label: string; className: string; icon: React.ReactNode }> = {
  brouillon: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 border-gray-300', icon: <Clock className="h-3 w-3 mr-1" /> },
  soumis: { label: 'Soumis', className: 'bg-blue-100 text-blue-700 border-blue-300', icon: <Send className="h-3 w-3 mr-1" /> },
  accepte: { label: 'Accepte', className: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
  refuse: { label: 'Refuse', className: 'bg-red-100 text-red-700 border-red-300', icon: <XCircle className="h-3 w-3 mr-1" /> },
};

const DevisStatusBadge: React.FC<{ status: DevisStatus }> = ({ status }) => {
  const { label, className, icon } = STATUS_CONFIG[status] || STATUS_CONFIG.brouillon;
  return (
    <Badge variant="outline" className={className + ' flex items-center w-fit'}>
      {icon}
      {label}
    </Badge>
  );
};

interface DevisRow extends Facture {
  client_nom?: string;
}

const DevisPage: React.FC = () => {
  const navigate = useNavigate();
  const [devis, setDevis] = useState<DevisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DevisStatus | 'all'>('all');
  const [selectedDevis, setSelectedDevis] = useState<DevisRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  usePageSetup({
    title: 'Devis',
    subtitle: 'Gestion des devis et proposals',
  });

  const fetchDevis = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('factures')
        .select(`
          *,
          clients(id, nom, telephone, ville)
        `)
        .eq('type', 'devis')
        .order('date_emission', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('statut', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: DevisRow[] = (data || []).map((d: any) => ({
        ...d,
        client_nom: d.clients?.nom || d.clients,
      }));

      setDevis(mapped);
    } catch (err: any) {
      showError('Erreur lors du chargement des devis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevis();
  }, [statusFilter]);

  const filteredDevis = devis.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.facture_number?.toLowerCase().includes(q) ||
      d.client_nom?.toLowerCase().includes(q) ||
      d.notes?.toLowerCase().includes(q)
    );
  });

  const handleConvertToInvoice = async (devisItem: DevisRow) => {
    setActionLoading(true);
    try {
      // Create new invoice from devis
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newFacture, error } = await supabase
        .from('factures')
        .insert({
          type: 'facture',
          statut: 'brouillon',
          client_id: devisItem.client_id,
          date_emission: new Date().toISOString().split('T')[0],
          devise: devisItem.devise,
          mode_livraison: devisItem.mode_livraison,
          subtotal: devisItem.subtotal,
          frais: devisItem.frais || 0,
          total_general: devisItem.total_general,
          notes: devisItem.notes,
          conditions_vente: devisItem.conditions_vente,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Copy items
      const items = devisItem.items || [];
      if (items.length > 0) {
        const lineItems = items.map((item: any) => ({
          facture_id: newFacture.id,
          numero_ligne: item.numero_ligne,
          description: item.description,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          poids: item.poids || 0,
          montant_total: item.montant_total,
          image_url: item.image_url,
          product_url: item.product_url,
        }));
        await supabase.from('facture_items').insert(lineItems);
      }

      showSuccess('Devis converti en facture avec succes');
      setConvertOpen(false);
      setDetailOpen(false);
      fetchDevis();
      navigate('/factures/create', { state: { factureId: newFacture.id } });
    } catch (err: any) {
      showError('Erreur lors de la conversion: ' + (err.message || 'Inconnu'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (devisItem: DevisRow, newStatus: DevisStatus) => {
    try {
      const { error } = await supabase
        .from('factures')
        .update({ statut: newStatus })
        .eq('id', devisItem.id);

      if (error) throw error;
      showSuccess(`Devis marque comme ${STATUS_CONFIG[newStatus].label}`);
      fetchDevis();
    } catch {
      showError('Erreur lors de la mise a jour du statut');
    }
  };

  const openDetail = (d: DevisRow) => {
    setSelectedDevis(d);
    setDetailOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredDevis.length} devis{filteredDevis.length > 1 ? 's' : ''} trouve{filteredDevis.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchDevis} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => navigate('/factures/create?type=devis')}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau devis
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numero, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'brouillon', 'soumis', 'accepte', 'refuse'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {s === 'all' ? 'Tous' : STATUS_CONFIG[s as DevisStatus]?.label || s}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : filteredDevis.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-lg font-medium">Aucun devis</p>
                <p className="text-sm mt-1">Creez votre premier devis pour un client</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N Devis</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Echeance</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevis.map((d) => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openDetail(d)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {d.facture_number || '—'}
                        </div>
                      </TableCell>
                      <TableCell>{d.client_nom || '—'}</TableCell>
                      <TableCell>{d.date_emission || '—'}</TableCell>
                      <TableCell>{d.date_validation || '—'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {d.total_general ? formatCurrency(d.total_general, d.devise || 'USD') : '—'}
                      </TableCell>
                      <TableCell><DevisStatusBadge status={(d.statut as DevisStatus) || 'brouillon'} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(d); }} title="Voir details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/factures/${d.id}/edit`); }} title="Modifier">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedDevis(d); setConvertOpen(true); }} title="Convertir en facture">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Devis {selectedDevis?.facture_number}</DialogTitle>
            <DialogDescription>Details du devis</DialogDescription>
          </DialogHeader>
          {selectedDevis && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">{selectedDevis.client_nom || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Statut</p>
                  <DevisStatusBadge status={(selectedDevis.statut as DevisStatus) || 'brouillon'} />
                </div>
                <div>
                  <p className="text-gray-500">Date emission</p>
                  <p className="font-medium">{selectedDevis.date_emission || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Echeance</p>
                  <p className="font-medium">{selectedDevis.date_validation || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Montant</p>
                  <p className="font-medium text-green-700 text-lg">
                    {selectedDevis.total_general ? formatCurrency(selectedDevis.total_general, selectedDevis.devise || 'USD') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Devise</p>
                  <p className="font-medium">{selectedDevis.devise || 'USD'}</p>
                </div>
              </div>

              {selectedDevis.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">{selectedDevis.notes}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex gap-2">
                  {selectedDevis.statut === 'brouillon' && (
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(selectedDevis, 'soumis')}>
                      <Send className="h-4 w-4 mr-2" />
                      Marquer soumis
                    </Button>
                  )}
                  {selectedDevis.statut === 'soumis' && (
                    <>
                      <Button variant="outline" size="sm" className="text-green-700" onClick={() => handleUpdateStatus(selectedDevis, 'accepte')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accepter
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-700" onClick={() => handleUpdateStatus(selectedDevis, 'refuse')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>Fermer</Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setDetailOpen(false); setSelectedDevis(selectedDevis); setConvertOpen(true); }}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convertir en facture
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert Confirmation Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en facture</DialogTitle>
            <DialogDescription>
              Le devis {selectedDevis?.facture_number} sera converti en facture. Les lignes seront dupliquees.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => selectedDevis && handleConvertToInvoice(selectedDevis)} disabled={actionLoading}>
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Convertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DevisPage;

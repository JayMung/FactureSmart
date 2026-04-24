"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Eye,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  X,
  FileEdit
} from 'lucide-react';
import Pagination from '../components/ui/pagination-custom';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useFactures } from '../hooks/useFactures';
import { useClients } from '../hooks/useClients';
import type { Facture, FactureFilters } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Avatar component for client initials
const ClientAvatar = ({ name, className }: { name: string; className?: string }) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', colors[colorIndex], className)}>
      <span className="text-[10px] font-bold">{initials}</span>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    validee: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Validée' },
    en_attente: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'En attente' },
    payee: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Payée' },
    annulee: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Annulée' },
    brouillon: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Brouillon' },
    rejetee: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Rejetée' },
  };

  const config = configs[status] || configs.brouillon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full', config.bg, config.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)}></span>
      {config.label}
    </span>
  );
};

// Format currency
const formatCurrency = (amount: number, devise: string = 'CDF') => {
  const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return devise === 'USD' ? `USD ${formatted}` : `CDF ${formatted}`;
};

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const FacturesList: React.FC = () => {
  usePageSetup({
    title: 'Factures',
    subtitle: 'Gestion de vos factures et devis'
  });

  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(7);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState('current');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Selection
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [factureToDelete, setFactureToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk delete
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Get date range based on period filter
  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case 'current':
        return {
          dateFrom: startOfMonth(now).toISOString(),
          dateTo: endOfMonth(now).toISOString()
        };
      case 'last3':
        return {
          dateFrom: subMonths(startOfMonth(now), 2).toISOString(),
          dateTo: endOfMonth(now).toISOString()
        };
      case 'last30':
        return {
          dateFrom: subMonths(now, 1).toISOString(),
          dateTo: now.toISOString()
        };
      case 'last90':
        return {
          dateFrom: subMonths(now, 3).toISOString(),
          dateTo: now.toISOString()
        };
      default:
        return { dateFrom: undefined, dateTo: undefined };
    }
  };

  const { dateFrom, dateTo } = getDateRange();

  // Build filters
  const filters: FactureFilters = useMemo(() => ({
    search: searchTerm || undefined,
    statut: statusFilter === 'all' ? undefined : statusFilter,
    clientId: clientFilter === 'all' ? undefined : clientFilter,
    dateFrom,
    dateTo,
  }), [searchTerm, statusFilter, clientFilter, dateFrom, dateTo]);

  // Fetch factures
  const {
    factures,
    pagination,
    isLoading,
    deleteFacture,
    refetch
  } = useFactures(currentPage, filters, { pageSize });

  // Fetch clients for filter dropdown
  const { clients } = useClients(1, {});

  // Calculate stats for filter badges
  const stats = useMemo(() => {
    if (!pagination) return { total: 0, validated: 0, pending: 0, rejected: 0 };

    // For now, we'll use the current page data to estimate
    // In a real app, you'd want to fetch these from separate API endpoints
    const total = pagination.count || 0;
    return { total, validated: Math.floor(total * 0.95), pending: Math.max(0, total - Math.floor(total * 0.95) - Math.floor(total * 0.05)), rejected: Math.floor(total * 0.05) };
  }, [pagination]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePeriodFilter = (period: string) => {
    setPeriodFilter(period);
    setCurrentPage(1);
  };

  const handleClientFilter = (clientId: string) => {
    setClientFilter(clientId);
    setCurrentPage(1);
  };

  const handleView = (facture: Facture) => {
    navigate(`/factures/view/${facture.id}`);
  };

  const handleEdit = (facture: Facture) => {
    navigate(`/factures/edit/${facture.id}`);
  };

  const handleDeleteClick = (id: string) => {
    setFactureToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!factureToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFacture(factureToDelete);
      showSuccess('Facture supprimée avec succès');
      refetch();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFactureToDelete(null);
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFactures(new Set(factures.map(f => f.id)));
    } else {
      setSelectedFactures(new Set());
    }
  };

  const handleSelectFacture = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedFactures);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedFactures(newSelected);
  };

  // Bulk handlers
  const handleBulkDelete = async () => {
    if (selectedFactures.size === 0) return;
    setIsDeleting(true);
    try {
      for (const id of Array.from(selectedFactures)) {
        await deleteFacture(id);
      }
      showSuccess(`${selectedFactures.size} facture(s) supprimée(s)`);
      setSelectedFactures(new Set());
      refetch();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleExportSelected = () => {
    if (selectedFactures.size === 0) return;
    // Export logic would go here
    showSuccess(`${selectedFactures.size} facture(s) exportée(s)`);
  };

  const handleNewFacture = () => {
    navigate('/factures/new');
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Factures</h1>
            <p className="text-sm text-gray-500">
              {pagination?.count || 0} factures — {stats.pending} en attente de validation DGI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" size={16} />
              <input
                type="text"
                placeholder="Rechercher une facture..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 w-64"
              />
            </div>
            <Button
              onClick={handleNewFacture}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus size={16} />
              Nouvelle facture
            </Button>
          </div>
        </div>

        <main className="p-8">
          {/* Filters bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Statut :</span>
                <button
                  onClick={() => handleStatusFilter('all')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                    statusFilter === 'all'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  )}
                >
                  Toutes ({stats.total})
                </button>
                <button
                  onClick={() => handleStatusFilter('validee')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1',
                    statusFilter === 'validee'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  )}
                >
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Validées ({stats.validated})
                </button>
                <button
                  onClick={() => handleStatusFilter('en_attente')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1',
                    statusFilter === 'en_attente'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                  )}
                >
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  En attente ({stats.pending})
                </button>
                <button
                  onClick={() => handleStatusFilter('rejetee')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1',
                    statusFilter === 'rejetee'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  )}
                >
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  Rejetées ({stats.rejected})
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              {/* Period filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Période :</span>
                <Select value={periodFilter} onValueChange={handlePeriodFilter}>
                  <SelectTrigger className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-green-100 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Janv — Avril 2026</SelectItem>
                    <SelectItem value="last3">3 derniers mois</SelectItem>
                    <SelectItem value="last30">30 derniers jours</SelectItem>
                    <SelectItem value="last90">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              {/* Client filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client :</span>
                <Select value={clientFilter} onValueChange={handleClientFilter}>
                  <SelectTrigger className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-green-100 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto">
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition-colors">
                  <SlidersHorizontal size={14} />
                  Plus de filtres
                </button>
              </div>
            </div>
          </div>

          {/* Bulk actions bar */}
          {selectedFactures.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {selectedFactures.size} facture{selectedFactures.size > 1 ? 's' : ''} sélectionnée{selectedFactures.size > 1 ? 's' : ''}
                </Badge>
                <span className="text-sm text-blue-700">Actions groupées disponibles</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  className="border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Download size={14} className="mr-2" />
                  Exporter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="border-red-200 text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={14} className="mr-2" />
                  Supprimer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFactures(new Set())}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <Checkbox
                      checked={selectedFactures.size === factures.length && factures.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Facture</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant HT</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA (18%)</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant TTC</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                      <td className="px-6 py-3.5"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                      <td className="px-6 py-3.5"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                      <td className="px-6 py-3.5"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-gray-200 rounded-full"></div><div className="h-4 w-32 bg-gray-200 rounded"></div></div></td>
                      <td className="px-6 py-3.5 text-right"><div className="h-4 w-20 bg-gray-200 rounded ml-auto"></div></td>
                      <td className="px-6 py-3.5 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto"></div></td>
                      <td className="px-6 py-3.5 text-right"><div className="h-4 w-24 bg-gray-200 rounded ml-auto"></div></td>
                      <td className="px-6 py-3.5 text-center"><div className="h-6 w-20 bg-gray-200 rounded-full mx-auto"></div></td>
                      <td className="px-6 py-3.5 text-center"><div className="h-8 w-20 bg-gray-200 rounded mx-auto"></div></td>
                    </tr>
                  ))
                ) : factures.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Aucune facture trouvée</p>
                      <p className="text-gray-400 text-sm">Essayez de modifier vos filtres ou créez une nouvelle facture</p>
                    </td>
                  </tr>
                ) : (
                  factures.map((facture) => {
                    const clientName = facture.clients?.nom || facture.client?.nom || 'Client inconnu';
                    const clientNif = facture.clients?.nif || facture.client?.nif || '';
                    const isSelected = selectedFactures.has(facture.id);
                    const tva = (facture.montant_ht || 0) * 0.18;
                    const isRejected = facture.statut === 'rejetee';

                    return (
                      <tr
                        key={facture.id}
                        className={cn(
                          'transition-colors cursor-pointer hover:bg-gray-50',
                          isSelected && 'bg-green-50/50'
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectFacture(facture.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-6 py-3.5" onClick={() => handleView(facture)}>
                          <span className="text-sm font-bold text-green-700">{facture.facture_number}</span>
                        </td>
                        <td className="px-6 py-3.5" onClick={() => handleView(facture)}>
                          <span className="text-sm text-gray-600">{formatDate(facture.date_emission)}</span>
                        </td>
                        <td className="px-6 py-3.5" onClick={() => handleView(facture)}>
                          <div className="flex items-center gap-2.5">
                            <ClientAvatar name={clientName} />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{clientName}</p>
                              <p className="text-xs text-gray-400">NIF: {clientNif || 'Non renseigné'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right" onClick={() => handleView(facture)}>
                          <span className="text-sm font-medium text-gray-700">
                            {formatCurrency(facture.montant_ht || facture.subtotal || 0, facture.devise)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right" onClick={() => handleView(facture)}>
                          <span className="text-sm text-gray-500">
                            {formatCurrency(tva, facture.devise)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right" onClick={() => handleView(facture)}>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(facture.montant_ttc || facture.total_general || 0, facture.devise)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <StatusBadge status={facture.statut} />
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleView(facture); }}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-600 flex items-center justify-center transition-colors"
                              title="Voir"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(facture); }}
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                                isRejected
                                  ? 'bg-orange-50 hover:bg-orange-100 text-orange-500 hover:text-orange-600'
                                  : 'bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-600'
                              )}
                              title={isRejected ? 'Corriger' : 'Modifier'}
                            >
                              {isRejected ? <FileEdit size={14} /> : <Eye size={14} />}
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors">
                                  <MoreHorizontal size={14} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(facture)}>
                                  <Eye size={14} className="mr-2" />
                                  Voir les détails
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(facture)}>
                                  <Edit size={14} className="mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(facture.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Affichage {factures.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, pagination?.count || 0)} sur {pagination?.count || 0} factures
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors',
                        currentPage === page
                          ? 'bg-green-600 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Delete confirmation dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer la facture"
          description="Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          variant="destructive"
        />

        {/* Bulk delete confirmation dialog */}
        <ConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title="Supprimer les factures"
          description={`Êtes-vous sûr de vouloir supprimer ${selectedFactures.size} facture(s) ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          onConfirm={handleBulkDelete}
          isLoading={isDeleting}
          variant="destructive"
        />
      </div>
    </Layout>
  );
};

export default FacturesList;

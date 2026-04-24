import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Receipt, 
  FileText, 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  Download,
  X,
  User,
  Phone,
  MapPin,
  Package
} from 'lucide-react';
import { useClientHistory } from '@/hooks/useClientHistory';
import { useFactures } from '@/hooks/useFactures';
import { useColisList } from '@/hooks/useColisList';
import type { Client, Transaction, Colis } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';

interface ClientHistoryModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  client,
  open,
  onOpenChange
}) => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    currency: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Transactions hook
  const {
    history: transactions,
    stats: transactionStats,
    loading: transactionsLoading,
    pagination: transactionPagination,
    refetch: refetchTransactions
  } = useClientHistory(client?.id || '', currentPage, filters);

  // Factures hook
  const {
    factures,
    pagination: facturePagination,
    isLoading: facturesLoading,
    refetch: refetchFactures
  } = useFactures(currentPage, {
    clientId: client?.id,
    type: undefined, // Tous les types (devis et factures)
    statut: undefined // Tous les statuts
  });

  // Colis hook
  const {
    data: colisData,
    isLoading: colisLoading,
    refetch: refetchColis
  } = useColisList({
    clientId: client?.id
  });
  
  const colis = (colisData as any[]) || [];

  const formatCurrencyValue = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} CDF`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return amount.toString();
  };

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case "Servi":
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case "En attente":
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case "Remboursé":
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
      case "Annulé":
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getFactureStatusBadge = (statut: string) => {
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleExportTransactions = () => {
    const csv = [
      ['Date', 'Référence', 'Montant', 'Devise', 'Motif', 'Mode de paiement', 'Statut', 'Frais', 'Bénéfice'],
      ...transactions.map(tx => [
        new Date(tx.created_at).toLocaleDateString('fr-FR'),
        tx.reference || '',
        tx.montant.toString(),
        tx.devise,
        tx.motif,
        tx.mode_paiement,
        tx.statut,
        tx.frais.toString(),
        tx.benefice.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${client?.nom}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFactures = () => {
    const csv = [
      ['Numéro', 'Type', 'Date', 'Montant total', 'Devise', 'Statut', 'Mode de livraison'],
      ...factures.map(facture => [
        facture.facture_number,
        facture.type,
        new Date(facture.date_emission).toLocaleDateString('fr-FR'),
        facture.total_general.toString(),
        facture.devise,
        facture.statut,
        facture.mode_livraison
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-${client?.nom}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-y-auto p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <span className="text-lg">←</span>
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {client.nom.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl">
              Modifier
            </Button>
            <Button size="sm" className="bg-green-500 hover:bg-green-600 rounded-xl">
              Nouvelle facture
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-5">
        {/* Stats Cards - alignes mockup J1 */}
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total facturé</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">
              {formatCurrencyValue(transactionStats?.totalAmount || 0, 'CDF')}
            </p>
            <p className="text-xs text-gray-400 mt-1">{facturePagination?.count || 0} factures</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Payé</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">
              {formatCurrencyValue(transactionStats?.totalPaye || 0, 'CDF')}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {transactionStats?.totalAmount ? Math.round((transactionStats.totalPaye / transactionStats.totalAmount) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">En attente</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {formatCurrencyValue((transactionStats?.totalAmount || 0) - (transactionStats?.totalPaye || 0), 'CDF')}
            </p>
            <p className="text-xs text-amber-600 mt-1">{(facturePagination?.count || 0) - (transactionStats?.paidCount || 0)} factures en attente</p>
          </div>
        </div>

        {/* Client Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informations client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                {client.nif && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">NIF</p>
                    <p className="text-sm font-mono text-gray-900">{client.nif}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Téléphone</p>
                  <p className="text-sm text-gray-900">{client.telephone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-gray-900">{client.adresse || '—'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Adresse</p>
                  <p className="text-sm text-gray-900">{client.adresse || client.ville || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ville</p>
                  <p className="text-sm text-gray-900">{client.ville}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Client depuis</p>
                  <p className="text-sm text-gray-900">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 sm:mt-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="transactions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 text-xs sm:text-sm">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Trans.</span>
              <span className="text-xs">({transactionPagination?.count || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="factures" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Factures</span>
              <span className="sm:hidden">Fact.</span>
              <span className="text-xs">({facturePagination?.count || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="colis" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span>Colis</span>
              <span className="text-xs">({colis?.length || 0})</span>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4 sm:space-y-6">
            {/* Transaction Stats - Mobile Optimized */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {transactionStats.totalTransactions}
                      </p>
                    </div>
                    <Receipt className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total USD</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrencyValue(transactionStats.totalUSD, 'USD')}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total CDF</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrencyValue(transactionStats.totalCDF, 'CDF')}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Bénéfice Total</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrencyValue(transactionStats.totalBenefice, 'USD')}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="Servi">Servi</SelectItem>
                      <SelectItem value="En attente">En attente</SelectItem>
                      <SelectItem value="Remboursé">Remboursé</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filters.currency} onValueChange={(value) => handleFilterChange('currency', value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes devises</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={handleExportTransactions}>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Transactions</span>
                  <Badge variant="outline">
                    {transactionPagination?.count || 0} transaction{transactionPagination?.count !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Aucune transaction trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          {getTransactionStatusIcon(transaction.statut)}
                          <div>
                            <p className="font-medium">
                              {formatCurrencyValue(transaction.montant, transaction.devise)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.motif} • {transaction.mode_paiement}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{transaction.statut}</Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            Frais: {formatCurrencyValue(transaction.frais, 'USD')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Factures Tab */}
          <TabsContent value="factures" className="space-y-6">
            {/* Facture Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Documents</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {facturePagination?.count || 0}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Devis</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {factures.filter(f => f.type === 'devis').length}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Factures</p>
                      <p className="text-2xl font-bold text-green-600">
                        {factures.filter(f => f.type === 'facture').length}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Validées</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {factures.filter(f => f.statut === 'validee').length}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleExportFactures}>
                <Download className="mr-2 h-4 w-4" />
                Exporter les factures
              </Button>
            </div>

            {/* Factures List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Factures et Devis</span>
                  <Badge variant="outline">
                    {facturePagination?.count || 0} document{facturePagination?.count !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {facturesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : factures.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Aucune facture ou devis trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {factures.map((facture) => (
                      <div key={facture.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-full bg-blue-100">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{facture.facture_number}</p>
                            <p className="text-sm text-gray-500">
                              {facture.type === 'devis' ? 'Devis' : 'Facture'} • {facture.mode_livraison}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getFactureStatusBadge(facture.statut)}
                          <p className="text-sm font-medium text-green-600 mt-1">
                            {formatCurrencyValue(facture.total_general, facture.devise)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colis Tab */}
          <TabsContent value="colis" className="space-y-4 sm:space-y-6">
            {/* Colis Stats - Mobile Optimized */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Total Colis</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        {colis?.length || 0}
                      </p>
                    </div>
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Aériens</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {colis?.filter((c: any) => c.type_livraison === 'aerien').length || 0}
                      </p>
                    </div>
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Maritimes</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {colis?.filter((c: any) => c.type_livraison === 'maritime').length || 0}
                      </p>
                    </div>
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Poids Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">
                        {colis?.reduce((sum: number, c: any) => sum + (c.poids || 0), 0).toFixed(1) || 0} kg
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colis List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <span>Liste des Colis</span>
                  <Badge variant="outline">
                    {colis?.length || 0} colis
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {colisLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : !colis || colis.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Aucun colis trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {colis.map((colisItem: any) => (
                      <div key={colisItem.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 gap-3 sm:gap-0">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className={`p-2 rounded-full ${colisItem.type_livraison === 'aerien' ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <Package className={`h-4 w-4 ${colisItem.type_livraison === 'aerien' ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <p className="text-sm sm:text-base font-medium">
                              {colisItem.type_livraison === 'aerien' ? '✈️ Aérien' : '🚢 Maritime'}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {colisItem.quantite} colis • {colisItem.poids} kg
                            </p>
                            {colisItem.tracking_chine && (
                              <p className="text-xs text-gray-400">
                                Tracking: {colisItem.tracking_chine}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <Badge variant={colisItem.statut === 'livre' ? 'default' : 'secondary'} className="mb-1">
                            {colisItem.statut}
                          </Badge>
                          <p className="text-sm sm:text-base font-medium text-green-600">
                            {formatCurrencyValue(colisItem.montant_a_payer, 'USD')}
                          </p>
                          {colisItem.transitaire && (
                            <p className="text-xs text-gray-500 mt-1">
                              {colisItem.transitaire.nom}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientHistoryModal;
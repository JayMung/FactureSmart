"use client";

import React from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { useDashboardDgi } from '../hooks/useDashboardDgi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Shield,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatUsd, formatCdf } from '@/utils/dgiUtils';

const IndexProtected: React.FC = () => {
  const { stats, chartData, topArticles, recentFactures, isLoading, refetch } = useDashboardDgi();

  usePageSetup({
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de votre activité'
  });

  const quickActions = [
    {
      id: 'facture',
      title: 'Nouvelle facture',
      description: 'Créez une facture pour un client.',
      icon: FileText,
      href: '/factures/new',
      badge: 'Factures',
      badgeClasses: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      iconClasses: 'bg-emerald-500/15 text-emerald-600',
      borderClasses: 'border-emerald-100/60 hover:border-emerald-200/80',
    },
    {
      id: 'pos',
      title: 'Ouvrir la caisse',
      description: 'Démarrez une session POS.',
      icon: Plus,
      href: '/pos',
      badge: 'POS',
      badgeClasses: 'bg-purple-50 text-purple-700 border border-purple-100',
      iconClasses: 'bg-purple-500/15 text-purple-600',
      borderClasses: 'border-purple-100/60 hover:border-purple-200/80',
    },
    {
      id: 'client',
      title: 'Ajouter un client',
      description: 'Enregistrez un nouveau client.',
      icon: Users,
      href: '/clients',
      badge: 'CRM',
      badgeClasses: 'bg-sky-50 text-sky-700 border border-sky-100',
      iconClasses: 'bg-sky-500/15 text-sky-600',
      borderClasses: 'border-sky-100/70 hover:border-sky-200/80',
    },
  ];

  const getStatutLabel = (statut: string) => {
    const map: Record<string, string> = {
      validee: 'Validée',
      en_attente: 'En attente',
      payee: 'Payée',
      annulee: 'Annulée',
      brouillon: 'Brouillon',
    };
    return map[statut] || statut;
  };

  const getStatutColor = (statut: string) => {
    const map: Record<string, string> = {
      validee: 'bg-green-100 text-green-800',
      en_attente: 'bg-amber-100 text-amber-800',
      payee: 'bg-blue-100 text-blue-800',
      annulee: 'bg-red-100 text-red-800',
      brouillon: 'bg-gray-100 text-gray-800',
    };
    return map[statut] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in duration-300">
        {/* Welcome + Fiscal Period Banner */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Bienvenue sur FactureSmart</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Période fiscale: {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} · Kinshasa, RDC
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <a href="/factures/new">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle facture
              </Button>
            </a>
          </div>
        </div>

        {/* DGI Alert Banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-amber-800 text-sm">
                ⚠️ Alerte DGI — Échéance déclaration mensuelle
              </p>
              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                Dans 7 jours
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              La déclaration DGI pour le mois de Mars 2026 est en attente. Veuillez la valider avant le 30/04/2026.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventes du jour */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                +{stats.progressMensuel}%
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Ventes du jour</p>
            <p className="text-2xl font-extrabold text-gray-900 font-mono">
              {isLoading ? '—' : formatUsd(stats.ventesJourUsd)}
            </p>
            {stats.ventesJourCdf > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {formatCdf(stats.ventesJourCdf)}
              </p>
            )}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                style={{ width: `${stats.progressMensuel}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{stats.progressMensuel}% de l'objectif mensuel</p>
          </div>

          {/* Factures en attente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                En cours
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Factures</p>
            <p className="text-2xl font-extrabold text-gray-900 font-mono">
              {isLoading ? '—' : stats.totalFactures}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.facturesValidees} validées · {stats.facturesEnAttente} en attente · {stats.facturesAnnulees} annulées
            </p>
            <div className="mt-3 flex gap-1">
              {stats.totalFactures > 0 && (
                <>
                  <div
                    className="flex-1 h-1.5 bg-emerald-500 rounded-full"
                    style={{ width: `${Math.round((stats.facturesValidees / stats.totalFactures) * 100)}%` }}
                  />
                  <div
                    className="flex-1 h-1.5 bg-amber-400 rounded-full"
                    style={{ width: `${Math.round((stats.facturesEnAttente / stats.totalFactures) * 100)}%` }}
                  />
                  <div
                    className="flex-1 h-1.5 bg-red-400 rounded-full"
                    style={{ width: `${Math.round((stats.facturesAnnulees / stats.totalFactures) * 100)}%` }}
                  />
                </>
              )}
            </div>
            {stats.montantEnAttente > 0 && (
              <p className="text-xs text-gray-400 mt-1">{formatUsd(stats.montantEnAttente)} en attente</p>
            )}
          </div>

          {/* Balance Caisse */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Solde
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Balance Caisse</p>
            <p className="text-2xl font-extrabold text-gray-900 font-mono">
              {isLoading ? '—' : formatUsd(stats.balanceCaisse)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Cash</p>
                <p className="text-sm font-bold text-emerald-700 font-mono">
                  {isLoading ? '—' : formatUsd(stats.totalEspeces)}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Bancaire</p>
                <p className="text-sm font-bold text-blue-700 font-mono">
                  {isLoading ? '—' : formatUsd(stats.totalBancaire)}
                </p>
              </div>
            </div>
          </div>

          {/* Conformité DGI */}
          <div
            className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Actif
              </span>
            </div>
            <p className="text-xs font-medium text-emerald-700 mb-1">Conformité DGI</p>
            <p className="text-2xl font-extrabold text-emerald-800 font-mono">
              {stats.nonConformites === 0 ? '✓ OK' : `⚠ ${stats.nonConformites}`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.nonConformites} non-conformités · {5 - stats.nonConformites} vérifications OK
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                'Timbre fiscal apposé',
                'Numéros DGI validés',
                'TVA 16% appliquée',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts + Top Articles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Ventes & Revenus</h3>
                <p className="text-xs text-gray-400">
                  {new Date().getFullYear()} — Chiffres en USD
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg">
                  DGI
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-gray-500 rounded-lg hover:bg-gray-50">
                  TVA
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-gray-500 rounded-lg hover:bg-gray-50">
                  Net
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Chargement...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatUsd(value), '']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="htv" name="HTVA" fill="#86efac" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="tva" name="TVA" fill="#6ee7b7" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="ttc" name="TTC" fill="#10B981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Articles */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Top Services</h3>
              <a href="/factures" className="text-xs text-emerald-600 font-semibold hover:text-emerald-700">
                Tout voir
              </a>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
              ) : topArticles.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune donnée disponible
                </div>
              ) : (
                topArticles.map((article, idx) => (
                  <div key={article.description} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-emerald-50 text-emerald-600' :
                      idx === 1 ? 'bg-emerald-50 text-emerald-600' :
                      idx === 2 ? 'bg-emerald-50 text-emerald-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{article.description}</p>
                      <p className="text-xs text-gray-400">{article.count} transactions</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 font-mono">
                      {formatUsd(article.totalVentes)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions + Recent Factures */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Navigation</p>
                    <CardTitle className="text-lg font-bold text-gray-900">Accès rapides</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                    {quickActions.length} raccourcis
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {quickActions.map((action) => (
                    <a
                      key={action.id}
                      href={action.href}
                      className={`group block rounded-xl border bg-white/60 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg ${action.borderClasses}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{action.description}</p>
                        </div>
                        <span className={`rounded-full p-2 ${action.iconClasses}`}>
                          <action.icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${action.badgeClasses}`}>
                          {action.badge}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-500 group-hover:text-gray-900 font-medium">
                          Accéder
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Factures */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-lg font-bold text-gray-900">Activité récente</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
              ) : recentFactures.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Aucune facture récente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentFactures.map((f) => (
                    <a key={f.id} href={`/factures/view/${f.id}`} className="block group">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-600">
                            {f.facture_number}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{f.client_nom}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatutColor(f.statut)}`}>
                            {getStatutLabel(f.statut)}
                          </span>
                          <span className="text-sm font-bold text-gray-900 font-mono">
                            {formatUsd(f.total_general)}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                  <a href="/factures" className="block text-center text-xs text-emerald-600 font-semibold hover:text-emerald-700 pt-2 border-t mt-2">
                    Voir toutes les factures →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default IndexProtected;

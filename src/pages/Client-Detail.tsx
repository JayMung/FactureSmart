"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { useClient } from '../hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  FilePlus,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface ClientFacture {
  id: string;
  facture_number: string;
  date_emission: string;
  total_general: number;
  devise: 'USD' | 'CDF';
  statut: string;
  montant_paye?: number;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  en_attente: { label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  validee: { label: 'Validée', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  payee: { label: 'Payée', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  annulee: { label: 'Annulée', className: 'bg-red-100 text-red-700 border-red-200' },
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { client, isLoading: loadingClient, error } = useClient(id || '');

  const [factures, setFactures] = useState<ClientFacture[]>([]);
  const [loadingFactures, setLoadingFactures] = useState(true);
  const [stats, setStats] = useState({
    totalFacture: 0,
    totalPaye: 0,
    totalEnAttente: 0,
    countTotal: 0,
    countPaye: 0,
    countEnAttente: 0,
    devise: 'CDF' as 'USD' | 'CDF',
  });

  usePageSetup({
    title: client?.nom || 'Fiche client',
    subtitle: 'Détails et historique de facturation',
  });

  useEffect(() => {
    if (!id) return;

    const fetchFactures = async () => {
      setLoadingFactures(true);
      try {
        const { data, error: facturesError } = await supabase
          .from('factures')
          .select('id, facture_number, date_emission, total_general, devise, statut, montant_paye')
          .eq('client_id', id)
          .order('date_emission', { ascending: false })
          .limit(10);

        if (facturesError) throw facturesError;

        const list = (data || []) as ClientFacture[];
        setFactures(list);

        // Compute stats
        const totalFacture = list.reduce((sum, f) => sum + (f.total_general || 0), 0);
        const totalPaye = list
          .filter((f) => f.statut === 'payee')
          .reduce((sum, f) => sum + (f.total_general || 0), 0);
        const totalEnAttente = list
          .filter((f) => f.statut === 'en_attente' || f.statut === 'validee')
          .reduce((sum, f) => sum + (f.total_general || 0), 0);
        const countPaye = list.filter((f) => f.statut === 'payee').length;
        const countEnAttente = list.filter(
          (f) => f.statut === 'en_attente' || f.statut === 'validee'
        ).length;
        const devise = (list[0]?.devise || 'CDF') as 'USD' | 'CDF';

        setStats({
          totalFacture,
          totalPaye,
          totalEnAttente,
          countTotal: list.length,
          countPaye,
          countEnAttente,
          devise,
        });
      } catch (err) {
        console.error('Error loading client factures:', err);
      } finally {
        setLoadingFactures(false);
      }
    };

    fetchFactures();
  }, [id]);

  if (loadingClient) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (error || !client) {
    return (
      <Layout>
        <Card className="max-w-2xl mx-auto mt-12 border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-900 mb-2">Client introuvable</h2>
            <p className="text-sm text-red-700 mb-4">
              {error || "Le client demandé n'existe pas ou a été supprimé."}
            </p>
            <Button onClick={() => navigate('/clients')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux clients
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const paidPercent = stats.totalFacture > 0
    ? Math.round((stats.totalPaye / stats.totalFacture) * 100)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/clients')}
              className="h-9 w-9 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.nom}</h1>
              <p className="text-xs text-gray-500">
                Client depuis{' '}
                {client.created_at
                  ? new Date(client.created_at).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/clients?edit=${client.id}`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
            <Button
              onClick={() => navigate(`/factures/new?client_id=${client.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <FilePlus className="h-4 w-4" />
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total facturé</p>
              <p className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(stats.totalFacture, stats.devise)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.countTotal} {stats.countTotal > 1 ? 'factures' : 'facture'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Payé</p>
              <p className="text-2xl font-extrabold text-emerald-700">
                {formatCurrency(stats.totalPaye, stats.devise)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {paidPercent}% — {stats.countPaye}{' '}
                {stats.countPaye > 1 ? 'factures' : 'facture'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">En attente</p>
              <p className="text-2xl font-extrabold text-amber-600">
                {formatCurrency(stats.totalEnAttente, stats.devise)}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {stats.countEnAttente}{' '}
                {stats.countEnAttente > 1 ? 'factures en attente' : 'facture en attente'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client info */}
        <Card className="border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              Informations client
            </h3>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <InfoRow
                  icon={<FileText className="h-3.5 w-3.5 text-gray-400" />}
                  label="NIF"
                  value={(client as any).nif || '—'}
                  mono
                />
                <InfoRow
                  icon={<FileText className="h-3.5 w-3.5 text-gray-400" />}
                  label="RCCM"
                  value={(client as any).rccm || '—'}
                  mono
                />
                <InfoRow
                  icon={<Mail className="h-3.5 w-3.5 text-gray-400" />}
                  label="Email"
                  value={(client as any).email || '—'}
                />
              </div>
              <div className="space-y-3">
                <InfoRow
                  icon={<Phone className="h-3.5 w-3.5 text-gray-400" />}
                  label="Téléphone"
                  value={client.telephone || '—'}
                />
                <InfoRow
                  icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />}
                  label="Ville / Adresse"
                  value={client.ville || '—'}
                />
                <InfoRow
                  icon={<Calendar className="h-3.5 w-3.5 text-gray-400" />}
                  label="Client depuis"
                  value={
                    client.created_at
                      ? new Date(client.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last invoices */}
        <Card className="border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Dernières factures
            </h3>
            <button
              onClick={() => navigate(`/factures?client_id=${client.id}`)}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Voir tout
            </button>
          </div>

          {loadingFactures ? (
            <div className="p-5 space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : factures.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Aucune facture pour ce client</p>
              <Button
                onClick={() => navigate(`/factures/new?client_id=${client.id}`)}
                className="bg-emerald-600 hover:bg-emerald-700 mt-4"
                size="sm"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Créer la première facture
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">Numéro</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-right px-5 py-3">Montant</th>
                  <th className="text-right px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {factures.map((f) => {
                  const config = STATUS_CONFIG[f.statut] || STATUS_CONFIG.brouillon;
                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/factures/view/${f.id}`)}
                    >
                      <td className="px-5 py-3 text-sm font-mono text-gray-900">
                        {f.facture_number}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {new Date(f.date_emission).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(f.total_general, f.devise)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={`${config.className} text-[10px] font-bold`}
                        >
                          {f.statut === 'payee' && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                          {(f.statut === 'en_attente' || f.statut === 'validee') && (
                            <Clock className="h-2.5 w-2.5 mr-1" />
                          )}
                          {config.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Layout>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-0.5">
      {icon}
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
    <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
  </div>
);

export default ClientDetail;

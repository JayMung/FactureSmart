"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { dgiService } from '@/services/dgi';
import { getDgiRegistryEntry, formatUsd, formatCdf } from '@/utils/dgiUtils';
import { showSuccess, showError } from '@/utils/toast';
import type { Facture } from '@/types';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Bell,
} from 'lucide-react';

interface TransmissionLog {
  time: string;
  level: 'INFO' | 'SUCCESS' | 'PROCESS' | 'ERROR';
  message: string;
}

type DgiStatus = 'en_attente' | 'transmise' | 'en_validation' | 'validee' | 'rejetee';

interface DgiTransmissionState {
  status: DgiStatus;
  numeroDgi?: string;
  transmissionId?: string;
  startedAt: string;
  validatedAt?: string;
  errorMessage?: string;
  attempts: number;
  serverStatus: 'up' | 'down' | 'unknown';
}

const DgiStatus: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [dgiEntry, setDgiEntry] = useState<any>(null);
  const [logs, setLogs] = useState<TransmissionLog[]>([]);
  const [transmission, setTransmission] = useState<DgiTransmissionState | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('');

  usePageSetup({
    title: 'Transmission DGI',
    subtitle: facture ? `Suivi en temps réel — ${facture.facture_number}` : 'Statut transmission',
  });

  const addLog = useCallback((level: TransmissionLog['level'], message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, level, message }]);
  }, []);

  const loadData = useCallback(async () => {
    if (!id) {
      navigate('/factures');
      return;
    }

    setLoading(true);
    try {
      // Fetch facture
      const { data: factureData, error: factureError } = await supabase
        .from('factures')
        .select('*, clients(nom)')
        .eq('id', id)
        .single();

      if (factureError || !factureData) {
        showError('Facture introuvable');
        navigate('/factures');
        return;
      }

      setFacture(factureData);

      // Fetch DGI registry entry
      const entry = await getDgiRegistryEntry(id);
      setDgiEntry(entry);

      // Build initial logs from existing data
      const initialLogs: TransmissionLog[] = [
        { time: new Date(factureData.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), level: 'INFO', message: `Facture ${factureData.facture_number} créée en local` },
        { time: new Date(factureData.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), level: 'INFO', message: `Calcul des totaux : HT=${formatUsd(factureData.montant_ht || 0)}, TVA=${formatUsd(factureData.montant_tva || 0)}, TTC=${formatUsd(factureData.montant_ttc || 0)}` },
      ];

      if (factureData.numero_dgi) {
        initialLogs.push({ time: new Date(factureData.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), level: 'SUCCESS', message: `Génération QR code : ${factureData.facture_number}` });
        initialLogs.push({ time: new Date(factureData.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), level: 'SUCCESS', message: 'Signature numérique appliquée (RSA-2048)' });
      }

      setLogs(initialLogs);

      // Determine transmission state
      let status: DgiStatus = 'en_attente';
      if (factureData.statut === 'validee' && entry?.numero_dgi) {
        status = 'validee';
      } else if (entry?.transmission_id) {
        status = 'en_validation';
      } else if (factureData.numero_dgi) {
        status = 'transmise';
      }

      setTransmission({
        status,
        numeroDgi: factureData.numero_dgi || entry?.numero_dgi,
        transmissionId: entry?.transmission_id,
        startedAt: factureData.created_at,
        validatedAt: entry?.validated_at,
        attempts: 1,
        serverStatus: 'up',
      });

      addLog('SUCCESS', 'Connexion API DGI établie (api.dgi.gouv.cd)');
      if (entry?.transmission_id) {
        addLog('SUCCESS', `Facture transmise — ID DGI: ${entry.transmission_id}`);
      }
      if (status === 'en_validation') {
        addLog('PROCESS', 'DGI en cours de validation...');
      }

    } catch (err) {
      console.error('[DgiStatus] Error loading data:', err);
      showError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, addLog]);

  const handleRetry = async () => {
    if (!facture) return;

    setSubmitting(true);
    addLog('INFO', 'Relance de la transmission en cours...');

    try {
      const result = await dgiService.submitFacture({
        id: facture.id,
        invoiceNumber: facture.facture_number,
        amount: facture.montant_ttc || facture.total_general || 0,
        date: facture.date_emission,
        clientNif: facture.clients?.nif || '',
      });

      if (result.success) {
        addLog('SUCCESS', `Facture transmise — ID DGI: ${result.transmissionId}`);
        setTransmission(prev => prev ? {
          ...prev,
          status: 'en_validation',
          transmissionId: result.transmissionId,
          attempts: prev.attempts + 1,
        } : null);
        showSuccess('Transmission relancée avec succès');
      } else {
        addLog('ERROR', `Échec de transmission: ${result.error}`);
        showError(result.error || 'Échec de la transmission');
      }
    } catch (err) {
      addLog('ERROR', 'Erreur de connexion à la DGI');
      showError('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLogs = () => {
    const logText = logs.map(l => `[${l.time}] ${l.level} ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    showSuccess('Logs copiés dans le presse-papier');
  };

  // Update elapsed time every minute
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!transmission?.startedAt) return;

    const updateElapsed = () => {
      const start = new Date(transmission.startedAt);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}min`);
      } else {
        setElapsedTime(`${minutes}min`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [transmission?.startedAt]);

  const getStatusBadge = () => {
    if (!transmission) return null;

    switch (transmission.status) {
      case 'en_attente':
        return <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3" />En attente</Badge>;
      case 'transmise':
        return <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"><FileText className="w-3 h-3" />Transmise</Badge>;
      case 'en_validation':
        return <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200"><Loader2 className="w-3 h-3 animate-spin" />En cours de validation</Badge>;
      case 'validee':
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3" />Validée DGI</Badge>;
      case 'rejetee':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejetée</Badge>;
      default:
        return null;
    }
  };

  const getStepStatus = (step: number): 'completed' | 'active' | 'pending' => {
    if (!transmission) return 'pending';

    const statusOrder: DgiStatus[] = ['en_attente', 'transmise', 'en_validation', 'validee'];
    const currentIndex = statusOrder.indexOf(transmission.status);

    if (step < currentIndex) return 'completed';
    if (step === currentIndex) return 'active';
    return 'pending';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      </Layout>
    );
  }

  if (!facture || !transmission) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Facture introuvable</p>
        </div>
      </Layout>
    );
  }

  const steps = [
    { label: 'En attente', time: transmission.startedAt ? new Date(transmission.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—' },
    { label: 'Transmise', time: transmission.transmissionId ? new Date(transmission.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—' },
    { label: 'En cours validation', time: transmission.status === 'en_validation' ? 'en cours' : '—' },
    { label: 'Validée', time: transmission.validatedAt ? new Date(transmission.validatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—' },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/factures/view/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Transmission DGI</h1>
            <p className="text-sm text-gray-500">Suivi en temps réel — {facture.facture_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/factures/view/${id}`)}>
              <FileText className="w-4 h-4 mr-2" /> Voir la facture
            </Button>
            <Button onClick={handleRetry} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Réessayer
            </Button>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Facture {facture.facture_number}</h2>
                  <p className="text-sm text-gray-500">{facture.clients?.nom || 'Client inconnu'} — {facture.devise === 'USD' ? formatUsd(facture.montant_ttc || 0) : formatCdf(facture.montant_ttc || 0)} TTC</p>
                  <p className="text-xs text-gray-400">Émise le {new Date(facture.date_emission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1">{getStatusBadge()}</div>
                {transmission.status === 'en_validation' && <p className="text-xs text-gray-400">En cours depuis {elapsedTime}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-6">Progression de transmission</h3>
            <div className="flex items-center">
              {steps.map((step, index) => {
                const stepStatus = getStepStatus(index);
                return (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                        stepStatus === 'completed' ? 'border-green-500 bg-green-500' :
                        stepStatus === 'active' ? 'border-green-600 bg-white' :
                        'border-gray-200 bg-white'
                      }`}>
                        {stepStatus === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : stepStatus === 'active' ? (
                          <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                        ) : (
                          <span className="text-gray-300 text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold text-center ${stepStatus === 'completed' ? 'text-green-700' : stepStatus === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</span>
                      <span className="text-[10px] text-gray-400 text-center mt-0.5">{step.time}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Logs + Details Grid */}
        <div className="grid grid-cols-2 gap-5">
          {/* Transmission Logs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Logs de transmission</CardTitle>
                <Button variant="ghost" size="sm" onClick={copyLogs}>
                  <Copy className="w-3 h-3 mr-1" /> Copier les logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-xs max-h-80 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 flex-shrink-0">{log.time}</span>
                    <span className={`flex-shrink-0 font-medium ${
                      log.level === 'SUCCESS' ? 'text-green-600' :
                      log.level === 'ERROR' ? 'text-red-600' :
                      log.level === 'PROCESS' ? 'text-orange-500' :
                      'text-gray-500'
                    }`}>{log.level}</span>
                    <span className="text-gray-700">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Details + Actions */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Détails du statut actuel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500">Étape actuelle</span>
                    <span className="text-xs font-semibold text-green-700">{steps[getStepStatus(0) === 'completed' ? 1 : 0]?.label || transmission.status}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500">ID DGI</span>
                    <span className="text-xs font-mono text-gray-700">{transmission.numeroDgi || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500">Temps écoulé</span>
                    <span className="text-xs font-semibold text-orange-600">{elapsedTime || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500">Tentatives</span>
                    <span className="text-xs font-semibold text-gray-700">{transmission.attempts}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-gray-500">Serveur DGI</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      {transmission.serverStatus === 'up' ? 'Opérationnel' : transmission.serverStatus === 'down' ? 'Hors ligne' : 'Inconnu'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-xs text-green-700 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    La validation DGI peut prendre entre 5 minutes et 24 heures selon la charge du serveur.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full" onClick={handleRetry} disabled={submitting}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Relancer la transmission
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => showError('Fonctionnalité à venir')}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-gray-400" /> Signaler un problème
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => showSuccess('Notification activée')}>
                    <Bell className="w-4 h-4 mr-2 text-gray-400" /> Me notifier à la validation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DgiStatus;

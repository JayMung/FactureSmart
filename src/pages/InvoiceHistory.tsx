"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  ArrowLeft,
  Clock,
  Edit,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  History,
  User,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { showSuccess, showError } from '@/utils/toast';

interface HistoryEntry {
  id: string;
  action: string;
  changes: any;
  changed_by: string | null;
  created_at: string;
  profile?: { first_name?: string; last_name?: string; email?: string };
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  created: { label: 'Creation', icon: <Plus className="h-4 w-4" />, color: 'text-green-600 bg-green-50 border-green-200' },
  updated: { label: 'Modification', icon: <Edit className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  deleted: { label: 'Suppression', icon: <Trash2 className="h-4 w-4" />, color: 'text-red-600 bg-red-50 border-red-200' },
  status_changed: { label: 'Changement de statut', icon: <RefreshCw className="h-4 w-4" />, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  sent: { label: 'Envoyee', icon: <Send className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  viewed: { label: 'Vue', icon: <FileText className="h-4 w-4" />, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const InvoiceHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [factureInfo, setFactureInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  usePageSetup({
    title: `Historique - ${id?.slice(0, 8)}...`,
    subtitle: 'Timeline des modifications de la facture',
  });

  useEffect(() => {
    if (!id) { navigate('/factures'); return; }
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load facture info
      const { data: facture } = await supabase
        .from('factures')
        .select('facture_number, type, statut, date_emission')
        .eq('id', id)
        .single();
      setFactureInfo(facture);

      // Load history — try invoice_history first, then fall back to activity_logs
      let historyData: HistoryEntry[] = [];

      const { data: invHistory } = await supabase
        .from('invoice_history')
        .select('*, profile:profiles(first_name, last_name, email)')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (invHistory && invHistory.length > 0) {
        historyData = invHistory as HistoryEntry[];
      } else {
        // Fall back to activity logs for this invoice
        const { data: activityData } = await supabase
          .from('activity_logs')
          .select('*, profile:profiles(first_name, last_name, email)')
          .ilike('entity_type', '%facture%')
          .eq('entity_id', id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (activityData) {
          historyData = activityData.map((a: any) => ({
            id: a.id,
            action: a.action || 'updated',
            changes: a.metadata || a.changes,
            changed_by: a.user_id,
            created_at: a.created_at,
            profile: a.profile,
          }));
        }
      }

      setHistory(historyData);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action: string) => {
    const key = Object.keys(ACTION_CONFIG).find(k => action?.toLowerCase().includes(k.toLowerCase()));
    return key ? ACTION_CONFIG[key] : ACTION_CONFIG.updated;
  };

  const formatChanges = (changes: any) => {
    if (!changes) return null;
    if (typeof changes === 'string') return changes;
    if (typeof changes === 'object') {
      const entries = Object.entries(changes);
      if (entries.length === 0) return null;
      return entries.map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="text-gray-500 capitalize">{key}:</span>{' '}
          <span className="font-medium">{String(value)}</span>
        </div>
      ));
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/factures/view/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
              <p className="text-sm text-gray-500 mt-1">
                {factureInfo ? `${factureInfo.type === 'devis' ? 'Devis' : 'Facture'} ${factureInfo.facture_number}` : id?.slice(0, 8)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Timeline des modifications ({history.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <History className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-lg font-medium">Aucun historique</p>
                <p className="text-sm mt-1">Les modifications apparaitront ici</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />

                <div className="space-y-4">
                  {history.map((entry, idx) => {
                    const actionCfg = getActionConfig(entry.action);
                    return (
                      <div key={entry.id || idx} className="relative flex items-start gap-4 pl-14">
                        {/* Icon */}
                        <div className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center border ${actionCfg.color}`}>
                          {actionCfg.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{actionCfg.label}</span>
                              {entry.profile && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.profile.first_name || entry.profile.email || 'Utilisateur'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              {entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: fr }) : ''}
                            </span>
                          </div>

                          {entry.changes && (
                            <div className="mt-2 space-y-1">
                              {formatChanges(entry.changes)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InvoiceHistory;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FactureHistoryEntry {
  id: string;
  facture_id: string;
  changed_by: string | null;
  changed_at: string;
  change_type: 'create' | 'update' | 'status_change' | 'delete';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined data
  changer_name?: string;
}

interface UseFactureHistoryResult {
  history: FactureHistoryEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addHistoryEntry: (entry: Omit<FactureHistoryEntry, 'id' | 'created_at'>) => Promise<void>;
}

export const useFactureHistory = (factureId: string | undefined): UseFactureHistoryResult => {
  const [history, setHistory] = useState<FactureHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!factureId) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('facture_history')
        .select(`
          *,
          profiles:changed_by (first_name, last_name)
        `)
        .eq('facture_id', factureId)
        .order('changed_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to include changer_name
      const transformedData: FactureHistoryEntry[] = (data || []).map((entry: any) => ({
        ...entry,
        changer_name: entry.profiles
          ? `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim()
          : 'Système',
      }));

      setHistory(transformedData);
    } catch (err: any) {
      console.error('Error fetching facture history:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  }, [factureId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addHistoryEntry = useCallback(async (
    entry: Omit<FactureHistoryEntry, 'id' | 'created_at'>
  ) => {
    if (!factureId) return;

    try {
      const { error: insertError } = await supabase
        .from('facture_history')
        .insert({
          facture_id: entry.facture_id || factureId,
          changed_by: entry.changed_by,
          change_type: entry.change_type,
          field_changed: entry.field_changed,
          old_value: entry.old_value,
          new_value: entry.new_value,
          metadata: entry.metadata || {},
        });

      if (insertError) {
        throw insertError;
      }

      // Refetch to get updated history
      await fetchHistory();
    } catch (err: any) {
      console.error('Error adding history entry:', err);
      // Don't throw - history tracking shouldn't break the main flow
    }
  }, [factureId, fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
    addHistoryEntry,
  };
};

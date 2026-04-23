// Hook for managing Fournisseurs (suppliers) stored as settings
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase';
import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from '@/types';

const SETTINGS_KEY = 'fournisseurs';

export interface Fournisseur {
  id?: string;
  nom: string;
  telephone?: string;
  ville?: string;
  created_at?: string;
}

interface UseFournisseursResult {
  fournisseurs: string[];
  isLoading: boolean;
  error: Error | null;
}

async function fetchFournisseurs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('settings')
    .select('valeur')
    .eq('cle', SETTINGS_KEY)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data?.valeur) return [];
  return (data.valeur as string).split(',').map((f: string) => f.trim()).filter(Boolean);
}

async function saveFournisseurs(fournisseurs: string[]): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({
      cle: SETTINGS_KEY,
      valeur: fournisseurs.join(','),
      description: 'Liste des fournisseurs disponibles pour les colis',
    }, { onConflict: 'cle' });

  if (error) throw error;
}

export function useFournisseurs(): UseFournisseursResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: fetchFournisseurs,
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (nom: string) => {
      const current = query.data || [];
      if (current.includes(nom.trim())) {
        throw new Error('Ce fournisseur existe déjà');
      }
      await saveFournisseurs([...current, nom.trim()]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (nom: string) => {
      const current = query.data || [];
      await saveFournisseurs(current.filter((f) => f !== nom));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
    },
  });

  return {
    fournisseurs: query.data || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

export { fetchFournisseurs, saveFournisseurs };

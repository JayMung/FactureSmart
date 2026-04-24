import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Article } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

const DEFAULT_PAGE_SIZE = 50;

export const useArticles = (page: number = 1, search?: string) => {
  const queryClient = useQueryClient();

  const fetchArticles = useCallback(async () => {
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .order('denomination', { ascending: true })
      .range((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE - 1);

    if (search && search.trim()) {
      query = query.or(`denomination.ilike.%${search}%,code_barres.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data as Article[], count: count || 0 };
  }, [page, search]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['articles', page, search],
    queryFn: fetchArticles,
    staleTime: 1000 * 60 * 2,
  });

  const createMutation = useMutation({
    mutationFn: async (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from('articles')
        .insert({ ...article, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return result as Article;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      showSuccess('Article créé avec succès');
    },
    onError: (err: any) => {
      showError(err.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updates }: { id: string; data: Partial<Article> }) => {
      const { data: result, error } = await supabase
        .from('articles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result as Article;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      showSuccess('Article mis à jour');
    },
    onError: (err: any) => {
      showError(err.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      showSuccess('Article supprimé');
    },
    onError: (err: any) => {
      showError(err.message || 'Erreur lors de la suppression');
    },
  });

  return {
    articles: data?.data || [],
    totalCount: data?.count || 0,
    isLoading,
    error: error?.message || null,
    refetch,
    createArticle: createMutation.mutate,
    updateArticle: updateMutation.mutate,
    deleteArticle: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook for all articles (no pagination) — used by POS combobox
export const useAllArticles = (search?: string) => {
  return useQuery({
    queryKey: ['articles', 'all', search],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('*')
        .order('denomination', { ascending: true });

      if (search && search.trim()) {
        query = query.or(`denomination.ilike.%${search}%,code_barres.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Article[];
    },
    staleTime: 1000 * 60 * 2,
  });
};

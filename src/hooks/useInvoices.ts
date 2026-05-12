/**
 * useInvoices — React Query hooks for DGI-compliant invoice management
 *
 * Hooks:
 *   useInvoicesList(filters?)          — Liste paginée
 *   useInvoice(id)                     — Détail facture
 *   useCreateInvoice()                 — Créer facture
 *   useUpdateInvoice()                 — Mettre à jour
 *   useTransitionInvoice()             — Changer statut
 *   useSubmitToDGI()                   — Envoyer à la DGI
 *   useCancelInvoice()                 — Annuler
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  Invoice,
  InvoiceStatus,
  CreateInvoiceData,
  InvoiceFilters,
  InvoiceItem,
} from '@/types';
import {
  createInvoice,
  updateInvoice,
  transitionInvoice,
  submitToDGI,
  cancelInvoice,
  getInvoice,
  listInvoices,
  getCompanies,
} from '@/services/invoice-service';

// ==========================================================================
// QUERIES
// ==========================================================================

/** Liste des sociétés */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
    staleTime: 30 * 60 * 1000, // 30 min
  });
}

/** Liste des factures */
export function useInvoicesList(
  filters?: InvoiceFilters,
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: ['invoices', { filters, page, pageSize }],
    queryFn: () => listInvoices(filters, page, pageSize),
    staleTime: 30 * 1000,
  });
}

/** Détail d'une facture */
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => (id ? getInvoice(id) : null),
    enabled: !!id,
    staleTime: 10 * 1000,
  });
}

// ==========================================================================
// MUTATIONS
// ==========================================================================

/** Créer une facture */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceData) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

/** Mettre à jour une facture */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceData> }) =>
      updateInvoice(id, data),
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoice', result.id] });
      }
    },
  });
}

/** Transition de statut (cycle de vie) */
export function useTransitionInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      transitionInvoice(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
}

/** Soumettre à la DGI */
export function useSubmitToDGI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => submitToDGI(invoiceId),
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
}

/** Annuler une facture */
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelInvoice(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
}

// ==========================================================================
// UTILITAIRES DGI
// ==========================================================================

/** Vérifie si un statut est terminal */
export function isTerminalStatus(status: InvoiceStatus): boolean {
  return ['archivee', 'annulee'].includes(status);
}

/** Récupère les transitions disponibles */
export function getAvailableTransitions(status: InvoiceStatus): InvoiceStatus[] {
  const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    brouillon:    ['validee'],
    validee:      ['envoyee_dgi'],
    envoyee_dgi:  [],
    acceptee_dgi: ['archivee'],
    rejetee_dgi:  ['envoyee_dgi'],
    archivee:     [],
    annulee:      [],
  };
  return transitions[status] || [];
}

/** Récupère les items d'une facture */
export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const { data } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  return (data || []) as InvoiceItem[];
}

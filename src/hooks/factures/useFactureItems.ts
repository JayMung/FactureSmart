import { useState, useCallback } from 'react';
import type { FactureItem } from '@/types';

interface ItemDisplayValues {
  [tempId: string]: {
    poids?: string;
    prix_unitaire?: string;
  };
}

export function useFactureItems(initialItems: FactureItem[] = []) {
  const [items, setItems] = useState<FactureItem[]>(initialItems);
  const [itemDisplayValues, setItemDisplayValues] = useState<ItemDisplayValues>({});

  const addItem = useCallback(() => {
    const newItem: FactureItem = {
      tempId: Date.now().toString(),
      numero_ligne: 1,
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0,
    };
    const newItems = [newItem, ...items];
    const reindexed = newItems.map((it, idx) => ({ ...it, numero_ligne: idx + 1 }));
    setItems(reindexed);
  }, [items]);

  const updateItem = useCallback((tempId: string, field: keyof FactureItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;

      let sanitizedValue = value;
      if (field === 'image_url' || field === 'product_url') {
        sanitizedValue = sanitizeUrl(value);
      }

      const updated = { ...item, [field]: sanitizedValue };

      if (field === 'quantite' || field === 'prix_unitaire') {
        updated.montant_total = updated.quantite * updated.prix_unitaire;
      }

      return updated;
    }));
  }, []);

  const removeItem = useCallback((tempId: string) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.tempId !== tempId);
      return filtered.map((it, idx) => ({ ...it, numero_ligne: idx + 1 }));
    });
  }, []);

  const updateDisplayValue = useCallback((tempId: string, field: 'poids' | 'prix_unitaire', value: string) => {
    setItemDisplayValues(prev => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        [field]: value,
      },
    }));
  }, []);

  const getDisplayValue = useCallback((tempId: string, field: 'poids' | 'prix_unitaire', actualValue: number): string => {
    return itemDisplayValues[tempId]?.[field] || (actualValue === 0 ? '' : actualValue.toString());
  }, [itemDisplayValues]);

  const resetItems = useCallback((newItems: FactureItem[]) => {
    setItems(newItems);
    setItemDisplayValues({});
  }, []);

  const reindex = useCallback(() => {
    setItems(prev => prev.map((it, idx) => ({ ...it, numero_ligne: idx + 1 })));
  }, []);

  return {
    items,
    setItems,
    addItem,
    updateItem,
    removeItem,
    updateDisplayValue,
    getDisplayValue,
    resetItems,
    reindex,
    itemDisplayValues,
  };
}

function sanitizeUrl(url: string): string {
  // Basic URL sanitization check
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

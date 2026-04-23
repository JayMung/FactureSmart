"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Printer, User, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import type { Client } from '@/types';

interface CartItem {
  id: string;
  description: string;
  prix_unitaire: number;
  quantite: number;
  montant_total: number;
}

interface POSCart {
  client: Client | null;
  items: CartItem[];
  mode_paiement: 'cash' | 'card';
  montant_recu: number;
}

const TVA_RATES: Record<string, number> = {
  'A': 0,
  'B': 0.16,
  'C': 0,
};

export default function POSCaisse() {
  const [cart, setCart] = useState<POSCart>({
    client: null,
    items: [],
    mode_paiement: 'cash',
    montant_recu: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastFacture, setLastFacture] = useState<{number: string; total: number} | null>(null);
  const [printMode, setPrintMode] = useState<'none' | 'preview'>('none');
  const [clients, setClients] = useState<Client[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, telephone, ville, nif, type')
        .order('nom', { ascending: true });
      if (!error && data) {
        setClients(data);
      }
    };
    loadClients();
  }, []);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setPrintMode('none');
        setLastFacture(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addItem = useCallback((description: string, prix: number) => {
    setCart(prev => {
      const existing = prev.items.find(
        i => i.description.toLowerCase() === description.toLowerCase() && i.prix_unitaire === prix
      );
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.id === existing.id ? { ...i, quantite: i.quantite + 1, montant_total: (i.quantite + 1) * i.prix_unitaire } : i
          ),
        };
      }
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        description,
        prix_unitaire: prix,
        quantite: 1,
        montant_total: prix,
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => ({
      ...prev,
      items: prev.items
        .map(i => {
          if (i.id !== id) return i;
          const newQty = i.quantite + delta;
          if (newQty <= 0) return null;
          return { ...i, quantite: newQty, montant_total: newQty * i.prix_unitaire };
        })
        .filter(Boolean) as CartItem[],
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const subtotal = cart.items.reduce((sum, i) => sum + i.montant_total, 0);
  const change = cart.montant_recu - subtotal;

  const handleQuickAdd = () => {
    // Parse "nom|prix" or just treat as description
    const parts = searchQuery.split('|').map(s => s.trim());
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      addItem(parts[0], Number(parts[1]));
    } else if (searchQuery.trim()) {
      // Try to parse "description prix" at end
      const match = searchQuery.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);
      if (match) {
        addItem(match[1].trim(), Number(match[2].replace(',', '.')));
      } else {
        addItem(searchQuery.trim(), 0);
      }
    }
  };

  const processPayment = async () => {
    if (cart.items.length === 0) {
      showError('Ajoutez au moins un article');
      return;
    }
    if (cart.mode_paiement === 'cash' && cart.montant_recu < subtotal) {
      showError('Montant reçu insuffisant');
      return;
    }
    if (cart.mode_paiement === 'card' && change < 0) {
      showError('Pour la carte, montant exact requis');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Generate invoice number
      const year = new Date().getFullYear();
      const { data: countData } = await supabase
        .from('factures')
        .select('id', { count: 'exact', head: true })
        .like('facture_number', `FV-${year}-%`);
      const seqNum = ((countData?.count ?? 0) + 1).toString().padStart(4, '0');
      const factureNumber = `FV-${year}-${seqNum}`;

      // Create facture
      const { data: facture, error: factureError } = await supabase
        .from('factures')
        .insert({
          facture_number: factureNumber,
          type: 'facture',
          statut: 'validee',
          client_id: cart.client?.id || '00000000-0000-0000-0000-000000000000',
          mode_livraison: 'aerien',
          devise: 'USD',
          subtotal: subtotal,
          frais: 0,
          total_general: subtotal,
          date_emission: new Date().toISOString(),
          date_validation: new Date().toISOString(),
          valide_par: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (factureError) throw factureError;

      // Create facture items
      const itemsToInsert = cart.items.map((item, idx) => ({
        facture_id: facture.id,
        numero_ligne: idx + 1,
        description: item.description,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        montant_total: item.montant_total,
        poids: 0,
      }));

      const { error: itemsError } = await supabase.from('facture_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      setLastFacture({ number: factureNumber, total: subtotal });
      setPrintMode('preview');
      showSuccess(`Facture ${factureNumber} créée ✓`);
      
      // Reset cart
      setCart({ client: null, items: [], mode_paiement: 'cash', montant_recu: 0 });
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la création');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;
    const WinPrint = window.open('', '', 'width=300,height=600');
    if (!WinPrint) {
      showError('Autorisez les popups pour imprimer');
      return;
    }
    WinPrint.document.write(`
      <html>
      <head>
        <title>Ticket ${lastFacture?.number}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0; padding: 5px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .row { display: flex; justify-content: space-between; }
          .line { border-top: 1px dashed #000; margin: 3px 0; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    WinPrint.document.close();
    WinPrint.focus();
    setTimeout(() => { WinPrint.print(); WinPrint.close(); }, 250);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT: Product Search + Cart */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🖥️ Caisse POS</h1>
            <p className="text-xs text-gray-500">Appuyez sur F2 pour rechercher — Escape pour effacer</p>
          </div>
          <div className="flex items-center gap-3">
            <ClientCombobox
              clients={clients}
              value={cart.client?.id || ''}
              onValueChange={(clientId) => {
                const selected = clients.find(c => c.id === clientId) || null;
                setCart(prev => ({ ...prev, client: selected }));
              }}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Nom article | prix  OU  scanner code-barres..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleQuickAdd();
                  if (e.key === 'Tab') { e.preventDefault(); handleQuickAdd(); }
                }}
                className="pl-10 text-base h-12"
              />
            </div>
            <Button onClick={handleQuickAdd} size="lg" className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-5 w-5 mr-1" /> Ajouter
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Format: <span className="font-mono">Description | Prix</span> — ex: <span className="font-mono">Café | 3.50</span>
          </p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-6">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Panier vide</p>
              <p className="text-sm">Recherchez et ajoutez des articles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-500">
                          {item.prix_unitaire.toFixed(2)} $ × {item.quantite}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQty(item.id, -1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-medium">{item.quantite}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQty(item.id, 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="font-bold text-emerald-700 w-24 text-right">
                          {item.montant_total.toFixed(2)} $
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary Footer */}
        <div className="bg-white border-t px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              {cart.client ? (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{cart.client.nom}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Client anonyme</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Sous-total</p>
              <p className="text-2xl font-bold text-gray-900">{subtotal.toFixed(2)} $</p>
            </div>
          </div>

          {/* Payment Type */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              variant={cart.mode_paiement === 'cash' ? 'default' : 'outline'}
              onClick={() => setCart(prev => ({ ...prev, mode_paiement: 'cash' }))}
              className={`h-12 ${cart.mode_paiement === 'cash' ? 'bg-emerald-600' : ''}`}
            >
              <Banknote className="h-5 w-5 mr-2" /> Espèces
            </Button>
            <Button
              variant={cart.mode_paiement === 'card' ? 'default' : 'outline'}
              onClick={() => setCart(prev => ({ ...prev, mode_paiement: 'card', montant_recu: subtotal }))}
              className={`h-12 ${cart.mode_paiement === 'card' ? 'bg-emerald-600' : ''}`}
            >
              <CreditCard className="h-5 w-5 mr-2" /> Carte
            </Button>
          </div>

          {/* Cash: amount received */}
          {cart.mode_paiement === 'cash' && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Montant reçu</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={cart.montant_recu || ''}
                  onChange={e => setCart(prev => ({ ...prev, montant_recu: Number(e.target.value) }))}
                  className="h-12 text-lg font-medium"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Rendu</label>
                <div className={`h-12 flex items-center px-4 border rounded-lg text-lg font-bold ${
                  change >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                }`}>
                  {change >= 0 ? change.toFixed(2) + ' $' : 'Insuffisant'}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={processPayment}
            disabled={cart.items.length === 0 || isProcessing}
            className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700"
          >
            {isProcessing ? (
              <span>Traitement...</span>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Payer {subtotal.toFixed(2)} $
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT: Receipt Preview */}
      <div className="w-80 bg-gray-100 border-l p-4 overflow-auto">
        <div className="mb-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <Printer className="h-4 w-4" /> Aperçu Ticket
          </h2>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm" ref={receiptRef}>
          {lastFacture ? (
            <ReceiptContent factureNumber={lastFacture.number} items={cart.items} subtotal={subtotal} change={change} client={cart.client} />
          ) : (
            <div className="text-center text-gray-400 py-8 text-sm italic">
              Le ticket apparaîtra ici après le paiement
            </div>
          )}
        </div>
        {lastFacture && (
          <Button onClick={printReceipt} className="w-full mt-3 bg-gray-800 hover:bg-gray-900">
            <Printer className="h-4 w-4 mr-2" /> Imprimer Ticket
          </Button>
        )}
      </div>

      {/* Receipt Preview Modal */}
      {printMode === 'preview' && lastFacture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">✓ Paiement réussi</h3>
              <button onClick={() => { setPrintMode('none'); setLastFacture(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-2">Facture <strong>{lastFacture.number}</strong></p>
            <p className="text-2xl font-bold text-emerald-600 mb-4">{lastFacture.total.toFixed(2)} $</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <p className="text-emerald-800 text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4" /> Transaction enregistrée
              </p>
            </div>
            <Button onClick={() => { printReceipt(); setPrintMode('none'); setLastFacture(null); }} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Printer className="h-4 w-4 mr-2" /> Imprimer Ticket
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptContent({ factureNumber, items, subtotal, change, client }: {
  factureNumber: string;
  items: CartItem[];
  subtotal: number;
  change: number;
  client: Client | null;
}) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '11px', width: '72mm' }}>
      <div className="center bold">🧾 FACTURE {factureNumber}</div>
      <div className="center">共和 POS</div>
      <div className="center">Kinshasa, RDC</div>
      <div className="line" />
      <div className="row">
        <span>Date:</span><span>{new Date().toLocaleDateString('fr-FR')}</span>
      </div>
      {client && (
        <div className="row">
          <span>Client:</span><span>{client.nom}</span>
        </div>
      )}
      <div className="line" />
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: '3px' }}>
          <div>{item.description}</div>
          <div className="row">
            <span>{item.prix_unitaire.toFixed(2)} × {item.quantite}</span>
            <span>{item.montant_total.toFixed(2)}</span>
          </div>
        </div>
      ))}
      <div className="line" />
      <div className="row bold">
        <span>TOTAL:</span><span>{subtotal.toFixed(2)} $</span>
      </div>
      {change > 0 && (
        <div className="row">
          <span>Rendu:</span><span>{change.toFixed(2)} $</span>
        </div>
      )}
      <div className="line" />
      <div className="center" style={{ fontSize: '9px' }}>
        Merci de votre achat !<br />
        Garantie conforme à la loi
      </div>
    </div>
  );
}

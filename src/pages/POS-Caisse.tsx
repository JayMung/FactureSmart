"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Printer, User, X, Check,
  Wifi, WifiOff, RefreshCw, Lock, Unlock,
  List, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { ArticleSelect } from '@/components/articles/ArticleSelect';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useCaisseRealtimeStatus } from '@/hooks/useCaisseRealtimeStatus';
import type { Client } from '@/types';

// ============================================================
// Types
// ============================================================
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

// ============================================================
// Main Component
// ============================================================
export default function POSCaisse() {
  // --- Realtime session + tickets ---
  const {
    hasActiveSession,
    isFullyConnected,
    sessionConnected,
    ticketsConnected,
    session,
    tickets,
    lastTicket,
    sessionLoading,
    error,
    openSession,
    closeSession,
    updateTotals,
  } = useCaisseRealtimeStatus();

  // --- Local state ---
  const [cart, setCart] = useState<POSCart>({
    client: null,
    items: [],
    mode_paiement: 'cash',
    montant_recu: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastFacture, setLastFacture] = useState<{ number: string; total: number } | null>(null);
  const [printMode, setPrintMode] = useState<'none' | 'preview'>('none');
  const [clients, setClients] = useState<Client[]>([]);
  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const [fondInitial, setFondInitial] = useState(0);
  const [showOpenModal, setShowOpenModal] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  // --- Load clients on mount ---
  useEffect(() => {
    const loadClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, telephone, ville, nif, type')
        .order('nom', { ascending: true });
      if (!error && data) setClients(data);
    };
    loadClients();
  }, []);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasActiveSession) return;
      if (e.key === 'Escape') {
        setPrintMode('none');
        setLastFacture(null);
        setShowTicketHistory(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasActiveSession]);

  // --- Show open modal when no session ---
  useEffect(() => {
    if (!sessionLoading && !hasActiveSession && session === null) {
      setShowOpenModal(true);
    }
    if (hasActiveSession) {
      setShowOpenModal(false);
    }
  }, [sessionLoading, hasActiveSession, session]);

  // ============================================================
  // Cart operations
  // ============================================================
  const addItem = useCallback((description: string, prix: number) => {
    setCart(prev => {
      const existing = prev.items.find(
        i => i.description.toLowerCase() === description.toLowerCase() && i.prix_unitaire === prix
      );
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.id === existing.id
              ? { ...i, quantite: i.quantite + 1, montant_total: (i.quantite + 1) * i.prix_unitaire }
              : i
          ),
        };
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            id: crypto.randomUUID(),
            description,
            prix_unitaire: prix,
            quantite: 1,
            montant_total: prix,
          },
        ],
      };
    });
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.map(i => {
        if (i.id !== id) return i;
        const newQty = i.quantite + delta;
        if (newQty <= 0) return null;
        return { ...i, quantite: newQty, montant_total: newQty * i.prix_unitaire };
      }).filter(Boolean) as CartItem[],
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const subtotal = cart.items.reduce((sum, i) => sum + i.montant_total, 0);
  const change = cart.montant_recu - subtotal;

  // ============================================================
  // Quick add: parse "Description | Prix" or "Description Prix"
  // ============================================================
  const handleQuickAdd = () => {
    const parts = searchQuery.split('|').map(s => s.trim());
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      addItem(parts[0], Number(parts[1]));
    } else if (searchQuery.trim()) {
      const match = searchQuery.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);
      if (match) {
        addItem(match[1].trim(), Number(match[2].replace(',', '.')));
      } else {
        addItem(searchQuery.trim(), 0);
      }
    }
  };

  // ============================================================
  // Article selection from DB
  // ============================================================
  const handleArticleSelect = (article: import('@/types').Article) => {
    addItem(article.denomination, article.prix);
  };

  // ============================================================
  // Session management
  // ============================================================
  const handleOpenSession = async () => {
    const result = await openSession(fondInitial);
    if (result) {
      showSuccess(`Session ouverte • fond initial: ${fondInitial.toFixed(2)} $`);
      setShowOpenModal(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    if (!window.confirm(
      `Fermer la session ?\n\n` +
      `Ventes totales: ${session.total_ventes.toFixed(2)} $\n` +
      `Espèces: ${session.total_especes.toFixed(2)} $\n` +
      `Carte: ${session.total_carte.toFixed(2)} $`
    )) return;

    const ok = await closeSession();
    if (ok) {
      showSuccess('Session fermée');
      setCart({ client: null, items: [], mode_paiement: 'cash', montant_recu: 0 });
    }
  };

  // ============================================================
  // Payment processing via edge function
  // ============================================================
  const processPayment = async () => {
    if (cart.items.length === 0) {
      showError('Ajoutez au moins un article');
      return;
    }
    if (!hasActiveSession) {
      showError('Aucune session ouverte');
      return;
    }
    if (cart.mode_paiement === 'cash' && cart.montant_recu < subtotal) {
      showError('Montant reçu insuffisant');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // 1. Create ticket via api-caisse edge function
      const { data: funcData, error: funcError } = await supabase.functions.invoke('api-caisse', {
        body: {
          action: 'ticket',
          session_id: session!.id,
          items: cart.items.map(item => ({
            description: item.description,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            montant_total: item.montant_total,
          })),
          client_nom: cart.client?.nom || 'Client anonyme',
          mode_paiement: cart.mode_paiement,
          montant_recu: cart.montant_recu || subtotal,
        },
      });

      if (funcError) throw funcError;
      if (funcData?.error) throw new Error(funcData.error);
      if (!funcData?.ticket) throw new Error('Erreur création ticket');

      const ticket = funcData.ticket;

      // 2. Create linked invoice
      const year = new Date().getFullYear();
      const { count: countData } = await supabase
        .from('factures')
        .select('id', { count: 'exact', head: true })
        .like('facture_number', `FV-${year}-%`);
      const seqNum = ((countData?.count ?? 0) + 1).toString().padStart(4, '0');
      const factureNumber = `FV-${year}-${seqNum}`;

      const { data: facture, error: factureError } = await supabase
        .from('factures')
        .insert({
          facture_number: factureNumber,
          type: 'facture',
          statut: 'validee',
          client_id: cart.client?.id || '00000000-0000-0000-0000-000000000000',
          mode_livraison: 'aerien',
          devise: 'USD',
          subtotal,
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

      // 3. Create facture line items
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

      // 4. Update session totals (optimistic local update)
      await updateTotals(subtotal, cart.mode_paiement);

      setLastFacture({ number: factureNumber, total: subtotal });
      setPrintMode('preview');
      showSuccess(`${ticket.ticket_number} → Facture ${factureNumber}`);

      // Reset cart
      setCart({ client: null, items: [], mode_paiement: 'cash', montant_recu: 0 });
    } catch (err: any) {
      const msg = err.message || 'Erreur lors du paiement';
      showError(msg);
      console.error('[POS] Payment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================
  // Print helper
  // ============================================================
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
        <title>${lastFacture?.number}</title>
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

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="flex h-screen bg-gray-50">
      {/* ======= LEFT PANEL ======= */}
      <div className="flex flex-1 flex-col">
        {/* --- Header --- */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">🖥️ Caisse POS</h1>
              {hasActiveSession && session && (
                <p className="text-xs text-gray-400">
                  Ouverte à {new Date(session.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            {/* Connection badge */}
            {hasActiveSession && (
              <Badge className={`flex items-center gap-1 px-2 py-1 text-xs ${
                isFullyConnected
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`} variant="outline">
                {isFullyConnected ? (
                  <><Wifi className="h-3 w-3" /> Connecté</>
                ) : (
                  <><RefreshCw className="h-3 w-3 animate-spin" /> Synchro...</>
                )}
              </Badge>
            )}

            {/* Per-channel status dots */}
            {hasActiveSession && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${sessionConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  Session
                </span>
                <span className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${ticketsConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  Tickets
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {sessionLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}

            {hasActiveSession && session && (
              <>
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-right">
                    <p className="text-gray-400">Espèces</p>
                    <p className="font-bold text-emerald-700">{session.total_especes.toFixed(2)} $</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Carte</p>
                    <p className="font-bold text-blue-600">{session.total_carte.toFixed(2)} $</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="text-right">
                    <p className="text-gray-400">Total</p>
                    <p className="font-bold text-gray-900">{session.total_ventes.toFixed(2)} $</p>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-8" />

                <Button variant="outline" size="sm" onClick={() => setShowTicketHistory(prev => !prev)} className="h-8 text-xs">
                  {showTicketHistory ? 'Ticket' : 'Historique'}
                </Button>

                <Button variant="destructive" size="sm" onClick={handleCloseSession} className="h-8 text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Fermer
                </Button>
              </>
            )}

            {!hasActiveSession && !sessionLoading && (
              <Button onClick={() => setShowOpenModal(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                <Unlock className="h-3 w-3 mr-1" /> Ouvrir session
              </Button>
            )}
          </div>
        </div>

        {/* --- Search bar --- */}
        {hasActiveSession && (
          <div className="bg-white border-b px-6 py-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <ArticleSelect
                  onSelect={handleArticleSelect}
                  placeholder="Rechercher un article ou scanner code-barres..."
                  autoFocus={true}
                  className="text-base h-12"
                />
              </div>
              <Button onClick={handleQuickAdd} size="lg" className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-5 w-5 mr-1" /> Ajouter
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Recherchez un article ou tapez <span className="font-mono">Description | Prix</span> et cliquez Ajouter
              <span className="ml-4 text-gray-300">Esc: Fermer</span>
            </p>
          </div>
        )}

        {/* --- Cart area --- */}
        <div className="flex-1 overflow-auto p-6">
          {!hasActiveSession ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Lock className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Session fermée</p>
              <p className="text-sm mb-4">Ouvrez une session pour commencer à vendre</p>
              <Button onClick={() => setShowOpenModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Unlock className="h-4 w-4 mr-2" /> Ouvrir une session
              </Button>
            </div>
          ) : cart.items.length === 0 ? (
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
                        <p className="text-sm text-gray-500">{item.prix_unitaire.toFixed(2)} $ &times; {item.quantite}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg">
                          <Button variant="ghost" size="sm" onClick={() => updateQty(item.id, -1)} className="h-8 w-8 p-0">
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-medium">{item.quantite}</span>
                          <Button variant="ghost" size="sm" onClick={() => updateQty(item.id, 1)} className="h-8 w-8 p-0">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="font-bold text-emerald-700 w-24 text-right">{item.montant_total.toFixed(2)} $</span>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
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

        {/* --- Payment footer --- */}
        {hasActiveSession && (
          <div className="bg-white border-t px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                {cart.client ? (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{cart.client.nom}</span>
                  </div>
                ) : (
                  <ClientCombobox
                    clients={clients}
                    value=""
                    onValueChange={(clientId) => {
                      const selected = clients.find(c => c.id === clientId) || null;
                      setCart(prev => ({ ...prev, client: selected }));
                    }}
                    placeholder="Client anonyme"
                  />
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Sous-total</p>
                <p className="text-2xl font-bold text-gray-900">{subtotal.toFixed(2)} $</p>
              </div>
            </div>

            {/* Payment mode selector */}
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

            {/* Cash received */}
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
                    {change >= 0 ? `${change.toFixed(2)} $` : 'Insuffisant'}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={processPayment}
              disabled={cart.items.length === 0 || isProcessing}
              className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Traitement...
                </span>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Payer {subtotal.toFixed(2)} $
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ======= RIGHT PANEL: Live tickets or receipt preview ======= */}
      <div className="w-80 bg-gray-100 border-l p-4 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <List className="h-4 w-4" />
            {showTicketHistory ? 'Tickets en direct' : 'Ticket en cours'}
          </h2>
          {hasActiveSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTicketHistory(prev => !prev)}
              className="h-7 px-2 text-xs"
            >
              {showTicketHistory ? <RotateCcw className="h-3 w-3 mr-1" /> : <List className="h-3 w-3 mr-1" />}
              {showTicketHistory ? 'Ticket' : 'Historique'}
            </Button>
          )}
        </div>

        {showTicketHistory ? (
          /* Live ticket feed from realtime subscription */
          <div className="flex-1 overflow-auto space-y-2">
            {tickets.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm italic">
                Aucun ticket pour cette session
              </div>
            ) : (
              tickets.map(ticket => (
                <Card key={ticket.id} className="bg-white shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {ticket.ticket_number}
                      </Badge>
                      <span className="text-sm font-bold text-emerald-700">
                        {Number(ticket.total).toFixed(2)} $
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {new Date(ticket.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        ticket.mode_paiement === 'cash'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ticket.mode_paiement === 'cash' ? '💵 Espèces' : '💳 Carte'}
                      </span>
                    </div>
                    {ticket.client_nom && ticket.client_nom !== 'Client anonyme' && (
                      <p className="text-xs text-gray-400 mt-1">{ticket.client_nom}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
            {tickets.length > 0 && (
              <p className="text-center text-xs text-gray-400 pt-1">
                {tickets.length} ticket(s) &mdash; mise à jour en temps réel
              </p>
            )}
          </div>
        ) : (
          /* Ticket receipt preview */
          <div className="bg-white border rounded-lg p-3 shadow-sm" ref={receiptRef}>
            {lastFacture ? (
              <ReceiptContent
                factureNumber={lastFacture.number}
                items={cart.items}
                subtotal={subtotal}
                change={change}
                client={cart.client}
              />
            ) : (
              <div className="text-center text-gray-400 py-8 text-sm italic">
                {hasActiveSession
                  ? 'Le ticket apparaîtra ici après le paiement'
                  : 'Ouvrez une session pour commencer'
                }
              </div>
            )}
          </div>
        )}

        {lastFacture && !showTicketHistory && (
          <Button onClick={printReceipt} className="w-full mt-3 bg-gray-800 hover:bg-gray-900">
            <Printer className="h-4 w-4 mr-2" /> Imprimer Ticket
          </Button>
        )}
      </div>

      {/* ======= SUCCESS MODAL ======= */}
      {printMode === 'preview' && lastFacture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
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
              {lastTicket && (
                <p className="text-emerald-700 text-xs mt-1">
                  Temps réel • Ticket #{lastTicket.ticket_number}
                </p>
              )}
            </div>
            <Button
              onClick={() => { printReceipt(); setPrintMode('none'); setLastFacture(null); }}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Printer className="h-4 w-4 mr-2" /> Imprimer Ticket
            </Button>
          </div>
        </div>
      )}

      {/* ======= OPEN SESSION MODAL ======= */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-4">🔓 Ouvrir une session de caisse</h3>
            <p className="text-sm text-gray-600 mb-4">
              Saisissez le fond initial de caisse avant de commencer.
            </p>

            <label className="text-sm font-medium text-gray-700 mb-1 block">Fond initial (USD)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={fondInitial || ''}
              onChange={e => setFondInitial(Number(e.target.value))}
              className="h-12 text-lg mb-4"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleOpenSession(); }}
            />

            <Button
              onClick={handleOpenSession}
              disabled={sessionLoading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
            >
              {sessionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Ouvrir la session
            </Button>

            {error && (
              <p className="text-sm text-red-500 mt-3 bg-red-50 p-2 rounded">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Receipt Content
// ============================================================
function ReceiptContent({
  factureNumber,
  items,
  subtotal,
  change,
  client,
}: {
  factureNumber: string;
  items: CartItem[];
  subtotal: number;
  change: number;
  client: Client | null;
}) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '11px', width: '72mm' }}>
      <div className="center" style={{ fontWeight: 'bold' }}>🧾 FACTURE {factureNumber}</div>
      <div className="center">POS Pro</div>
      <div className="center">Lubumbashi, RDC</div>
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
            <span>{Number(item.prix_unitaire).toFixed(2)} &times; {item.quantite}</span>
            <span>{Number(item.montant_total).toFixed(2)}</span>
          </div>
        </div>
      ))}
      <div className="line" />
      <div className="row" style={{ fontWeight: 'bold' }}>
        <span>TOTAL:</span><span>{Number(subtotal).toFixed(2)} $</span>
      </div>
      {change > 0 && (
        <div className="row">
          <span>Rendu:</span><span>{Number(change).toFixed(2)} $</span>
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

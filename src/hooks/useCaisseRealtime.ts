import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/types/pos';

export interface POSCartSnapshot {
  sessionId: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  clientId: string | null;
  modePaiement: 'cash' | 'card';
  montantRecu: number;
  lastUpdated: string;
  deviceId: string;
}

interface UseCaisseRealtimeOptions {
  sessionId: string | null;
  userId: string | null;
  localCart: CartItem[];
  localSubtotal: number;
  localClientId: string | null;
  localModePaiement: 'cash' | 'card';
  localMontantRecu: number;
  onRemoteCartUpdate: (cart: POSCartSnapshot) => void;
  onDeviceConflict: (activeDeviceId: string, currentDeviceId: string, remoteCart: POSCartSnapshot) => void;
}

export interface UseCaisseRealtimeReturn {
  isConnected: boolean;
  activeDeviceId: string | null;
  lastSyncAt: Date | null;
  broadcastCart: (cart: Omit<POSCartSnapshot, 'sessionId' | 'userId' | 'lastUpdated' | 'deviceId'>) => void;
  disconnect: () => void;
}

// Génère un ID de périphérique persistant pour ce navigateur
const getDeviceId = (): string => {
  const key = 'pos_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
};

export const useCaisseRealtime = ({
  sessionId,
  userId,
  localCart,
  localSubtotal,
  localClientId,
  localModePaiement,
  localMontantRecu,
  onRemoteCartUpdate,
  onDeviceConflict,
}: UseCaisseRealtimeOptions): UseCaisseRealtimeReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const deviceIdRef = useRef<string>(getDeviceId());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const isLocalUpdateRef = useRef(false);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsConnected(false);
    setActiveDeviceId(null);
  }, []);

  // Broadcast du panier actuel vers les autres terminaux
  const broadcastCart = useCallback(
    (cartData: Omit<POSCartSnapshot, 'sessionId' | 'userId' | 'lastUpdated' | 'deviceId'>) => {
      if (!channelRef.current || !sessionId || !userId) return;

      const snapshot: POSCartSnapshot = {
        ...cartData,
        sessionId,
        userId,
        lastUpdated: new Date().toISOString(),
        deviceId: deviceIdRef.current,
      };

      isLocalUpdateRef.current = true;
      channelRef.current.send({
        type: 'broadcast',
        event: 'cart_update',
        payload: snapshot,
      });

      // Reset flag après un court délai
      setTimeout(() => { isLocalUpdateRef.current = false; }, 100);
    },
    [sessionId, userId]
  );

  useEffect(() => {
    if (!sessionId || !userId) {
      disconnect();
      return;
    }

    const channelName = `pos_realtime:${sessionId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }, // Ne pas recevoir ses propres messages
          postgres: {
            table: 'caisse_sessions',
            filter: `id=eq.${sessionId}`,
          },
        },
      })
      // Écouter les mises à jour de la session (totaux, fermeture)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'caisse_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          // Propagation des mises à jour session — ignoré ici car useCaisseSession le gère
          console.debug('[useCaisseRealtime] Session update received:', payload);
        }
      )
      // Écouter les broadcasts cart_update des autres terminaux
      .on('broadcast', { event: 'cart_update' }, (payload) => {
        if (isLocalUpdateRef.current) return; // Ignorer ses propres messages

        const remoteCart = payload.payload as POSCartSnapshot;

        // Détection de conflit : si un autre appareil a un panier plus récent
        if (remoteCart.deviceId !== deviceIdRef.current) {
          setActiveDeviceId(remoteCart.deviceId);
          setLastSyncAt(new Date());

          // Conflit si les deux ont des articles différents et non vides
          const remoteHasItems = remoteCart.items.length > 0;
          const localHasItems = localCart.length > 0;

          if (remoteHasItems && localHasItems) {
            onDeviceConflict(remoteCart.deviceId, deviceIdRef.current, remoteCart);
          } else if (remoteHasItems) {
            // Pas de conflit, juste mettre à jour
            onRemoteCartUpdate(remoteCart);
          }
        }
      },
      // Écouter les événements de déconnexion/reconnexion d'autres appareils
      .on('broadcast', { event: 'device_offline' }, (payload) => {
        const offlineDevice = payload.payload as { deviceId: string };
        if (offlineDevice.deviceId === activeDeviceId) {
          setActiveDeviceId(null);
        }
      })
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED';
        setIsConnected(connected);

        if (connected) {
          // Informer les autres appareils qu'on est en ligne
          channel.send({
            type: 'broadcast',
            event: 'device_online',
            payload: { deviceId: deviceIdRef.current, sessionId },
          });
        } else {
          // Programmmer une reconnexion automatique
          reconnectRef.current = setTimeout(() => {
            console.log('[useCaisseRealtime] Reconnecting...');
            channel.subscribe();
          }, 5000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);

      // Informer les autres de sa déconnexion
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'device_offline',
          payload: { deviceId: deviceIdRef.current },
        }).then(() => channel.unsubscribe());
      }
    };
  }, [sessionId, userId, disconnect, activeDeviceId, localCart, onRemoteCartUpdate, onDeviceConflict]);

  return {
    isConnected,
    activeDeviceId,
    lastSyncAt,
    broadcastCart,
    disconnect,
  };
};

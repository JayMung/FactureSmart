"use client";

import React from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plug,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { showSuccess } from '@/utils/toast';

type IntegrationStatus = 'connected' | 'active' | 'not_configured';

interface Integration {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bgColor: string;
  status: IntegrationStatus;
  primaryAction: { label: string; variant: 'default' | 'outline' };
  href?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'dgi',
    name: 'API DGI',
    description: 'Connexion officielle à la Direction Générale des Impôts',
    emoji: '📦',
    bgColor: 'bg-blue-100',
    status: 'connected',
    primaryAction: { label: 'Configurer', variant: 'outline' },
  },
  {
    id: 'orange-money',
    name: 'Orange Money',
    description: 'Paiements en ligne via Orange Money',
    emoji: '💳',
    bgColor: 'bg-purple-100',
    status: 'not_configured',
    primaryAction: { label: 'Connecter', variant: 'default' },
  },
  {
    id: 'airtel-money',
    name: 'Airtel Money',
    description: 'Paiements via Airtel Money RDC',
    emoji: '📱',
    bgColor: 'bg-red-100',
    status: 'not_configured',
    primaryAction: { label: 'Connecter', variant: 'default' },
  },
  {
    id: 'mpesa',
    name: 'M-Pesa',
    description: 'Paiements via Vodacom M-Pesa',
    emoji: '💰',
    bgColor: 'bg-green-100',
    status: 'not_configured',
    primaryAction: { label: 'Connecter', variant: 'default' },
  },
  {
    id: 'webhook-dgi',
    name: 'Webhook DGI',
    description: 'URL de callback pour les notifications DGI',
    emoji: '🔌',
    bgColor: 'bg-emerald-100',
    status: 'active',
    primaryAction: { label: 'Voir URL', variant: 'outline' },
    href: '/webhooks',
  },
  {
    id: 'webhooks-comm',
    name: 'Webhooks (Discord, Slack, n8n)',
    description: 'Notifications externes vers vos outils',
    emoji: '🔔',
    bgColor: 'bg-indigo-100',
    status: 'connected',
    primaryAction: { label: 'Configurer', variant: 'outline' },
    href: '/webhooks',
  },
  {
    id: 'api-comptable',
    name: 'API Comptable (OHADA)',
    description: 'Export automatique vers votre logiciel comptable',
    emoji: '📊',
    bgColor: 'bg-gray-100',
    status: 'not_configured',
    primaryAction: { label: 'Connecter', variant: 'default' },
  },
];

const StatusIndicator: React.FC<{ status: IntegrationStatus }> = ({ status }) => {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <span className="text-xs text-green-600 font-medium">Connecté</span>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <span className="text-xs text-green-600 font-medium">Actif</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
      <span className="text-xs text-amber-600 font-medium">Non configuré</span>
    </div>
  );
};

const SettingsIntegrations: React.FC = () => {
  usePageSetup({
    title: 'Paramètres — Intégrations',
    subtitle: 'Connectez vos outils préférés',
  });

  const apiKeyMasked = '••••••••••••••••';
  const apiEndpoint = '/api/v1/factures';

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(`${window.location.origin}${apiEndpoint}`);
    showSuccess('Endpoint copié dans le presse-papier');
  };

  const handleAction = (integration: Integration) => {
    if (integration.href) {
      window.location.href = integration.href;
    } else {
      showSuccess(`Configuration de ${integration.name} bientôt disponible`);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Plug className="h-6 w-6 text-emerald-600" />
              Intégrations
            </h1>
            <p className="text-gray-500 mt-1">Connectez vos outils préférés à FactureSmart</p>
          </div>
        </div>

        {/* Liste des intégrations */}
        <div className="space-y-4">
          {INTEGRATIONS.map((integration) => (
            <Card key={integration.id} className="border-gray-200 shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${integration.bgColor} rounded-xl flex items-center justify-center text-2xl`}
                  >
                    {integration.emoji}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{integration.name}</p>
                    <p className="text-xs text-gray-500 max-w-md">{integration.description}</p>
                    <StatusIndicator status={integration.status} />
                  </div>
                </div>
                <Button
                  variant={integration.primaryAction.variant}
                  size="sm"
                  onClick={() => handleAction(integration)}
                  className={
                    integration.primaryAction.variant === 'default'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : ''
                  }
                >
                  {integration.primaryAction.label}
                  {integration.href && <ExternalLink className="h-3 w-3 ml-1.5" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API REST */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">API REST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-emerald-400">GET {apiEndpoint}</span>
                <Badge className="bg-emerald-900/50 text-emerald-400 border-0 text-xs font-semibold">
                  200 OK
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="h-1.5 flex-1 bg-gray-700 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded" style={{ width: '80%' }} />
                </div>
                <span className="text-[10px] text-gray-500">80 req/min</span>
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  Clé API
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded flex-1">
                  {apiKeyMasked}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={handleCopyEndpoint}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800">
                <a
                  href="/api-keys"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  Gérer les clés API
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Besoin d'une intégration personnalisée ?</p>
              <p className="text-blue-800">
                Notre API REST est documentée et supporte tous les endpoints CRUD. Consultez la
                documentation ou contactez le support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsIntegrations;

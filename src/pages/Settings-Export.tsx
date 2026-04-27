"use client";

import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ExportFormat {
  id: 'csv' | 'pdf' | 'json';
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  primary: boolean;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    title: 'Export CSV complet',
    description: 'Toutes vos factures, clients et rapports',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    bgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    primary: true,
  },
  {
    id: 'pdf',
    title: 'Export PDF groupé',
    description: 'Archive PDF de toutes vos factures',
    icon: <FileText className="h-5 w-5" />,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    primary: false,
  },
  {
    id: 'json',
    title: 'Export JSON API',
    description: 'Données brutes pour intégration',
    icon: <FileCode className="h-5 w-5" />,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    primary: false,
  },
];

const SettingsExport: React.FC = () => {
  usePageSetup({
    title: 'Paramètres — Export avancé',
    subtitle: "Options d'export et sauvegarde des données",
  });

  const [exporting, setExporting] = useState<string | null>(null);
  const [autoExport, setAutoExport] = useState(true);
  const [scheduleDay, setScheduleDay] = useState('1');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format.id);
    try {
      // TODO: Brancher sur l'endpoint d'export réel
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showSuccess(`Export ${format.id.toUpperCase()} lancé. Vous recevrez un email avec le lien.`);
    } catch {
      showError("Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  const handleSaveAutomation = () => {
    if (autoExport && !recipientEmail) {
      showError("L'email destinataire est requis pour l'export automatique");
      return;
    }
    showSuccess('Paramètres d\'automatisation enregistrés');
  };

  const handleDeleteAll = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    showError('Action désactivée pour démo. Contactez le support.');
    setShowDeleteConfirm(false);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Download className="h-6 w-6 text-emerald-600" />
            Export avancé
          </h1>
          <p className="text-gray-500 mt-1">Options d'export et sauvegarde des données</p>
        </div>

        {/* Export de données */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">Export de données</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EXPORT_FORMATS.map((format) => (
              <div
                key={format.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${format.bgColor} rounded-xl flex items-center justify-center ${format.iconColor}`}
                  >
                    {format.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{format.title}</p>
                    <p className="text-xs text-gray-500">{format.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={format.primary ? 'default' : 'outline'}
                  disabled={exporting === format.id}
                  onClick={() => handleExport(format)}
                  className={format.primary ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {exporting === format.id ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : null}
                  Exporter
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Automatisation */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">Automatisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Export automatique mensuel</p>
                <p className="text-xs text-gray-500">
                  Envoi automatique par email selon la fréquence choisie
                </p>
              </div>
              <Switch checked={autoExport} onCheckedChange={setAutoExport} />
            </div>

            {autoExport && (
              <>
                <div>
                  <Label htmlFor="schedule-day" className="text-xs font-semibold text-gray-700">
                    Jour d'envoi
                  </Label>
                  <Select value={scheduleDay} onValueChange={setScheduleDay}>
                    <SelectTrigger id="schedule-day" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1er du mois</SelectItem>
                      <SelectItem value="15">15 du mois</SelectItem>
                      <SelectItem value="last">Dernier jour du mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recipient" className="text-xs font-semibold text-gray-700">
                    Email destinataire
                  </Label>
                  <Input
                    id="recipient"
                    type="email"
                    placeholder="comptabilite@monentreprise.cd"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

            <Button onClick={handleSaveAutomation} className="bg-emerald-600 hover:bg-emerald-700">
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Zone danger */}
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Zone danger
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-800">Supprimer toutes les données</p>
                <p className="text-xs text-red-600">Cette action est irréversible</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
              >
                {showDeleteConfirm ? 'Confirmer la suppression' : 'Supprimer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsExport;

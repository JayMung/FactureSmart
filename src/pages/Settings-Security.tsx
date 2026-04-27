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
  ShieldCheck,
  Smartphone,
  Monitor,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface ActiveSession {
  id: string;
  device: string;
  os: string;
  location: string;
  lastActive: string;
  current: boolean;
}

const MOCK_SESSIONS: ActiveSession[] = [
  {
    id: 'current',
    device: 'Chrome',
    os: 'Windows',
    location: 'Kinshasa, RDC',
    lastActive: 'Actif maintenant',
    current: true,
  },
  {
    id: 'mobile-1',
    device: 'Safari',
    os: 'iPhone',
    location: 'Kinshasa, RDC',
    lastActive: 'il y a 2 heures',
    current: false,
  },
];

const SettingsSecurity: React.FC = () => {
  usePageSetup({
    title: 'Paramètres — Sécurité',
    subtitle: 'Protégez votre compte et vos données',
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Tous les champs sont requis');
      return;
    }
    if (newPassword.length < 8) {
      showError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showSuccess('Mot de passe mis à jour avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleDisconnectSession = (sessionId: string) => {
    showSuccess(`Session ${sessionId} déconnectée (à venir)`);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Sécurité
          </h1>
          <p className="text-gray-500 mt-1">Protégez votre compte et vos données</p>
        </div>

        {/* 2FA */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">
              Authentification à deux facteurs (2FA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {twoFactorEnabled ? '2FA activé' : '2FA désactivé'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {twoFactorEnabled
                      ? 'Votre compte est protégé par double authentification'
                      : 'Activez la 2FA pour renforcer la sécurité de votre compte'}
                  </p>
                </div>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={(v) => {
                  setTwoFactorEnabled(v);
                  showSuccess(v ? '2FA activé (configuration à venir)' : '2FA désactivé');
                }}
              />
            </div>

            {twoFactorEnabled && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Code envoyé par SMS</p>
                  <p className="text-xs text-gray-500 mt-0.5">Méthode : SMS</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Changer mot de passe */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              Changer le mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="current-pwd" className="text-xs font-semibold text-gray-700">
                Mot de passe actuel
              </Label>
              <Input
                id="current-pwd"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="new-pwd" className="text-xs font-semibold text-gray-700">
                Nouveau mot de passe
              </Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="Minimum 8 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pwd" className="text-xs font-semibold text-gray-700">
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="Confirmez le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPwd}
              className="bg-emerald-600 hover:bg-emerald-700 mt-2"
            >
              {savingPwd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mettre à jour
            </Button>
          </CardContent>
        </Card>

        {/* Sessions actives */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">Sessions actives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_SESSIONS.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {session.os === 'iPhone' || session.os === 'Android' ? (
                    <Smartphone className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Monitor className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {session.device} — {session.os}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.location} — {session.lastActive}
                    </p>
                  </div>
                </div>
                {session.current ? (
                  <span className="text-xs font-medium text-emerald-600">Session actuelle</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnectSession(session.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Déconnecter
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsSecurity;

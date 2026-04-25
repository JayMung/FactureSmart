// Profile Settings Section
// Extracted from Settings-Permissions.tsx to reduce code cloning

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Button from '@/components/ui/button';
import { Camera, Save, User, Lock } from 'lucide-react';
import { showError } from '@/utils/toast';
// Inline type — Supabase profiles may include extended fields
interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ProfileSectionProps {
  profile: Profile | null;
  profileForm: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  setProfileForm: (form: any | ((prev: any) => any)) => void;
  passwordForm: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  };
  setPasswordForm: (form: any | ((prev: any) => any)) => void;
  passwordFormError: string;
  saving: boolean;
  uploading: boolean;
  changingPassword: boolean;
  saveProfile: () => Promise<void>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePasswordChange: () => Promise<void>;
}

export function ProfileSection({
  profile,
  profileForm,
  setProfileForm,
  passwordForm,
  setPasswordForm,
  passwordFormError,
  saving,
  uploading,
  changingPassword,
  saveProfile,
  handleAvatarUpload,
  handlePasswordChange,
}: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Mon profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className="text-3xl font-bold text-green-600">
                  {profileForm.first_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-1.5 bg-green-500 rounded-full text-white hover:bg-green-600 transition-colors shadow-md disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profileForm.first_name} {profileForm.last_name}
              </h2>
              <p className="text-gray-500">{profileForm.email}</p>
            </div>
          </div>

          {/* Profile form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={profileForm.first_name}
                onChange={(e) => setProfileForm((prev: any) => ({ ...prev, first_name: e.target.value }))}
                placeholder="Votre prénom"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={profileForm.last_name}
                onChange={(e) => setProfileForm((prev: any) => ({ ...prev, last_name: e.target.value }))}
                placeholder="Votre nom"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((prev: any) => ({ ...prev, phone: e.target.value }))}
              placeholder="+243..."
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profileForm.email}
              readOnly
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            Modifier le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordFormError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{passwordFormError}</div>
          )}
          <div>
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input
              id="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((prev: any) => ({ ...prev, current_password: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((prev: any) => ({ ...prev, new_password: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((prev: any) => ({ ...prev, confirm_password: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword ? 'Modification...' : 'Modifier le mot de passe'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

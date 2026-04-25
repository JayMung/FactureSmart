// Users Management Section
// Extracted from Settings-Permissions.tsx to reduce code cloning

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Button from '@/components/ui/button';
import { Crown, UserCheck, Mail, Plus, Pencil, Trash2, UserX, KeyRound, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LocalUser {
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

interface UserForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
}

const getRoleDisplay = (role: string) => {
  switch (role) {
    case 'super_admin':
      return { text: 'Super Admin', icon: Crown, color: 'bg-yellow-500 hover:bg-yellow-600' };
    case 'admin':
      return { text: 'Admin', icon: Crown, color: 'bg-green-500 hover:bg-green-600' };
    case 'operateur':
      return { text: 'Opérateur', icon: UserCheck, color: 'bg-blue-500 hover:bg-blue-600' };
    default:
      return { text: 'Opérateur', icon: UserCheck, color: 'bg-blue-500 hover:bg-blue-600' };
  }
};

interface UsersSectionProps {
  users: LocalUser[];
  isAdmin: boolean;
  isUserFormOpen: boolean;
  selectedUser: LocalUser | null;
  userForm: UserForm;
  userFormError: string;
  formErrors: Record<string, string>;
  isDeleteUserDialogOpen: boolean;
  userToDelete: LocalUser | null;
  isDeletingUser: boolean;
  isResetPasswordDialogOpen: boolean;
  userToResetPassword: LocalUser | null;
  manualPassword: string;
  isResettingPassword: boolean;
  isInviteDialogOpen: boolean;
  inviteEmail: string;
  inviteRole: string;
  inviting: boolean;
  onOpenUserForm: (user?: LocalUser) => void;
  onCloseUserForm: () => void;
  onUserFormChange: (form: UserForm | ((prev: UserForm) => UserForm)) => void;
  onSaveUser: () => Promise<void>;
  onDeleteUser: (user: LocalUser) => void;
  onConfirmDeleteUser: () => Promise<void>;
  onCancelDeleteUser: () => void;
  onResetPassword: (user: LocalUser) => void;
  onManualPasswordChange: (val: string) => void;
  onConfirmResetPassword: () => Promise<void>;
  onCancelResetPassword: () => void;
  onOpenInvite: () => void;
  onCloseInvite: () => void;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (val: string) => void;
  onInvite: () => Promise<void>;
}

export function UsersSection({
  users,
  isAdmin,
  isUserFormOpen,
  selectedUser,
  userForm,
  userFormError,
  formErrors,
  isDeleteUserDialogOpen,
  userToDelete,
  isDeletingUser,
  isResetPasswordDialogOpen,
  userToResetPassword,
  manualPassword,
  isResettingPassword,
  isInviteDialogOpen,
  inviteEmail,
  inviteRole,
  inviting,
  onOpenUserForm,
  onCloseUserForm,
  onUserFormChange,
  onSaveUser,
  onDeleteUser,
  onConfirmDeleteUser,
  onCancelDeleteUser,
  onResetPassword,
  onManualPasswordChange,
  onConfirmResetPassword,
  onCancelResetPassword,
  onOpenInvite,
  onCloseInvite,
  onInviteEmailChange,
  onInviteRoleChange,
  onInvite,
}: UsersSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onOpenInvite}>
                <Mail className="mr-2 h-4 w-4" />
                Inviter par email
              </Button>
              <Button size="sm" onClick={() => onOpenUserForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un utilisateur
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun utilisateur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((u) => {
                const roleInfo = getRoleDisplay(u.role);
                const RoleIcon = roleInfo.icon;
                return (
                  <div
                    key={u.id}
                    className="card-base transition-shadow-hover flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2.5 rounded-full ${roleInfo.color} flex items-center justify-center flex-shrink-0`}>
                        <RoleIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-medium text-gray-900">
                            {u.first_name} {u.last_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {roleInfo.text}
                          </Badge>
                          {!u.is_active && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Inactif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenUserForm(u)}
                        className="text-gray-500 hover:text-green-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResetPassword(u)}
                        className="text-gray-500 hover:text-blue-600"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteUser(u)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Form Dialog */}
      <Dialog open={isUserFormOpen} onOpenChange={(open) => !open && onCloseUserForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Modifier' : 'Ajouter'} un utilisateur</DialogTitle>
          </DialogHeader>
          {userFormError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{userFormError}</div>
          )}
          <div className="space-y-4">
            {!selectedUser && (
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => onUserFormChange((prev: UserForm) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => onUserFormChange((prev: UserForm) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user_first_name">Prénom</Label>
                <Input
                  id="user_first_name"
                  value={userForm.first_name}
                  onChange={(e) => onUserFormChange((prev: UserForm) => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="user_last_name">Nom</Label>
                <Input
                  id="user_last_name"
                  value={userForm.last_name}
                  onChange={(e) => onUserFormChange((prev: UserForm) => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="user_phone">Téléphone</Label>
              <Input
                id="user_phone"
                value={userForm.phone}
                onChange={(e) => onUserFormChange((prev: UserForm) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="user_role">Rôle</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: string) => onUserFormChange((prev: UserForm) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operateur">Opérateur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCloseUserForm}>Annuler</Button>
              <Button onClick={onSaveUser}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={(open) => !open && onCancelDeleteUser()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.first_name} {userToDelete?.last_name}</strong> ?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelDeleteUser}>Annuler</Button>
            <Button variant="destructive" onClick={onConfirmDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => !open && onCancelResetPassword()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Définir un nouveau mot de passe pour <strong>{userToResetPassword?.email}</strong>
          </p>
          <div>
            <Label htmlFor="manualPassword">Nouveau mot de passe</Label>
            <Input
              id="manualPassword"
              type="password"
              value={manualPassword}
              onChange={(e) => onManualPasswordChange(e.target.value)}
              placeholder="Minimum 6 caractères"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelResetPassword}>Annuler</Button>
            <Button onClick={onConfirmResetPassword} disabled={isResettingPassword || !manualPassword}>
              {isResettingPassword ? 'Réinitialisation...' : 'Réinitialiser'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={(open) => !open && onCloseInvite()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => onInviteEmailChange(e.target.value)}
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="inviteRole">Rôle</Label>
              <Select value={inviteRole} onValueChange={(val: string) => onInviteRoleChange(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operateur">Opérateur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCloseInvite}>Annuler</Button>
              <Button onClick={onInvite} disabled={inviting || !inviteEmail}>
                {inviting ? 'Invitation...' : 'Inviter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

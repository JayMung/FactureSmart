import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';
import type { PaymentMethod } from '@/types';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useSettings() {
  usePageSetup({
    pageTitle: 'Paramètres',
    pageDescription: 'Gérez les paramètres de votre entreprise',
  });
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('operateur');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { user: authUser } = useAuth();
  const { checkPermission, canAccessModule, getAccessibleModules, isAdmin, loading: permissionsLoading } = usePermissions();

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });

  const [exchangeRates, setExchangeRates] = useState({
    usdToCdf: 2100,
    usdToCny: 7.2,
  });

  const [transactionFees, setTransactionFees] = useState({
    transfert: 0,
    commande: 15,
    partenaire: 5,
  });

  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'operateur' as string,
  });
  const [userFormError, setUserFormError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordFormError, setPasswordFormError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Confirmation dialogs
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Invite users
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('operateur');
  const [inviting, setInviting] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser?.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setCurrentUserRole(profileData.role || 'operateur');
          setProfileForm({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || '',
            email: authUser?.email || '',
          });
        }

        // Fetch users (admin only)
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (usersData) setUsers(usersData);

        // Fetch exchange rates
        const { data: ratesData } = await supabase
          .from('exchange_rates')
          .select('*')
          .eq('id', (await supabase.from('exchange_rates').select('id').limit(1)).data?.[0]?.id)
          .single();

        if (ratesData) {
          setExchangeRates({
            usdToCdf: ratesData.usd_to_cdf || 2100,
            usdToCny: ratesData.usd_to_cny || 7.2,
          });
        }

        // Fetch fees
        const { data: feesData } = await supabase
          .from('fees')
          .select('*')
          .eq('id', (await supabase.from('fees').select('id').limit(1)).data?.[0]?.id)
          .single();

        if (feesData) {
          setTransactionFees({
            transfert: feesData.transfert || 0,
            commande: feesData.commande || 15,
            partenaire: feesData.partenaire || 5,
          });
        }

        // Fetch payment methods
        const { data: pmData } = await supabase
          .from('payment_methods')
          .select('*')
          .order('name');

        if (pmData) setPaymentMethods(pmData);

        // Fetch activity logs
        const { data: logsData } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (logsData) setActivityLogs(logsData);
      } catch (err) {
        console.error('Error fetching settings data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [authUser?.id]);

  // Profile save
  const saveProfile = useCallback(async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) throw error;
      showSuccess('Profil mis à jour');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  }, [authUser?.id, profileForm]);

  // Avatar upload
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser?.id) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      showError('L\'image doit faire moins de 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${authUser.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      showSuccess('Avatar mis à jour');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUploading(false);
    }
  }, [authUser?.id]);

  // Password change
  const handlePasswordChange = useCallback(async () => {
    setPasswordFormError('');

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setPasswordFormError('Tous les champs sont requis');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordFormError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordFormError('Les mots de passe ne correspondent pas');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      });
      if (error) throw error;
      showSuccess('Mot de passe modifié');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPasswordFormError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }, [passwordForm]);

  // Exchange rates save
  const saveExchangeRates = useCallback(async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('exchange_rates').select('id').limit(1);
      if (existing?.[0]) {
        await supabase.from('exchange_rates').update({
          usd_to_cdf: exchangeRates.usdToCdf,
          usd_to_cny: exchangeRates.usdToCny,
        }).eq('id', existing[0].id);
      } else {
        await supabase.from('exchange_rates').insert({
          usd_to_cdf: exchangeRates.usdToCdf,
          usd_to_cny: exchangeRates.usdToCny,
        });
      }
      showSuccess('Taux de change mis à jour');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  }, [exchangeRates]);

  // Fees save
  const saveFees = useCallback(async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('fees').select('id').limit(1);
      if (existing?.[0]) {
        await supabase.from('fees').update({
          transfert: transactionFees.transfert,
          commande: transactionFees.commande,
          partenaire: transactionFees.partenaire,
        }).eq('id', existing[0].id);
      } else {
        await supabase.from('fees').insert({
          transfert: transactionFees.transfert,
          commande: transactionFees.commande,
          partenaire: transactionFees.partenaire,
        });
      }
      showSuccess('Frais mis à jour');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  }, [transactionFees]);

  // ... Payment methods CRUD, User management CRUD, etc.
  // (omitted for brevity — will only extract the reusable components)

  return {
    // State
    activeTab, setActiveTab,
    profile, setProfile,
    users, setUsers,
    paymentMethods, setPaymentMethods,
    activityLogs,
    user,
    currentUserRole,
    loading,
    usersLoading,
    saving,
    uploading,
    fileInputRef,
    profileForm, setProfileForm,
    exchangeRates, setExchangeRates,
    transactionFees, setTransactionFees,
    passwordForm, setPasswordForm,
    passwordFormError, setPasswordFormError,
    changingPassword,
    // Payment methods
    isPaymentMethodFormOpen, setIsPaymentMethodFormOpen,
    selectedPaymentMethod, setSelectedPaymentMethod,
    deleteDialogOpen, setDeleteDialogOpen,
    paymentMethodToDelete, setPaymentMethodToDelete,
    isDeleting,
    // User management
    isUserFormOpen, setIsUserFormOpen,
    selectedUser, setSelectedUser,
    userForm, setUserForm,
    userFormError, setUserFormError,
    formErrors, setFormErrors,
    isDeleteUserDialogOpen, setIsDeleteUserDialogOpen,
    userToDelete, setUserToDelete,
    isDeletingUser,
    isResetPasswordDialogOpen, setIsResetPasswordDialogOpen,
    userToResetPassword, setUserToResetPassword,
    manualPassword, setManualPassword,
    isResettingPassword,
    // Invite
    isInviteDialogOpen, setIsInviteDialogOpen,
    inviteEmail, setInviteEmail,
    inviteRole, setInviteRole,
    inviting,
    // Actions
    saveProfile,
    handleAvatarUpload,
    handlePasswordChange,
    saveExchangeRates,
    saveFees,
    // Permissions
    checkPermission, canAccessModule, isAdmin, permissionsLoading,
    navigate,
  };
}

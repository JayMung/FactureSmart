/**
 * usePermissions - Simplified for Phase 0
 * Role-based access only: admin, comptable, caissier
 * Granular permissions system removed.
 */

import { useAuth } from '@/components/auth/AuthProvider';
import type { Role } from '@/types';

export type ModuleType = never; // No longer used

export const usePermissions = () => {
  const { profileRole } = useAuth();

  const role = (profileRole || 'caissier') as Role;

  const isAdmin = role === 'admin';
  const isComptable = role === 'comptable';
  const isCaissier = role === 'caissier';

  // checkPermission always returns true since we only have role-based access
  const checkPermission = (_module: ModuleType, _action: 'read' | 'create' | 'update' | 'delete'): boolean => {
    return true;
  };

  const canAccessModule = (_module: ModuleType): boolean => {
    return true;
  };

  // Admin has all access, comptable and caissier have limited access
  const getAccessibleModules = () => {
    // All modules accessible, but UI can hide based on role
    return [];
  };

  const loading = false;
  const error = null;

  return {
    permissions: {},
    loading,
    error,
    isAdmin,
    isComptable,
    isCaissier,
    role,
    checkPermission,
    canAccessModule,
    updatePermission: async () => { /* no-op */ },
    applyRole: async () => { /* no-op */ },
    getAccessibleModules,
    modules: [],
    predefinedRoles: []
  };
};

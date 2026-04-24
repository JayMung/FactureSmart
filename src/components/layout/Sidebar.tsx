"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Users,
  Receipt,
  Settings,
  FileText,
  LayoutDashboard,
  Building2,
  Wallet,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

interface SidebarProps {
  isMobileOpen?: boolean;
  currentPath?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const { user, profileRole } = useAuth();

  const role = profileRole || 'caissier';
  const isAdmin = role === 'admin';
  const isComptable = role === 'comptable';

  const menuItems: Array<{
    icon: any;
    label: string;
    path: string;
    adminOnly?: boolean;
    comptableOnly?: boolean;
  }> = [
    {
      icon: LayoutDashboard,
      label: 'Tableau de bord',
      path: '/',
    },
    {
      icon: Users,
      label: 'Clients',
      path: '/clients',
    },
    {
      icon: FileText,
      label: 'Factures',
      path: '/factures',
    },
    {
      icon: FileSpreadsheet,
      label: 'Devis',
      path: '/devis',
    },
    {
      icon: Wallet,
      label: 'POS Caisse',
      path: '/pos',
    },
    {
      icon: Receipt,
      label: 'Transactions',
      path: '/transactions',
      comptableOnly: true,
    },
    {
      icon: Building2,
      label: 'Déclarants DGI',
      path: '/declarants',
      comptableOnly: true,
    },
    {
      icon: Settings,
      label: 'Paramètres',
      path: '/settings',
      adminOnly: true,
    },
  ];

  // Filter items based on role
  const filteredItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.comptableOnly && !isAdmin && !isComptable) return false;
    return true;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess('Déconnexion réussie');
  };

  return (
    <div className="bg-gradient-to-b from-emerald-600 via-emerald-600 to-emerald-700 dark:from-emerald-700 dark:via-emerald-800 dark:to-emerald-900 text-white flex flex-col h-full w-64 shadow-xl">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-emerald-600 font-bold text-xl">F</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">FactureSmart</h1>
            <p className="text-xs text-emerald-200/80">DGI Ready</p>
          </div>
        </div>
      </div>

      {/* Navigation - Flat menu */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  currentPath === item.path
                    ? "bg-white text-emerald-700 shadow-lg shadow-emerald-900/20"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/10 bg-black/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
            <span className="text-emerald-600 font-bold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.user_metadata?.first_name ?
                `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}` :
                user?.email || 'Utilisateur'
              }
            </p>
            <p className="text-xs text-emerald-200/70 truncate">
              {role === 'admin' ? '👑 Admin' :
                role === 'comptable' ? '📊 Comptable' : '💰 Caissier'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

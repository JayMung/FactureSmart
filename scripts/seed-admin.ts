#!/usr/bin/env npx tsx
/**
 * Seed Admin User
 * Crée automatiquement le premier utilisateur Super Admin dans Supabase Auth.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Prérequis: Supabase local doit tourner (supabase start)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Charger .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'admin.facturex@local';
const ADMIN_PASSWORD = 'FactureSmart2026!';

async function seedAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Vérifier si l'utilisateur existe déjà
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some((u: any) => u.email === ADMIN_EMAIL);

  if (alreadyExists) {
    console.log(`⚠️  L'utilisateur ${ADMIN_EMAIL} existe déjà.`);
    console.log('   Si le mot de passe est incorrect, supprimez-le via Supabase Studio et relancez ce script.');
    process.exit(0);
  }

  // Créer l'utilisateur
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Administrateur FactureSmart' },
  });

  if (error) {
    console.error('❌ Erreur création admin:', error.message);
    process.exit(1);
  }

  console.log(`✅ Admin créé avec succès !`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   UUID:  ${data.user?.id}`);
  console.log(`   Role:  super_admin (défini par le trigger handle_new_user)`);
}

seedAdmin();

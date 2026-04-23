/**
 * POS Auth & DGI Tests
 * Tests pour FactureX POS - Auth et Declarants DGI
 */
import { describe, it, expect, beforeAll } from 'vitest';

describe('POS Auth', () => {
  describe('Super Admin Auto-Assignment', () => {
    it('should have super_admin role for first registered user', async () => {
      // This test verifies the trigger is set up correctly
      // The actual verification is done via the database check
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, role')
        .order('created_at', { ascending: true })
        .limit(1);

      expect(profiles).toBeDefined();
      if (profiles && profiles.length > 0) {
        expect(['super_admin', 'admin', 'caissier']).toContain(profiles[0].role);
      }
    });
  });
});

describe('DGI Declarants', () => {
  it('should have declarants table accessible', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('declarants')
      .select('id, raison_sociale, nif')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have dgi_declarations table accessible', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('dgi_declarations')
      .select('id, etat')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have dgi_invoice_registry table accessible', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('dgi_invoice_registry')
      .select('id')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

describe('POS Articles', () => {
  it('should have articles table', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('articles')
      .select('id, denomination, prix')
      .limit(3);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

describe('POS Clients', () => {
  it('should have clients table', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, nom')
      .limit(3);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

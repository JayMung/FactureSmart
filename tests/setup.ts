// Configuration pour les tests
import { vi } from 'vitest'

// Mock Supabase pour les tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      // result = objet de base retourné par TOUTE la chaîne de query building
      // IL a toutes les méthodes car chaque étape retourne ce même objet
      const result: any = {
        data: null,
        error: null,
        then: (onFulfilled: any, onRejected: any) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected),
      };
      // Chaque méthode CRUD retourne result (qui a toutes les méthodes de chainage)
      const crud = () => result;
      // Toutes les méthodes de query building + CRUD sont sur result
      result.eq = crud;
      result.gte = crud;
      result.lte = crud;
      result.order = crud;
      result.limit = crud;
      result.single = crud;
      result.insert = crud;
      result.select = crud;
      result.update = crud;
      result.delete = crud;
      return result;
    }),
    rpc: vi.fn(() => ({ data: null, error: null })),
  }
}))

// Mock toast pour éviter les erreurs dans les tests
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }
}))

// Variables d'environnement pour les tests
process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
process.env.VITE_SUPABASE_ANON_KEY = 'test-key'

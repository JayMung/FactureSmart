-- Migration: Create facture_history table for tracking invoice modifications
-- Issue: COD-32-2

CREATE TABLE IF NOT EXISTS public.facture_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'status_change', 'delete'
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries on facture history
CREATE INDEX IF NOT EXISTS idx_facture_history_facture_id ON public.facture_history(facture_id);
CREATE INDEX IF NOT EXISTS idx_facture_history_changed_at ON public.facture_history(changed_at DESC);

-- RLS policies
ALTER TABLE public.facture_history ENABLE ROW LEVEL SECURITY;

-- Users can read history of factures they have access to
CREATE POLICY "Users can read facture history" ON public.facture_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.factures f
      WHERE f.id = facture_history.facture_id
      AND (
        f.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = (
            SELECT company_id FROM public.profiles WHERE id = f.created_by
          )
        )
      )
    )
  );

-- Users can insert history (system tracking)
CREATE POLICY "System can insert facture history" ON public.facture_history
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.facture_history IS 'Tracks all modifications made to factures for audit purposes';

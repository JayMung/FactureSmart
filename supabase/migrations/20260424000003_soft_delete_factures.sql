-- Migration: Soft delete for factures (SYSCOHADA compliance)
-- Issue: COD-50
-- Soft delete = no permanent deletion. All records preserved for accounting audit.

-- ============================================
-- STEP 1: Add soft delete columns to factures
-- ============================================
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- Index for filtering soft-deleted records
CREATE INDEX IF NOT EXISTS idx_factures_deleted_at ON public.factures(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- STEP 2: Create facture_deletion_logs table
-- Detailed audit trail for deletions (SYSCOHADA requirement)
-- ============================================
CREATE TABLE IF NOT EXISTS public.facture_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE RESTRICT,
  facture_number VARCHAR(50) NOT NULL,
  deleted_by UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Reason/motivation for deletion (optional)
  reason TEXT,
  -- Snapshot of the facture at deletion time for audit
  facture_snapshot JSONB NOT NULL DEFAULT '{}',
  -- Additional context
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_facture_deletion_logs_facture_id ON public.facture_deletion_logs(facture_id);
CREATE INDEX IF NOT EXISTS idx_facture_deletion_logs_deleted_by ON public.facture_deletion_logs(deleted_by);
CREATE INDEX IF NOT EXISTS idx_facture_deletion_logs_deleted_at ON public.facture_deletion_logs(deleted_at DESC);

-- ============================================
-- STEP 3: RLS policies for facture_deletion_logs
-- ============================================
ALTER TABLE public.facture_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all deletion logs
CREATE POLICY "Admins can read facture deletion logs" ON public.facture_deletion_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin')
    )
  );

-- System can insert deletion logs
CREATE POLICY "System can insert facture deletion logs" ON public.facture_deletion_logs
  FOR INSERT WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.facture_deletion_logs IS 'Audit trail for soft-deleted factures — required by SYSCOHADA accounting standards. No hard deletes allowed.';
COMMENT ON COLUMN public.factures.deleted_at IS 'Soft delete timestamp. NULL = active record. Non-NULL = soft-deleted (preserved for SYSCOHADA).';
COMMENT ON COLUMN public.factures.deleted_by IS 'User who performed the soft delete.';

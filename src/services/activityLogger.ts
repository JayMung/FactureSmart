/**
 * Activity Logger Service (STUB - activity_logs table removed in Phase 0)
 * All logging operations are now no-ops.
 */

export class ActivityLogger {
  async logActivity(action: string, entityType?: string, entityId?: string, details?: any): Promise<void> {
    // No-op: activity_logs table removed in Phase 0 cleanup
    console.debug('[ActivityLogger] logActivity (stub):', { action, entityType, entityId });
  }

  async logActivityWithChanges(
    action: string,
    entityType: string,
    entityId: string,
    changes: { before?: any; after?: any }
  ): Promise<void> {
    console.debug('[ActivityLogger] logActivityWithChanges (stub):', { action, entityType, entityId });
  }

  async logCustomActivity(
    message: string,
    level: 'info' | 'warning' | 'error' | 'success' = 'info',
    details?: any
  ): Promise<void> {
    console.debug('[ActivityLogger] logCustomActivity (stub):', { message, level });
  }

  async logAuthActivity(action: string, user: any, details?: any): Promise<void> {
    console.debug('[ActivityLogger] logAuthActivity (stub):', { action });
  }

  async logCRUDActivity(
    operation: 'create' | 'update' | 'delete',
    entity: string,
    entityId: string,
    entityName?: string,
    details?: any
  ): Promise<void> {
    console.debug('[ActivityLogger] logCRUDActivity (stub):', { operation, entity, entityId });
  }

  async logSettingsActivity(
    action: string,
    category: string,
    oldValue?: any,
    newValue?: any
  ): Promise<void> {
    console.debug('[ActivityLogger] logSettingsActivity (stub):', { action, category });
  }
}

export const activityLogger = new ActivityLogger();

export const logActivity = (params: {
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
}) => {
  console.debug('[ActivityLogger] logActivity helper (stub):', params.action);
  return Promise.resolve();
};

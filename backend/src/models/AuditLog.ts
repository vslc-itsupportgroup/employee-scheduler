export interface AuditLog {
  id: string;
  action: string;
  entity_type: 'schedule' | 'change_request' | 'approval' | 'user';
  entity_id: string;
  performed_by: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  notes?: string;
  created_at: Date;
}

export interface ChangeRequest {
  id: string;
  schedule_id: string;
  requested_by: string;
  requested_shift_type_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Date;
  reviewer_remarks?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChangeRequestWithDetails extends ChangeRequest {
  original_schedule: {
    date: Date;
    shift_code: string;
    shift_name: string;
  };
  requested_shift: {
    shift_code: string;
    shift_name: string;
  };
  employee_name: string;
  requester_name: string;
}

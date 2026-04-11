export interface ShiftType {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface Schedule {
  id: string;
  employee_id: string;
  shift_type_id: string;
  scheduled_date: Date;
  status: 'approved' | 'pending' | 'rejected';
  created_by: string;
  approved_by?: string;
  approval_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduleWithDetails extends Schedule {
  shift_code: string;
  shift_name: string;
  employee_name: string;
}

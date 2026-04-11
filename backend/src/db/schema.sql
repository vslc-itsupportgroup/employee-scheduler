-- Create tables for Employee Scheduling System

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'manager', 'admin')),
  department VARCHAR(100),
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_secret VARCHAR(255),
  confirmation_email_enabled BOOLEAN DEFAULT false,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  password_expires_at TIMESTAMP,
  force_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email confirmations table
CREATE TABLE IF NOT EXISTS email_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmation_code VARCHAR(6) NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email configuration table
CREATE TABLE IF NOT EXISTS email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_server VARCHAR(255) NOT NULL,
  smtp_port INT NOT NULL,
  smtp_username VARCHAR(255) NOT NULL,
  smtp_password VARCHAR(500) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  test_email_subject VARCHAR(255) DEFAULT 'Test Email - Employee Scheduling System',
  confirmation_email_subject VARCHAR(255) DEFAULT 'Email Verification - Employee Scheduling System',
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shift types table
CREATE TABLE IF NOT EXISTS shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_type_id UUID NOT NULL REFERENCES shift_types(id),
  scheduled_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, scheduled_date)
);

-- Change requests table
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_shift_type_id UUID NOT NULL REFERENCES shift_types(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  reviewer_remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval tokens table (for email-based approval links)
CREATE TABLE IF NOT EXISTS approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login sessions table (for tracking logins and enabling revocation)
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  revoke_token VARCHAR(255) UNIQUE,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, token)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_two_fa_enabled ON users(two_fa_enabled);
-- Password policy table
CREATE TABLE IF NOT EXISTS password_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_length INT DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  password_expiry_days INT DEFAULT 90,
  password_history_count INT DEFAULT 3,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password history table (to prevent reuse)
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_confirmations_user_id ON email_confirmations(user_id);
CREATE INDEX idx_email_confirmations_expires_at ON email_confirmations(expires_at);
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_schedules_employee_id ON schedules(employee_id);
CREATE INDEX idx_schedules_scheduled_date ON schedules(scheduled_date);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_change_requests_schedule_id ON change_requests(schedule_id);
CREATE INDEX idx_change_requests_status ON change_requests(status);
CREATE INDEX idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX idx_login_sessions_token ON login_sessions(token);
CREATE INDEX idx_login_sessions_revoke_token ON login_sessions(revoke_token);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_approval_tokens_change_request_id ON approval_tokens(change_request_id);
CREATE INDEX idx_approval_tokens_token ON approval_tokens(token);
CREATE INDEX idx_approval_tokens_expires_at ON approval_tokens(expires_at);

-- Insert default shift types
INSERT INTO shift_types (code, name, description) VALUES
  ('7-4', 'Regular Shift', '7:00 AM - 4:00 PM'),
  ('RD', 'Rest Day', 'Day off'),
  ('VL', 'Vacation Leave', 'Paid vacation'),
  ('SPL', 'Special Leave', 'Special unpaid leave'),
  ('HDD', 'Holiday', 'Public holiday')
ON CONFLICT (code) DO NOTHING;

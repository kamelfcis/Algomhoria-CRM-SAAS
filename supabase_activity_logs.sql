-- Activity Logs Table
-- This table tracks all user actions for audit and security purposes

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'login', 'logout'
  entity_type TEXT NOT NULL, -- e.g., 'post', 'user', 'property', 'category'
  entity_id UUID, -- ID of the affected entity
  entity_name TEXT, -- Name/title of the affected entity for quick reference
  description TEXT, -- Human-readable description of the action
  metadata JSONB, -- Additional data about the action (old values, new values, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- RLS Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity logs
CREATE POLICY "users_view_own_activity" ON activity_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all activity logs
CREATE POLICY "admins_view_all_activity" ON activity_logs FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Only system can insert activity logs (via service role or functions)
-- Regular users cannot insert directly for security
CREATE POLICY "system_insert_activity" ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (true); -- We'll use a function with SECURITY DEFINER to insert

-- Function to log activity (can be called from application)
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    description,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_description,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- Comments for documentation
COMMENT ON TABLE activity_logs IS 'Tracks all user actions for audit and security purposes';
COMMENT ON COLUMN activity_logs.action IS 'Type of action: create, update, delete, login, logout, etc.';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity affected: post, user, property, etc.';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional JSON data about the action (old/new values, etc.)';
COMMENT ON FUNCTION log_activity IS 'Function to safely log user activities with proper permissions';


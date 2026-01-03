-- Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direct_lead_id UUID REFERENCES direct_leads(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('call', 'meeting', 'site_show', 'managerial_action', 'end', 'message')),
  result TEXT,
  notes TEXT,
  follow_up_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_lead_type CHECK (
    (lead_id IS NOT NULL AND direct_lead_id IS NULL) OR
    (lead_id IS NULL AND direct_lead_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_direct_lead_id ON lead_activities(direct_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by ON lead_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_action ON lead_activities(action);
CREATE INDEX IF NOT EXISTS idx_lead_activities_follow_up_date ON lead_activities(follow_up_date);

-- Create trigger for updated_at
CREATE TRIGGER update_lead_activities_updated_at BEFORE UPDATE ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


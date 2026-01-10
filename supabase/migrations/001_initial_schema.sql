-- ============================================
-- PrincetonAI Medical Phone Agent
-- Initial Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Submissions Table
-- Stores completed patient intake submissions
-- ============================================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  call_timestamp TIMESTAMPTZ NOT NULL,
  call_duration_secs INTEGER,
  caller_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  patient_data JSONB NOT NULL DEFAULT '{}',
  request_type TEXT,
  request_data JSONB,
  transcript TEXT,
  analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Call Logs Table
-- Stores webhook events and processing logs
-- ============================================
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_submissions_conversation_id ON submissions(conversation_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_submissions_request_type ON submissions(request_type);
CREATE INDEX idx_call_logs_conversation_id ON call_logs(conversation_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at DESC);

-- ============================================
-- Updated At Trigger
-- Automatically updates updated_at on row update
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for webhooks)
CREATE POLICY "Service role full access to submissions"
  ON submissions
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to call_logs"
  ON call_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Anon role can read submissions (for admin dashboard)
-- In production, replace with proper auth
CREATE POLICY "Anon can read submissions"
  ON submissions
  FOR SELECT
  USING (true);

CREATE POLICY "Anon can read call_logs"
  ON call_logs
  FOR SELECT
  USING (true);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE submissions IS 'Patient intake submissions from voice agent calls';
COMMENT ON TABLE call_logs IS 'Webhook processing logs and events';

COMMENT ON COLUMN submissions.conversation_id IS 'ElevenLabs conversation ID (unique per call)';
COMMENT ON COLUMN submissions.agent_id IS 'ElevenLabs agent ID';
COMMENT ON COLUMN submissions.status IS 'pending, completed, failed, requires_review';
COMMENT ON COLUMN submissions.patient_data IS 'Extracted patient information (name, postcode, phone, etc)';
COMMENT ON COLUMN submissions.request_type IS 'health_problem or repeat_prescription';
COMMENT ON COLUMN submissions.request_data IS 'Type-specific request details';
COMMENT ON COLUMN submissions.analysis IS 'Raw ElevenLabs analysis output';

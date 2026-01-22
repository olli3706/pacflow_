-- PackFlow Database Migrations for Supabase
-- Run these in your Supabase SQL Editor (Dashboard > SQL Editor)

-- =============================================================================
-- PAYMENTS TABLE
-- =============================================================================

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    work_period_start DATE,
    work_period_end DATE,
    hours_worked DECIMAL(10, 2) DEFAULT 0,
    rate DECIMAL(10, 2) DEFAULT 0,
    additional_fees DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'paid')),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add client_phone column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'client_phone') THEN
        ALTER TABLE payments ADD COLUMN client_phone TEXT;
    END IF;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migrations)
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON payments;

-- Policy: Users can only view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own payments
CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payments
CREATE POLICY "Users can update own payments" ON payments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own payments
CREATE POLICY "Users can delete own payments" ON payments
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SMS LOG TABLE (Optional - for tracking sent messages)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sms_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message_preview TEXT, -- First 50 chars of message
    message_id TEXT, -- From SMS Works API
    status TEXT,
    credits_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sms_log
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migrations)
DROP POLICY IF EXISTS "Users can view own sms_log" ON sms_log;
DROP POLICY IF EXISTS "Users can insert own sms_log" ON sms_log;

-- Users can only view their own SMS logs
CREATE POLICY "Users can view own sms_log" ON sms_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own SMS logs
CREATE POLICY "Users can insert own sms_log" ON sms_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_sms_log_user_id ON sms_log(user_id);

-- =============================================================================
-- USER BANK DETAILS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_bank_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    sort_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure one bank details record per user
    UNIQUE(user_id)
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_user_bank_details_user_id ON user_bank_details(user_id);

-- Enable RLS on user_bank_details table
ALTER TABLE user_bank_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migrations)
DROP POLICY IF EXISTS "Users can view own bank details" ON user_bank_details;
DROP POLICY IF EXISTS "Users can insert own bank details" ON user_bank_details;
DROP POLICY IF EXISTS "Users can update own bank details" ON user_bank_details;
DROP POLICY IF EXISTS "Users can delete own bank details" ON user_bank_details;

-- Policy: Users can only view their own bank details
CREATE POLICY "Users can view own bank details" ON user_bank_details
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own bank details
CREATE POLICY "Users can insert own bank details" ON user_bank_details
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bank details
CREATE POLICY "Users can update own bank details" ON user_bank_details
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bank details
CREATE POLICY "Users can delete own bank details" ON user_bank_details
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamp for bank details
DROP TRIGGER IF EXISTS update_user_bank_details_updated_at ON user_bank_details;
CREATE TRIGGER update_user_bank_details_updated_at
    BEFORE UPDATE ON user_bank_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add missing subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active' 
CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid')),
ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) DEFAULT 'month' 
CHECK (subscription_period IN ('month', 'year')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_ends_at ON profiles(subscription_ends_at);

-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_status IS 'Current status of the user subscription';
COMMENT ON COLUMN profiles.subscription_period IS 'Billing period: monthly or yearly';
COMMENT ON COLUMN profiles.subscription_ends_at IS 'Timestamp when the current subscription period ends';
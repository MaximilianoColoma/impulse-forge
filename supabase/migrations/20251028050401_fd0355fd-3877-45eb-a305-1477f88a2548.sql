-- Add onboarding and accessibility preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS low_motion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{}';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_low_motion ON profiles(low_motion);
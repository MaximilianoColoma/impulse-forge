-- Add high_contrast column to profiles table for WCAG AAA accessibility
ALTER TABLE profiles ADD COLUMN high_contrast BOOLEAN DEFAULT false NOT NULL;

-- Add index for better query performance on theme and accessibility preferences
CREATE INDEX IF NOT EXISTS idx_profiles_theme ON profiles(theme);
CREATE INDEX IF NOT EXISTS idx_profiles_accessibility ON profiles(high_contrast) WHERE high_contrast = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.high_contrast IS 'WCAG AAA high contrast mode preference (7:1 contrast ratio)';
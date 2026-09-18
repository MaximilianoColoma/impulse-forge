-- Rollback Referral Program Tables
-- This removes the incomplete referral system that is causing build issues

DROP TABLE IF EXISTS referral_rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;

-- Note: This migration removes all referral data
-- The referral system can be re-implemented later with complete edge functions
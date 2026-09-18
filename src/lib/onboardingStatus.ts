import { supabase } from "@/integrations/supabase/client";

export async function getOnboardingCompleted(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data.onboarding_completed === true;
}

export async function persistOnboardingCompleted(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId)
    .select("id")
    .single();

  if (error) throw error;
}

import { supabase } from '@/integrations/supabase/client';
import { runtimeFeatures } from '@/lib/runtimeFeatures';

export async function searchImpulses(searchTerm: string): Promise<any[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  if (!runtimeFeatures.optionalAiEnabled) {
    const normalizedTerm = searchTerm.trim();
    const { data, error } = await supabase
      .from('impulses')
      .select('*')
      .ilike('content', `%${normalizedTerm}%`)
      .limit(50);

    if (error) {
      console.error('Error searching impulses locally:', error);
      return [];
    }

    return data ?? [];
  }

  try {
    const { data, error } = await supabase.functions.invoke('semantic-search', {
      body: { searchTerm }
    });

    if (error) {
      console.error('Error searching impulses:', error);
      return [];
    }

    return data?.impulses || [];
  } catch (error) {
    console.error('Error calling semantic-search function:', error);
    return [];
  }
}

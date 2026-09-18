import { supabase } from '@/integrations/supabase/client';
import { runtimeFeatures } from '@/lib/runtimeFeatures';

// Simple local cache for tag results
const tagCache = new Map<string, { tags: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// German stop words to filter out from local tagging
const STOP_WORDS = new Set([
  'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'mit', 'für',
  'von', 'zu', 'in', 'auf', 'an', 'bei', 'nach', 'vor', 'über', 'unter',
  'ist', 'sind', 'war', 'hat', 'haben', 'wird', 'werden', 'kann', 'muss',
  'soll', 'will', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'den',
  'dem', 'des', 'dass', 'wenn', 'weil', 'als', 'auch', 'noch', 'schon',
  'the', 'a', 'an', 'is', 'are', 'was', 'has', 'have', 'will', 'can',
  'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'and', 'or',
]);

/**
 * Local fallback: extract meaningful words as tags
 */
function generateLocalTags(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s-]/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Count word frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency, take top 3-5
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.min(5, Math.max(1, Math.floor(freq.size / 3))))
    .map(([word]) => word);
}

export async function generateTags(content: string, projectId?: string): Promise<string[]> {
  if (!content || content.trim().length < 5) {
    return [];
  }

  if (!runtimeFeatures.optionalAiEnabled) {
    return generateLocalTags(content);
  }

  // Check cache first
  const cacheKey = `${content.trim().slice(0, 200)}:${projectId || ''}`;
  const cached = tagCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tags;
  }

  try {
    // Try AI tagging with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const { data, error } = await supabase.functions.invoke('generate-tags', {
      body: { content, projectId },
    });

    clearTimeout(timeout);

    if (error) throw error;

    const tags = data?.tags || [];
    if (tags.length > 0) {
      tagCache.set(cacheKey, { tags, timestamp: Date.now() });
      return tags;
    }

    // AI returned empty → use fallback
    const fallbackTags = generateLocalTags(content);
    tagCache.set(cacheKey, { tags: fallbackTags, timestamp: Date.now() });
    return fallbackTags;
  } catch {
    // AI failed → use local fallback silently
    const fallbackTags = generateLocalTags(content);
    tagCache.set(cacheKey, { tags: fallbackTags, timestamp: Date.now() });
    return fallbackTags;
  }
}

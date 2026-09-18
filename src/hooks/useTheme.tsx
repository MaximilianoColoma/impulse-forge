import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [highContrast, setHighContrast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  // Load theme and high contrast from Supabase or localStorage
  const loadTheme = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme, high_contrast')
          .eq('id', user.id)
          .single();
        
        if (profile?.theme) {
          setTheme(profile.theme as Theme);
          setHighContrast(profile.high_contrast || false);
          applyTheme(profile.theme as Theme, profile.high_contrast || false);
        } else {
          const stored = localStorage.getItem('theme') as Theme;
          const storedContrast = localStorage.getItem('highContrast') === 'true';
          if (stored) {
            setTheme(stored);
            setHighContrast(storedContrast);
            applyTheme(stored, storedContrast);
          } else {
            applyTheme('system', false);
          }
        }
      } else {
        const stored = localStorage.getItem('theme') as Theme;
        const storedContrast = localStorage.getItem('highContrast') === 'true';
        if (stored) {
          setTheme(stored);
          setHighContrast(storedContrast);
          applyTheme(stored, storedContrast);
        } else {
          applyTheme('system', false);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      applyTheme('system', false);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply theme and high contrast to document
  const applyTheme = (newTheme: Theme, contrast: boolean) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }

    // Apply high contrast mode
    if (contrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  };

  // Save theme to Supabase and localStorage
  const saveTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme, highContrast);
    localStorage.setItem('theme', newTheme);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Save high contrast preference
  const saveHighContrast = async (contrast: boolean) => {
    setHighContrast(contrast);
    applyTheme(theme, contrast);
    localStorage.setItem('highContrast', contrast.toString());
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ high_contrast: contrast })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving high contrast:', error);
    }
  };

  return {
    theme,
    setTheme: saveTheme,
    highContrast,
    setHighContrast: saveHighContrast,
    isLoading
  };
}

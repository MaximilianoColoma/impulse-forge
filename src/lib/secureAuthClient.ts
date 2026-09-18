import { supabase } from '@/integrations/supabase/client';

export const secureAuth = {
  // Login with HttpOnly cookies
  async login(email: string, password: string) {
    const response = await supabase.functions.invoke('secure-login', {
      body: { email, password }
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.data;
  },
  
  // Logout with cookie deletion
  async logout() {
    const response = await supabase.functions.invoke('secure-logout');
    
    if (response.error) {
      throw new Error('Logout failed');
    }
    
    // Client-side session clearing
    await supabase.auth.signOut();
    
    return response.data;
  },
  
  // Token refresh with HttpOnly cookies
  async refreshSession() {
    const response = await supabase.functions.invoke('refresh-session');
    
    if (response.error) {
      throw new Error('Session refresh failed');
    }
    
    return response.data;
  }
};

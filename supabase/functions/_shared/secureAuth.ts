import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const setSecureCookie = (res: Response, name: string, value: string, options: {
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
} = {}) => {
  const {
    maxAge,
    expires,
    secure = true,
    httpOnly = true,
    sameSite = 'strict',
    path = '/'
  } = options;
  
  let cookieString = `${name}=${value}; path=${path}`;
  
  if (maxAge) cookieString += `; max-age=${maxAge}`;
  if (expires) cookieString += `; expires=${expires.toUTCString()}`;
  if (secure) cookieString += '; secure';
  if (httpOnly) cookieString += '; httpOnly';
  if (sameSite) cookieString += `; samesite=${sameSite}`;
  
  res.headers.append('Set-Cookie', cookieString);
};

export const clearSecureCookie = (res: Response, name: string) => {
  res.headers.append('Set-Cookie', `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httpOnly; secure; samesite=strict`);
};

// Middleware to validate HttpOnly cookies
export const validateSecureCookie = (req: Request, cookieName: string): string | null => {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies[cookieName] || null;
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { passwordSchema } from '@/lib/validation/auth';
import { useAuth } from '@/hooks/useAuth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { passwordRecoveryActive, clearPasswordRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Keep the externally visible result identical to prevent account enumeration.
    } finally {
      setRequestSent(true);
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    
    if (!passwordSchema.safeParse(password).success) {
      toast.error('Nutze 8–100 Zeichen mit Großbuchstaben, Kleinbuchstaben und mindestens einer Zahl.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      toast.success('Passwort erfolgreich zurückgesetzt');
      clearPasswordRecovery();
      
      // Redirect to login page after successful reset
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch {
      toast.error(
        'Das Passwort konnte gerade nicht geändert werden. Bitte öffne den Reset-Link erneut oder versuche es später.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!passwordRecoveryActive) {
    return (
      <>
        <Helmet>
          <title>Passwort zurücksetzen - Synapse</title>
          <meta name="description" content="Fordere einen Link zum Zurücksetzen deines Synapse-Passworts an" />
        </Helmet>

        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{requestSent ? 'E-Mail prüfen' : 'Passwort zurücksetzen'}</CardTitle>
              <CardDescription>
                {requestSent
                  ? 'Wenn ein Konto für diese E-Mail existiert, erhältst du gleich einen Reset-Link.'
                  : 'Gib die E-Mail-Adresse deines Synapse-Kontos ein.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestSent ? (
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Zur Anmeldung
                </Button>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-Mail</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Wird angefordert...' : 'Reset-Link anfordern'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }


  return (
    <>
      <Helmet>
        <title>Passwort zurücksetzen - Synapse</title>
        <meta name="description" content="Setzen Sie Ihr Synapse Passwort zurück" />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Passwort zurücksetzen</CardTitle>
            <CardDescription>
              Setzen Sie Ihr neues Passwort fest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Neues Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={100}
                  required
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Passwort wiederholen"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Wird verarbeitet...' : 'Passwort zurücksetzen'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

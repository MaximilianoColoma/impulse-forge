import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authSchema, loginSchema } from '@/lib/validation/auth';
import { sanitizeInput } from '@/lib/sanitize';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') !== 'signup';
  const [isLogin, setIsLogin] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Check for saved redirect path
      let redirectPath = '/app';
      try {
        const saved = localStorage.getItem('synapse_redirect_path');
        if (saved && saved.startsWith('/')) {
          redirectPath = saved;
          localStorage.removeItem('synapse_redirect_path');
        }
      } catch {
        // localStorage might be unavailable
      }
      navigate(redirectPath);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // Don't sanitize password as it may contain special chars

    // Validate inputs
    try {
      const schema = isLogin ? loginSchema : authSchema;
      schema.parse({ email: sanitizedEmail, password: sanitizedPassword });
    } catch (error: any) {
      const errors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        errors[err.path[0]] = err.message;
      });
      setValidationErrors(errors);
      toast.error('Bitte korrigiere die Fehler im Formular');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(sanitizedEmail, sanitizedPassword);
      } else {
        await signUp(sanitizedEmail, sanitizedPassword);
        toast.success('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail-Adresse zur Bestätigung.');
        navigate('/email-confirmation');
        return;
      }
    } catch (error) {
      // Error handling is done in useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Synapse</h1>
          <p className="text-muted-foreground">
            Verwandle dein ADHS in deine Superkraft
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="deine@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              required
              className={`bg-background ${validationErrors.email ? 'border-destructive' : ''}`}
              aria-invalid={!!validationErrors.email}
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
            />
            {validationErrors.email && (
              <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors(prev => ({ ...prev, password: '' }));
                }
              }}
              required
              minLength={isLogin ? 1 : 8}
              className={`bg-background ${validationErrors.password ? 'border-destructive' : ''}`}
              aria-invalid={!!validationErrors.password}
              aria-describedby={validationErrors.password ? 'password-error' : undefined}
            />
            {validationErrors.password && (
              <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.password}
              </p>
            )}
            {!isLogin && !validationErrors.password && (
              <p className="text-xs text-muted-foreground">
                Mindestens 8 Zeichen mit Groß-, Kleinbuchstaben und einer Zahl
              </p>
            )}
            {isLogin && (
              <div className="text-right">
                <Link
                  to="/reset-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Passwort vergessen?
                </Link>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>{isLogin ? 'Anmelden' : 'Account erstellen'}</>
            )}
          </Button>

          {!isLogin && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Mit der Registrierung akzeptierst du die{' '}
              <Link to="/beta-bedingungen" className="text-primary hover:underline">
                Bedingungen der kostenlosen Beta
              </Link>{' '}
              und bestätigst, die{' '}
              <Link to="/datenschutz" className="text-primary hover:underline">
                Datenschutzerklärung
              </Link>{' '}
              gelesen zu haben.
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isLogin ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Anmelden'}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4 border-t pt-4 text-xs text-muted-foreground">
          <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
        </div>
      </Card>
    </div>
  );
}

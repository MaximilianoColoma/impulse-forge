import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLowMotion } from "@/hooks/useLowMotion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, User, TrendingUp, Settings as SettingsIcon, Key, Copy, Check, Share2, Undo2, Crown, Zap, Sparkles, Shield, Moon, Sun, Monitor, Maximize2, Eye } from "lucide-react";
import { toast } from "sonner";
import { ToolManager } from "@/components/ToolManager";
import { RollbackButton } from "@/components/RollbackButton";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/i18n";
import { TeamSeatsMembers } from "@/components/tenancy/TeamSeatsMembers";
import { billingEnabled } from "@/lib/billing";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme, highContrast, setHighContrast } = useTheme();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalImpulses: 0,
    thisWeekImpulses: 0,
    completedTasks: 0,
  });
  const [pomodoroLength, setPomodoroLength] = useState("25");
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [seats, setSeats] = useState<number>(5);
  const [pendingSeats, setPendingSeats] = useState<number | null>(null);
  const [pendingEffectiveAt, setPendingEffectiveAt] = useState<string | null>(null);
  const [newSeats, setNewSeats] = useState<number>(5);
  const [seatsSaving, setSeatsSaving] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    fetchStats();
    loadPomodoroSetting();
    fetchSubscriptionTier();
  }, []);

  const fetchSubscriptionTier = async () => {
    try {
      // Check admin status first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdminResult } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(!!isAdminResult);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, seats, pending_seats, pending_seats_effective_at')
        .single();
      
      if (error) throw error;
      
      setSubscriptionTier(data?.subscription_tier || 'free');
      const s = (data as { seats?: number | null } | null)?.seats ?? 5;
      setSeats(s);
      setNewSeats(s);
      setPendingSeats(((data as { pending_seats?: number | null } | null)?.pending_seats) ?? null);
      setPendingEffectiveAt(((data as { pending_seats_effective_at?: string | null } | null)?.pending_seats_effective_at) ?? null);
    } catch (error) {
      console.error('Error fetching subscription tier:', error);
    }
  };

  const handleSeatChange = async () => {
    if (!billingEnabled) {
      toast.error('Bezahlte Pläne sind während der kostenlosen Beta deaktiviert');
      return;
    }
    setSeatsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-seat-change', {
        body: { newSeats },
      });
      if (error) throw error;
      if (data?.mode === 'immediate') {
        toast.success(t('settings.seats.success_immediate'));
        setSeats(newSeats);
        setPendingSeats(null);
        setPendingEffectiveAt(null);
      } else {
        toast.success(t('settings.seats.success_scheduled'));
        setPendingSeats(newSeats);
        setPendingEffectiveAt(data?.effectiveAt ?? null);
      }
    } catch (e) {
      console.error('seat change error', e);
      toast.error(t('settings.seats.error'));
    } finally {
      setSeatsSaving(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total impulses
      const { count: total } = await supabase
        .from("impulses")
        .select("*", { count: "exact", head: true });

      // This week impulses
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: thisWeek } = await supabase
        .from("impulses")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Completed tasks
      const { count: completed } = await supabase
        .from("impulses")
        .select("*", { count: "exact", head: true })
        .eq("status", "done");

      setStats({
        totalImpulses: total || 0,
        thisWeekImpulses: thisWeek || 0,
        completedTasks: completed || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const loadPomodoroSetting = () => {
    const saved = localStorage.getItem("pomodoroLength");
    if (saved) {
      setPomodoroLength(saved);
    }
  };

  const savePomodoroSetting = (value: string) => {
    setPomodoroLength(value);
    localStorage.setItem("pomodoroLength", value);
    toast.success("Pomodoro-Länge gespeichert");
  };

  const generateApiToken = async () => {
    setGeneratingToken(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-api-token');

      if (error) {
        console.error('Error generating token:', error);
        toast.error('Fehler beim Generieren des Tokens');
        return;
      }

      setApiToken(data.token);
      setTokenExpiry(data.expiresAt);
      toast.success('API-Token erfolgreich generiert');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Generieren des Tokens');
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToken = async () => {
    if (apiToken) {
      try {
        await navigator.clipboard.writeText(apiToken);
        setCopiedToken(true);
        toast.success('Token in Zwischenablage kopiert');
        setTimeout(() => setCopiedToken(false), 2000);
      } catch (error) {
        console.error('Error copying token:', error);
        toast.error('Fehler beim Kopieren');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>

        <h1 className="text-3xl font-bold mb-8">Einstellungen</h1>

        <div className="space-y-6">
          {/* Account Info */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Account</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">E-Mail-Adresse</Label>
                <p className="text-foreground font-medium mt-1">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={signOut} className="mt-4">
                Logout
              </Button>
            </div>
          </Card>

          {/* Subscription */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                {isAdmin ? (
                  <Shield className="h-5 w-5 text-primary" />
                ) : subscriptionTier === 'power' ? (
                  <Crown className="h-5 w-5 text-primary" />
                ) : subscriptionTier === 'pro' ? (
                  <Sparkles className="h-5 w-5 text-primary" />
                ) : (
                  <Zap className="h-5 w-5 text-primary" />
                )}
              </div>
              <h2 className="text-xl font-semibold">Dein Plan</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktueller Plan</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold text-primary capitalize">
                      {isAdmin ? 'Admin' : (
                        <>
                          {subscriptionTier === 'free' && 'Free'}
                          {subscriptionTier === 'pro' && 'Pro'}
                          {subscriptionTier === 'power' && 'Power'}
                          {subscriptionTier === 'enterprise' && 'Enterprise'}
                        </>
                      )}
                    </p>
                  </div>
                  {isAdmin && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Voller Zugriff auf alle Funktionen
                    </p>
                  )}
                </div>
                {!isAdmin && (billingEnabled ? (
                  <Button onClick={() => navigate('/pricing')} variant="default">
                    Plan upgraden
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Kostenlose Beta
                  </Button>
                ))}
              </div>
              
              {billingEnabled && subscriptionTier === 'free' && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2">
                    🚀 Schalte Superkräfte frei
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade zu Pro oder Power und nutze KI-Tagging, semantische Suche, 
                    erweiterte Analytics und vieles mehr.
                  </p>
                </div>
              )}
              
              {billingEnabled && subscriptionTier !== 'free' && !isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('customer-portal');
                      if (error) throw error;
                      if (data?.url) {
                        window.open(data.url, '_blank');
                      }
                    } catch (error) {
                      console.error('Error opening customer portal:', error);
                      toast.error('Fehler beim Öffnen des Kundenportals');
                    }
                  }}
                >
                  Abo verwalten
                </Button>
              )}
            </div>
          </Card>

          {/* Team Seats (Enterprise only) */}
          {billingEnabled && subscriptionTier === 'enterprise' && !isAdmin && (
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{t('settings.seats.title')}</h2>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('settings.seats.description')}</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('settings.seats.current')}</span>
                  <span className="text-2xl font-bold text-primary">{seats}</span>
                </div>

                {pendingSeats && pendingEffectiveAt && (
                  <div className="p-3 rounded-md border border-warning/40 bg-warning/5 text-sm">
                    {t('settings.seats.pending', {
                      seats: String(pendingSeats),
                      date: new Date(pendingEffectiveAt).toLocaleDateString(),
                    })}
                  </div>
                )}

                <div>
                  <Label htmlFor="seats-slider">{t('settings.seats.slider_label')}</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <input
                      id="seats-slider"
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={newSeats}
                      onChange={(e) => setNewSeats(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-mono">{newSeats}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{t('settings.seats.hint')}</p>

                <Button
                  onClick={handleSeatChange}
                  disabled={seatsSaving || newSeats === seats}
                >
                  {seatsSaving ? t('settings.seats.updating') : t('settings.seats.cta')}
                </Button>
              </div>
            </Card>
          )}

          {/* Team members / seat assignment (Enterprise only) */}
          {billingEnabled && subscriptionTier === 'enterprise' && !isAdmin && (
            <TeamSeatsMembers />
          )}

          {/* Statistics */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Deine Statistiken</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">Impulse diese Woche</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {stats.thisWeekImpulses}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">Gesamt Impulse</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {stats.totalImpulses}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">Erledigte Aufgaben</p>
                <p className="text-3xl font-bold text-success mt-2">
                  {stats.completedTasks}
                </p>
              </div>
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Präferenzen</h2>
            </div>
            <div className="space-y-6">
              {/* Language Selection */}
              <LanguageSetting />

              {/* Theme Selection */}
              <div>
                <Label htmlFor="theme-select">Design-Modus</Label>
                <Select
                  value={theme}
                  onValueChange={(value) => {
                    setTheme(value as 'light' | 'dark' | 'system');
                    toast.success('Design-Modus aktualisiert');
                  }}
                >
                  <SelectTrigger id="theme-select" className="mt-2" aria-label="Design-Modus auswählen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" aria-hidden="true" />
                        <span>Hell</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" aria-hidden="true" />
                        <span>Dunkel</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" aria-hidden="true" />
                        <span>System</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Wähle zwischen hellem und dunklem Modus oder folge den Systemeinstellungen.
                </p>
              </div>

              {/* High Contrast Mode */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast-toggle" className="text-base">
                    Hoher Kontrast (WCAG AAA)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Aktiviere maximale Kontrastverhältnisse für bessere Lesbarkeit
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="high-contrast-toggle"
                  checked={highContrast}
                  onChange={(e) => {
                    setHighContrast(e.target.checked);
                    toast.success(
                      e.target.checked
                        ? "Hoher Kontrast aktiviert"
                        : "Hoher Kontrast deaktiviert"
                    );
                  }}
                  className="h-5 w-5 rounded"
                />
              </div>
            </div>
          </Card>

          {/* Accessibility Settings */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Barrierefreiheit</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Passe die visuelle Darstellung an deine Bedürfnisse an
              </p>
              
              <AccessibilityToggles />
            </div>
          </Card>

          {/* Tools */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">App-Einstellungen</h2>
            </div>
            <div className="space-y-6">
              <div>
                <Label htmlFor="pomodoro-length">Standard Pomodoro-Länge</Label>
                <Select
                  value={pomodoroLength}
                  onValueChange={savePomodoroSetting}
                >
                  <SelectTrigger id="pomodoro-length" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minuten</SelectItem>
                    <SelectItem value="20">20 Minuten</SelectItem>
                    <SelectItem value="25">25 Minuten (Standard)</SelectItem>
                    <SelectItem value="30">30 Minuten</SelectItem>
                    <SelectItem value="45">45 Minuten</SelectItem>
                    <SelectItem value="60">60 Minuten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Tool Manager */}
          <ToolManager />

          {/* Share Feature Guide */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Teilen-Funktion</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Erfasse Impulse direkt aus jeder App heraus – Browser, Mail, Notizen und mehr.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h3 className="font-semibold text-sm mb-2">📱 So funktioniert's auf dem Smartphone:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Öffne einen interessanten Artikel, eine E-Mail oder Notiz</li>
                    <li>Tippe auf das Teilen-Symbol (meistens <Share2 className="inline h-3 w-3" />)</li>
                    <li>Wähle "Synapse" aus der Liste der Apps</li>
                    <li>Der Inhalt wird automatisch als Impuls erfasst!</li>
                  </ol>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-2">💡 Pro-Tipp</p>
                  <p className="text-xs text-muted-foreground">
                    Installiere Synapse auf deinem Startbildschirm, um die Teilen-Funktion zu aktivieren. 
                    Der Install-Prompt erscheint automatisch beim ersten Besuch.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Swipe Gestures Guide */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-orange-500/10 p-2">
                <span className="text-xl">👆</span>
              </div>
              <h2 className="text-xl font-semibold">Wischgesten auf dem Smartphone</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Archiviere oder lösche Projekte und Impulse blitzschnell mit intuitiven Wischgesten.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h3 className="font-semibold text-sm mb-2">📦 Archivieren (50% nach links wischen):</h3>
                  <p className="text-sm text-muted-foreground">
                    Wische ein Projekt oder einen Impuls zur Hälfte nach links, um ihn zu archivieren. 
                    Der orangefarbene Hintergrund zeigt an, dass die Aktion ausgelöst wird.
                  </p>
                </div>

                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h3 className="font-semibold text-sm mb-2">🗑️ Löschen (80% nach links wischen):</h3>
                  <p className="text-sm text-muted-foreground">
                    Wische ein Item fast vollständig nach links, um es zu löschen. 
                    Der rote Hintergrund signalisiert diese Aktion. Du wirst vor dem Löschen um Bestätigung gebeten.
                  </p>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-2">💡 Haptisches Feedback</p>
                  <p className="text-xs text-muted-foreground">
                    Dein Smartphone vibriert leicht, sobald du den Schwellenwert für eine Aktion erreichst, 
                    damit du genau weißt, wann die Geste registriert wird.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Rollback Section */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Undo2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Struktur wiederherstellen</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Falls dir eine KI-Optimierung nicht gefällt, kannst du die letzte Änderung rückgängig machen.
              </p>
              <RollbackButton onUpdate={() => window.location.reload()} />
            </div>
          </Card>

          {/* API Access */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-secondary/10 p-2">
                <Key className="h-5 w-5 text-secondary" />
              </div>
              <h2 className="text-xl font-semibold">API-Zugriff</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Generiere einen API-Token, um Impulse von externen Systemen wie Centraly zu erstellen.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/api-docs')}
                >
                  📖 API-Dokumentation
                </Button>
              </div>
              
              <Button
                onClick={generateApiToken}
                disabled={generatingToken}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {generatingToken ? 'Generiere...' : 'API-Token generieren'}
              </Button>

              {apiToken && (
                <div className="space-y-3 mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Dein API-Token</Label>
                      <div className="mt-1 p-3 bg-background rounded border border-border font-mono text-xs break-all">
                        {apiToken}
                      </div>
                    </div>
                    <Button
                      onClick={copyToken}
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                    >
                      {copiedToken ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {tokenExpiry && (
                    <p className="text-xs text-muted-foreground">
                      Gültig bis: {new Date(tokenExpiry).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                  
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-xs text-destructive-foreground">
                      ⚠️ Wichtig: Behandle diesen Token wie ein Passwort und teile ihn nicht öffentlich.
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label className="text-sm font-semibold">API-Endpunkt</Label>
                    <div className="p-3 bg-background rounded border border-border">
                      <code className="text-xs text-primary">
                        POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-impulse-api
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sende den Token im <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code> Header.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Accessibility Toggles Component
const AccessibilityToggles = () => {
  const { isLowMotion, isCompactMode, updateLowMotion, updateCompactMode } = useLowMotion();
  
  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="space-y-0.5 flex-1">
          <Label htmlFor="low-motion-toggle" className="text-base">
            Reduzierte Animationen
          </Label>
          <p className="text-sm text-muted-foreground">
            Weniger Bewegung für bessere Konzentration
          </p>
        </div>
        <input
          type="checkbox"
          id="low-motion-toggle"
          checked={isLowMotion}
          onChange={(e) => updateLowMotion(e.target.checked)}
          className="h-5 w-5 rounded"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="space-y-0.5 flex-1">
          <Label htmlFor="compact-mode-toggle" className="text-base">
            Kompakter Modus
          </Label>
          <p className="text-sm text-muted-foreground">
            Mehr Inhalt auf weniger Platz
          </p>
        </div>
        <input
          type="checkbox"
          id="compact-mode-toggle"
          checked={isCompactMode}
          onChange={(e) => updateCompactMode(e.target.checked)}
          className="h-5 w-5 rounded"
        />
      </div>
    </>
  );
};

function LanguageSetting() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div>
      <Label htmlFor="language-select">{t('settings.language.title')}</Label>
      <Select
        value={locale}
        onValueChange={(value) => {
          setLocale(value as 'de' | 'en');
          toast.success(t('settings.language.updated'));
        }}
      >
        <SelectTrigger id="language-select" className="mt-2" aria-label={t('settings.language.title')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="de">{t('settings.language.de')}</SelectItem>
          <SelectItem value="en">{t('settings.language.en')}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground mt-2">
        {t('settings.language.description')}
      </p>
    </div>
  );
}

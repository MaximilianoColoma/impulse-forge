import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, TrendingUp, Zap, Target, Lightbulb, AlertCircle, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useActivityStatus } from '@/hooks/useActivityStatus';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { UnlockDialog } from '@/components/UnlockDialog';
import { LockedState } from '@/components/LockedState';
import { runtimeFeatures } from '@/lib/runtimeFeatures';

interface AnalyticsData {
  topProductiveTimes: Array<{ day: string; hour: number; impulseCount: number }>;
  projectTriggers: Array<{ projectName: string; impulseCount: number }>;
  successPatterns: Array<{ pattern: string; confidence: string }>;
  proactiveSuggestion: string;
  dataAvailable: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export default function Analytics() {
  const navigate = useNavigate();
  const { data: activityStatus } = useActivityStatus();
  const { tier, isLoading: tierLoading } = useSubscriptionTier();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runtimeFeatures.optionalAiEnabled) {
      setError('Optionale KI-Analytics ist in der privaten PWA deaktiviert.');
      setLoading(false);
      return;
    }

    if (tier !== 'free' && !tierLoading) {
      fetchAnalytics();
    } else if (!tierLoading) {
      setLoading(false);
    }
  }, [tier, tierLoading]);

  const fetchAnalytics = async () => {
    if (!runtimeFeatures.optionalAiEnabled) {
      setError('Optionale KI-Analytics ist in der privaten PWA deaktiviert.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-patterns', {
        body: {}
      });

      if (analysisError) {
        throw analysisError;
      }

      if (analysisData.error) {
        throw new Error(analysisData.error);
      }

      setData(analysisData);
    } catch (err: any) {
      console.error('Analytics error:', err);
      setError(err.message || 'Fehler beim Laden der Analytics');
      toast.error('Analytics-Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'hoch':
        return 'text-green-500';
      case 'mittel':
        return 'text-yellow-500';
      case 'niedrig':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Analytics & Insights</h1>
            </div>
          </div>
          {tier !== 'free' && (
            <Button onClick={fetchAnalytics} disabled={loading || !runtimeFeatures.optionalAiEnabled}>
              Aktualisieren
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {tier === 'free' ? (
          <LockedState 
            requiredTier="pro"
            feature="Analytics & Insights"
            description="Erhalte tiefe Einblicke in deine Produktivitätsmuster, optimale Arbeitszeiten und Erfolgs-Trends mit KI-gestützten Analytics."
          />
        ) : loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Fehler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={fetchAnalytics}
                variant="outline"
                disabled={!runtimeFeatures.optionalAiEnabled}
              >
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        ) : !data?.dataAvailable ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Noch keine Daten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {data?.proactiveSuggestion || 'Erfasse mehr Impulse, um personalisierte Insights zu erhalten.'}
              </p>
              <Button onClick={() => navigate('/')}>
                Zu den Impulsen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Proactive Suggestion Card */}
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Deine persönliche Empfehlung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{data.proactiveSuggestion}</p>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Productive Times Chart */}
              {data.topProductiveTimes && data.topProductiveTimes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Deine produktivsten Zeiten
                    </CardTitle>
                    <CardDescription>
                      Wochentage und Uhrzeiten mit den meisten Impulsen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.topProductiveTimes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="day" 
                          stroke="hsl(var(--foreground))"
                          tick={{ fill: 'hsl(var(--foreground))' }}
                        />
                        <YAxis 
                          stroke="hsl(var(--foreground))"
                          tick={{ fill: 'hsl(var(--foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                        <Bar dataKey="impulseCount" fill="hsl(var(--primary))" name="Impulse" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Project Triggers Chart */}
              {data.projectTriggers && data.projectTriggers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Projekt-Trigger
                    </CardTitle>
                    <CardDescription>
                      Projekte, die die meisten Impulse auslösen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.projectTriggers}
                          dataKey="impulseCount"
                          nameKey="projectName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.projectName}: ${entry.impulseCount}`}
                        >
                          {data.projectTriggers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Success Patterns */}
            {data.successPatterns && data.successPatterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Erfolgs-Muster
                  </CardTitle>
                  <CardDescription>
                    Entdeckte Zusammenhänge in deinem Arbeitsverhalten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.successPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="mt-1">
                          <div className={`h-2 w-2 rounded-full ${
                            pattern.confidence === 'hoch' ? 'bg-green-500' :
                            pattern.confidence === 'mittel' ? 'bg-yellow-500' :
                            'bg-orange-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm mb-1">{pattern.pattern}</p>
                          <p className={`text-xs font-medium ${getConfidenceColor(pattern.confidence)}`}>
                            Konfidenz: {pattern.confidence}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <UnlockDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog} />
      </main>
    </div>
  );
}
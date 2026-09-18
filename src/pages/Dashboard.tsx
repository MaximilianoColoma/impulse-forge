import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ImpulseCatcher } from '@/components/ImpulseCatcher';
import { ImpulseCard } from '@/components/ImpulseCard';
import { ExportModal } from '@/components/ExportModal';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { Onboarding } from '@/components/Onboarding';
import { InstallPrompt } from '@/components/InstallPrompt';
import { FocusBlockWidget } from '@/components/dashboard/FocusBlockWidget';
import { SmartMatchingWidget } from '@/components/dashboard/SmartMatchingWidget';
import { EvolutionNotification } from '@/components/EvolutionNotification';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, X, Loader2, TrendingUp, Settings as SettingsIcon, Lightbulb, Shield, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { searchImpulses } from '@/services/semanticSearch';
import { useNavigate } from 'react-router-dom';
import { useAppBadge } from '@/hooks/useAppBadge';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getOnboardingCompleted, persistOnboardingCompleted } from '@/lib/onboardingStatus';

export default function Dashboard() {
  const [impulses, setImpulses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catcherOpen, setCatcherOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { clearBadge } = useAppBadge();
  const { isAdmin } = useSubscriptionTier();
  const queryClient = useQueryClient();
  
  const debouncedSearchTerm = useDebounce(searchTerm, 800);

  // Pull-to-refresh functionality
  const handleRefresh = async () => {
    await Promise.all([
      fetchImpulses(),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['user-activity-status'] }),
    ]);
    toast.success('Daten aktualisiert');
  };

  const {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing: isPullRefreshing,
    pullProgress,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await handleRefresh();
    } finally {
      setIsManualRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchImpulses();
    
    // Clear badge when user views the dashboard
    clearBadge();

    // Set up keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R: Refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleManualRefresh();
        return;
      }
      
      // Ctrl/Cmd + K: Open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Ctrl/Cmd + N or Space: Open impulse catcher
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCatcherOpen(true);
      }
      
      // Check for contentEditable elements and prevent Space trigger in input fields
      const target = e.target as HTMLElement;
      const isInputElement = target?.tagName === 'INPUT' || 
                             target?.tagName === 'TEXTAREA' || 
                             target?.isContentEditable;
      
      if (e.code === 'Space' && !catcherOpen && !isInputElement) {
        e.preventDefault();
        e.stopPropagation();
        setCatcherOpen(true);
      }
      
      // Escape: Close overlays
      if (e.key === 'Escape') {
        if (catcherOpen) {
          setCatcherOpen(false);
        } else if (exportModalOpen) {
          setExportModalOpen(false);
        } else if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else if (showResults) {
          setShowResults(false);
          setSearchTerm('');
        }
      }
      
      // ?: Show shortcuts
      if (e.key === '?' && !catcherOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResults, catcherOpen, exportModalOpen, shortcutsOpen]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    getOnboardingCompleted(user.id)
      .then((completed) => {
        if (!cancelled) setOnboardingOpen(!completed);
      })
      .catch(() => {
        if (!cancelled) toast.error('Onboarding-Status konnte nicht geladen werden');
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      performSearch(debouncedSearchTerm);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearchTerm]);

  const handleOnboardingComplete = async () => {
    if (!user) return;

    try {
      await persistOnboardingCompleted(user.id);
    } catch {
      toast.error('Onboarding konnte nicht gespeichert werden');
      return;
    }

    setOnboardingOpen(false);
    toast.success("Willkommen bei Synapse! 🎉");
  };

  const fetchImpulses = async () => {
    try {
      const { data, error } = await supabase
        .from('impulses')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImpulses(data || []);
    } catch (error: any) {
      toast.error('Failed to load impulses');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (term: string) => {
    setIsSearching(true);
    try {
      const results = await searchImpulses(term);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      toast.error('Suche fehlgeschlagen');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('impulses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setImpulses(prev => prev.filter(i => i.id !== id));
      setSearchResults(prev => prev.filter(i => i.id !== id));
      toast.success('✅ Impuls gelöscht');
    } catch (error: any) {
      toast.error('Failed to delete impulse');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  const displayedImpulses = showResults ? searchResults : impulses;

  return (
    <div ref={containerRef} className="min-h-screen w-full pb-20">
      <PullToRefreshIndicator
        isPulling={isPulling}
        pullDistance={pullDistance}
        pullProgress={pullProgress}
        isRefreshing={isPullRefreshing}
      />
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Synapse</h1>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <Shield className="h-3 w-3" />
                <span>Admin</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing || isPullRefreshing}
              title="Aktualisieren"
              aria-label="Dashboard aktualisieren"
            >
              <RefreshCw className={cn("h-5 w-5", (isManualRefreshing || isPullRefreshing) && "animate-spin")} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/analytics')}
              title="Analytics & Insights"
              aria-label="Analytics und Statistiken anzeigen"
            >
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              aria-label="Zu Einstellungen navigieren"
            >
              <SettingsIcon className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-28">{/* Erhöht von pt-24 auf pt-28 */}
          {/* Focus Block Widget */}
          <div className="mb-8">
            <FocusBlockWidget />
          </div>

          {/* Smart Matching Widget */}
          <div className="mb-8">
            <SmartMatchingWidget />
          </div>

          {/* Evolution Notification */}
          <EvolutionNotification />

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Durchsuche deine Gedanken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-20 h-12 text-base border-2 focus:border-primary"
              />
              {(searchTerm || isSearching) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isSearching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Suche löschen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {showResults && (
              <div className="mt-2 text-sm text-muted-foreground">
                {searchResults.length} {searchResults.length === 1 ? 'Ergebnis' : 'Ergebnisse'} für "{debouncedSearchTerm}"
              </div>
            )}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {showResults ? 'Suchergebnisse' : 'Impulse Stream'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {displayedImpulses.length} {displayedImpulses.length === 1 ? 'Impuls' : 'Impulse'}
              </p>
            </div>
          </div>

          {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-16 w-full mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedImpulses.length === 0 ? (
          <div className="py-12 text-center">
            {showResults ? (
              <>
                <p className="mb-4 text-muted-foreground">
                  Keine Impulse gefunden für "{debouncedSearchTerm}"
                </p>
                <Button onClick={clearSearch} variant="outline">
                  Suche zurücksetzen
                </Button>
              </>
            ) : (
              <EmptyState
                icon={Lightbulb}
                title="Willkommen in Synapse!"
                description="Fange deinen ersten Gedanken ab und leg los. Deine Ideen sind wertvoll!"
                action={{
                  label: "Ersten Impuls erfassen",
                  onClick: () => setCatcherOpen(true)
                }}
              />
            )}
          </div>
          ) : (
            <div className="space-y-4">
              {displayedImpulses.map((impulse) => (
                <ImpulseCard
                  key={impulse.id}
                  impulse={impulse}
                  onDelete={handleDelete}
                  onUpdate={fetchImpulses}
                  searchTerm={showResults ? debouncedSearchTerm : undefined}
                />
              ))}
            </div>
          )}

          {/* Floating Action Button */}
          <button
            onClick={() => setCatcherOpen(true)}
            className="fixed bottom-24 right-4 sm:right-6 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-50"
            title="Impuls erfassen (Leertaste oder Strg+N)"
            aria-label="Neuen Impuls erfassen"
          >
            <Plus className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
          </button>
        </div>
      </main>

      <ImpulseCatcher
        open={catcherOpen}
        onOpenChange={setCatcherOpen}
        onImpulseCreated={fetchImpulses}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      <Onboarding
        open={onboardingOpen}
        onComplete={handleOnboardingComplete}
      />

      <InstallPrompt />
    </div>
  );
}

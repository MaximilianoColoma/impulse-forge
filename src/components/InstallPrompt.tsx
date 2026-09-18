import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');

    if (!hasSeenPrompt && !isInStandaloneMode) {
      // For Android/Desktop - listen for beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // For iOS - show manual instructions after a short delay
      if (iOS) {
        setTimeout(() => setShowPrompt(true), 2000);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Desktop installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('hasSeenInstallPrompt', 'true');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      // iOS - just mark as seen since we can't programmatically trigger
      localStorage.setItem('hasSeenInstallPrompt', 'true');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('hasSeenInstallPrompt', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 lg:bottom-8 lg:left-auto lg:right-8 lg:max-w-sm">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Installiere Synapse für schnellen Zugriff!
            </h3>
            
            {isIOS ? (
              <p className="text-xs text-muted-foreground mb-3">
                Tippe auf <span className="inline-flex items-center mx-1">
                  <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </span> dann auf "Zum Startbildschirm hinzufügen"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                Nutze Synapse wie eine native App - schneller Zugriff ohne Browser!
              </p>
            )}

            <div className="flex gap-2">
              {!isIOS && deferredPrompt && (
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  Installieren
                </Button>
              )}
              {isIOS && (
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  Verstanden
                </Button>
              )}
              <Button onClick={handleDismiss} variant="ghost" size="sm">
                Später
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
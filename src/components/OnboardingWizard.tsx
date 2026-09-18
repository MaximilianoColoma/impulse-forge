import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Zap, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingStepProps {
  onNext: () => void;
  onPrev: () => void;
  data: any;
  setData: (data: any) => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<OnboardingStepProps>;
}

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Willkommen bei Synapse',
      description: 'Lass uns dein Gehirn besser verstehen',
      icon: Brain,
      component: WelcomeStep
    },
    {
      id: 'profile',
      title: 'Dein Profil',
      description: 'Personalisiere deine Erfahrung',
      icon: Target,
      component: ProfileStep
    },
    {
      id: 'tutorial',
      title: 'Schnellstart-Tutorial',
      description: 'Erfahre, wie du Synapse am besten nutzt',
      icon: Zap,
      component: TutorialStep
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            onboarding_data: onboardingData,
            low_motion: onboardingData.preferences?.lowMotion || false,
            compact_mode: onboardingData.preferences?.compactMode || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (error) throw error;
      }
      
      toast.success('Willkommen bei Synapse! Lass uns anfangen.');
      navigate('/app');
    } catch (error: any) {
      toast.error('Fehler beim Speichern: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Schritt {currentStep + 1} von {steps.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={step.id}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive ? 'border-primary bg-primary text-primary-foreground' :
                  isCompleted ? 'border-green-600 bg-green-600 text-white' :
                  'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {React.createElement(steps[currentStep].icon, { className: "h-6 w-6 text-primary" })}
            </div>
            <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent
              onNext={handleNext}
              onPrev={handlePrev}
              data={onboardingData}
              setData={setOnboardingData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const WelcomeStep: React.FC<OnboardingStepProps> = ({ onNext, data, setData }) => {
  const [adhdType, setAdhdType] = useState('');
  
  const handleNext = () => {
    setData({ ...data, adhdType });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          Synapse wurde für Menschen mit ADHS entwickelt. Hilf uns, die App an deine Bedürfnisse anzupassen.
        </p>
        
        <div className="space-y-3">
          <Label>Welche Beschreibung passt am besten zu dir?</Label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { value: 'inattentive', label: 'Aufmerksamkeitsdefizit-Typ', desc: 'Schwierigkeiten, sich zu konzentrieren' },
              { value: 'hyperactive', label: 'Hyperaktiv-Impulsiver Typ', desc: 'Unruhe und Impulsivität' },
              { value: 'combined', label: 'Kombinierter Typ', desc: 'Beide Merkmale ausgeprägt' },
              { value: 'other', label: 'Keine Diagnose', desc: 'Ich interessiere mich für die Methoden' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setAdhdType(type.value)}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  adhdType === type.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-muted-foreground">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!adhdType}>
          Weiter <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const ProfileStep: React.FC<OnboardingStepProps> = ({ onNext, onPrev, data, setData }) => {
  const [fullName, setFullName] = useState('');
  const [preferences, setPreferences] = useState({
    lowMotion: false,
    compactMode: false,
    darkMode: true
  });
  
  const handleNext = () => {
    setData({ 
      ...data, 
      profile: { fullName, preferences },
      preferences 
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Dein Name (optional)</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Max Mustermann"
          />
        </div>
        
        <div className="space-y-3">
          <Label>Visuelle Präferenzen</Label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.lowMotion}
                onChange={(e) => setPreferences({ ...preferences, lowMotion: e.target.checked })}
                className="rounded"
              />
              <div>
                <div className="font-medium">Reduzierte Animationen</div>
                <div className="text-sm text-muted-foreground">
                  Weniger Bewegung für bessere Konzentration
                </div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.compactMode}
                onChange={(e) => setPreferences({ ...preferences, compactMode: e.target.checked })}
                className="rounded"
              />
              <div>
                <div className="font-medium">Kompakter Modus</div>
                <div className="text-sm text-muted-foreground">
                  Mehr Inhalt auf weniger Platz
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={handleNext}>
          Weiter <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const TutorialStep: React.FC<OnboardingStepProps> = ({ onNext, onPrev }) => {
  const [currentTutorial, setCurrentTutorial] = useState(0);
  
  const tutorials = [
    {
      title: 'Der Impuls-Fänger',
      description: 'Erfasse deine Ideen mit Ctrl+Space, bevor sie verschwinden',
      shortcut: 'Strg + Leertaste'
    },
    {
      title: 'Das Kanban-Board',
      description: 'Organisiere deine Impulse durch Drag & Drop',
      shortcut: 'Ziehen & Loslassen'
    },
    {
      title: 'Der Sprint-Modus',
      description: 'Fokussiere dich auf das Wesentliche',
      shortcut: 'Sprint-Icon klicken'
    }
  ];

  const nextTutorial = () => {
    if (currentTutorial < tutorials.length - 1) {
      setCurrentTutorial(currentTutorial + 1);
    } else {
      onNext();
    }
  };

  const prevTutorial = () => {
    if (currentTutorial > 0) {
      setCurrentTutorial(currentTutorial - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="bg-primary/5 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">{tutorials[currentTutorial].title}</h3>
          <p className="text-muted-foreground mb-4">{tutorials[currentTutorial].description}</p>
          <Badge variant="secondary">{tutorials[currentTutorial].shortcut}</Badge>
        </div>
        
        <div className="flex justify-center gap-2">
          {tutorials.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentTutorial ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={currentTutorial === 0 ? onPrev : prevTutorial}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {currentTutorial === 0 ? 'Zurück' : 'Vorheriger Tipp'}
        </Button>
        <Button onClick={nextTutorial}>
          {currentTutorial === tutorials.length - 1 ? 'Starte Synapse' : 'Nächster Tipp'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWizard;
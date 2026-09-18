import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Plus, Target, Rocket } from "lucide-react";

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

export function Onboarding({ open, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Zap className="h-12 w-12 text-primary" />,
      title: "Willkommen bei Synapse!",
      description:
        "Synapse ist dein zweites Gehirn – ein Ort, wo du deine Gedanken auffängst, bevor sie verschwinden. Perfekt für ADHS-Minds, die tausend Ideen gleichzeitig haben.",
    },
    {
      icon: <Plus className="h-12 w-12 text-primary" />,
      title: "Fange deinen ersten Impuls",
      description:
        "Siehst du das Plus-Symbol unten rechts? Das ist dein Impuls-Fänger. Ein Klick darauf (oder Strg+N) – und schon kannst du festhalten, was dir gerade durch den Kopf geht. Probier es aus!",
      highlight: "fab",
    },
    {
      icon: <Target className="h-12 w-12 text-primary" />,
      title: "Organisiere in Projekten",
      description:
        "Impulse können Projekten zugeordnet werden. In der Kanban-Werkstatt kannst du sie dann strukturiert bearbeiten. Nutze den Sprint-Modus für fokussiertes Arbeiten!",
    },
    {
      icon: <Rocket className="h-12 w-12 text-primary" />,
      title: "Bereit zum Start!",
      description:
        "Du bist startklar! Denk daran: Drücke '?' um alle Keyboard-Shortcuts zu sehen. Und jetzt: Fang deine Gedanken auf und verwandle sie in Taten!",
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex justify-center mb-4">{currentStep.icon}</div>
          <DialogTitle className="text-center text-2xl">
            {currentStep.title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-center text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
          {currentStep.highlight === "fab" && (
            <div className="mt-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Plus className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {!isLastStep && (
            <Button variant="ghost" onClick={handleSkip} className="w-full sm:w-auto">
              Überspringen
            </Button>
          )}
          <Button onClick={handleNext} className="w-full sm:w-auto">
            {isLastStep ? "Los geht's!" : "Weiter"}
          </Button>
        </DialogFooter>
        <div className="flex justify-center gap-2 mt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all ${
                index === step ? "bg-primary w-8" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

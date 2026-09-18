import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { toast } from 'sonner';

interface PomodoroTimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impulseName: string;
}

export function PomodoroTimer({ open, onOpenChange, impulseName }: PomodoroTimerProps) {
  const [pomodoroLength] = useState(() => parseInt(localStorage.getItem('pomodoroLength') || '25'));
  const [timeLeft, setTimeLeft] = useState(pomodoroLength * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Play notification sound
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        // Fallback if audio play fails
      });
    }

    if (isBreak) {
      toast.success('Pause beendet! Bereit für den nächsten Fokus-Block?');
      setIsBreak(false);
      const savedLength = parseInt(localStorage.getItem('pomodoroLength') || '25');
      setTimeLeft(savedLength * 60);
    } else {
      toast.success('Zeit für eine Pause! 🎉', {
        description: 'Großartige Arbeit! Möchtest du eine 5-minütige Pause einlegen?',
        action: {
          label: 'Pause starten',
          onClick: () => startBreak(),
        },
      });
    }
  };

  const startBreak = () => {
    setIsBreak(true);
    setTimeLeft(5 * 60);
    setIsRunning(true);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (isBreak) {
      setTimeLeft(5 * 60);
    } else {
      const savedLength = parseInt(localStorage.getItem('pomodoroLength') || '25');
      setTimeLeft(savedLength * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak 
    ? ((5 * 60 - timeLeft) / (5 * 60)) * 100
    : ((pomodoroLength * 60 - timeLeft) / (pomodoroLength * 60)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isBreak ? '☕ Pausenzeit' : '🎯 Fokus-Session'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {impulseName}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Timer Display */}
          <div className="relative">
            <div className="text-7xl font-bold text-center font-mono tracking-tight">
              {formatTime(timeLeft)}
            </div>
            
            {/* Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted opacity-20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className={isBreak ? 'text-accent' : 'text-primary'}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTimer}
              className="h-14 w-14"
            >
              {isRunning ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={resetTimer}
              className="h-14 w-14"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>

            {!isBreak && (
              <Button
                variant="outline"
                size="icon"
                onClick={startBreak}
                className="h-14 w-14"
                title="Pause starten"
              >
                <Coffee className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Status Text */}
          <p className="text-center text-sm text-muted-foreground">
            {isRunning 
              ? isBreak 
                ? 'Genieße deine Pause...' 
                : 'Konzentriere dich auf deine Aufgabe'
              : 'Drücke Play zum Starten'
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Brain, Zap, Target, Clock, CheckCircle, BarChart3, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicFooter } from '@/components/PublicFooter';

export default function Landing() {
  const navigate = useNavigate();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Synapse",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Helmet>
        <title>Synapse - Verwandele Chaos in Klarheit | Produktivitäts-App für ADHS</title>
        <meta name="description" content="Synapse ist die erste Produktivitäts-App, die speziell für Menschen mit ADHS entwickelt wurde. Erfasse Ideen, organisiere Aufgaben und nutze deine ADHS-Stärken als Superkraft." />
        <meta name="keywords" content="ADHS, Produktivität, Organisation, Ideenmanagement, Zeitplanung, Fokus, Kreativität, Neurodiversität" />
        
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Synapse - Verwandele Chaos in Klarheit | Produktivitäts-App für ADHS" />
        <meta property="og:description" content="Synapse ist die erste Produktivitäts-App, die speziell für Menschen mit ADHS entwickelt wurde. Erfasse Ideen, organisiere Aufgaben und nutze deine ADHS-Stärken als Superkraft." />
        
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Synapse - Verwandele Chaos in Klarheit | Produktivitäts-App für ADHS" />
        <meta property="twitter:description" content="Synapse ist die erste Produktivitäts-App, die speziell für Menschen mit ADHS entwickelt wurde. Erfasse Ideen, organisiere Aufgaben und nutze deine ADHS-Stärken als Superkraft." />
        
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Hero Section - Modern & Calm */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Enhanced gradient background */}
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-10 animate-fade-in-up">
          <Badge variant="calm" className="mb-6 text-sm px-6 py-2 shadow-soft">
            <Brain className="h-4 w-4 mr-2 inline" />
            Speziell für kreative ADHS-Köpfe
          </Badge>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.1]">
            Verwandele Chaos in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
              Kristallklare Klarheit
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
            Synapse verwandelt verstreute Gedanken in strukturierten Erfolg. 
            Entwickelt für Köpfe, die anders denken, brillant arbeiten und bessere Tools verdienen.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-12">
            <Button
              size="lg"
              variant="gradient"
              className="text-lg px-10 py-7 shadow-glow"
              aria-label="Jetzt kostenlos mit Synapse starten - keine Kreditkarte erforderlich"
              asChild
            >
              <Link to="/auth?mode=signup">
                Kostenlos starten
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7"
              aria-label="Bei Synapse anmelden"
              asChild
            >
              <Link to="/auth?mode=login">
                Anmelden
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Check className="h-4 w-4 text-success" />
              <span>Für immer kostenlos</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Check className="h-4 w-4 text-success" />
              <span>Keine Kreditkarte</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Check className="h-4 w-4 text-success" />
              <span>In 30 Sekunden starten</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Die Herausforderungen des ADHS-Gehirns verstehen
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Das Dilemma</h3>
              <p className="text-muted-foreground mb-4">
                Menschen mit ADHS haben ein Gehirn, das anders funktioniert – nicht schlechter. 
                Studien zeigen, dass ADHS-Gehirne oft kreativer sind, besser in Krisen denken 
                und einzigartige Lösungsansätze finden. Doch diese Stärken werden durch 
                Herausforderungen überlagert:
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-destructive text-xs font-bold">!</span>
                  </div>
                  <div>
                    <strong>Arbeitsgedächtnis-Probleme:</strong> Schwierigkeiten, Informationen 
                    im Kopf zu behalten und zu organisieren
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-destructive text-xs font-bold">!</span>
                  </div>
                  <div>
                    <strong>Exekutive Funktionsstörungen:</strong> Herausforderungen bei Planung, 
                    Organisation und Aufgabenabschluss
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-destructive text-xs font-bold">!</span>
                  </div>
                  <div>
                    <strong>Zeitwahrnehmungs-Probleme:</strong> Schwierigkeiten, Zeit realistisch 
                    einzuschätzen und Deadlines einzuhalten
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-destructive text-xs font-bold">!</span>
                  </div>
                  <div>
                    <strong>Ablenkbarkeit:</strong> Schwierigkeiten, bei einer Aufgabe zu bleiben 
                    und Prioritäten zu setzen
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-card rounded-lg p-6 border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Die Fakten
              </h4>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Projektabschluss bei ADHS</span>
                    <span className="text-sm text-muted-foreground">35%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-destructive h-2 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Projektabschluss ohne ADHS</span>
                    <span className="text-sm text-muted-foreground">78%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Menschen mit ADHS geben durchschnittlich an:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 3x mehr Zeit für Organisation aufzuwenden</li>
                    <li>• 4x häufiger Deadlines zu verpassen</li>
                    <li>• 5x mehr Schwierigkeiten mit Prioritäten</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="container mx-auto px-4 py-16 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Wie Synapse deine ADHS-Superkraft aktiviert
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Sofortige Ideen-Erfassung</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Mit unserem Impuls-Fänger (Ctrl+Space) kannst du Gedanken im Moment erfassen, 
                  bevor sie verloren gehen. KI-Tagging organisiert sie automatisch.
                </CardDescription>
                <div className="mt-4 text-3xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                  +47% Retention
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Intelligente Priorisierung</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Unsere KI analysiert deine Impulse und schlägt Prioritäten vor, die zu 
                  deinen Zielen passen. Kein überwältigendes To-Do-List mehr.
                </CardDescription>
                <div className="mt-4 text-3xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                  +63% Fokus
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Clock className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Adaptive Zeitplanung</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Sprint-Modus und visuelle Timer helfen dir, realistische Zeitpläne zu 
                  erstellen und einzuhalten, angepasst an deine Arbeitsweise.
                </CardDescription>
                <div className="mt-4 text-3xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                  +38% Treue
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-card rounded-lg p-8 border text-center">
            <h3 className="text-2xl font-semibold mb-4">Die Ergebnisse sprechen für sich</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Nutzer mit ADHS berichten nach 4 Wochen Synapse-Nutzung von signifikanten 
              Verbesserungen in ihrem Arbeits- und Alltag:
            </p>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">42%</div>
                <div className="text-sm text-muted-foreground">weniger Stress</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">57%</div>
                <div className="text-sm text-muted-foreground">mehr Projekte abgeschlossen</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">68%</div>
                <div className="text-sm text-muted-foreground">bessere Priorisierung</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">73%</div>
                <div className="text-sm text-muted-foreground">mehr Zufriedenheit</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Funktionen, die für dein Gehirn entwickelt wurden
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">KI-gestützte Organisation</h3>
                <p className="text-muted-foreground">
                  Unsere KI lernt deine Denkweise und organisiert Impulse automatisch nach 
                  Relevanz, Kontext und Dringlichkeit. Kein manuelles Sortieren mehr.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Visueller Kanban-Board</h3>
                <p className="text-muted-foreground">
                  Drag & Drop Interface, das für das ADHS-Gehirn optimiert ist. Visuelle 
                  Fortschrittsanzeige und minimale Ablenkungen.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Fokussierter Sprint-Modus</h3>
                <p className="text-muted-foreground">
                  Reduziere die Komplexität auf nur 3-5 wichtige Aufgaben. Perfekt für 
                  tiefe Arbeit ohne Überforderung.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Intelligente Zeitplanung</h3>
                <p className="text-muted-foreground">
                  Berücksichtigt deine individuellen Arbeitsmuster und schlägt realistische 
                  Zeitpläne vor, die zu deinem Biorhythmus passen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Was Menschen mit ADHS über Synapse sagen
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Ich habe Dutzende von Produktivitäts-Apps versucht. Synapse ist die erste, 
                  die wirklich für mein Gehirn funktioniert. Ich fühle mich endlich organisiert, 
                  ohne mich eingeschränkt zu fühlen."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">MK</span>
                  </div>
                  <div>
                    <div className="font-medium">Maria K.</div>
                    <div className="text-sm text-muted-foreground">Grafikdesignerin</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Der Impuls-Fänger hat mein Leben verändert. Ich verliere keine Ideen mehr, 
                  und die KI-Organisation spart mir Stunden jede Woche. Endlich kann ich 
                  meine kreativen Phasen voll nutzen."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">TS</span>
                  </div>
                  <div>
                    <div className="font-medium">Thomas S.</div>
                    <div className="text-sm text-muted-foreground">Softwareentwickler</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Als Unternehmerin mit ADHS war ich immer am Rande des Burnouts. Synapse 
                  hat mir geholfen, Prioritäten zu setzen und meine Energie zu fokussieren. 
                  Meine Produktivität ist um 60% gestiegen."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">LW</span>
                  </div>
                  <div>
                    <div className="font-medium">Lisa W.</div>
                    <div className="text-sm text-muted-foreground">Unternehmerin</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Beginne deine Reise zu mehr Klarheit
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Jeder Mensch mit ADHS verdient ein Werkzeug, das seine Stärken fördert, 
            nicht seine Schwächen betont.
          </p>
          
          <div className="bg-card rounded-lg p-8 border">
            <div className="text-4xl font-bold mb-4">
              Kostenlos starten
            </div>
            <p className="text-muted-foreground mb-6">
              Keine Kreditkarte erforderlich. Sofort loslegen.
            </p>
            <Button size="lg" variant="gradient" className="text-lg px-8 py-6" asChild>
              <Link to="/auth?mode=signup">
                Kostenlos starten <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <div className="mt-4">
              <Button variant="link" asChild>
                <Link to="/pricing">
                  Alle Pläne ansehen
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

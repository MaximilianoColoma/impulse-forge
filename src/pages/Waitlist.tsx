import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Brain, Zap, Target, Clock, Check, ArrowRight, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { PublicFooter } from '@/components/PublicFooter';

const waitlistSchema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein'),
  name: z.string().optional(),
  affiliateInterest: z.boolean().default(false),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export default function Waitlist() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: '',
      name: '',
      affiliateInterest: false,
    },
  });

  useEffect(() => {
    fetchSubscriberCount();
  }, []);

  const fetchSubscriberCount = async () => {
    try {
      const { count, error } = await supabase
        .from('waitlist_subscribers')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setSubscriberCount(count);
      }
    } catch (error) {
      console.error('Error fetching subscriber count:', error);
    }
  };

  const onSubmit = async (data: WaitlistFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('waitlist_subscribers')
        .insert({
          email: data.email.toLowerCase().trim(),
          name: data.name?.trim() || null,
          affiliate_interest: data.affiliateInterest,
          source: 'waitlist',
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Diese E-Mail-Adresse ist bereits registriert.');
        } else {
          throw error;
        }
        return;
      }

      setIsSubmitted(true);
      setSubscriberCount(prev => prev + 1);
      toast.success('Willkommen auf der Warteliste! 🎉');
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Helmet>
        <title>Synapse Warteliste - Sei dabei, wenn wir starten</title>
        <meta name="description" content="Trage dich auf die Synapse Warteliste ein und erhalte exklusiven Zugang zur ersten Produktivitäts-App für ADHS-Köpfe." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
          <Badge variant="calm" className="mb-4 text-sm px-6 py-2 shadow-soft">
            <Sparkles className="h-4 w-4 mr-2 inline" />
            Coming Soon
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            Synapse - Produktivität, die zu deinem{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
              ADHS-Gehirn
            </span>{" "}
            passt
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            Sei unter den Ersten, die Zugang zur revolutionären Produktivitäts-App erhalten, 
            die speziell für neurodiverse Köpfe entwickelt wurde.
          </p>

          {/* Live Counter */}
          {subscriberCount > 0 && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg">
                Bereits <strong className="text-foreground">{subscriberCount.toLocaleString('de-DE')}+</strong> auf der Warteliste
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Signup Form Section */}
      <section className="container mx-auto px-4 py-12 -mt-8">
        <div className="max-w-xl mx-auto">
          <Card className="border-0 shadow-lg glass-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {isSubmitted ? '🎉 Du bist dabei!' : 'Jetzt auf die Warteliste eintragen'}
              </CardTitle>
              <CardDescription className="text-base">
                {isSubmitted 
                  ? 'Wir melden uns, sobald Synapse startet.' 
                  : 'Keine Spam-Mails, nur Updates zum Launch.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-muted-foreground">
                    Vielen Dank für dein Interesse! Du wirst als einer der Ersten informiert, 
                    sobald wir live gehen.
                  </p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail-Adresse *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="deine@email.de" 
                              type="email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Wie dürfen wir dich nennen?" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="affiliateInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Ich interessiere mich für das Affiliate-Programm
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Verdiene mit uns, indem du Synapse empfiehlst.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      variant="gradient" 
                      className="w-full text-lg py-6 shadow-glow"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'Wird eingetragen...'
                      ) : (
                        <>
                          Auf die Warteliste
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Was dich erwartet
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">Instant Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Erfasse Gedanken in Sekundenbruchteilen, bevor sie verloren gehen.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Brain className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">KI-Organisation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatische Kategorisierung und intelligente Priorisierung.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">ADHS-optimiert</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Jedes Feature ist für neurodiverse Gehirne entwickelt.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft hover-lift glass-card">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Clock className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">Sprint-Modus</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Fokussiere dich auf das Wesentliche ohne Überforderung.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                +47%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Retention</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                +63%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Fokus</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                +38%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Produktivität</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials (shortened) */}
      <section className="container mx-auto px-4 py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Was andere sagen
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft glass-card">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4 italic">
                  "Endlich eine App, die versteht, wie mein Gehirn funktioniert. 
                  Das Erfassen von Ideen war noch nie so einfach."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-semibold text-primary">M</span>
                  </div>
                  <div>
                    <p className="font-medium">Marcus K.</p>
                    <p className="text-sm text-muted-foreground">Beta-Tester</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft glass-card">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4 italic">
                  "Der Sprint-Modus hat meine Art zu arbeiten komplett verändert. 
                  Weniger Stress, mehr erreicht."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-semibold text-primary">S</span>
                  </div>
                  <div>
                    <p className="font-medium">Sarah L.</p>
                    <p className="text-sm text-muted-foreground">Beta-Testerin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-8 text-center text-sm text-muted-foreground">
        Mit dem Absenden werden deine Angaben gemäß unserer{' '}
        <Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link>{' '}
        verarbeitet.
      </div>
      <PublicFooter />
    </div>
  );
}

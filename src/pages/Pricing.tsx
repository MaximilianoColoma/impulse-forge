import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, Star, ArrowRight, Zap, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Helmet } from 'react-helmet-async';
import { pricingFeatures, tierLimits } from '@/data/pricingFeatures';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocale } from '@/i18n';
import { UpgradeNudgeBanner } from '@/components/UpgradeNudgeBanner';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { PublicFooter } from '@/components/PublicFooter';
import { billingEnabled } from '@/lib/billing';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [enterpriseSeats, setEnterpriseSeats] = useState(5);
  const navigate = useNavigate();
  const { t } = useLocale();
  const { tier } = useSubscriptionTier();

  const formatPrice = (price: number | null, currency = '€') => {
    if (price === null) return t('common.individual');
    return `${currency}${price}`;
  };

  const calculateSavings = (monthlyPrice: number) => {
    const yearlyPrice = monthlyPrice * 12 * 0.85;
    const savings = monthlyPrice * 12 - yearlyPrice;
    return Math.round(savings);
  };

  const handleCheckout = async (tier: string, seats?: number) => {
    if (!billingEnabled) {
      toast.error('Bezahlte Pläne sind während der kostenlosen Beta deaktiviert');
      return;
    }
    setCheckoutLoading(tier);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Bitte melde dich zuerst an');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          tier,
          billingCycle: isYearly ? 'yearly' : 'monthly',
          ...(tier === 'enterprise' ? { seats: seats ?? enterpriseSeats } : {}),
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error('Fehler beim Checkout: ' + error.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const tiers = Object.entries(pricingFeatures).map(([key, tier]) => ({
    key,
    ...tier,
    icon: key === 'free' ? Lock : 
          key === 'pro' ? Star : 
          key === 'power' ? Zap : Building,
    popular: key === 'pro',
    enterprise: key === 'enterprise'
  }));

  return (
    <>
      <Helmet>
        <title>{t('pricing.meta.title')}</title>
        <meta name="description" content={t('pricing.meta.description')} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
              {t('pricing.heading')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('pricing.subheading')}
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`font-medium transition-colors ${
                !isYearly ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {t('common.monthly')}
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="scale-110"
              />
              <span className={`font-medium transition-colors ${
                isYearly ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {t('common.yearly')}
              </span>
              {isYearly && (
                <Badge variant="secondary" className="ml-2 animate-fade-in">
                  {t('common.yearly_saving_badge')}
                </Badge>
              )}
            </div>
          </div>

          {/* Contextual upgrade nudge */}
          <div className="max-w-3xl mx-auto mb-8">
            <UpgradeNudgeBanner surface="pricing.top" disabled={!tier || !billingEnabled} />
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {tiers.map((tier) => {
              const Icon = tier.icon;
              const price = isYearly ? tier.price.yearly : tier.price.monthly;
              const isPaid = price !== null && price > 0;
              const monthlyPrice = tier.price.monthly;
              
              return (
                <Card 
                  key={tier.key}
                  className={`relative transition-all duration-300 hover:scale-105 ${
                    tier.popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
                  } ${
                    hoveredTier === tier.key ? 'shadow-xl' : ''
                  }`}
                  onMouseEnter={() => setHoveredTier(tier.key)}
                  onMouseLeave={() => setHoveredTier(null)}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        {t('pricing.popular')}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <CardTitle className="text-xl">{t(tier.name)}</CardTitle>
                    <CardDescription>{t(tier.description)}</CardDescription>
                    
                    {!tier.enterprise && (
                      <div className="mt-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold transition-all duration-300">
                            {formatPrice(price)}
                          </span>
                          {isPaid && (
                            <span className="text-muted-foreground text-sm">
                              {isYearly ? t('common.per_year') : t('common.per_month')}
                            </span>
                          )}
                        </div>
                        {isYearly && monthlyPrice && monthlyPrice > 0 && (
                          <p className="text-sm text-green-600 mt-1 animate-fade-in">
                            {t('common.save_amount', { amount: formatPrice(calculateSavings(monthlyPrice)) })}
                          </p>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Limits für Free Tier */}
                    {tier.key === 'free' && (
                      <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>{t('pricing.limits.projects')}</span>
                          <span className="font-medium">{tierLimits.free.projects}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('pricing.limits.impulses')}</span>
                          <span className="font-medium">{tierLimits.free.impulses}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Features */}
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${
                            feature.included ? '' : 'text-muted-foreground'
                          }`}>
                            {t(feature.name)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* CTA Button */}
                    {tier.enterprise ? (
                      <div className="mt-6 space-y-3">
                        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{t('pricing.enterprise.seats_label')}</span>
                            <span className="tabular-nums font-semibold">{enterpriseSeats}</span>
                          </div>
                          <Slider
                            min={5}
                            max={50}
                            step={1}
                            value={[enterpriseSeats]}
                            onValueChange={(v) => setEnterpriseSeats(v[0])}
                            aria-label={t('pricing.enterprise.seats_label')}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('pricing.enterprise.seats_hint', {
                              price: isYearly
                                ? `€${tier.price.yearly}`
                                : `€${tier.price.monthly}`,
                              period: isYearly ? t('common.per_year').replace('/', '') : t('common.per_month').replace('/', ''),
                            })}
                          </p>
                          <div className="flex items-baseline justify-between pt-1 border-t">
                            <span className="text-sm text-muted-foreground">{t('pricing.enterprise.total_label')}</span>
                            <span className="text-2xl font-bold">
                              €{(isYearly ? tier.price.yearly : tier.price.monthly)! * enterpriseSeats}
                              <span className="text-xs text-muted-foreground ml-1">
                                {isYearly ? t('common.per_year') : t('common.per_month')}
                              </span>
                            </span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleCheckout('enterprise', enterpriseSeats)}
                          disabled={!billingEnabled || checkoutLoading === 'enterprise'}
                        >
                          {!billingEnabled
                            ? 'In der kostenlosen Beta nicht verfügbar'
                            : checkoutLoading === 'enterprise'
                            ? t('common.loading')
                            : t('pricing.enterprise.cta_checkout', { seats: enterpriseSeats })}
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                          <a href="mailto:max@coloma.de?subject=Synapse Enterprise Anfrage">
                            {t('pricing.enterprise.cta_contact')}
                          </a>
                        </Button>
                      </div>
                    ) : tier.key === 'free' ? (
                      <Button 
                        className="w-full mt-6" 
                        variant="outline"
                        asChild
                      >
                        <Link to="/register">
                          {t('pricing.cta.start_free')}
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        className="w-full mt-6" 
                        variant={tier.popular ? 'default' : 'outline'}
                        onClick={() => handleCheckout(tier.key)}
                        disabled={!billingEnabled || checkoutLoading === tier.key}
                      >
                        {!billingEnabled ? (
                          'In der kostenlosen Beta nicht verfügbar'
                        ) : checkoutLoading === tier.key ? (
                          t('common.loading')
                        ) : (
                          <>
                            {t('pricing.cta.start_now')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ROI Calculator */}
          <div className="mt-20 max-w-4xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Dein ROI mit Synapse</CardTitle>
                <CardDescription>
                  Berechne, wie viel Zeit und Geld du mit Synapse sparst
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary">47%</div>
                    <div className="text-sm text-muted-foreground">
                      Mehr Ideen retention
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">5.5h</div>
                    <div className="text-sm text-muted-foreground">
                      Wöchentlich gespart
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">10x</div>
                    <div className="text-sm text-muted-foreground">
                      ROI im ersten Jahr
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Elements */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>{t('pricing.trust')}</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    </>
  );
}

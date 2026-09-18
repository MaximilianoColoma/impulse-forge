import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Sparkles, Crown, Zap, Building } from 'lucide-react';
import { useSubscriptionTier, SubscriptionTier } from '@/hooks/useSubscriptionTier';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/i18n';

interface LockedStateProps {
  requiredTier: SubscriptionTier;
  feature?: string;
  description?: string;
  children?: React.ReactNode;
}

const tierIcons: Record<Exclude<SubscriptionTier, 'free'>, typeof Crown> = {
  pro: Crown,
  power: Zap,
  enterprise: Building,
};

export function LockedState({ 
  requiredTier,
  feature,
  description,
  children
}: LockedStateProps) {
  const navigate = useNavigate();
  const { canAccess, isAdmin } = useSubscriptionTier();
  const { t, tArray } = useLocale();

  // Admins can access all features
  if (isAdmin || canAccess(requiredTier)) {
    return <>{children}</>;
  }

  const resolvedTier: Exclude<SubscriptionTier, 'free'> =
    requiredTier === 'free' ? 'pro' : requiredTier;
  const Icon = tierIcons[resolvedTier];
  const info = {
    title: t(`locked.tiers.${resolvedTier}.title`),
    description: t(`locked.tiers.${resolvedTier}.description`),
    price: t(`locked.tiers.${resolvedTier}.price`),
    features: tArray(`locked.features.${resolvedTier}`),
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>{feature || info.title}</CardTitle>
          </div>
          <CardDescription className="text-base">
            {description || info.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Price */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{info.price}</div>
            {requiredTier !== 'enterprise' && (
              <Badge variant="secondary" className="text-xs">
                {t('locked.yearly_discount_badge')}
              </Badge>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">{t('locked.what_you_get')}</p>
            <ul className="space-y-2">
              {info.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={() => navigate('/pricing')} 
            size="lg"
            className="w-full"
          >
            {requiredTier === 'enterprise' ? (
              <>
                <Building className="mr-2 h-4 w-4" />
                {t('locked.cta_contact')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('locked.cta_upgrade')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

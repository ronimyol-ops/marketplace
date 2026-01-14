import { Badge } from '@/components/ui/badge';
import { Star, Zap, ArrowUp, Clock } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns';

interface PromotionBadgesProps {
  promotionType?: 'featured' | 'top' | 'urgent' | null;
  promotionExpiresAt?: string | null;
  expiresAt?: string | null;
  renewedAt?: string | null;
  showExpiry?: boolean;
  size?: 'sm' | 'md';
}

export function PromotionBadges({
  promotionType,
  promotionExpiresAt,
  expiresAt,
  renewedAt,
  showExpiry = false,
  size = 'md',
}: PromotionBadgesProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeClass = size === 'sm' ? 'text-xs py-0 px-1.5' : '';

  const isPromotionActive = promotionExpiresAt && !isPast(new Date(promotionExpiresAt));
  const isExpired = expiresAt && isPast(new Date(expiresAt));
  const daysUntilExpiry = expiresAt ? differenceInDays(new Date(expiresAt), new Date()) : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {isPromotionActive && promotionType === 'featured' && (
        <Badge className={`gap-1 bg-amber-500 hover:bg-amber-600 ${badgeClass}`}>
          <Star className={`${iconSize} fill-current`} />
          Featured
        </Badge>
      )}

      {isPromotionActive && promotionType === 'top' && (
        <Badge className={`gap-1 bg-purple-500 hover:bg-purple-600 ${badgeClass}`}>
          <ArrowUp className={iconSize} />
          Top Ad
        </Badge>
      )}

      {isPromotionActive && promotionType === 'urgent' && (
        <Badge className={`gap-1 bg-red-500 hover:bg-red-600 ${badgeClass}`}>
          <Zap className={iconSize} />
          Urgent
        </Badge>
      )}

      {renewedAt && (
        <Badge variant="outline" className={`gap-1 border-green-500 text-green-600 ${badgeClass}`}>
          <Clock className={iconSize} />
          Renewed
        </Badge>
      )}

      {showExpiry && expiresAt && (
        <Badge 
          variant="outline" 
          className={`gap-1 ${isExpired ? 'border-destructive text-destructive' : 
            daysUntilExpiry !== null && daysUntilExpiry <= 5 ? 'border-amber-500 text-amber-600' : ''} ${badgeClass}`}
        >
          <Clock className={iconSize} />
          {isExpired ? 'Expired' : `Expires in ${daysUntilExpiry} days`}
        </Badge>
      )}
    </div>
  );
}

interface AdExpiryInfoProps {
  expiresAt: string;
  renewedAt?: string | null;
  onRenew?: () => void;
  isRenewing?: boolean;
}

export function AdExpiryInfo({ expiresAt, renewedAt, onRenew, isRenewing }: AdExpiryInfoProps) {
  const isExpired = isPast(new Date(expiresAt));
  const daysUntilExpiry = differenceInDays(new Date(expiresAt), new Date());

  return (
    <div className={`p-3 rounded-lg ${isExpired ? 'bg-destructive/10' : daysUntilExpiry <= 5 ? 'bg-amber-500/10' : 'bg-muted'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${isExpired ? 'text-destructive' : daysUntilExpiry <= 5 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <span className="text-sm">
            {isExpired ? (
              <span className="text-destructive font-medium">This ad has expired</span>
            ) : (
              <>
                Expires {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
                {renewedAt && <span className="text-muted-foreground"> · Last renewed {formatDistanceToNow(new Date(renewedAt), { addSuffix: true })}</span>}
              </>
            )}
          </span>
        </div>
        {onRenew && (isExpired || daysUntilExpiry <= 7) && (
          <button
            onClick={onRenew}
            disabled={isRenewing}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            {isRenewing ? 'Renewing...' : 'Renew Ad'}
          </button>
        )}
      </div>
    </div>
  );
}

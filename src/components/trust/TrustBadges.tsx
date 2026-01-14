import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Phone, 
  Shield, 
  Star, 
  Clock,
  Award
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrustBadgesProps {
  phoneVerified?: boolean;
  memberSince?: string;
  totalAds?: number;
  isOnline?: boolean;
  isTrusted?: boolean;
  isTopSeller?: boolean;
  showAll?: boolean;
  size?: 'sm' | 'md';
}

export function TrustBadges({
  phoneVerified = false,
  memberSince,
  totalAds = 0,
  isOnline = false,
  isTrusted = false,
  isTopSeller = false,
  showAll = false,
  size = 'md'
}: TrustBadgesProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeClass = size === 'sm' ? 'text-xs py-0 px-1.5' : '';

  return (
    <div className="flex flex-wrap gap-1.5">
      {phoneVerified && (
        <Badge variant="secondary" className={`gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ${badgeClass}`}>
          <Phone className={iconSize} />
          Verified
        </Badge>
      )}

      {isTopSeller && (
        <Badge variant="secondary" className={`gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 ${badgeClass}`}>
          <Award className={iconSize} />
          Top Seller
        </Badge>
      )}

      {isTrusted && (
        <Badge variant="secondary" className={`gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ${badgeClass}`}>
          <Shield className={iconSize} />
          Trusted
        </Badge>
      )}

      {isOnline && (
        <Badge variant="secondary" className={`gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 ${badgeClass}`}>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </Badge>
      )}

      {showAll && memberSince && (
        <Badge variant="outline" className={`gap-1 ${badgeClass}`}>
          <Clock className={iconSize} />
          Member {formatDistanceToNow(new Date(memberSince), { addSuffix: false })}
        </Badge>
      )}

      {showAll && totalAds > 0 && (
        <Badge variant="outline" className={`gap-1 ${badgeClass}`}>
          <Star className={iconSize} />
          {totalAds} {totalAds === 1 ? 'ad' : 'ads'}
        </Badge>
      )}
    </div>
  );
}

interface PhoneDisplayProps {
  phoneNumber: string | null;
  isVerified?: boolean;
  showFull?: boolean;
  onReveal?: () => void;
}

export function PhoneDisplay({ 
  phoneNumber, 
  isVerified = false,
  showFull = false,
  onReveal 
}: PhoneDisplayProps) {
  if (!phoneNumber) return null;

  const maskPhone = (phone: string) => {
    if (phone.length < 6) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  };

  return (
    <div className="flex items-center gap-2">
      <Phone className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">
        {showFull ? phoneNumber : maskPhone(phoneNumber)}
      </span>
      {isVerified && (
        <CheckCircle className="h-4 w-4 text-green-500" />
      )}
      {!showFull && onReveal && (
        <button 
          onClick={onReveal}
          className="text-sm text-primary hover:underline"
        >
          Show number
        </button>
      )}
    </div>
  );
}

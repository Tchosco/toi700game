import { cn } from '@/lib/utils';
import { Building2, Map, Flag } from 'lucide-react';

interface TokenDisplayProps {
  cityTokens: number;
  landTokens: number;
  stateTokens: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TokenDisplay({ 
  cityTokens, 
  landTokens, 
  stateTokens, 
  size = 'md',
  className 
}: TokenDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs gap-2',
    md: 'text-sm gap-3',
    lg: 'text-base gap-4',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn('flex items-center', sizeClasses[size], className)}>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-token-city/10 text-token-city">
        <Building2 className={iconSizes[size]} />
        <span className="font-semibold">{cityTokens}</span>
        <span className="text-token-city/70">CT</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-token-land/10 text-token-land">
        <Map className={iconSizes[size]} />
        <span className="font-semibold">{landTokens}</span>
        <span className="text-token-land/70">LT</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-token-state/10 text-token-state">
        <Flag className={iconSizes[size]} />
        <span className="font-semibold">{stateTokens}</span>
        <span className="text-token-state/70">ST</span>
      </div>
    </div>
  );
}

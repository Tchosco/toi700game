import { cn } from '@/lib/utils';
import { TrendingUp, Sparkles } from 'lucide-react';

interface PointsDisplayProps {
  developmentPoints: number;
  influencePoints: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PointsDisplay({ 
  developmentPoints, 
  influencePoints, 
  size = 'md',
  className 
}: PointsDisplayProps) {
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
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary">
        <TrendingUp className={iconSizes[size]} />
        <span className="font-semibold">{developmentPoints.toLocaleString()}</span>
        <span className="text-primary/70">PD</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/10 text-secondary">
        <Sparkles className={iconSizes[size]} />
        <span className="font-semibold">{influencePoints.toLocaleString()}</span>
        <span className="text-secondary/70">PI</span>
      </div>
    </div>
  );
}

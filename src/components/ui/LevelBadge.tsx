import { cn } from '@/lib/utils';
import { TerritoryLevel } from '@/lib/data';

interface LevelBadgeProps {
  level: TerritoryLevel;
  levelNumber: number;
  className?: string;
  showLabel?: boolean;
}

const levelColors: Record<number, string> = {
  1: 'bg-level-1/20 text-level-1 border-level-1/30',
  2: 'bg-level-2/20 text-level-2 border-level-2/30',
  3: 'bg-level-3/20 text-level-3 border-level-3/30',
  4: 'bg-level-4/20 text-level-4 border-level-4/30',
  5: 'bg-level-5/20 text-level-5 border-level-5/30',
};

export function LevelBadge({ level, levelNumber, className, showLabel = true }: LevelBadgeProps) {
  const colorClass = levelColors[levelNumber] || levelColors[1];
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn(
        'px-3 py-1 rounded-full text-xs font-bold border',
        colorClass
      )}>
        Nv. {levelNumber}
      </span>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{level}</span>
      )}
    </div>
  );
}

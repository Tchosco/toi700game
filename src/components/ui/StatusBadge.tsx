import { cn } from '@/lib/utils';
import { TerritoryStatus, CityStatus } from '@/lib/data';

interface StatusBadgeProps {
  status: TerritoryStatus | CityStatus | string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  'Ativo': 'status-active',
  'Em Análise': 'status-pending',
  'Inativo': 'status-inactive',
  'Suspenso': 'status-inactive',
  'Livre': 'status-active',
  'Ocupada': 'status-pending',
  'Neutra': 'status-neutral',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styleClass = statusStyles[status] || 'status-neutral';
  
  return (
    <span className={cn('status-badge', styleClass, className)}>
      {status}
    </span>
  );
}

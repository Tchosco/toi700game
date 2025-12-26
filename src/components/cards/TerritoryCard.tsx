import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Crown } from 'lucide-react';
import type { TerritoryWithDetails } from '@/pages/TerritoriesPage';
import type { Database } from '@/integrations/supabase/types';

interface TerritoryCardProps {
  territory: TerritoryWithDetails;
}

type TerritoryStatus = Database['public']['Enums']['territory_status'];
type TerritoryLevel = Database['public']['Enums']['territory_level'];
type TerritoryStyle = Database['public']['Enums']['territory_style'];
type GovernmentType = Database['public']['Enums']['government_type'];

const statusConfig: Record<TerritoryStatus, { label: string; className: string }> = {
  pending: { label: 'Em Análise', className: 'bg-status-pending/20 text-status-pending border-status-pending/30' },
  approved: { label: 'Aprovado', className: 'bg-status-active/20 text-status-active border-status-active/30' },
  rejected: { label: 'Rejeitado', className: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30' },
  active: { label: 'Ativo', className: 'bg-status-active/20 text-status-active border-status-active/30' },
  inactive: { label: 'Inativo', className: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30' },
};

const levelConfig: Record<TerritoryLevel, { label: string; number: number; className: string }> = {
  colony: { label: 'Colônia', number: 1, className: 'bg-level-1/20 text-level-1 border-level-1/30' },
  autonomous: { label: 'Território Autônomo', number: 2, className: 'bg-level-2/20 text-level-2 border-level-2/30' },
  recognized: { label: 'Estado Reconhecido', number: 3, className: 'bg-level-3/20 text-level-3 border-level-3/30' },
  kingdom: { label: 'Reino / República', number: 4, className: 'bg-level-4/20 text-level-4 border-level-4/30' },
  power: { label: 'Potência Planetária', number: 5, className: 'bg-level-5/20 text-level-5 border-level-5/30' },
};

const styleLabels: Record<TerritoryStyle, string> = {
  cultural: 'Cultural',
  commercial: 'Comercial',
  technological: 'Tecnológico',
  military: 'Militar',
};

const governmentLabels: Record<GovernmentType, string> = {
  monarchy: 'Monarquia',
  republic: 'República',
  theocracy: 'Teocracia',
  oligarchy: 'Oligarquia',
  democracy: 'Democracia',
  dictatorship: 'Ditadura',
};

export function TerritoryCard({ territory }: TerritoryCardProps) {
  const status = statusConfig[territory.status];
  const level = levelConfig[territory.level];

  return (
    <Link to={`/territorio/${territory.id}`}>
      <Card className="glass-card hover:border-primary/50 transition-all duration-300 hover:glow-primary group h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                {territory.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                <Crown className="w-3 h-3" />
                <span className="truncate">{territory.governorName}</span>
              </div>
            </div>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level Badge */}
          <Badge variant="outline" className={level.className}>
            Nível {level.number} • {level.label}
          </Badge>
          
          {/* Location & Cities */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{territory.region}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{territory.cityCount} {territory.cityCount === 1 ? 'cidade' : 'cidades'}</span>
            </div>
          </div>

          {/* Points */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-token-city font-semibold">{territory.pdPoints}</span>
              <span className="text-muted-foreground">PD</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-token-state font-semibold">{territory.piPoints}</span>
              <span className="text-muted-foreground">PI</span>
            </div>
          </div>

          {/* Style & Government */}
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{styleLabels[territory.style]}</span> • {governmentLabels[territory.governmentType]}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

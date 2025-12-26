import { Link } from 'react-router-dom';
import { Territory } from '@/lib/data';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { PointsDisplay } from '@/components/ui/PointsDisplay';
import { MapPin, Users, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TerritoryCardProps {
  territory: Territory;
}

export function TerritoryCard({ territory }: TerritoryCardProps) {
  return (
    <Link to={`/territorio/${territory.id}`}>
      <Card className="glass-card hover:border-primary/50 transition-all duration-300 hover:glow-primary group">
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
            <StatusBadge status={territory.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <LevelBadge level={territory.level} levelNumber={territory.levelNumber} />
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{territory.region}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{territory.cities.length} cidades</span>
            </div>
          </div>

          <PointsDisplay 
            developmentPoints={territory.developmentPoints}
            influencePoints={territory.influencePoints}
            size="sm"
          />

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{territory.style}</span> • {territory.governmentType}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

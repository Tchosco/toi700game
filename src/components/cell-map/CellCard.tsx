"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, TreePine, Home } from "lucide-react";

type Cell = {
  id: string;
  status: string;
  cell_type: string;
  area_km2: number;
  is_urban_eligible: boolean;
  colonization_cost: number;
  owner_territory_id: string | null;
  has_city: boolean;
  regions: { name: string; difficulty: string } | null;
  territories: { name: string } | null;
  cities: { name: string } | null;
};

type Props = {
  cell: Cell;
  canColonize: (cell: Cell) => boolean;
  canFoundCity: (cell: Cell) => boolean;
  onColonize: (cell: Cell) => void;
  onFoundCity: (cell: Cell) => void;
};

function StatusBadge(status: string) {
  switch (status) {
    case "blocked":
      return <Badge variant="secondary" className="bg-muted/50">Bloqueada</Badge>;
    case "explored":
      return <Badge className="bg-status-warning/20 text-status-warning">Explorada</Badge>;
    case "colonized":
      return <Badge className="bg-status-success/20 text-status-success">Colonizada</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function TypeBadge(type: string, isUrbanEligible: boolean) {
  if (type === "urban") {
    return (
      <Badge className="bg-primary/20 text-primary">
        <Building2 className="h-3 w-3 mr-1" />
        Urbana
      </Badge>
    );
  }
  if (isUrbanEligible) {
    return (
      <Badge className="bg-accent/20 text-accent-foreground">
        <Home className="h-3 w-3 mr-1" />
        Urbanizável
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <TreePine className="h-3 w-3 mr-1" />
      Rural
    </Badge>
  );
}

function difficultyColor(difficulty?: string) {
  switch (difficulty) {
    case "easy": return "text-status-success";
    case "medium": return "text-status-warning";
    case "hard": return "text-orange-500";
    case "extreme": return "text-status-danger";
    case "anomaly": return "text-purple-500";
    default: return "text-muted-foreground";
  }
}

export default function CellCard({ cell, canColonize, canFoundCity, onColonize, onFoundCity }: Props) {
  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          {StatusBadge(cell.status)}
          {TypeBadge(cell.cell_type, cell.is_urban_eligible)}
        </div>
        <CardDescription className="text-xs font-mono mt-2">{cell.id.slice(0, 8)}...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Região:</span>
            <span className={difficultyColor(cell.regions?.difficulty)}>
              {cell.regions?.name || "Desconhecida"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Área:</span>
            <span>{cell.area_km2.toLocaleString()} km²</span>
          </div>
          {cell.colonization_cost > 0 && cell.status === "explored" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo:</span>
              <span className="text-status-warning">{cell.colonization_cost.toLocaleString()}</span>
            </div>
          )}
          {cell.territories?.name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dono:</span>
              <span className="text-primary">{cell.territories.name}</span>
            </div>
          )}
          {cell.has_city && cell.cities?.name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cidade:</span>
              <span className="text-accent">{cell.cities.name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {canColonize(cell) && (
            <Button size="sm" className="flex-1" onClick={() => onColonize(cell)}>
              <MapPin className="h-3 w-3 mr-1" />
              Colonizar
            </Button>
          )}
          {canFoundCity(cell) && (
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => onFoundCity(cell)}>
              <Building2 className="h-3 w-3 mr-1" />
              Fundar Cidade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
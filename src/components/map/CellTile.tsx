"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const CellTile: React.FC<{
  cell: {
    id: string;
    type: string;
    status: string;
    owner_territory_id: string | null;
    population_total: number;
    rural_population: number;
    urban_population: number;
    fertility: number;
    habitability: number;
    mineral_richness: number;
    energy_potential: number;
    population_density: number;
    rural_share?: number;
    urban_share?: number;
    region_id: string;
  };
  onClick: () => void;
}> = ({ cell, onClick }) => {
  const ownerLabel = cell.owner_territory_id ? `Dono: ${cell.owner_territory_id}` : "Livre";
  const typeBadge = cell.type === 'urban' ? 'bg-blue-500' : cell.type === 'rural' ? 'bg-green-500' : 'bg-muted';

  const bar = (val: number) => {
    const pct = Math.round(Math.min(100, Math.max(0, val * 100)));
    const color = val < 0.33 ? 'bg-red-500' : val < 0.66 ? 'bg-yellow-500' : 'bg-green-500';
    return <div className="w-full h-2 rounded bg-muted/50"><div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} /></div>;
  };

  return (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={onClick}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs">{cell.id.slice(0, 8)}...</span>
          <Badge className={`${typeBadge} text-white`}>{cell.type}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">Status: {cell.status} • {ownerLabel}</div>
        <div className="text-xs">Pop: {cell.population_total.toLocaleString()} (R {cell.rural_population.toLocaleString()} / U {cell.urban_population.toLocaleString()})</div>
        <div className="space-y-1">
          <div className="text-[11px]">Fertility</div>
          {bar(cell.fertility)}
          <div className="text-[11px]">Habitability</div>
          {bar(cell.habitability)}
          <div className="text-[11px]">Minerals</div>
          {bar(cell.mineral_richness)}
          <div className="text-[11px]">Energy</div>
          {bar(cell.energy_potential)}
        </div>
      </CardContent>
    </Card>
  );
};
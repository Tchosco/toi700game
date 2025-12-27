"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const ClusterCard: React.FC<{
  regionName: string;
  data: {
    totals: { cells: number; rural_pct: number; urban_pct: number; occupied: number; population_total: number };
    metrics: { fertility_avg: number; habitability_avg: number; minerals_avg: number; energy_avg: number; density_avg: number };
  };
  onEnter: () => void;
}> = ({ regionName, data, onEnter }) => {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm">{regionName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Células</span>
          <span className="font-medium">{data.totals.cells.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Ocupadas</span>
          <span className="font-medium">{data.totals.occupied.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Rural / Urbano</span>
          <span className="font-medium">{data.totals.rural_pct}% / {data.totals.urban_pct}%</span>
        </div>
        <div className="flex justify-between">
          <span>População</span>
          <span className="font-medium">{data.totals.population_total.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Fertility</p>
            <p className="font-medium">{data.metrics.fertility_avg}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Habitability</p>
            <p className="font-medium">{data.metrics.habitability_avg}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Minerals</p>
            <p className="font-medium">{data.metrics.minerals_avg}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Energy</p>
            <p className="font-medium">{data.metrics.energy_avg}</p>
          </div>
          <div className="p-2 rounded bg-muted/50 col-span-2">
            <p className="text-xs text-muted-foreground">Density</p>
            <p className="font-medium">{data.metrics.density_avg}</p>
          </div>
        </div>
        <Button className="w-full mt-2" onClick={onEnter}>Entrar na Região</Button>
      </CardContent>
    </Card>
  );
};
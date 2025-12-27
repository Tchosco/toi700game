"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const SectorCard: React.FC<{
  sectorKey: number;
  data: {
    counts: { cells: number; occupied: number };
    metrics: { density: number; fertility: number; habitability: number; minerals: number; energy: number };
  };
  onViewCells: () => void;
}> = ({ sectorKey, data, onViewCells }) => {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm">Setor #{sectorKey}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Células</span>
          <span className="font-medium">{data.counts.cells.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Ocupadas</span>
          <span className="font-medium">{data.counts.occupied.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Densidade</p>
            <p className="font-medium">{data.metrics.density}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Fertility</p>
            <p className="font-medium">{data.metrics.fertility}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Habitability</p>
            <p className="font-medium">{data.metrics.habitability}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Minerals</p>
            <p className="font-medium">{data.metrics.minerals}</p>
          </div>
          <div className="p-2 rounded bg-muted/50 col-span-2">
            <p className="text-xs text-muted-foreground">Energy</p>
            <p className="font-medium">{data.metrics.energy}</p>
          </div>
        </div>
        <Button className="w-full mt-2" onClick={onViewCells}>Ver Células do Setor</Button>
      </CardContent>
    </Card>
  );
};
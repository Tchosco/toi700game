"use client";

import React from "react";

type HeatmapMode =
  | "habitability"
  | "fertility"
  | "minerals"
  | "energy"
  | "density"
  | "urban_share"
  | "food_capacity"
  | "tech_capacity";

export const HeatmapLegend: React.FC<{ mode: HeatmapMode }> = ({ mode }) => {
  const labels: Record<HeatmapMode, string> = {
    habitability: "Habitability",
    fertility: "Fertility",
    minerals: "Mineral Richness",
    energy: "Energy Potential",
    density: "Population Density",
    urban_share: "Urban Share",
    food_capacity: "Food Capacity",
    tech_capacity: "Tech Capacity",
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{labels[mode]}:</span>
      <div className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-red-500/70" />
        <span>Baixo</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-yellow-500/70" />
        <span>Médio</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-green-500/70" />
        <span>Alto</span>
      </div>
    </div>
  );
};
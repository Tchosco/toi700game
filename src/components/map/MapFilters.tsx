"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MapFiltersState {
  regionId?: string;
  type?: "rural" | "urban" | "neutral";
  status?: "explored" | "colonized";
  onlyMine?: boolean;
  habitabilityMin?: number;
  habitabilityMax?: number;
  fertilityMin?: number;
  fertilityMax?: number;
  densityMin?: number;
  densityMax?: number;
  predominant?: "food" | "energy" | "minerals" | "technology";
  searchCellId?: string;
  searchStateName?: string;
  orderBy?: "population" | "density" | "tech" | "minerals" | "fertility";
}

export const MapFilters: React.FC<{
  filters: MapFiltersState;
  onChange: (next: MapFiltersState) => void;
  regions: { id: string; name: string }[];
}> = ({ filters, onChange, regions }) => {
  const set = (patch: Partial<MapFiltersState>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div>
        <Label>Região</Label>
        <Select value={filters.regionId || ""} onValueChange={(v) => set({ regionId: v || undefined })}>
          <SelectTrigger className="bg-muted/50">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tipo</Label>
        <Select value={filters.type || ""} onValueChange={(v) => set({ type: (v || undefined) as any })}>
          <SelectTrigger className="bg-muted/50">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="rural">Rural</SelectItem>
            <SelectItem value="urban">Urbano</SelectItem>
            <SelectItem value="neutral">Neutro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={filters.status || ""} onValueChange={(v) => set({ status: (v || undefined) as any })}>
          <SelectTrigger className="bg-muted/50">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="explored">Livre</SelectItem>
            <SelectItem value="colonized">Ocupado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Recurso Predominante</Label>
        <Select value={filters.predominant || ""} onValueChange={(v) => set({ predominant: (v || undefined) as any })}>
          <SelectTrigger className="bg-muted/50">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="energy">Energy</SelectItem>
            <SelectItem value="minerals">Minerals</SelectItem>
            <SelectItem value="technology">Tech</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Habitability (min)</Label>
        <Input type="number" step="0.01" value={filters.habitabilityMin ?? ""} onChange={(e) => set({ habitabilityMin: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label>Habitability (max)</Label>
        <Input type="number" step="0.01" value={filters.habitabilityMax ?? ""} onChange={(e) => set({ habitabilityMax: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label>Fertility (min)</Label>
        <Input type="number" step="0.01" value={filters.fertilityMin ?? ""} onChange={(e) => set({ fertilityMin: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label>Fertility (max)</Label>
        <Input type="number" step="0.01" value={filters.fertilityMax ?? ""} onChange={(e) => set({ fertilityMax: e.target.value ? Number(e.target.value) : undefined })} />
      </div>

      <div>
        <Label>Densidade (min)</Label>
        <Input type="number" step="0.1" value={filters.densityMin ?? ""} onChange={(e) => set({ densityMin: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label>Densidade (max)</Label>
        <Input type="number" step="0.1" value={filters.densityMax ?? ""} onChange={(e) => set({ densityMax: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label>Buscar por Cell ID</Label>
        <Input value={filters.searchCellId ?? ""} onChange={(e) => set({ searchCellId: e.target.value || undefined })} placeholder="UUID da célula" />
      </div>
      <div>
        <Label>Estado (nome)</Label>
        <Input value={filters.searchStateName ?? ""} onChange={(e) => set({ searchStateName: e.target.value || undefined })} placeholder="Nome do Estado" />
      </div>
    </div>
  );
};
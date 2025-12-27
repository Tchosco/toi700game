"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Cell = any;

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
  if (type === "urban") return <Badge className="bg-primary/20 text-primary">Urbana</Badge>;
  if (isUrbanEligible) return <Badge className="bg-accent/20 text-accent-foreground">Urbanizável</Badge>;
  return <Badge variant="outline">Rural</Badge>;
}

type Props = {
  cells: Cell[] | null | undefined;
  loading: boolean;
  canColonize: (cell: Cell) => boolean;
  canFoundCity: (cell: Cell) => boolean;
  onColonize: (cell: Cell) => void;
  onFoundCity: (cell: Cell) => void;
};

export default function CellsList({
  cells,
  loading,
  canColonize,
  canFoundCity,
  onColonize,
  onFoundCity,
}: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        {/* Keep same loader style as grid */}
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!cells || cells.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Nenhuma célula encontrada</div>;
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">ID</th>
            <th className="text-left p-3">Região</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Área</th>
            <th className="text-left p-3">Dono</th>
            <th className="text-left p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr key={cell.id} className="border-t border-border hover:bg-muted/30">
              <td className="p-3 font-mono text-xs">{cell.id.slice(0, 8)}...</td>
              <td className="p-3">{cell.regions?.name || "-"}</td>
              <td className="p-3">{StatusBadge(cell.status)}</td>
              <td className="p-3">{TypeBadge(cell.cell_type, cell.is_urban_eligible)}</td>
              <td className="p-3">{cell.area_km2.toLocaleString()} km²</td>
              <td className="p-3">{cell.territories?.name || "-"}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  {canColonize(cell) && (
                    <Button size="sm" variant="outline" onClick={() => onColonize(cell)}>
                      Colonizar
                    </Button>
                  )}
                  {canFoundCity(cell) && (
                    <Button size="sm" variant="outline" onClick={() => onFoundCity(cell)}>
                      Fundar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
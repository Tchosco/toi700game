"use client";

import React from "react";
import CellCard from "./CellCard";
import { Loader2, MapPin } from "lucide-react";

type Cell = any;

type Props = {
  cells: Cell[] | null | undefined;
  loading: boolean;
  canColonize: (cell: Cell) => boolean;
  canFoundCity: (cell: Cell) => boolean;
  onColonize: (cell: Cell) => void;
  onFoundCity: (cell: Cell) => void;
};

export default function CellsGrid({
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cells || cells.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma célula encontrada com os filtros selecionados</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cells.map((cell) => (
        <CellCard
          key={cell.id}
          cell={cell}
          canColonize={canColonize}
          canFoundCity={canFoundCity}
          onColonize={onColonize}
          onFoundCity={onFoundCity}
        />
      ))}
    </div>
  );
}
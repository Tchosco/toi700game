"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Coins, Loader2 } from "lucide-react";

type Territory = { id: string; name: string };
type Cell = {
  id: string;
  area_km2: number;
  is_urban_eligible: boolean;
  colonization_cost: number;
  regions: { name: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCell: Cell | null;
  userTerritories: Territory[] | null | undefined;
  selectedTerritoryId: string;
  onSelectedTerritoryIdChange: (v: string) => void;
  useToken: boolean;
  onUseTokenChange: (v: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  userTokens: { land_tokens?: number } | null | undefined;
};

export default function ColonizeDialog({
  open,
  onOpenChange,
  selectedCell,
  userTerritories,
  selectedTerritoryId,
  onSelectedTerritoryIdChange,
  useToken,
  onUseTokenChange,
  onConfirm,
  isPending,
  userTokens,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Colonizar Célula</DialogTitle>
          <DialogDescription>Escolha como deseja pagar pela colonização desta célula.</DialogDescription>
        </DialogHeader>

        {selectedCell && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Região:</span>
                <span>{selectedCell.regions?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Área:</span>
                <span>{selectedCell.area_km2.toLocaleString()} km²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Urbanizável:</span>
                <span>{selectedCell.is_urban_eligible ? "Sim" : "Não"}</span>
              </div>
            </div>

            <div>
              <Label>Território</Label>
              <Select value={selectedTerritoryId} onValueChange={onSelectedTerritoryIdChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um território" />
                </SelectTrigger>
                <SelectContent>
                  {userTerritories?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Método de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant={useToken ? "default" : "outline"}
                  onClick={() => onUseTokenChange(true)}
                  className="justify-start"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  1 Token de Terra
                  <span className="ml-auto text-xs opacity-70">({userTokens?.land_tokens || 0})</span>
                </Button>
                <Button
                  variant={!useToken ? "default" : "outline"}
                  onClick={() => onUseTokenChange(false)}
                  className="justify-start"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  {(((selectedCell.colonization_cost || 0) + 500) || 0).toLocaleString()}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !selectedTerritoryId}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
            Colonizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
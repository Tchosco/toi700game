"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";

type Cell = {
  id: string;
  owner_territory_id: string | null;
  regions: { name: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCell: Cell | null;
  userTokens: { city_tokens?: number } | null | undefined;
  onConfirm: (cityName: string) => void;
  isPending: boolean;
};

export default function FoundCityDialog({
  open,
  onOpenChange,
  selectedCell,
  userTokens,
  onConfirm,
  isPending,
}: Props) {
  const [cityName, setCityName] = useState("");

  useEffect(() => {
    if (!open) setCityName("");
  }, [open]);

  const canSubmit = cityName.trim().length > 0 && (userTokens?.city_tokens || 0) >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fundar Cidade</DialogTitle>
          <DialogDescription>Crie uma nova cidade nesta célula urbanizável. Custo: 1 Token de Cidade.</DialogDescription>
        </DialogHeader>

        {selectedCell && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Região:</span>
                <span>{selectedCell.regions?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seus Tokens de Cidade:</span>
                <span className={(userTokens?.city_tokens || 0) > 0 ? "text-status-success" : "text-status-danger"}>
                  {userTokens?.city_tokens || 0}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="city-name">Nome da Cidade</Label>
              <Input
                id="city-name"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Digite o nome da cidade"
                maxLength={50}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(cityName.trim())}
            disabled={isPending || !canSubmit}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
            Fundar Cidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, Search, Home } from "lucide-react";

type RegionItem = { id: string; name: string };

type FiltersBarProps = {
  searchTerm: string;
  onSearchTermChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  regionFilter: string;
  onRegionFilterChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  urbanOnlyFilter: boolean;
  onToggleUrbanOnly: () => void;
  regions?: RegionItem[] | null;
};

export default function FiltersBar({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  regionFilter,
  onRegionFilterChange,
  typeFilter,
  onTypeFilterChange,
  urbanOnlyFilter,
  onToggleUrbanOnly,
  regions = [],
}: FiltersBarProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Região, território..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="explored">Exploradas</SelectItem>
                <SelectItem value="colonized">Colonizadas</SelectItem>
                <SelectItem value="blocked">Bloqueadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Região</Label>
            <Select value={regionFilter} onValueChange={onRegionFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {regions?.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
                <SelectItem value="urban">Urbana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant={urbanOnlyFilter ? "default" : "outline"}
              onClick={onToggleUrbanOnly}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Só Urbanizáveis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
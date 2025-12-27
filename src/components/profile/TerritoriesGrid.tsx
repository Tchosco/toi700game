"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Vote } from "lucide-react";

type Territory = {
  id: string;
  name: string;
  level: string;
  government_type: string;
  stability: number;
  economy_rating: number;
  pd_points: number;
  pi_points: number;
  region?: { name?: string } | null;
  capital?: { name?: string } | null;
};

type Props = {
  territories: Territory[];
  levelLabels: Record<string, string>;
  levelColors: Record<string, string>;
};

export default function TerritoriesGrid({ territories, levelLabels, levelColors }: Props) {
  if (!territories || territories.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-bold text-lg mb-2">Nenhum território</h3>
        <p className="text-muted-foreground mb-4">
          Você ainda não possui nenhum território. Crie sua primeira nação!
        </p>
        <Link to="/criar-territorio">
          <button className="inline-flex items-center h-9 rounded-md border px-4 text-sm font-medium hover:bg-muted">
            Criar Território
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {territories.map((territory) => (
        <Link key={territory.id} to={`/territorio/${territory.id}`} className="block">
          <Card className="hover:border-primary/50 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg">{territory.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {territory.region?.name || "Sem região"}
                  </p>
                </div>
                <Badge className={`${levelColors[territory.level] || "bg-gray-500"} text-white`}>
                  {levelLabels[territory.level] || territory.level}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Capital:</span>
                  <span className="ml-2 font-medium">{territory.capital?.name || "Nenhuma"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Governo:</span>
                  <span className="ml-2 font-medium capitalize">{territory.government_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Estabilidade:</span>
                  <span className="ml-2 font-medium">{territory.stability}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Economia:</span>
                  <span className="ml-2 font-medium">{territory.economy_rating}%</span>
                </div>
              </div>

              <div className="flex gap-4 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-1 text-sm">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="font-mono">{territory.pd_points} PD</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Vote className="w-4 h-4 text-purple-500" />
                  <span className="font-mono">{territory.pi_points} PI</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
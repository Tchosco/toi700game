"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf, Zap, Mountain, Cpu, Vote } from "lucide-react";

type Aggregated = Record<string, { amount: number; production: number; consumption: number }>;

export default function ResourcesSummary({ aggregatedResources }: { aggregatedResources?: Aggregated | null }) {
  const resourceIcons: Record<string, React.ElementType> = {
    food: Leaf,
    energy: Zap,
    minerals: Mountain,
    technology: Cpu,
    influence: Vote,
  };
  const resourceLabels: Record<string, string> = {
    food: "Alimentos",
    energy: "Energia",
    minerals: "Minerais",
    technology: "Tecnologia",
    influence: "Influência",
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-500" />
          Recursos Totais
        </CardTitle>
        <CardDescription>Soma de recursos de todos os seus territórios</CardDescription>
      </CardHeader>
      <CardContent>
        {aggregatedResources && Object.keys(aggregatedResources).length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(aggregatedResources).map(([type, data]) => {
              const Icon = resourceIcons[type] || Leaf;
              const netProduction = data.production - data.consumption;

              return (
                <Card key={type} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{resourceLabels[type] || type}</h3>
                        <p className="font-mono text-xl font-bold">{data.amount.toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Produção:</span>
                        <span className="text-green-500 font-mono">+{data.production.toFixed(1)}/ciclo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consumo:</span>
                        <span className="text-red-500 font-mono">-{data.consumption.toFixed(1)}/ciclo</span>
                      </div>
                      <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">Líquido:</span>
                        <span className={`font-mono font-bold ${netProduction >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {netProduction >= 0 ? "+" : ""}
                          {netProduction.toFixed(1)}/ciclo
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Leaf className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-bold text-lg mb-2">Sem recursos</h3>
            <p className="text-muted-foreground">
              Você ainda não possui recursos. Crie um território para começar a produzir!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
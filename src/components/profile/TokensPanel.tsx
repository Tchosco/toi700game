"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Building2, Map, Globe } from "lucide-react";
import { Link } from "react-router-dom";

type Tokens = {
  city_tokens?: number | null;
  land_tokens?: number | null;
  state_tokens?: number | null;
};

export default function TokensPanel({ tokens }: { tokens?: Tokens | null }) {
  const tokenLabels: Record<string, string> = {
    city: "City Token",
    land: "Land Token",
    state: "State Token",
  };
  const tokenIcons: Record<string, React.ElementType> = {
    city: Building2,
    land: Map,
    state: Globe,
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" />
          Meus Tokens
        </CardTitle>
        <CardDescription>Tokens disponíveis para expansão territorial</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {["city", "land", "state"].map((type) => {
            const Icon = tokenIcons[type];
            const count =
              type === "city"
                ? tokens?.city_tokens
                : type === "land"
                ? tokens?.land_tokens
                : tokens?.state_tokens;

            return (
              <Card key={type} className="bg-muted/30">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">{tokenLabels[type]}</h3>
                  <p className="font-mono text-3xl font-bold text-primary mb-2">{count || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {type === "city" && "Permite fundar 1 cidade"}
                    {type === "land" && "Permite colonizar 1 célula"}
                    {type === "state" && "Permite criar 1 país"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link to="/mercado">
            <button className="inline-flex items-center h-9 rounded-md border px-4 text-sm font-medium hover:bg-muted">
              <Coins className="w-4 h-4 mr-2" />
              Comprar Tokens no Mercado
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
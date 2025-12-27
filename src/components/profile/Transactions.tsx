"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wallet, Crown, History, ArrowUpRight, ArrowDownRight, Clock, Coins, Building2, Map, Globe } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CurrencyTx = {
  id: string;
  amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
  transaction_type: string;
};
type TokenTx = {
  id: string;
  token_type: "city" | "land" | "state" | string;
  amount: number;
  reason: string | null;
  created_at: string;
};

export default function Transactions({
  currencyTransactions,
  tokenTransactions,
}: {
  currencyTransactions?: CurrencyTx[] | null;
  tokenTransactions?: TokenTx[] | null;
}) {
  const tokenIcons: Record<string, React.ElementType> = {
    city: Building2,
    land: Map,
    state: Globe,
  };
  const tokenLabels: Record<string, string> = {
    city: "City Token",
    land: "Land Token",
    state: "State Token",
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Currency Transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-500" />
            Transações de Moeda
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currencyTransactions && currencyTransactions.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currencyTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {tx.transaction_type === "credit" ? (
                      <ArrowDownRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{tx.description || tx.category}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono font-bold ${tx.transaction_type === "credit" ? "text-green-500" : "text-red-500"}`}>
                    {tx.transaction_type === "credit" ? "+" : "-"}₮{Math.abs(Number(tx.amount)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma transação</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-500" />
            Transações de Tokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokenTransactions && tokenTransactions.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tokenTransactions.map((tx) => {
                const Icon = tokenIcons[tx.token_type] || Coins;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{tokenLabels[tx.token_type] || tx.token_type}</p>
                        <p className="text-xs text-muted-foreground">{tx.reason || "Sem descrição"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma transação</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
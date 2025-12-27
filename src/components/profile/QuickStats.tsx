"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Building2, TrendingUp, Coins } from "lucide-react";

type WalletData = {
  balance?: number | null;
  total_earned?: number | null;
  total_spent?: number | null;
};

type Props = {
  wallet?: WalletData | null;
  territoriesCount: number;
};

export default function QuickStats({ wallet, territoriesCount }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="font-mono text-xl font-bold">
                ₮{Number(wallet?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Territórios</p>
              <p className="font-mono text-xl font-bold">{territoriesCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ganho</p>
              <p className="font-mono text-xl font-bold">
                ₮{Number(wallet?.total_earned || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Gasto</p>
              <p className="font-mono text-xl font-bold">
                ₮{Number(wallet?.total_spent || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
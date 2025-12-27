"use client";

import React from "react";
import { User } from "lucide-react";

type Props = {
  username?: string | null;
  email?: string | null;
};

export default function ProfileHeader({ username, email }: Props) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">
            {username || "Jogador"}
          </h1>
          {email && <p className="text-muted-foreground">{email}</p>}
        </div>
      </div>
    </div>
  );
}
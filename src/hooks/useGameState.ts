"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type WorldConfig = {
  total_planet_land_km2?: number;
  total_planet_population?: number;
  tick_interval_hours?: number;
  last_tick_at?: string | null;
  total_ticks?: number | null;
  season_day?: number | null;
  land_area_km2?: number;
  total_population?: number;
  planet_area_total_km2?: number;
  land_ratio?: number;
  proportion_dry_area?: number;
  tick_number?: number;
};

type TickLog = {
  id: string;
  tick_number: number;
  started_at: string;
  completed_at: string | null;
  status: string;
  territories_processed: number | null;
  cities_processed: number | null;
  events_generated: number | null;
};

type EventLog = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  created_at: string;
  territories?: { name: string } | null;
};

export function useGameState() {
  const qc = useQueryClient();

  const worldConfigQuery = useQuery<WorldConfig | null>({
    queryKey: ["worldConfig"],
    queryFn: async (): Promise<WorldConfig | null> => {
      try {
        const { data: pc } = await (supabase as any)
          .from("planet_config")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (pc) return pc as WorldConfig;
      } catch {}
      const { data: wc } = await supabase
        .from("world_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      return (wc ?? null) as WorldConfig | null;
    },
    staleTime: 60_000,
  });

  const lastTickQuery = useQuery<TickLog | null>({
    queryKey: ["lastTick"],
    queryFn: async (): Promise<TickLog | null> => {
      const { data } = await supabase
        .from("tick_logs")
        .select("*")
        .order("tick_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data ?? null) as TickLog | null;
    },
    staleTime: 30_000,
  });

  const eventsQuery = useQuery<EventLog[]>({
    queryKey: ["planetEvents"],
    queryFn: async (): Promise<EventLog[]> => {
      const { data } = await supabase
        .from("event_logs")
        .select("*, territories(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return Array.isArray(data) ? (data as EventLog[]) : [];
    },
    staleTime: 15_000,
  });

  // Realtime subscriptions: invalidate and refetch on changes
  useEffect(() => {
    const chTicks = supabase
      .channel("game-state-ticks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tick_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["lastTick"] });
        qc.invalidateQueries({ queryKey: ["worldConfig"] });
        qc.invalidateQueries({ queryKey: ["planetEvents"] });
      })
      .subscribe();

    const chWorld = supabase
      .channel("game-state-world")
      .on("postgres_changes", { event: "*", schema: "public", table: "world_config" }, () => {
        qc.invalidateQueries({ queryKey: ["worldConfig"] });
      })
      .subscribe();

    const chEvents = supabase
      .channel("game-state-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["planetEvents"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chTicks);
      supabase.removeChannel(chWorld);
      supabase.removeChannel(chEvents);
    };
  }, [qc]);

  const config = worldConfigQuery.data;
  const lastTick = lastTickQuery.data;
  const events = eventsQuery.data || [];

  const density =
    config?.land_area_km2 && config?.total_population
      ? config.total_population / config.land_area_km2
      : config?.total_planet_land_km2 && config?.total_planet_population
      ? config.total_planet_population / config.total_planet_land_km2
      : null;

  const areaTotal =
    config?.planet_area_total_km2 ?? config?.total_planet_land_km2 ?? null;
  const landArea =
    config?.land_area_km2 ?? config?.total_planet_land_km2 ?? null;
  const landRatio =
    config?.land_ratio ?? config?.proportion_dry_area ?? null;
  const tickInterval =
    config?.tick_interval_hours ?? 24;
  const tickNumber =
    config?.tick_number ?? lastTick?.tick_number ?? 0;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["worldConfig"] });
    qc.invalidateQueries({ queryKey: ["lastTick"] });
    qc.invalidateQueries({ queryKey: ["planetEvents"] });
  };

  return {
    worldConfig: config,
    lastTick,
    events,
    derived: {
      density,
      areaTotal,
      landArea,
      landRatio,
      tickInterval,
      tickNumber,
      lastTickTime: lastTick?.completed_at || lastTick?.started_at || null,
    },
    status: {
      worldConfigLoading: worldConfigQuery.isLoading,
      lastTickLoading: lastTickQuery.isLoading,
      eventsLoading: eventsQuery.isLoading,
    },
    refetch: {
      worldConfig: worldConfigQuery.refetch,
      lastTick: lastTickQuery.refetch,
      events: eventsQuery.refetch,
      all: invalidateAll,
    },
  };
}
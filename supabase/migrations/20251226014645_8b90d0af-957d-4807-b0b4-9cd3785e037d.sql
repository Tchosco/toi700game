-- Create tick_logs table to track tick executions
CREATE TABLE public.tick_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tick_number INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  territories_processed INTEGER DEFAULT 0,
  cities_processed INTEGER DEFAULT 0,
  research_projects_completed INTEGER DEFAULT 0,
  events_generated INTEGER DEFAULT 0,
  error_message TEXT,
  summary JSONB DEFAULT '{}'::jsonb
);

-- Create event_logs table for daily events
CREATE TABLE public.event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tick_log_id UUID REFERENCES public.tick_logs(id),
  territory_id UUID REFERENCES public.territories(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  effects JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tick_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for tick_logs
CREATE POLICY "Admins can manage tick logs" ON public.tick_logs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tick logs viewable by everyone" ON public.tick_logs
FOR SELECT USING (true);

-- RLS policies for event_logs
CREATE POLICY "Admins can manage event logs" ON public.event_logs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Event logs viewable by everyone" ON public.event_logs
FOR SELECT USING (true);

-- Add last_tick_at to world_config for tracking
ALTER TABLE public.world_config ADD COLUMN IF NOT EXISTS last_tick_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.world_config ADD COLUMN IF NOT EXISTS total_ticks INTEGER DEFAULT 0;
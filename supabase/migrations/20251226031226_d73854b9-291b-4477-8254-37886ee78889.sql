-- Create enum for discussion space types
CREATE TYPE discussion_space_type AS ENUM ('planetary_council', 'bloc_council', 'trade_chamber', 'private_room');

-- Create enum for proposal status
CREATE TYPE proposal_status AS ENUM ('draft', 'open', 'voting', 'approved', 'rejected', 'executed');

-- Create enum for proposal types
CREATE TYPE proposal_type AS ENUM ('law', 'treaty', 'bloc_creation', 'trade_deal', 'sanction', 'era_change', 'other');

-- Discussion spaces table
CREATE TABLE public.discussion_spaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_type discussion_space_type NOT NULL,
  name text NOT NULL,
  description text,
  bloc_id uuid REFERENCES public.geopolitical_blocs(id) ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Discussion topics
CREATE TABLE public.discussion_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid NOT NULL REFERENCES public.discussion_spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_territory_id uuid REFERENCES public.territories(id),
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Discussion replies
CREATE TABLE public.discussion_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.discussion_topics(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_territory_id uuid REFERENCES public.territories(id),
  is_hidden boolean DEFAULT false,
  hidden_by uuid,
  hidden_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Formal proposals (can become laws, treaties, etc)
CREATE TABLE public.formal_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid NOT NULL REFERENCES public.discussion_spaces(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.discussion_topics(id),
  proposal_type proposal_type NOT NULL,
  title text NOT NULL,
  description text,
  full_content text,
  status proposal_status NOT NULL DEFAULT 'draft',
  proposer_id uuid NOT NULL,
  proposer_territory_id uuid REFERENCES public.territories(id),
  votes_yes integer DEFAULT 0,
  votes_no integer DEFAULT 0,
  votes_abstain integer DEFAULT 0,
  voting_ends_at timestamp with time zone,
  result_entity_id uuid,
  result_entity_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Private room invitations
CREATE TABLE public.room_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.discussion_spaces(id) ON DELETE CASCADE,
  invited_territory_id uuid NOT NULL REFERENCES public.territories(id),
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Diplomatic history log
CREATE TABLE public.diplomatic_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  involved_territories uuid[],
  proposal_id uuid REFERENCES public.formal_proposals(id),
  space_id uuid REFERENCES public.discussion_spaces(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discussion_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomatic_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussion_spaces
CREATE POLICY "Public spaces viewable by everyone" ON public.discussion_spaces
FOR SELECT USING (is_private = false OR space_type IN ('planetary_council', 'trade_chamber'));

CREATE POLICY "Bloc councils viewable by members" ON public.discussion_spaces
FOR SELECT USING (
  space_type = 'bloc_council' AND EXISTS (
    SELECT 1 FROM bloc_memberships bm
    JOIN territories t ON t.id = bm.territory_id
    WHERE bm.bloc_id = discussion_spaces.bloc_id
    AND t.owner_id = auth.uid()
    AND bm.status = 'active'
  )
);

CREATE POLICY "Private rooms viewable by invited" ON public.discussion_spaces
FOR SELECT USING (
  is_private = true AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM room_invitations ri
      JOIN territories t ON t.id = ri.invited_territory_id
      WHERE ri.room_id = discussion_spaces.id
      AND t.owner_id = auth.uid()
      AND ri.status = 'accepted'
    )
  )
);

CREATE POLICY "Users can create private rooms" ON public.discussion_spaces
FOR INSERT WITH CHECK (auth.uid() = created_by AND is_private = true);

CREATE POLICY "Admins manage spaces" ON public.discussion_spaces
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for topics
CREATE POLICY "Topics viewable if space is viewable" ON public.discussion_topics
FOR SELECT USING (
  EXISTS (SELECT 1 FROM discussion_spaces WHERE id = discussion_topics.space_id)
);

CREATE POLICY "Territory owners can create topics" ON public.discussion_topics
FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (SELECT 1 FROM territories WHERE owner_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Authors can update own topics" ON public.discussion_topics
FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins manage topics" ON public.discussion_topics
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for replies
CREATE POLICY "Replies viewable if topic is viewable" ON public.discussion_replies
FOR SELECT USING (
  is_hidden = false AND
  EXISTS (SELECT 1 FROM discussion_topics WHERE id = discussion_replies.topic_id)
);

CREATE POLICY "Territory owners can create replies" ON public.discussion_replies
FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (SELECT 1 FROM territories WHERE owner_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Authors can update own replies" ON public.discussion_replies
FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins manage replies" ON public.discussion_replies
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for proposals
CREATE POLICY "Proposals viewable in accessible spaces" ON public.formal_proposals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM discussion_spaces WHERE id = formal_proposals.space_id)
);

CREATE POLICY "Territory owners can create proposals" ON public.formal_proposals
FOR INSERT WITH CHECK (
  auth.uid() = proposer_id AND
  EXISTS (SELECT 1 FROM territories WHERE owner_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Proposers can update draft proposals" ON public.formal_proposals
FOR UPDATE USING (auth.uid() = proposer_id AND status = 'draft');

CREATE POLICY "Admins manage proposals" ON public.formal_proposals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for invitations
CREATE POLICY "Invitations viewable by involved parties" ON public.room_invitations
FOR SELECT USING (
  invited_by = auth.uid() OR
  EXISTS (SELECT 1 FROM territories WHERE id = invited_territory_id AND owner_id = auth.uid())
);

CREATE POLICY "Users can create invitations for own rooms" ON public.room_invitations
FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Invited users can update invitation status" ON public.room_invitations
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM territories WHERE id = invited_territory_id AND owner_id = auth.uid())
);

CREATE POLICY "Admins manage invitations" ON public.room_invitations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for diplomatic history
CREATE POLICY "Diplomatic history viewable by everyone" ON public.diplomatic_history
FOR SELECT USING (true);

CREATE POLICY "Admins manage history" ON public.diplomatic_history
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_discussion_spaces_updated_at BEFORE UPDATE ON public.discussion_spaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_discussion_topics_updated_at BEFORE UPDATE ON public.discussion_topics
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_formal_proposals_updated_at BEFORE UPDATE ON public.formal_proposals
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default discussion spaces
INSERT INTO public.discussion_spaces (space_type, name, description, is_private) VALUES
('planetary_council', 'Conselho Planetário de TOI-700', 'Espaço oficial para debates sobre a Constituição Planetária, leis globais e o futuro do planeta.', false),
('trade_chamber', 'Câmara de Comércio Planetária', 'Espaço para negociações comerciais, acordos econômicos e propostas de intercâmbio entre nações.', false);
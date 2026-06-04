# Fase 1 — Hierarquia Legal + Constitucionalidade (Profundidade 5)

Aproveita o que já existe (`laws`, `law_templates`, `legal_history`, `geopolitical_blocs`, `parliamentary_votes`, `formal_proposals`) e adiciona a camada que falta.

## Entregáveis

### 1. Constituição Planetária semeada
- Migration insere uma linha em `laws` com `legal_level='planetary'`, `is_constitution=true`, `status='enacted'`, e `full_text` contendo uma constituição inicial em pt-BR (preâmbulo + 8 títulos: direitos fundamentais, organização dos poderes, países, blocos, parlamento, suprema corte, processo legislativo, emendas).
- Só insere se ainda não existir uma constituição promulgada (idempotente).

### 2. Sistema de Emendas Constitucionais
- Novas tabelas:
  - `constitutional_amendments` (proposer_user_id, proposer_territory_id, title, rationale, proposed_text, target_section, status: draft|voting|approved|rejected|withdrawn, votes_yes/no/abstain, voting_ends_at, approved_at, applied_at)
  - `amendment_votes` (amendment_id, voter_user_id, voter_territory_id, vote: yes|no|abstain) — unique(amendment_id, voter_territory_id)
- RLS: leitura pública; INSERT por dono de território ativo; voto por dono de território ativo (1 voto por país).
- RPCs (SECURITY DEFINER, auth checks):
  - `propose_amendment(...)` → cria amendment em status `voting` com `voting_ends_at = now() + 7 dias`.
  - `cast_amendment_vote(amendment_id, vote)` → upsert do voto, atualiza contadores.
  - `finalize_amendment(amendment_id)` → fecha votação se prazo expirou; aprova com ≥ 2/3 dos votos válidos; se aprovada, faz append/replace no `full_text` da constituição e registra em `legal_history`.

### 3. Verificação automática de constitucionalidade
- Função `check_law_conflicts(law_id)` → percorre leis superiores (constituição → planetárias → carta do bloco → leis do bloco) e usa heurística textual (palavras-chave proibidas/antônimos em `full_text`/`description` + flags em `negative_effects`/`positive_effects`) para detectar conflitos. Retorna jsonb `[{ superior_law_id, superior_law_name, level, reason }]`.
- Trigger `AFTER INSERT/UPDATE OF status,full_text,description ON laws` quando `status IN ('proposed','enacted')`: popula `legal_conflicts`, e se houver conflito registra `legal_history` (action='conflict_detected') + cria `notification` para o dono.
- Leis com conflitos não bloqueiam INSERT (preserva fluxo atual), mas ficam marcadas.

### 4. UI

**ConstitutionPage.tsx** (expandir):
- Aba "Constituição": render do `full_text` (mantido) + botão "Propor Emenda" (modal).
- Aba "Emendas": lista de emendas em votação / aprovadas / rejeitadas, com tempo restante, contagem de votos, botão "Votar" (Sim/Não/Abstenção) habilitado para donos de território ativo, e botão "Finalizar votação" quando prazo expirou.
- Aba "Leis Planetárias" (já existe).

**LegalHierarchyPage.tsx**: adicionar badge vermelha "Inconstitucional" em cards cujo `legal_conflicts.length > 0`, com tooltip explicando o conflito.

**CreateLawPage.tsx**: ao salvar, refazer query para mostrar conflitos detectados pelo trigger.

### 5. Memória do projeto
- Atualizar `mem://gameplay/sistema-legal` com regras de emenda (2/3, 7 dias, 1 voto por país) e como a verificação de constitucionalidade funciona.

## Detalhes técnicos

- Não usar CHECK constraints com `now()`; usar trigger de validação.
- Todas as RPCs validam `auth.uid()` e existência de território ativo do chamador.
- GRANT em todas as novas tabelas: `authenticated` (CRUD escopado por RLS) e `service_role` (ALL).
- Migration única para schema; emenda da constituição usa supabase--insert (não migration).
- Sem mudanças em edge functions existentes; sem remover nada.

## Fora de escopo (próximas fases)
Parlamento + Suprema Corte completos, mídia escrita, regimes políticos, sistema de prestígio, eventos dinâmicos derivados. A escolha foi começar pela hierarquia legal — vou abrir essas fases assim que esta estiver no ar.

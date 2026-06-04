# Plano: Mapa Interativo de TOI-700 + NPCs + Províncias

Execução em **4 fases sequenciais**. Cada fase é independente, com migração + código.

## Fase 1 — Re-escala planetária + NPCs
- Atualizar `planetary_config` com dimensões reais de TOI-700 e (raio ~1.19 R⊕, ~726M km² superfície, ~29% terra → ~210M km² emersos, ~71% oceano).
- Em `territories`: adicionar `is_npc` (bool), `development_level` (1-10), `npc_color`.
- Em `cells`: relaxar `area_km2` (mínimo 7500 para players, variável de 7.500–60.000 para NPCs/oceanos).
- Seed: para cada região sem dono, criar um **NPC country** ocupando suas células livres, com população baixa-média e desenvolvimento 1-4.

## Fase 2 — Hierarquia Estado → Província → Cidade(=Célula)
- Nova tabela `provinces` (territory_id, name, capital_cell_id, color, governor_user_id?).
- `cells`: adicionar `province_id`, `cell_name` (cada célula vira uma "cidade").
- RPC `create_province`, `assign_cell_to_province`, `rename_cell`.
- Página `ProvincesPage` + aba "Províncias" no detalhe do Estado.

## Fase 3 — Mapa Mundial Interativo
- Gerar arte SVG nova de TOI-700 (continentes estilizados, inspirada na imagem mas original).
- Componente `WorldMap.tsx` com hexágonos/células posicionados sobre os continentes.
- Substituir `PoliticalMapPage` por mapa real interativo: hover/click → ficha do Estado.
- Filtros: Estados, Blocos, Regimes, Desenvolvimento, NPCs vs Players.

## Fase 4 — Polimento & Integrações
- Vínculos cruzados: clicar célula → CellDetailPage; clicar Estado → TerritoryDetailPage.
- Mostrar bandeira/cor do NPC, possibilidade de diplomacia limitada com NPCs (não-jogadores).
- Atualizar Navbar e remover/depreciar mapa antigo.

Começarei pela **Fase 1** (migração + seed de NPCs).

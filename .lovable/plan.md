
# Plano: Nova escala de células + regras de agrupamento

## Decisões de design

- **Tamanho da célula**: máximo **1000 km²** (mínimo ~100 km² para variar terreno).
- **País (territory)**: composto por **muitas células** (dezenas a centenas).
- **Província**: agrupa células de um mesmo país. Já planejada na Fase 2.
- **Cidade ↔ Célula**: relação **1:1** — cada célula tem no máximo uma cidade; cada cidade pertence a uma célula.
- **Agrupamento (merge)**: o jogador pode unir células **limítrofes da mesma província** em uma célula maior. A célula resultante mantém o limite prático superior (faixa de até ~5000 km² após merges), mas a unidade mínima territorial continua sendo a célula original (sem subdividir abaixo de 1000 km²).
- **Liberdade administrativa**: o jogador pode **renomear** células (cidades), províncias e o país livremente. Renomear não afeta as regras do jogo, só apresentação.

## Mudanças de banco

1. **`planetary_config`**: ajustar `min_cell_area_km2`=100, `max_cell_area_km2`=1000, e adicionar `max_merged_cell_area_km2`=5000.
2. **`cells`**: 
   - reduzir `area_km2` default para um valor aleatório 100–1000 (apenas células não-jogador) — para células já existentes, reescalar para esse intervalo.
   - adicionar `display_name` (text, nullable) — o nome que o jogador dá à cidade/célula.
   - adicionar `merged_into_cell_id` (uuid, nullable, self-FK) — quando uma célula foi absorvida por outra via merge, aponta para a "mestre".
   - adicionar `province_id` (uuid, nullable) — preparado para Fase 2.
3. **`territories`**: garantir que `display_name` (apelido) já existe — caso contrário adicionar `nickname` (text, nullable) para nome livre do país.
4. **Regra**: 1 cidade por célula já é o modelo atual (`cells.city_id`). Vamos adicionar **constraint** `UNIQUE(cell_id)` na `cell_cities` para reforçar.

## RPCs novas (server-side, com locks)

- `rename_cell(p_cell_id, p_name)` — só o dono do território pode.
- `rename_territory(p_territory_id, p_nickname)` — só o dono.
- `merge_cells(p_master_cell_id, p_absorbed_cell_id)` — valida que ambas pertencem ao mesmo `owner_territory_id`, mesma `province_id`, são adjacentes (por enquanto: mesma região), e o total não excede `max_merged_cell_area_km2`. Marca a absorvida como `merged_into_cell_id` e soma `area_km2`/populações na mestre.
- `unmerge_cell(p_absorbed_cell_id)` — reverte.

## Re-seed de cells/NPCs

A Fase 1 seedou NPCs com 7.500–60.000 km² por célula — fora da nova regra. Vamos:
- **Re-escalar** todas as células existentes para `area_km2` aleatório 100–1000.
- **Multiplicar** o número de células por região para preencher o território de forma coerente com TOI-700 (gera mais granularidade — alvo: ~50–200 células por região).
- Re-atribuir cidades NPC de forma que cada cidade NPC ocupe **uma** célula.

## UI (Fase 3 / breve)

- Página de detalhe da célula: input "Renomear cidade".
- Página do território: input "Apelido do país".
- Botão "Mesclar com célula vizinha" no painel da célula (lista células elegíveis).

## Fora de escopo agora

- Adjacência geométrica real (precisa de coordenadas/grid). Por ora: mesma região + mesma província = elegível para merge.
- Mapa SVG interativo (fica para a próxima fase).

Vou executar com **uma migração** consolidando schema + re-seed, e em seguida criar as **edge functions** `rename-cell`, `rename-territory`, `merge-cells`. UI vem depois.

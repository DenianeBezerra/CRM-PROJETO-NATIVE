# Changelog — CRM Vibratto

## [0.0.354] — 2026-09-12 — T2.39 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-034 fechado: dado ausente aparece como cobertura incompleta e não é removido silenciosamente do denominador. Teste humano aprovado pela cliente (2026-09-12 ~10:00 — "perfeito, siga", execução delegada ao champion).
- Prova na UI real (browser): bloco "Cobertura incompleta" com avisos "permanecem no denominador" (3 de 3 / 2 de 3 / 1 de 3), badges COBERTURA 1/3 e 1/2, `sem_etapa: 1` explícito, conversão "50% (N=2)" com 3 oportunidades; filtro Origem = Site recalcula todos os avisos sobre o denominador filtrado (2 de 2, N=1). Prints em artifacts/t239_dashboard_cobertura_geral|filtro_site.png.
- Limpeza pós-teste: migration 0105 remove as fixtures da prova (proposta de contraste + negócio/permanência/proposta da 0104) — delete via API bloqueado por design (T2.21 append-only), padrão AP-2026-09-12-0915.
- Fase 2: 39/40 (97,5%). SPEC-2-007: 4/5.

## [0.0.350] — 2026-09-12 — T2.38 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-033 fechado: dashboard com leads por origem/período, oportunidades por etapa, primeira resposta, tempo por etapa, propostas/ciclo, conversão, perdas e filas — N explícito e filtros consistentes. Teste humano aprovado pela cliente (2026-09-12 09:45 — "pode concluir e seguir", execução delegada ao champion).
- Prova na UI real (browser): visão completa (N=1, conversão 100%), filtro Site zera todos os blocos, filtro Indicação restaura; prints em artifacts/t238_dashboard_todas|site|indicacao.png.
- Fase 2: 38/40 (95%).

## [0.0.348] — 2026-09-12 — T2.38 implementada (CA-2-033, aguardando teste humano)

### Adicionado

- **Dashboard comercial (CA-2-033)**: endpoint `GET /backend/v1/dashboard/comercial` com 9 blocos (leads por origem, oportunidades por etapa, primeira resposta p50/p90, tempo por etapa, propostas/ciclo, conversão, perdas por motivo, filas, cobertura) — N explícito em cada número e filtros de período/origem aplicados consistentemente a todos os blocos. Página `/dashboard` com filtros e N visível + link na home. Provas: RED 1 + GREEN 5 + regressão (evidência em `evidencias/spec-2-007/ca-2-033-green.md`).

## [0.0.345] — 2026-09-12 — T2.37 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-032 fechado: baseline calculado para período explícito, congelado com versão e reproduzível pela consulta de origem. Teste humano aprovado pela cliente (2026-09-12 09:31 — "sim, traga evidencias. Conclua e siga para a proxima", execução delegada ao champion).
- Provas do teste: baseline v1 (período 2026-09-01..12) → re-execução criou v2 sem sobrescrever (v1 congelada intacta, valores idênticos) → período invertido rejeitado com mensagem clara. Nota: `reproduzivel=false` no período com fim hoje é comportamento correto (período em curso).
- Fase 2: 37/40 (92,5%).

## [0.0.343] — 2026-09-12 — T2.37 implementada (CA-2-032, aguardando teste humano)

### Adicionado

- **Baseline de métricas (CA-2-032)**: coleção `baselines` append-only (UNIQUE periodo+versão) + `POST /backend/v1/metricas/baseline` (admin; período explícito obrigatório, cálculo filtrando a origem pelo período, congelamento com versão sequencial — re-execução cria nova versão, nunca sobrescreve) + `GET` de listagem. Período em curso marcado `reproduzivel: false`. **Fix de reprodutibilidade (v0.0.341)**: permanências órfãs (negócio deletado) excluídas e reportadas; permanência aberta em período fechado congela no fim do período — recálculos consecutivos agora produzem valores idênticos. Provas: RED 1 + GREEN 6 + regressão (evidência em `evidencias/spec-2-007/ca-2-032-green.md`). Limpeza: migrations 0100/0101.

## [0.0.339] — 2026-09-12 — T2.36 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-031 fechado: dicionário registra fórmula, fonte, evento inicial/final, fuso, exclusões e dono para cada métrica. Teste humano aprovado pela cliente (2026-09-12 09:26 — "sim, concluir e seguir", execução delegada ao champion).
- Prova na UI real (browser): tela /admin/dicionario com os 5 cards completos; prints em artifacts/t236_dicionario_topo|meio|fim.png.
- Fase 2: 36/40 (90%).

## [0.0.337] — 2026-09-12 — T2.36 implementada (CA-2-031, aguardando teste humano)

### Adicionado

- **Dicionário de métricas (CA-2-031)**: coleção `dicionario_metricas` append-only (create/update admin-only, delete bloqueado) + seed com as 5 métricas existentes (fórmulas e exclusões extraídas do código real, nada inventado) + endpoint `GET /backend/v1/metricas/dicionario` (leitura autenticada) + tela admin `/admin/dicionario` com link na home. Cada métrica registra fórmula, fonte, evento inicial/final, fuso (America/Sao_Paulo), exclusões e dono. Provas: RED 1 + GREEN 4 + regressão (evidência em `evidencias/spec-2-007/ca-2-031-green.md`).

## [0.0.335] — 2026-09-12 — T2.35 CONCLUÍDA (teste humano aprovado) — SPEC-2-006 FECHADA (6/6)

### Concluído

- CA-2-030 fechado: visão da oportunidade mostra estado do handoff, pendências abertas e tempo até aceite. Teste humano aprovado pela cliente (2026-09-12 09:20 — "sim, conclua!", execução delegada ao champion).
- Prova na UI real (browser): card "Handoff" no modal Consulta 360º com badge "Devolvido ao emissor", motivo e "Aguardando reenvio"; blocos existentes íntegros. Print: artifacts/t235_teste_handoff_ui.png.
- Lição registrada: preview do Skip só atualiza com build development (production não toca o preview).
- **SPEC-2-006 FECHADA (6/6)**: T2.31–T2.35 concluídas com teste humano aprovado.
- Fase 2: 35/40 (87,5%).

## [0.0.333] — 2026-09-12 — T2.35 implementada (CA-2-030, aguardando teste humano)

### Adicionado

- **Handoff na visão da oportunidade (CA-2-030)**: bloco `handoff` no `GET /backend/v1/negocios/{id}/consulta-360` — estado (pendente/aceito/devolvido/nenhum, explícito), pendências abertas (item/dono/prazo, só as não resolvidas), tempo até aceite (aceito = calculado; pendente = decorrido; devolvido = null, aguardando reenvio) e contexto (criado_em, decidido_em, motivo_devolucao). Card "Handoff" no modal Consulta 360º com badge colorido, tempo formatado e lista de pendências. Provas: RED 1 + GREEN 4 + regressão (evidência em `evidencias/spec-2-006/ca-2-030-green.md`). Fixtures 0095/0096 limpas.

## [0.0.330] — 2026-09-12 — T2.34 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-029 fechado: repetição do ganho cria exatamente um handoff e não sobrescreve decisão existente. Teste humano aprovado pela cliente (2026-09-12 09:10 — "sim, conclua e siga a proxima task", execução delegada ao champion).
- Provas: 2 ciclos completos de re-ganho (reabrir → ganhar, 200+200 cada); handoff único preservado com status `devolvido`, motivo e snapshot (ação + motivo + 5 itens) byte a byte idênticos; oportunidade íntegra em `fechado_ganho`/`ganho`.
- Causa raiz documentada: model hook `onRecordUpdate` de `negocios` inoperante no runtime (bloco duplicado do hook T2.31 em `comercial_fields_rules.js`, removido) — criação do handoff agora em request hook (v0.0.326).
- Fase 2: 34/40 (85%).

## [0.0.327] — 2026-09-12 — T2.34 implementada (CA-2-029, aguardando teste humano)

### Adicionado

- **Ganho simultâneo com handoff único (CA-2-029)**: criação do handoff movida para request hook (`onRecordUpdateRequest` em `negocios`) — o model hook parou de disparar no runtime (RED provado: 8+ ganhos, 0 handoffs; causa: bloco duplicado do hook T2.31 em `comercial_fields_rules.js`, removido). Idempotência reforçada: check prévio + índice UNIQUE (`handoffs.negocio`); ganho simultâneo cria exatamente um handoff; re-ganho após decisão preserva status/motivo/snapshot byte a byte; falha de criação não quebra o ganho. Provas: RED (causa raiz) + GREEN 4 + segurança (evidência em `evidencias/spec-2-006/ca-2-029-green.md`).

### Corrigido (durante as provas)

- Hook de ganho inoperante (handoff nunca mais era criado desde 11/09) — request hook v0.0.326.

## [0.0.322] — 2026-09-12 — T2.33 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-028 fechado: receptor aceita ou devolve o handoff; decisão registra ator, data, motivo (devolução) e snapshot do checklist/pendências; decisão só sobre handoff pendente; 401 sem auth.
- Teste humano aprovado pela cliente (2026-09-12 08:56 — "validado", com prints da oportunidade "Proposta BPO").
- Revalidação independente do zero: RED 4 re-provado (400 sem motivo, 400 ação inválida, 401, 400 re-decisão) + GREEN 1 re-provado (devolução com ator/data/motivo/snapshot) + idempotência; negócio real "Proposta BPO" íntegro.
- Migração 0093 restaurou o handoff real para `pendente` (checklist padrão, sem resíduo de decisão) — pronto para o fluxo da T2.34.
- Fase 2: 33/40 (82,5%).

## [0.0.320] — 2026-09-12 — T2.33 implementada (CA-2-028, aguardando teste humano)

### Adicionado

- **Decisão do receptor com snapshot (CA-2-028)**: endpoint `POST /backend/v1/handoffs/{id}/decisao` — `acao: "devolver"` exige motivo ≥ 10 chars e grava ator, data, motivo e snapshot do checklist/pendências; `acao: "aceitar"` mantém as regras da T2.32 (obrigatório pendente bloqueia) e grava snapshot no aceite. Decisão só sobre handoff pendente (idempotente por estado); 401 sem auth. Campos novos (0090: `devolvido_por`, `devolvido_em`, `motivo_devolucao`, `snapshot_decisao`). Provas: RED 4 + GREEN 2 + idempotência (evidência em `evidencias/spec-2-006/ca-2-028-green.md`).

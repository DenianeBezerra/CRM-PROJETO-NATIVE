# Changelog — CRM Vibratto

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

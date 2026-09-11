# Changelog — CRM Vibratto

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

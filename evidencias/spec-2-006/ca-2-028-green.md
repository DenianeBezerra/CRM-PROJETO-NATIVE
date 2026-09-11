# CA-2-028 — GREEN: receptor aceita ou devolve com ator, data, motivo e snapshots (T2.33)

- Data: 2026-09-12
- Versões: v0.0.318–v0.0.320 (QA verde)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Receptor aceita ou devolve; decisão registra ator, data, motivo e snapshots.

## Implementação

- Migration 0090: campos `devolvido_por` (relation), `devolvido_em` (date), `motivo_devolucao` (text), `snapshot_decisao` (JSON) em `handoffs`.
- Endpoint `POST /backend/v1/handoffs/{id}/decisao` (`handoff_decisao_endpoint.js`):
  - `acao: "devolver"` — exige motivo ≥ 10 chars; grava ator, data, motivo e snapshot (checklist + pendências congelados); status `devolvido`;
  - `acao: "aceitar"` — regras da T2.32 (obrigatório pendente bloqueia e gera pendência com dono/prazo); checklist completo aceita com ator/data + snapshot;
  - decisão só sobre handoff `pendente` (idempotente por estado); 401 sem auth.

## Provas (por API)

### RED

1. Devolver sem motivo → **400** "Devolução exige o motivo (mínimo 10 caracteres)". ✅
2. Ação inválida ("rejeitar") → **400** "Informe a ação". ✅
3. Sem autenticação → **401**. ✅
4. Decidir handoff já decidido → **400** "Decisão só vale para handoff em pendente (status atual: devolvido)". ✅

### GREEN

1. Devolver com motivo ("Acessos do cliente ainda nao foram concedidos pela TI") → **200**: status `devolvido`, `devolvido_por`, `devolvido_em`, `motivo_devolucao` gravados; `snapshot_decisao` com acao/ator/data/motivo + checklist completo (5 itens) congelado. ✅
2. Aceitar com checklist completo (0091) → **200**: status `aceito`, `aceito_por`, `aceito_em` + snapshot com acao/ator/checklist/pendências. ✅

### Idempotência

- Re-decidir handoff já decidido → **400** (estado preserva a primeira decisão). ✅

## Regressão

- Fluxo da T2.32 intacto (aceite com bloqueio de obrigatório é reutilizado pelo endpoint de decisão).
- Negócio real "Proposta BPO" íntegro.

## Limpeza

- Migration 0092: handoff real resetado para `pendente` com checklist padrão (obrigatórios pendentes) — pronto para o teste humano.
- Nenhum fixture residual; QA v0.0.320 verde.

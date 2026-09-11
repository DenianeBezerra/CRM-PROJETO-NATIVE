# CA-2-029 — GREEN: repetição simultânea do ganho cria exatamente um handoff e não sobrescreve decisão (T2.34)

- Data: 2026-09-12
- Versões: v0.0.325–v0.0.327 (QA verde)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Repetição simultânea do evento de ganho cria exatamente um handoff e não sobrescreve decisão existente.

## Causa raiz (RED — descoberta durante a prova)

- O model hook `onRecordUpdate` em `negocios` (arquivo `handoff_ganho.js`) NÃO disparava no runtime atual: 8+ transições de ganho reais (negócios de prova + re-ganhos do negócio real) criaram **0 handoffs**.
- Causa provável: `comercial_fields_rules.js` continha um **bloco duplicado** do mesmo hook T2.31 (mesmo `onRecordUpdate` em `negocios`), conflitando com `handoff_ganho.js`. Bloco duplicado removido (v0.0.325) — o hook de ganho continuou sem disparar.
- Correção definitiva (v0.0.326): criação do handoff movida para **request hook** `onRecordUpdateRequest` (padrão `audit_crm_changes.js`, que demonstradamente roda e tem `e.auth`), com `e.next()` antes da criação do handoff. Provas RED anteriores: 2 PATCHes simultâneos → 200 + 400 (concorrência otimista da T2.29 rejeitou a segunda escrita), 0 handoffs.

## Implementação (handoff_ganho.js reescrito)

- Request hook: captura antes/depois → `e.next()` (conclui o save) → se ganho novo, cria o handoff com checklist padrão (obrigatórios marcados, T2.32), origem (serviço), emissor (ator), receptor (responsável).
- Idempotência: check prévio + índice UNIQUE (`handoffs.negocio`); conflito de UNIQUE = outro ganho venceu → loga "handoff único preservado", não sobrescreve nada; demais falhas não quebram o ganho.

## Provas (por API, v0.0.326/0.0.327)

### GREEN

1. **Ganho simples cria handoff** — reabrir + ganhar negócio de prova → 200 + 200; handoff criado: status `pendente`, origem `cfo_as_a_service`, checklist 5 itens. ✅
2. **Simultâneo cria exatamente 1** — 2 PATCHes paralelos para `fechado_ganho` no mesmo negócio → ambos 200; `handoffs` do negócio = **1**. ✅
3. **Decisão não sobrescrita** — handoff devolvido (motivo + snapshot com checklist 5) → reabrir + re-ganhar o negócio → handoff permanece `devolvido`, motivo e snapshot byte a byte idênticos, total 1. ✅
4. **Idempotência por estado** — re-save com mesmo estágio (antes == depois) não dispara; handoffs totais estáveis. ✅

### Segurança/regressão

- Sem auth no update de negócio → negado (404 por ocultação de regra, padrão PocketBase). ✅
- Negócio real "Proposta BPO" (`fechado_ganho`/`ganho`) e handoff real (`pendente`, checklist 5, sem snapshot) íntegros. ✅
- Fluxo T2.31→T2.33 preservado: decisão (aceite/devolução com snapshot) opera sobre o handoff criado pelo novo hook. ✅

## Limpeza

- Migration 0094: 4 negócios de prova + seus handoffs removidos. Estado final: 1 negócio real, 1 handoff real `pendente` — pronto para a T2.35.
- QA v0.0.325–0.0.327 verde (setup/static/build/test).

## Nota técnica para o consultor

- Model hooks `onRecordUpdate` deixaram de disparar para `negocios` neste runtime (request hooks seguem OK). A T2.31 GREEN original (11/09) provou o comportamento via model hook; entre 11/09 e 12/09 o runtime deixou de executá-lo. Recomenda-se revisar outros model hooks de negócio em tasks futuras (ex.: `stage_dwell_history` usa model hooks — permanências continuaram sendo criadas nas provas de hoje, então o problema pode ser específico da combinação/ordem de registro).

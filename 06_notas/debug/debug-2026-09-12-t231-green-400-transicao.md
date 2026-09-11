# Debug — 2026-09-12 — T2.31 (CA-2-026) GREEN bloqueado por 400 na transição fechado_ganho

## Task e problema

T2.31 — ganho cria handoff idempotente. Implementação (hook `handoff_ganho.js` + migration 0076) já existia na árvore v0.0.291. RED provado; GREEN não consegue executar a transição de estágio.

## Reprodução

- PATCH `negocios/ek8vvnaisupsnga` com `{"estagio":"fechado_ganho"}` → HTTP 400 `{"message":"Failed to update record."}` (4 tentativas, com/sem `data_ganho`/`observacao_ganho`).
- PATCH do mesmo registro com `{"observacoes":"..."}` → HTTP 200. O ofensor é a mudança de `estagio`, não o payload.
- Logs do servidor (Skip, nível error, 10:55Z): apenas "Failed to update record." — a mensagem real do hook não aparece no log de request.

## Hipóteses e descartes

1. Concorrência otimista (versao_registro) — DESCARTADA: PATCH sem versão não exige; e `observacoes` passa pelo mesmo hook.
2. Permanências abertas duplicadas / histórico inconsistente (stage_dwell_history) — DESCARTADO por consulta: exatamente 1 permanência aberta, etapa `novo` = etapa atual (fxk9w1lx3q9lkfr).
3. Exceção lançada dentro de model hook durante a transição (handoff_ganho ou stage_dwell_history) sendo convertida em 400 genérico pelo PocketBase — HIPÓTESE PRINCIPAL, não confirmada no orçamento desta rodada.

## Correção

Não aplicada — causa raiz não demonstrada. Nada foi alterado no produto nesta rodada (apenas 1 campo `observacoes` de prova no registro real, sem efeito de estado).

## Estado preservado

- RED provado: handoffs=0 com negócio em fechado_ganho (vx4wp69l374ef6y, anterior ao hook); create direto de handoff via API → 403 (correto, regras null).
- Fixture de criação de negócio bloqueada pelo guard de próxima ação futura (T2.18) — provas usaram o negócio real.
- Próximo passo: isolar a exceção do model hook (rota debug de leitura ou revisão da ordem dos hooks) e provar GREEN + idempotência.

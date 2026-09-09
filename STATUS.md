# Status

**Status:** Fase 1 em execução — 23 de 24 tasks concluídas (95,83%)
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma
**Última task concluída:** T9.1 — contadores, tempo por etapa e filas operacionais
**Próxima task elegível:** T9.2 — bordas e regressão de contadores e filas
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## Evidência da T9.1

- 4 rotas operacionais (`/backend/v1/operacional/{resumo,tempo-por-etapa,acoes-vencidas,paradas}`) validadas por API real: 200 autenticado, 401 sem token.
- Histórico de permanência append-only criado/fechado atomicamente nas transições (model hooks); update/delete/create direto → 403.
- Fila de paradas com limite configurável validada (limite 0 → 1 parada; limite 10 → vazia); seed `limite_oportunidade_parada_dias` = 10.
- Fila de ações vencidas: data passada entra, futura não entra.
- Correção de deadlock documentada: model hooks em vez de `e.next()` dentro de `runInTransaction`.
- QA v0.0.73–v0.0.79 verde; teste humano aprovado pela cliente em 2026-09-09 ("confirmados, pode concluir").
- Evidência detalhada: `evidencias/spec-1-009/t9.1-green.md`.

## Evidência da T8.2

- Regressão validou destinos inválidos, estados finais como destino, múltiplas oportunidades, cancelamento, rollback transacional, auditoria, RBAC e regressão.
- QA v0.0.71 verde e teste humano aprovado pela cliente.
- Evidência detalhada: `evidencias/spec-1-008/t8.2-regressao.md`.

## Evidência da T8.1

- Etapa em uso exige destino ativo; migração completa, cancelamento sem estado parcial e auditoria implementados.
- Correção de atomicidade com `$app.runInTransaction` e `txApp`.
- Skip QA v0.0.68 verde e teste humano aprovado pela cliente.
- Evidência detalhada: `evidencias/spec-1-008/t8.1-green.md`.

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora da execução desta pasta até seus gates específicos.

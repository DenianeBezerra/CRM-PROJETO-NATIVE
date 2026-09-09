# Status

**Status:** Fase 1 concluída — 24 de 24 tasks (100%)
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma
**Última task concluída:** T9.2 — bordas e regressão de contadores e filas
**Próxima task elegível:** nenhuma — Fase 1 completa; fase só fecha oficialmente após validação do consultor
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## Evidência da T9.2

- RBAC completo (CA-1-12F): operator não altera `configuracoes_operacionais` (negado por ocultação — 404/400 do PocketBase); consulta → 200; admin altera → 200.
- Estado inválido: duplicata de permanência aberta sinalizada em `estado_invalido` sem dobrar o cálculo; transição bloqueada (400); base restaurada após o teste.
- Borda de 10 dias exatos: não entra na fila de paradas (regra "acima do limite"); descrição 500 chars aceita, 501 rejeitada.
- Regressão: kanban, clientes, auditoria, interações e 4 rotas operacionais — todos consistentes; etapa "proposta" reativada.
- Fixture permanente: `operator@vibratto.com.br` (senha provisória `Operator@2026` — trocar no primeiro acesso).
- QA v0.0.81–v0.0.83 verde; teste humano aprovado pela cliente em 2026-09-09.
- Evidência detalhada: `evidencias/spec-1-009/t9.2-regressao.md`.

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

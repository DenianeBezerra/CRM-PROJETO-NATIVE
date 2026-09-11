# CA-2-031 — GREEN: dicionário registra fórmula, fonte, evento inicial/final, fuso, exclusões e dono para cada métrica (T2.36)

- Data: 2026-09-12
- Versões: v0.0.337 (QA verde, build development para o preview)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Dicionário registra fórmula, fonte, evento inicial/final, fuso, exclusões e dono para cada métrica.

## Implementação

- **Coleção `dicionario_metricas`** (migration 0097): append-only — create/update admin-only (`@request.auth.role = 'admin'`), delete bloqueado (`deleteRule: null`). Campos: `chave` (UNIQUE), `nome`, `formula`, `fonte`, `evento_inicial`, `evento_final`, `fuso`, `exclusoes`, `dono`, `endpoint`, `ativa`.
- **Seed** (migration 0098): 5 métricas existentes com fórmulas e exclusões extraídas do código real (`operational_queues.js`, `fila_propostas_vencidas_cron.js`) — nada inventado: oportunidades_por_status, tempo_por_etapa, acoes_vencidas, oportunidades_paradas, propostas_vencidas. Dono padrão: Deniane Bezerra (CFO). Fuso: America/Sao_Paulo.
- **Endpoint** `GET /backend/v1/metricas/dicionario` (`dicionario_metricas_endpoint.js`): leitura autenticada (operador lê), retorna total + métricas + fuso_padrao.
- **UI**: tela admin `/admin/dicionario` (`src/pages/Dicionario.tsx`) com card por métrica (fórmula, fonte, eventos, fuso, exclusões, dono, endpoint) + link "Dicionário de métricas" na home admin.

## Provas (por API)

### RED

1. Antes do deploy: coleção inexistente → `GET /backend/v1/metricas/dicionario` não existia (404 rota); sem documentação de métricas em nenhum lugar. ✅

### GREEN

1. **Dicionário completo** — `total: 5`, `fuso_padrao: America/Sao_Paulo`, e TODAS as 5 métricas com os 7 campos obrigatórios preenchidos (formula, fonte, evento_inicial, evento_final, fuso, exclusoes, dono). ✅
2. **401 sem auth** no endpoint. ✅
3. **RBAC** — operator: leitura 200; edição 404 (negada por updateRule); criação 400 (negada por createRule, nenhum registro criado — total permaneceu 5). ✅
4. **Delete bloqueado até para admin** (deleteRule null) → 403. ✅

### Regressão

- 4 endpoints operacionais (`resumo`, `tempo-por-etapa`, `acoes-vencidas`, `paradas`) → 200. ✅
- Negócio real "Proposta BPO" íntegro (`fechado_ganho`/`ganho`). ✅

## Estado final

- 5 métricas documentadas no dicionário, nenhuma fixture residual.
- QA v0.0.337 verde (setup/static/build/test).

## Teste humano (roteiro)

Preview (build development) → login admin → home → link "Dicionário de métricas" → tela `/admin/dicionario` com os 5 cards completos.

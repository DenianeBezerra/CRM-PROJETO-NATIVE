# CA-2-033 — GREEN: dashboard exibe leads por origem/período, oportunidades por etapa, primeira resposta, tempo por etapa, propostas/ciclo, conversão, perdas e filas com N e filtros consistentes (T2.38)

- Data: 2026-09-12
- Versões: v0.0.347–v0.0.348 (QA verde, build development)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Dashboard exibe leads por origem/período, oportunidades por etapa, primeira resposta, tempo por etapa, propostas/ciclo, conversão, perdas e filas com N e filtros consistentes.

## Implementação

- **Endpoint** `GET /backend/v1/dashboard/comercial?periodo_inicio=&periodo_fim=&origem=` (`dashboard_comercial_endpoint.js`): um único cálculo server-side; os MESMOS filtros (período + origem) aplicados a todos os blocos. 9 blocos: leads_por_origem, oportunidades_por_etapa, primeira_resposta (p50/p90 da transição novo_lead→contato_feito), tempo_por_etapa (fórmula do dicionário), propostas_ciclo (N/valor/tempo médio de decisão), conversão (taxa com N explícito), perdas (por motivo estruturado), filas (ações vencidas + paradas), cobertura (dado ausente explícito — prepara T2.39).
- **UI** `src/pages/DashboardComercial.tsx` (rota `/dashboard`, link na home): filtros de período + origem, cada bloco com N visível, aviso de cobertura incompleta em âmbar.

## Provas (por API)

### RED

1. Antes do deploy: endpoint inexistente (404); painel operacional sem origem/primeira resposta/conversão/perdas. ✅

### GREEN

1. **Visão completa (sem filtros)** — leads N=1 (indicacao: 1), etapa fechado_ganho: 1, conversão 100% (N=1), cobertura avisa explicitamente o que não existe no período. ✅
2. **Filtro de origem consistente** — `origem=site` (não existe) zera TODOS os blocos (leads 0, etapas vazias, conversão 0) e a cobertura avisa. ✅
3. **Filtro de origem existente** — `origem=indicacao` mantém N=1 e conversão 100% (mesma origem em todos os blocos). ✅
4. **Filtro de período** — período antes da criação do negócio (2026-01-01..2026-08-31) → N=0 em todos os blocos. ✅
5. **Validações** — sem auth → 401; período invertido → 400 com mensagem; só início sem fim → 400. ✅

### Regressão

- 4 endpoints operacionais + dicionário + baseline → 200. Negócio real íntegro (`fechado_ganho`/`ganho`). ✅

## Estado final

- Endpoint + página `/dashboard` prontos; nenhum fixture residual (o dashboard lê a base real).
- QA v0.0.347–0.0.348 verde (setup/static/build/test).

## Teste humano (roteiro)

Preview → login → home → link "Dashboard comercial" → filtros de período/origem → cada bloco com N; mudar origem para "Site" → todos os blocos zeram com aviso de cobertura.

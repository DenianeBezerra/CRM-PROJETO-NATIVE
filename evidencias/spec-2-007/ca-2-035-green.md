# CA-2-035 — GREEN: drill-down e exportação agregada correspondem aos números exibidos, neutralizam fórmulas e respeitam RBAC/LGPD (T2.40)

- Data: 2026-09-12
- Versões: v0.0.357 (hook + migration 0107) → v0.0.358 (fix app.save + helpers inline JSVM) → v0.0.359 (UI drill-down clicável + botão Exportar CSV) → v0.0.360 (limpeza fixtures 0108)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Drill-down e exportação agregada correspondem aos números exibidos, neutralizam fórmulas e respeitam RBAC/LGPD.

## Implementação

- **Drill-down** `GET /backend/v1/dashboard/comercial/drilldown?bloco=&chave=&periodo_inicio=&periodo_fim=&origem=` (`dashboard_drilldown_export.js`): recalcula server-side com a MESMA lógica/filtros do dashboard (T2.38) e retorna os registros que compõem o número — blocos leads_por_origem, oportunidades_por_etapa, perdas, propostas_ciclo, conversao (encerradas), conversao_ganhas, conversao_perdidas, primeira_resposta, tempo_por_etapa. Payload LGPD: id, título, estágio, origem, status, valor, arquivado — SEM e-mail/telefone/contato.
- **Exportação agregada** `GET /backend/v1/dashboard/comercial/export`: CSV (BOM UTF-8, `;`) com bloco;chave;valor;n_denominador das agregações exibidas, mesmos filtros; neutralização CSV injection (padrão OWASP T2.03) em todo campo textual; trilha append-only em `exportacoes` com entidade `dashboard_comercial` (migration 0107 adiciona o valor ao select, sem remover existentes) — falha na trilha = 500, arquivo não gerado.
- **UI** `DashboardComercial.tsx`: botão "Exportar CSV" (baixa o arquivo com os filtros aplicados) + linhas clicáveis nos blocos Leads por origem, Oportunidades por etapa e Perdas → modal de drill-down com os registros e o N; dica de uso no rodapé.
- **RBAC**: endpoints exigem autenticação (401 sem); dado é o mesmo que admin/operator já consultam no dashboard; trilha respeita as regras da coleção (operator vê só os próprios atos — regra 0073).

## Provas (por API)

### RED (validações e proteções)

1. Drill-down sem auth → **401**. ✅
2. Export agregada sem auth → **401**. ✅
3. `bloco=usuarios` (bloco inexistente) → **400** com lista de blocos válidos. ✅
4. Período invertido → **400** "inicio deve ser anterior ou igual a fim". ✅

### GREEN (correspondência com os números exibidos)

Base: 2 negócios reais/fixture (Proposta BPO fechado_ganho/indicacao, T239 perda fechado_perdido/site) + 1 negócio de prova `novo` (para neutralização, depois removido pela 0108).

1. **leads_por_origem** — indicacao 1=1, site 1=1. ✅
2. **oportunidades_por_etapa** — fechado_ganho 1=1, fechado_perdido 1=1, novo 1=1. ✅
3. **conversao** — drill-down das encerradas n=2 = N=2 declarado (taxa 50%). ✅
4. **perdas** — timing 1=1. ✅
5. **propostas_ciclo** — 0=0. ✅
6. **CSV = dashboard** — 6 linhas comparadas campo a campo contra o endpoint (leads, etapas, conversão 50 N=2, perdas) — todas idênticas. ✅
7. **Filtro consistente** — `origem=site`: drill-down etapa/novo 1=1 e CSV recalculado (site 2, conversão 0% N=1). ✅

### Neutralização de fórmulas e LGPD

1. Negócio de prova com título `=SOMA(1+1) T240 PROVA` → export de registros (T2.04) traz `"'=SOMA(1+1) T240 PROVA"` (prefixo `'`, célula neutralizada). ✅
2. Drill-down retorna o título como dado (JSON, sem risco de fórmula) e o payload NÃO contém email/telefone/contato (LGPD/minimização). ✅

### RBAC e trilha

1. Sem auth → 401 nos dois endpoints novos (dashboard/comercial já provado). ✅
2. Trilha `exportacoes` registrada: entidade `dashboard_comercial`, quantidade = linhas do CSV, filtros JSON, csv_gerado=true (2 eventos observados nas provas). Regras da coleção (0073): operator vê só os próprios atos; admin tudo. ✅
3. Falha na trilha → 500 e arquivo não gerado (mesmo contrato da T2.04, código compartilhado). ✅

### Regressão

- `GET /backend/v1/metricas/dicionario` → 200; `GET /backend/v1/metricas/baseline` → 200; `GET /backend/v1/operacional/resumo` → 200. ✅
- Negócio real "Proposta BPO" íntegro (`fechado_ganho`/`ganho`). ✅
- Dashboard íntegro pós-limpeza (leads 1/1, etapas 1/1, conversão 50% N=2). ✅
- QA v0.0.357–0.0.360 verde (setup/static/build/test/integrations). ✅

## Teste humano — AGUARDANDO (portão aberto 2026-09-12)

- Prova prévia do champion na UI real (browser, preview development v0.0.359) — NÃO substitui o teste humano:
  1. Botão "Exportar CSV" visível ao lado de "Aplicar filtros". ✅
  2. Clique na linha "fechado_perdido" (Oportunidades por etapa) → modal "Drill-down — oportunidades_por_etapa · fechado_perdido" com "1 registro(s) — mesmo filtro do número exibido" e o item "T239 PROVA perda sem motivo (fixture arquivada) · fechado_perdido · origem: site · R$ 300,00" — N do modal = número do bloco. ✅
  3. Dica de drill-down no rodapé dos blocos. ✅
- Print: artifacts/t240_drilldown_ui.png (workspace do champion).
- Limpeza pós-provas: migration 0108 remove o negócio de prova `=SOMA(1+1)` e os aceites de contraste; trilha `exportacoes` permanece (append-only, histórico).
- Aguardando validação da cliente no portão de teste humano.

## Resíduos declarados

- Nenhum fixture residual de negócio; trilha de exportações mantida por design (append-only).
- Operator não existe mais na base (só admin) — RBAC por papel provado nas regras da coleção (0073) e 401 sem auth; prova com operator real fica para o ambiente de produção (usuários criados lá).

## Teste humano (roteiro original)

Preview → login → /dashboard → (1) botão "Exportar CSV" visível; (2) clicar linha "novo" em Oportunidades por etapa → modal "Drill-down — oportunidades_por_etapa · novo" com 1 registro; (3) conferir que o N do modal bate com o número do bloco.

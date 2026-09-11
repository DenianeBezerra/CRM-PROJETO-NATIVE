# CA-2-032 — GREEN: baseline é calculado para período explícito, congelado com versão e reproduzível pela consulta de origem (T2.37)

- Data: 2026-09-12
- Versões: v0.0.340–v0.0.343 (QA verde)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Baseline é calculado para período explícito, congelado com versão e reproduzível pela consulta de origem.

## Implementação

- **Coleção `baselines`** (migration 0099): append-only (create/update/delete bloqueados via API — só server-side), UNIQUE `(periodo_inicio, periodo_fim, versao)`. Campos: período, versão, `metricas` (JSON congelado), fuso, fonte, ator, `reproduzivel`, `criado_em`.
- **`POST /backend/v1/metricas/baseline`** (admin-only): exige período explícito (início/fim, validados), calcula as métricas **filtrando a origem pelo período** (negócios criados no período, permanências entradas no período, propostas criadas no período), congela o JSON com **versão sequencial por período** (re-execução cria nova versão, nunca sobrescreve) e registra ator/data. Período em curso → `reproduzivel: false` (transparência).
- **`GET /backend/v1/metricas/baseline`**: lista baselines (leitura autenticada, operador incluído).

## Provas (por API)

### RED

1. Antes do deploy: coleção e endpoints inexistentes (404); nenhum snapshot de métricas em nenhum lugar. ✅

### GREEN

1. **Período explícito + versão** — POST `2026-09-01..2026-09-10` → 200, versão 1, `reproduzivel: true`, 3 métricas congeladas (oportunidades_por_status, tempo_por_etapa, propostas_por_status). ✅
2. **Congelado com versão** — re-execução do mesmo período → versão 2; lista mostra v1 e v2 coexistindo (nada sobrescrito). ✅
3. **Validações** — período invertido → 400 com mensagem; sem datas → 400; sem auth → 401; operator → POST 403 / GET 200. ✅
4. **Período em curso** — `2026-09-01..2026-09-30` → `reproduzivel: false` (números ainda mudam; explícito, não maquiado). ✅
5. **REPRODUTIBILIDADE** — dois recálculos consecutivos do mesmo período fechado → valores idênticos em todas as métricas (v4 == v5). ✅

### Causa raiz corrigida durante a prova (v0.0.341)

O primeiro par de recálculos divergiu em `tempo_por_etapa` (45617s vs 45633s). Investigação: **2 permanências órfãs** (negócios deletados, registros 404) com permanência aberta em `novo`, dentro do período — contavam "até agora" e cresciam a cada leitura. Correção: permanência aberta só entra se o negócio existe e o período está fechado (congela no `periodo_fim`); órfãs são **excluídas e reportadas** (`permanencias_orfas_excluidas: 1` no payload). Após o fix, recálculos consecutivos = valores idênticos.

### Regressão

- Dicionário (T2.36) → 200; endpoint operacional `resumo` → 200; negócio real íntegro. ✅

## Estado final

- 1 baseline congelado e reproduzível (`2026-09-01..2026-09-10`, v5) — as provas v1–v4 e o baseline em curso foram limpos (migrations 0100/0101).
- QA v0.0.340–0.0.343 verde (setup/static/build/test).

## Teste humano (roteiro)

Por API (endpoint admin): POST com período explícito → baseline congelado com versão; GET lista; re-execução cria nova versão.

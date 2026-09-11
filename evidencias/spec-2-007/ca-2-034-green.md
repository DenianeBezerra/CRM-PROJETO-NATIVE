# CA-2-034 — GREEN: dado ausente aparece como cobertura incompleta e não é removido silenciosamente do denominador (T2.39)

- Data: 2026-09-12
- Versões: v0.0.352 (bloco de cobertura por bloco no endpoint) + v0.0.353 (migration 0104 — correção da fixture 0103)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Dado ausente aparece como cobertura incompleta e não é removido silenciosamente do denominador.

## Implementação

- **Endpoint** `GET /backend/v1/dashboard/comercial` (T2.38): cada bloco declara `n_com_dado` / `n_sem_dado` sobre o MESMO denominador (oportunidades filtradas); aviso textual por bloco + lista global `cobertura` + `cobertura_por_bloco` estruturado.
- **UI** `DashboardComercial.tsx`: badge âmbar "Cobertura X/Y" por bloco + aviso textual quando `n_sem_dado > 0`.
- **Migration 0104** (v0.0.353): corrige a fixture 0103, que falhou em silêncio (negócio-alvo `dze8910cje2n1di` não existia — try/catch engoliu o erro; lição registrada). A criação server-side de proposta com valor 0 também é bloqueada pelos model hooks (regra T2.21 vale para `app.save`) — o cenário "valor ausente" é provado pelas dimensões que existem na base real.

## Provas (por API)

### RED (dado ausente não é criável por fora — a regra de negócio protege o dado)

1. `POST /propostas` com `valor: 0` → **400** "A proposta exige um valor maior que zero" (hook T2.21, 3 tentativas: 12:55, 12:56, 12:59). ✅
2. Contraste: mesma proposta com `valor: 5000` → **200** (id `guj5vqimceljbvy`) — a rejeição foi pelo valor, não por outra regra. ✅
3. Fixture 0103 não criou proposta (negócio inexistente) → corrigida pela 0104; criação server-side com valor 0 também bloqueada pelos model hooks — dado ausente não entra na base por engano. ✅

### GREEN (dado ausente aparece como cobertura incompleta, denominador preservado)

Base real no momento da prova: 3 oportunidades (Proposta BPO `fechado_ganho`/indicacao, fixture perda `fechado_perdido`/site, fixture sem estágio/origem default site) + 1 proposta rascunho (contraste).

1. **primeira_resposta** — n=0, n_sem_transicao=3 de 3; aviso: "nenhuma transição novo_lead→contato_feito no período (3 de 3 sem a transição — permanecem no denominador)". ✅
2. **propostas_ciclo** — n=1 (rascunho, valor 5000), cobertura parcial: "2 de 3 oportunidades sem proposta (permanecem no denominador)", n_com_dado=1, n_sem_dado=2. Antes da proposta de contraste: "3 de 3 sem proposta". ✅
3. **conversao** — taxa 50% calculada sobre N=2 encerradas; aviso: "cobertura parcial — 1 de 3 oportunidades ainda em aberto (taxa calculada sobre N=2 encerradas)". A oportunidade em aberto NÃO sai do N declarado. ✅
4. **perdas** — n=1 (timing), n_sem_dado=1 (a encerrada como ganho permanece no denominador de encerradas). ✅
5. **oportunidades_por_etapa** — negócio sem estágio aparece como `sem_etapa: 1` (rótulo explícito, não removido do N=3). ✅
6. **Filtro consistente** (`origem=site`) — n=2, todos os avisos recalculados sobre o denominador filtrado (2 de 2). ✅
7. **Sem auth** → **401**. ✅

### Regressão

- `GET /backend/v1/metricas/dicionario` → 200; `GET /backend/v1/metricas/baseline` → 200; `GET /backend/v1/operacional/resumo` → 200. ✅
- Negócio real "Proposta BPO" íntegro (`fechado_ganho`/`ganho`). ✅
- QA v0.0.353 verde (setup/static/build/test/integrations). ✅

## Resíduos declarados

- Proposta de contraste `guj5vqimceljbvy` (valor 5000, rascunho, negócio fixture `cutf47ouneeioo6` sem estágio): delete bloqueado por design (T2.21 append-only, 403 provado). Limpeza via migration de estado no fechamento da T2.39 (padrão AP-2026-09-12-0915).
- Fixture 0103 mantida no repositório (histórico); sua falha silenciosa está documentada como aprendizado.

## Teste humano — APROVADO (2026-09-12)

- Aprovação da cliente: "perfeito, siga" (2026-09-12 ~10:00), execução do fechamento delegada ao champion.
- Revalidação independente por UI real (browser, preview development):
  1. Login → home → "Dashboard comercial" → bloco "Cobertura incompleta" presente com os 3 avisos citando "permanecem no denominador" (primeira_resposta 3 de 3; propostas_ciclo 2 de 3; conversao 1 de 3 em aberto, taxa sobre N=2). ✅
  2. Badges "COBERTURA 1/3" (Propostas/ciclo) e "COBERTURA 1/2" (Perdas) visíveis nos blocos. ✅
  3. Oportunidade sem estágio aparece como `sem_etapa: 1` em "Oportunidades por etapa (N=3)" — rótulo explícito, não removida do N. ✅
  4. Conversão exibida como "50% (N=2)" com 3 oportunidades — a em aberto permanece declarada. ✅
  5. Filtro Origem = Site + Aplicar: todos os blocos recalculam sobre o denominador filtrado (avisos passam a "2 de 2" e "1 de 2", conversão "0% (N=1)", leads N=2). ✅
- Prints: artifacts/t239_dashboard_cobertura_geral.png e artifacts/t239_dashboard_cobertura_filtro_site.png (workspace do champion).
- Limpeza pós-teste: migration 0105 remove as fixtures da prova (proposta de contraste + negócio/permanência/proposta da 0104) — delete via API é bloqueado por design (T2.21 append-only), padrão AP-2026-09-12-0915.
- # QA da limpeza: v0.0.354 (aplicação da 0105 + governança).

## Teste humano (roteiro original)

Preview → login → home → "Dashboard comercial" → verificar: (1) badges âmbar "Cobertura X/Y" nos blocos primeira_resposta, propostas/ciclo, conversão e perdas; (2) avisos citando "permanecem no denominador"; (3) aplicar filtro Origem = Site e conferir que os avisos recalculam (2 de 2); (4) conferir que a taxa de conversão exibe "N=2" enquanto existem 3 oportunidades (a em aberto não sai do N declarado).

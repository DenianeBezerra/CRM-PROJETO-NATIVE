# Evidência — T2.25 — CA-2-020 (RED/GREEN)

- **Data:** 2026-09-12
- **Versões:** 0.0.256–0.0.259 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0059_t225_ca2020_fila_vencidas.js` — coleção `fila_propostas_vencidas` (append-only: create/update/delete null pela API): proposta, negócio, responsável, versão, valor, validade, **dia_referencia**; índice UNIQUE (proposta, dia_referencia) garante idempotência.
- `pocketbase/hooks/fila_propostas_vencidas_cron.js` — **cron diário `0 11 * * *` = 08:00 America/Sao_Paulo (UTC-3)**: varre propostas `emitida` com validade vencida e registra na fila. **Não altera resultado comercial** — nenhum write em propostas ou negócios.
- `pocketbase/hooks/fila_propostas_vencidas_endpoint.js` — `GET /backend/v1/filas/propostas-vencidas`: operator vê só as suas (por responsável); admin vê todas; leitura pura.
- `pocketbase/hooks/fila_propostas_vencidas_executar.js` — execução manual da varredura (admin-only, mesma lógica do cron, duplicada inline por regra de scoping do JSVM) para prova imediata e reprocessamento.
- Migrations 0060/0061 — fixture de proposta vencida (v13) e limpeza.

## Provas por API (v0.0.257–0.0.258)

| Prova (CA-2-020)                                                                      | Resultado                                                         |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **RED: fila vazia antes da varredura**                                                | ✅ 200, total 0                                                   |
| **GREEN: varredura registra v13 vencida**                                             | ✅ 200 — 1 registrada                                             |
| **GREEN: fila do responsável (admin vê a sua)**                                       | ✅ 1 item — "Proposta BPO" v13, status `emitida`, validade 10/09  |
| **GREEN: isolamento por responsável** (operator não vê proposta de outro responsável) | ✅ operator: 0 itens / admin: 1 item                              |
| **GREEN: idempotência** (2ª execução no mesmo dia)                                    | ✅ novas: 0, já hoje: 1 — sem duplicar                            |
| **GARANTIA: resultado comercial inalterado**                                          | ✅ v13 status `emitida` (inalterado); negócio `novo` (inalterado) |
| **RED: execução manual pelo operator**                                                | ✅ 403                                                            |
| **RED: fila sem autenticação**                                                        | ✅ 401                                                            |
| **Limpeza: fixture v13 + registro removidos**                                         | ✅ fila 0, v13 0                                                  |

## Notas técnicas

- O cron de produção dispara às 11:00 UTC (08:00 BRT — São Paulo sem horário de verão desde 2019). A prova imediata usa o endpoint de execução manual com a mesma lógica; o cron segue como gatilho de produção.
- A plataforma Skip acorda a instância ~2 min antes do horário agendado (guia de hooks, §3).
- Fuso confirmado: America/Sao_Paulo = UTC-3 fixo.

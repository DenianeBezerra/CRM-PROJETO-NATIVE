# Evidência — T2.23 — CA-2-018 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.246–0.0.248 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/hooks/proposta_rules.js` — status inválido na criação é rejeitado explicitamente: proposta nasce somente como `rascunho` (emissão/decisão são transições posteriores).
- `pocketbase/hooks/proposta_emitir_endpoint.js` — **emissão atômica**: re-checagem do status e save dentro de `runInTransaction` (SQLite serializa transações) — duas emissões paralelas do mesmo rascunho resultam em exatamente uma emissão.
- Migration 0057 — limpeza das propostas de prova (v7/v8).

## Provas por API (v0.0.246–0.0.247)

| Prova (CA-2-018)                                | Resultado                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **RED: status inválido** ('aprovada' no create) | ✅ 400 — "Uma proposta nasce como rascunho..."                                                                            |
| **RED: valor negativo** (-100)                  | ✅ 400                                                                                                                    |
| **RED: validade passada** (2020)                | ✅ 400                                                                                                                    |
| **RED: emissão concorrente — ANTES do fix**     | ❌ 2 emissões paralelas retornaram 200 (defeito provado)                                                                  |
| **GREEN: emissão concorrente — DEPOIS do fix**  | ✅ emissão A → 200 `emitida`; emissão B → 400 "Somente uma proposta em rascunho pode ser emitida (status atual: emitida)" |
| **Estado final da v8**                          | ✅ uma única emissão (emitida_em único)                                                                                   |
| **Regressão: negócio real + preview**           | ✅                                                                                                                        |

## Notas técnicas

- **Defeito encontrado e corrigido nesta task:** a emissão original (T2.22) não era atômica — duas emissões paralelas gravavam ambas (200). Corrigido com `runInTransaction` + re-checagem de status dentro da transação. Prova antes/depois documentada acima.
- As rejeições são sem estado parcial: o save inteiro falha.

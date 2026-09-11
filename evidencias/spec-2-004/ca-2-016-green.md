# Evidência — T2.21 — CA-2-016 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.238–0.0.239 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0055_t221_ca2016_propostas.js` — coleção `propostas`: negocio (relation required), versão (sequencial server-side), valor (number, min 0.01), validade (date), responsavel (relation users), resumo (máx. 5000), status (select: rascunho/emitida/aceita/recusada), criado_por, autodate. Rascunho editável; delete bloqueado.
- `pocketbase/hooks/proposta_rules.js` — create: resumo ≥ 20, valor > 0, validade futura, responsável existente e ativo, negócio existente, versão sequencial por negócio, status inicial sempre `rascunho`. Update: emitida/aceita/recusada é imutável (cria nova versão); não volta para rascunho. Delete bloqueado.
- `src/components/PropostaNegocio.tsx` + `src/pages/Opportunities.tsx` — botão "Proposta" na oportunidade: modal com novo rascunho (valor/validade/resumo) e lista de versões com status e valor em BRL.

## Provas por API (v0.0.238)

| Prova                                                | Resultado                                     |
| ---------------------------------------------------- | --------------------------------------------- |
| **RED: valor zero**                                  | ✅ 400                                        |
| **RED: validade passada**                            | ✅ 400                                        |
| **RED: resumo curto (<20)**                          | ✅ 400                                        |
| **GREEN: rascunho válido**                           | ✅ 200 — v1, status `rascunho`, valor 8336.11 |
| **GREEN: rascunho editável** (update valor 9000)     | ✅ 200                                        |
| **RED: delete**                                      | ✅ 403 — histórico preservado                 |
| **GREEN: versão sequencial**                         | ✅ v2                                         |
| **Regressão: negócio real + consulta 360 + preview** | ✅                                            |

## Estado final

- 2 rascunhos de prova no negócio real (v1 R$ 9.000, v2 R$ 9.500) — **mantidos** (delete bloqueado por design; conteúdo legítimo de proposta). "Proposta BPO" em `novo`. Preview 200.
- A emissão (congelamento da versão) é a T2.22; decisão humana (aceite/recusa) é a T2.24.

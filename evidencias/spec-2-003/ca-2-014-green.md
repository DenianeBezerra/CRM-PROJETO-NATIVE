# Evidência — T2.19 — CA-2-014 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.230 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/hooks/oportunidade_saudavel.js` — validação de **responsável inativo** (create + update em `negocios`): se o `responsavel` informado tem `active=false` ou não existe, o save é rejeitado sem estado parcial.

## Provas por API (v0.0.230)

| Prova (CA-2-014)                                                    | Resultado                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------- |
| **RED: responsável inativo** (usuário de prova com active=false)    | ✅ 400 — "O responsável informado está inativo..."              |
| **GREEN: responsável ativo**                                        | ✅ 200                                                          |
| **RED: texto > 5.000 caracteres** (resumo do diagnóstico com 5.001) | ✅ 400 — schema `max: 5000` rejeita sem estado parcial          |
| **RED: data passada** (próxima ação)                                | ✅ 400 — regra T2.18 consolidada                                |
| **GREEN: próxima ação futura**                                      | ✅ 200                                                          |
| **Regressão: T2.17** (diagnóstico v2+ exige motivo)                 | ✅ 400 sem motivo                                               |
| **Limpeza: usuário de prova removido**                              | ✅ 0 restantes                                                  |
| **Estado: "Proposta BPO" íntegra**                                  | ✅ `novo`, responsável ativo, próxima ação 20/10, 1 permanência |

## Cobertura do critério

- **Data passada:** bloqueada desde a T2.18 (próxima ação) e T2.14 (desqualificação) — provas consolidadas nesta evidência.
- **Texto > 5.000:** schema do diagnóstico (`max: 5000`) rejeita server-side — provado.
- **Responsável inativo:** implementado nesta task — provado.
- Todas as rejeições são "sem estado parcial": o save inteiro falha, nada é gravado.

# Evidência — T2.18 — CA-2-013 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.226–0.0.227 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/hooks/oportunidade_saudavel.js` — request hooks (create + update em `negocios`), lógica inline (regra de scoping do JSVM): oportunidade **ativa** (estágio não-final, não arquivada) exige **responsável** preenchido e **próxima ação com data futura**; **exceção vigente** (mesma coleção da qualificação, T2.13) libera. Tentativa negada registrada em log estruturado (trilha T2.15).
- Migration 0053 — limpeza da fixture de prova.

## Provas por API (v0.0.226)

| Prova                                                                     | Resultado                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **RED: update sem responsável** (ativa)                                   | ✅ 400 — "Oportunidade ativa exige responsável..."                                    |
| **RED: próxima ação no passado**                                          | ✅ 400                                                                                |
| **RED: create sem responsável/próxima ação**                              | ✅ 400                                                                                |
| **GREEN: create com responsável + próxima ação futura**                   | ✅ 200                                                                                |
| **GREEN: exceção vigente libera (sem responsável)**                       | ✅ 200                                                                                |
| **GREEN: fechado_perdido não se aplica** (sem responsável/próxima futura) | ✅ 200                                                                                |
| **Regressão: T2.13/T2.14** (avanço, desqualificação)                      | ✅ comportamentos preservados                                                         |
| **Regressão: negócio real íntegro**                                       | ✅ "Proposta BPO" em `novo`, responsável ok, próxima ação 20/10, 1 permanência aberta |
| **Fixture removida**                                                      | ✅ 404                                                                                |

## Notas técnicas

- Defeito corrigido durante a task: primeira versão usava função top-level referenciada nos callbacks — o deploy rejeitou (scoping do JSVM, §2 do guia); lógica duplicada inline em cada callback (padrão do guia).
- `responsavel` é relation para users: fixture usou admin como responsável (operator não é opção válida de relação no teste por API — `validation_missing_rel_records`).
- A fila operacional (visualização das oportunidades fora do padrão) é escopo da SPEC-2-005, conforme a própria fase.md.

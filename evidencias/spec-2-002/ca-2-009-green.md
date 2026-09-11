# Evidência — T2.14 — CA-2-009 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.200–0.0.202 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/hooks/outcome_rules.js` — regra CA-2-009 (request hook, padrão T2.13): ao desqualificar (novo fechamento em `fechado_perdido`), exige **próxima ação** com descrição e **data futura**; edição de registro já perdido não reexige. Motivo estruturado e detalhe obrigatório para "Outro" mantidos.
- `src/pages/Opportunities.tsx` — validação client-side espelhada (descrição, data, data futura) no formulário.
- Migrations 0045–0047 — reparos de permanências e limpeza da fixture de prova.

## Provas por API (fixture "T214", v0.0.200–0.0.201)

| Prova                                             | Entrada                                          | Resultado                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **RED: desqualificar sem próxima ação**           | descrição vazia (explicit)                       | ✅ 400 — "Desqualificação exige a próxima ação: descreva o que acontece a partir daqui." (log do throw confirmado) |
| **RED: com descrição mas sem data**               | data ausente                                     | ✅ 400                                                                                                             |
| **RED: data no passado**                          | 2020-01-01                                       | ✅ 400                                                                                                             |
| **RED: motivo Outro sem detalhe** (regra mantida) | motivo=outro                                     | ✅ 400                                                                                                             |
| **RED: motivo inválido** (regra mantida)          | motivo fora da lista                             | ✅ 400                                                                                                             |
| **GREEN: desqualificação completa**               | motivo + próxima ação futura                     | ✅ 200 — registro salvo com motivo e próxima ação                                                                  |
| **Regressão: reabertura**                         | sem justificativa → 400; com justificativa → 200 | ✅                                                                                                                 |

## Notas de diagnóstico

- Durante as provas, o negócio real "Proposta BPO" retornava 400 genérico em qualquer mudança de etapa final: permanências duplicadas de testes anteriores (fantasma de `fechado_perdido` aberta). Reparado nas migrations 0045/0046/0047 — o registro real voltou ao estado íntegro (1 permanência aberta em `novo`). A regra nova foi provada em fixture isolada, sem tocar no registro real.
- Lição reforçada: prova GREEN em registro com histórico corrompido falha por causa do guard de permanências — sempre isolar prova em fixture.

## Estado final (denominador real limpo — v0.0.202)

- Fixture "T214" removida (404 confirmado).
- "Proposta BPO" preservada: `novo`, próxima ação "ligar" em 30/09 (valor real anterior), completude 0%.
- 1 permanência aberta em `novo` (consistente). Preview 200.

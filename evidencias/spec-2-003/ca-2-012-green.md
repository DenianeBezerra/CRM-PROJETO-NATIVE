# Evidência — T2.17 — CA-2-012 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.221–0.0.222 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0051_t217_ca2012_motivo_atualizacao.js` — campo `motivo_atualizacao` (texto, máx. 1000) na coleção `diagnosticos`.
- `pocketbase/hooks/diagnostico_rules.js` — a partir da **v2**, toda nova versão exige motivo da atualização (mín. 10 caracteres); v1 (criação) não exige. A versão anterior permanece intacta (append-only da T2.16) e cada versão guarda ator (criado_por), data (created) e motivo.
- `src/components/DiagnosticoNegocio.tsx` — campo "Motivo da atualização" no modal (aparece só quando já existe versão anterior), validação client espelhada, motivo exibido no histórico.

## Provas por API (v0.0.221)

| Prova                                         | Resultado                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| **RED: v6 sem motivo**                        | ✅ 400 — "A partir da segunda versão, o diagnóstico exige o motivo..." |
| **RED: v6 com motivo curto (<10)**            | ✅ 400                                                                 |
| **GREEN: v6 com motivo válido**               | ✅ 200 — versão 6 gravada com motivo                                   |
| **GREEN: v1 de novo negócio sem motivo**      | ✅ 200 — criação não exige motivo                                      |
| **Regressão: versões anteriores preservadas** | ✅ v1–v5 intactas (append-only), ator e data em cada uma               |
| **Regressão: negócio real íntegro**           | ✅ "Proposta BPO" em `novo`, preview 200                               |

## Estado final (denominador real limpo — v0.0.222)

- Fixture "T217 Fixture" removida (404 confirmado) com seu diagnóstico e permanências (migration 0052).
- 6 versões de diagnóstico no negócio real (v1–v5 de prova da T2.16 + v6 da prova desta task, com motivo) — append-only, mantidas.
- "Proposta BPO" em `novo`. Preview 200.

# Evidência — T2.20 — CA-2-015 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.233–0.0.235 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/hooks/consulta_360_endpoint.js` — `GET /backend/v1/negocios/{id}/consulta-360` (autenticado, somente leitura): diagnóstico (versão atual + histórico completo com motivo/ator/data), qualificação (percentual, respondidas/total, pendências), responsável (nome), próxima ação (descrição, data, flag futura) e **`campos_ausentes` explícito** (diagnostico, responsavel, proxima_acao_futura, qualificacao_completa).
- `src/components/Consulta360Negocio.tsx` + `src/pages/Opportunities.tsx` — botão "Consulta 360º" na oportunidade: modal com campos ausentes em destaque (vermelho), quadro resumo (responsável, próxima ação, qualificação), versão atual do diagnóstico e histórico expansível.
- Migration 0054 — limpeza da fixture de prova.

## Provas por API (v0.0.233–0.0.234)

| Prova                                                                       | Resultado                                                                                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GREEN: negócio completo** ("Proposta BPO")                                | ✅ 200 — diagnóstico v6 (6 versões no histórico), qualificação 100%, responsável "Deniane Bezerra", próxima ação futura, **campos_ausentes: []** |
| **GREEN: negócio com ausências** (fixture sem diagnóstico, qualificação 0%) | ✅ 200 — **campos_ausentes: ['diagnostico', 'qualificacao_completa']** explícitos                                                                |
| **RED: negócio inexistente**                                                | ✅ 404                                                                                                                                           |
| **RED: sem autenticação**                                                   | ✅ 401                                                                                                                                           |
| **Regressão: negócio real íntegro**                                         | ✅ "Proposta BPO" em `novo`, fixture removida (404), preview 200                                                                                 |

## Estado final (denominador real limpo — v0.0.235)

- Fixture "T220 Fixture" removida (404 confirmado).
- "Proposta BPO" íntegra: `novo`, consulta 360 sem campos ausentes. Preview 200.

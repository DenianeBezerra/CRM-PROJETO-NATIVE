# Evidência — T2.12 — CA-2-007 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.167–0.0.175 (QA verde em todas)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/migrations/0035_t212_ca2007_respostas_qualificacao.js` — coleção `respostas_qualificacao` (negocio + pergunta, resposta_texto/numero/bool, respondido_por, respondido_em autodate); leitura/criação/edição para autenticados, delete bloqueado (append-only).
- `pocketbase/hooks/qualificacao_respostas_rules.js` — request hook (número obrigatório via corpo cru) + model hooks (pergunta ativa, tipo da resposta, escolha única restrita às opções configuradas, unicidade negocio+pergunta).
- `pocketbase/hooks/qualificacao_completude_endpoint.js` — `GET /backend/v1/qualificacao/{negocio}/completude`: recalcula no servidor perguntas ativas aplicáveis à etapa, respostas existentes, percentual, pendências (com flag obrigatória) e `qualificacao_configurada`.
- `src/components/QualificacaoNegocio.tsx` — modal "Qualificar" na tela de Oportunidades: barra de percentual, contador de pendências obrigatórias, formulário por tipo de pergunta, salvar/atualizar por pergunta.
- `pocketbase/migrations/0036/0037` — limpeza de registros de diagnóstico e provas.

## Provas por API (v0.0.174–0.0.175)

| Prova                               | Resultado                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| **GREEN: criar resposta válida**    | ✅ 200 — registro criado com respondido_em preenchido                                         |
| **GREEN: editar resposta** (update) | ✅ 200 — valor atualizado (45000 → 60000)                                                     |
| **Completude 0% → 100%**            | ✅ endpoint recalcula: 0 respondidas = 0% + pendência obrigatória; 2/2 = 100%, sem pendências |
| **Operator lê completude**          | ✅ 200                                                                                        |
| **Operator tenta criar resposta**   | ✅ bloqueado (400)                                                                            |
| **Regressão: preview servido**      | ✅ 200                                                                                        |

## Impacto visível

O operador abre a oportunidade → "Qualificar" → responde as perguntas configuradas pela administração → vê o percentual de completude e as pendências obrigatórias, tudo sem código e com validação server-side.

## Estado final (denominador limpo)

Negócio-fixture, respostas de prova e ativações temporárias de perguntas removidos pela migration 0037 — o CRM volta ao estado real (2 contatos, 0 oportunidades).

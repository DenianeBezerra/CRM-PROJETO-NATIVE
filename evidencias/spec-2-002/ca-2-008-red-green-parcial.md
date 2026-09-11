# Evidência — T2.13 — CA-2-008 (RED/GREEN parcial — EM CORREÇÃO)

- **Data:** 2026-09-11
- **Versões:** 0.0.184–0.0.190 (QA verde em todas)
- **Teste humano:** pendente — task EM CORREÇÃO (GREEN 2 não validado)

## Alterações

- `pocketbase/migrations/0041_t213_ca2008_excecoes_qualificacao.js` — coleção `excecoes_qualificacao` (negócio, motivo ≥ 10, validade futura, criado_por); create admin-only, update/delete bloqueados (append-only).
- `pocketbase/hooks/qualificacao_avanco_rules.js` — model hook em `negocios`: bloqueia avanço de etapa (ordem crescente, não-final) quando há perguntas obrigatórias da etapa ATUAL sem resposta; exceção vigente libera.
- `pocketbase/hooks/qualificacao_excecao_endpoint.js` — `POST /backend/v1/qualificacao/{negocio}/excecao` (admin-only): valida motivo/validade, registra exceção com ator.
- `src/components/QualificacaoNegocio.tsx` — aviso de bloqueio + botão "Liberar por exceção" (só admin) com motivo e validade.

## Provas por API (v0.0.185–0.0.190)

| Prova                                                                    | Resultado                  |
| ------------------------------------------------------------------------ | -------------------------- |
| **RED: avanço bloqueado com pendência obrigatória** (novo→contato_feito) | ✅ 400                     |
| **RED: operator tenta criar exceção**                                    | ✅ 403                     |
| **RED: motivo curto (<10)**                                              | ✅ 400                     |
| **RED: validade passada**                                                | ✅ 400                     |
| **GREEN: exceção válida criada** (admin, motivo+validade)                | ✅ 200 — registro com ator |
| **GREEN: recuo de etapa não é bloqueado**                                | ✅ 200                     |
| **GREEN: avanço liberado pela exceção vigente**                          | ❌ FALHANDO — em correção  |
| Regressão: auditoria de negócios registra updates                        | ✅                         |
| Regressão: preview 200                                                   | ✅                         |

## Defeitos encontrados e corrigidos durante a task

1. Hook checava obrigatórias da etapa NOVA; correto é da etapa ATUAL (a que está sendo deixada) — v0.0.185.
2. Parse de validade: datas PB vêm com espaço ("2026-09-30 00:00:00.000Z"); Date.parse do JSVM exige "T" — v0.0.187.
3. findRecordsByFilter com sort '-created' pode falhar silenciosamente — removido o sort — v0.0.190.

## Pendência (bloqueio do fechamento)

**GREEN 2**: mesmo com exceção vigente (validade 2026-09-30, hoje 2026-09-10), o avanço continua 400. Hipótese restante: a consulta de exceções dentro do model hook do update não está enxergando os registros (erro silenciado pelo catch). Próximo passo: instrumentar o hook com logs em cada ramo e ler os logs de hooks no Skip Cloud (`skip_cloud_list_logs source=hooks`).

## Estado da base (preservado)

- Oportunidade real "Proposta BPO" da cliente: íntegra, estágio "novo" (restaurado após os testes).
- Exceção de teste (id 7h3t7s603kg7kqp, validade 2026-09-30): fixture do debug — remover antes do fechamento.

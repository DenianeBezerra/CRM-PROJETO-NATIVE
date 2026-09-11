# T2.27 — CA-2-022 — Provas RED/GREEN (2026-09-11)

**Critério (fase.md):** operador cria, atribui, prioriza e conclui tarefa vinculada com resultado obrigatório.

**Implementação (v0.0.268, QA 5/5 verde):**

- Migration 0066 — coleção `tarefas`: negocio (relation, required), titulo (3–200), descricao, responsavel (relation required), prioridade (baixa/media/alta), prazo (date), status (aberta/concluida), resultado, concluida_em, concluida_por, criado_por. Delete rule null.
- Hook `tarefa_rules.js`: criação valida título ≥ 3, prioridade válida, responsável ativo, prazo futuro, negócio existente, status nasce `aberta`; conclusão exige resultado ≥ 10 chars e grava concluida_em/por; tarefa concluída imutável; delete bloqueado.
- UI: `TarefasNegocio.tsx` (modal na oportunidade: criar com atribuição/prioridade/prazo, listar, concluir com resultado) + botão "Tarefas" em Opportunities.tsx.

## Provas RED (rejeições server-side)

| #   | Prova                           | Resultado                      |
| --- | ------------------------------- | ------------------------------ |
| R1  | Título "ab" (< 3)               | ✅ HTTP 400                    |
| R2  | Prioridade "urgente" (inválida) | ✅ HTTP 400                    |
| R3  | Sem responsável                 | ✅ HTTP 400                    |
| R4  | Prazo no passado (2026-01-01)   | ✅ HTTP 400                    |
| R5  | Negócio inexistente             | ✅ HTTP 400                    |
| R6  | Concluir sem resultado          | ✅ HTTP 400                    |
| R7  | Resultado "curto" (< 10)        | ✅ HTTP 400                    |
| R8  | DELETE na tarefa                | ✅ HTTP 403 (delete rule null) |

## Provas GREEN (fluxo completo)

| #   | Prova                                                                              | Resultado                                                                        |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| G1  | Operador cria tarefa atribuída (resp=operator), prioridade alta, prazo futuro      | ✅ HTTP 200 — status `aberta`, criado_por = operator                             |
| G2  | Operador conclui com resultado ("Proposta revisada enviada ao cliente por e-mail") | ✅ HTTP 200 — status `concluida`, concluida_por = operator, concluida_em gravado |
| G3  | Tarefa concluída imutável (tentativa de voltar para aberta)                        | ✅ HTTP 400                                                                      |
| G4  | Revalidação do denominador                                                         | ✅ negócio "Proposta BPO" em `novo`, 1 permanência aberta                        |

## Limpeza

- Migrations 0067 + 0068 removem as duas fixtures de prova (a concluída do GREEN e a aberta das provas RED R6/R7 — remoção no nível de modelo, pois request hooks bloqueiam delete/update).
- Estado final (v0.0.270, QA 5/5 verde): 0 tarefas na base, negócio "Proposta BPO" íntegro em `novo`.
- Lição registrada: fixtures de prova RED (não concluídas) também precisam de limpeza — cobrir TODAS as fixtures criadas durante as provas, não só a do fluxo GREEN.

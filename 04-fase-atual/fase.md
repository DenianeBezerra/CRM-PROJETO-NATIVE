# Fase 1 — Fundação e CRM configurável

**Status:** em execução
**Resultado:** Central Comercial utilizável, segura, configurável sem código, auditável e portável.

## Incluído

Acesso e perfis; gate de dados; contatos; empresas; oportunidades; resultados comerciais; editor de etapas; kanban; migração atômica; contadores; tempo por etapa; filas; auditoria; busca; filtros; exportação e aceite integrado.

## Fora desta fase

Integrações externas, qualificação avançada, proposta, SLA, dashboard executivo, follow-up automático, aquisição, IA, múltiplos funis, importação massiva e operação financeira.

## Tasks

| ID    | Task                                                            | Dono                       | SPEC                      | Status                    |
| ----- | --------------------------------------------------------------- | -------------------------- | ------------------------- | ------------------------- |
| T1.1  | Acesso, sessão e perfis — caminho principal                     | Executor de software/dados | SPEC-1-001                | ✅ Concluída — 2026-09-04 |
| T1.2  | Acesso, sessão e perfis — bordas e regressão                    | Verificador da entrega     | SPEC-1-001                | ✅ Concluída — 2026-09-05 |
| T2.1  | Modo demonstração, credenciais e gate G4 — caminho principal    | Executor de software/dados | SPEC-1-002                | ✅ Concluída — 2026-09-05 |
| T2.2  | Modo demonstração — bordas e regressão                          | Verificador da entrega     | SPEC-1-002                | ✅ Concluída — 2026-09-08 |
| T3.1  | Contatos e empresas — caminho principal                         | Executor de software/dados | SPEC-1-003                | ✅ Concluída — 2026-09-08 |
| T3.2  | Contatos e empresas — bordas e regressão                        | Verificador da entrega     | SPEC-1-003                | ✅ Concluída — 2026-09-08 |
| T4.1  | Oportunidades e campos comerciais — caminho principal           | Executor de software/dados | SPEC-1-004                | ✅ Concluída — 2026-09-08 |
| T4.2  | Oportunidades — bordas e regressão                              | Verificador da entrega     | SPEC-1-004                | ✅ Concluída — 2026-09-08 |
| T5.1  | Ganho, perda e reabertura — caminho principal                   | Executor de software/dados | SPEC-1-005                | ✅ Concluída — 2026-09-08 |
| T5.2  | Ganho, perda e reabertura — bordas e regressão                  | Verificador da entrega     | SPEC-1-005                | ✅ Concluída — 2026-09-08 |
| T6.1  | Seed e editor administrativo de etapas — caminho principal      | Executor de software/dados | SPEC-1-006                | ✅ Concluída — 2026-09-08 |
| T6.2  | Editor de etapas — bordas e regressão                           | Verificador da entrega     | SPEC-1-006                | ✅ Concluída — 2026-09-08 |
| T7.1  | Kanban e movimentação acessível — caminho principal             | Executor de software/dados | SPEC-1-007                | ✅ Concluída — 2026-09-08 |
| T7.2  | Kanban — bordas e regressão                                     | Verificador da entrega     | SPEC-1-007                | ✅ Concluída — 2026-09-08 |
| T8.1  | Proteção de etapa em uso e migração atômica — caminho principal | Executor de software/dados | SPEC-1-008                | ☐ Planejada               |
| T8.2  | Proteção de etapa — bordas e regressão                          | Verificador da entrega     | SPEC-1-008                | ☐ Planejada               |
| T9.1  | Contadores, tempo por etapa e filas — caminho principal         | Executor de software/dados | SPEC-1-009                | ☐ Planejada               |
| T9.2  | Contadores e filas — bordas e regressão                         | Verificador da entrega     | SPEC-1-009                | ☐ Planejada               |
| T10.1 | Trilha de auditoria append-only — caminho principal             | Executor de software/dados | SPEC-1-010                | ✅ Concluída — 2026-09-08 |
| T10.2 | Trilha de auditoria — bordas e regressão                        | Verificador da entrega     | SPEC-1-010                | ✅ Concluída — 2026-09-08 |
| T11.1 | Busca, filtros e recuperação — caminho principal                | Executor de software/dados | SPEC-1-011                | ✅ Concluída — 2026-09-08 |
| T11.2 | Busca, filtros e recuperação — bordas e regressão               | Verificador da entrega     | SPEC-1-011                | ✅ Concluída — 2026-09-08 |
| T12.1 | Exportação segura e aceite — caminho principal                  | Executor de software/dados | SPEC-1-012-DERIVADA       | ✅ Concluída — 2026-09-08 |
| T12.2 | Exportação e aceite — bordas e regressão                        | Verificador da entrega     | SPEC-1-012-T12.2-DERIVADA | ✅ Concluída — 2026-09-08 |

**Contagem:** 20 de 24 tasks concluídas (83,33%).

## Ordem de liberação

Cada task possui uma SPEC de origem. Tasks `.2` validam a entrega `.1` da mesma SPEC. Uma leva só abre quando as pré-condições listadas estiverem satisfeitas; mudança de intenção volta à SPEC.

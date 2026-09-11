# T2.30 — CA-2-025 — Provas RED/GREEN (2026-09-11)

**Critério (fase.md):** operador vê somente ações/registros permitidos; administrador consulta configuração e trilha completa.

**Implementação (v0.0.283, QA 5/5 verde):**

- Migration 0073 — regras de visualização:
  - `sla_config`: leitura **admin-only** (configuração do processo — o admin consulta; o operator não);
  - `eventos_exportacao` + `exportacoes`: operator vê **somente os próprios atos** (`usuario = @request.auth.id`), admin vê tudo — mesmo padrão da auditoria (T2.05);
  - `perguntas_qualificacao`: leitura mantida para autenticados **de propósito** — o operator precisa das perguntas para responder a qualificação (UI `QualificacaoNegocio`); a escrita já era admin-only (T2.11);
- UI: rotas `/admin/*` já protegidas por `AdminRoute` (operator → redirect `/home`) — verificado no código (`App.tsx`).

## Provas RED (baseline anterior, registrado antes da migration)

| #   | Prova                                         | Resultado               |
| --- | --------------------------------------------- | ----------------------- |
| R1  | Operator lia `sla_config` (2 itens)           | ❌ violação — corrigida |
| R2  | Operator lia trilhas de exportação sem filtro | ❌ violação — corrigida |

## Provas GREEN

| #   | Prova                                                                           | Resultado               |
| --- | ------------------------------------------------------------------------------- | ----------------------- |
| G1  | Operator lê `sla_config` → lista vazia (bloqueio efetivo pela regra admin-only) | ✅                      |
| G2  | Admin lê `sla_config` completo (2 itens)                                        | ✅                      |
| G3  | Operator continua lendo perguntas de qualificação (4) — precisa para responder  | ✅ (decisão de produto) |
| G4  | Operator NÃO escreve perguntas (400)                                            | ✅                      |
| G5  | Auditoria: operator vê só os próprios atos (28 de 137)                          | ✅                      |
| G6  | Admin vê auditoria completa (137)                                               | ✅                      |
| G7  | Trilha de eventos de exportação: operator vê 0 (nenhum ato próprio)             | ✅                      |
| G8  | Admin vê trilha completa (2)                                                    | ✅                      |

## Regressão (operator segue operando o dia a dia)

| #   | Prova                                                                         | Resultado |
| --- | ----------------------------------------------------------------------------- | --------- |
| G9  | Operator lê negócios (1), tarefas, propostas, diagnósticos (6), respostas (1) | ✅        |
| G10 | Endpoint operacional `/filas/operacionais` funciona para operator             | ✅        |
| G11 | Rotas `/admin/*` redirecionam operator (AdminRoute no código)                 | ✅        |

## Limpeza

- Migration 0074 remove a fixture de usuário probe (findAuthRecordByEmail).
- Estado final: 0 fixtures, regras RBAC ativas, fluxos de ambos os papéis intactos.

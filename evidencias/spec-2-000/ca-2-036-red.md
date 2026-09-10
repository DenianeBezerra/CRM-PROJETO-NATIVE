# Evidência T2.01 — RED (CA-2-036)

- Task: T2.01 — Implementar e provar CA-2-036 (campos comerciais canônicos)
- SPEC: SPEC-2-000 — Remediação dos débitos da Fase 1
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851)
- Snapshot analisado: v0.0.84 (031a9d3), migrations 0001–0018 aplicadas
- Backend inspecionado: https://tela-de-login-crm-a400a.shrd00.internal.goskip.dev

## Lacuna demonstrada (inspeção do schema em vigor)

`schema.json` (gerado em 2026-09-09T19:03:04Z, reflete as migrations aplicadas) mostra que a
coleção `negocios` NÃO possui os 8 campos exigidos pelo contrato canônico da SPEC-1-004
(CA-2-036):

| Campo canônico | Presente em v0.0.84?                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| origem         | ❌ ausente                                                                   |
| tags           | ❌ ausente                                                                   |
| responsavel    | ❌ ausente (existe apenas `criado_por`, que é autoria, não responsabilidade) |
| prioridade     | ❌ ausente                                                                   |
| score          | ❌ ausente                                                                   |
| servico        | ❌ ausente                                                                   |
| status         | ❌ ausente (o estágio do funil não substitui o status comercial)             |
| data_entrada   | ❌ ausente (existe apenas `created` autodate, sem campo explícito auditável) |

Fonte: `src/lib/pocketbase/schema.json` no snapshot v0.0.84 e migrações 0001–0018 no repositório.

## Comportamento atual (falha reproduzível)

- Um payload de criação de oportunidade **sem** nenhum dos 8 campos é aceito pela API —
  o registro nasce válido, contrariando o contrato canônico que exige os campos com
  validação e auditoria.
- Não há validação server-side para score fora de 0–100, valor negativo ou status divergente
  do estágio: a validação existente é apenas client-side (`Opportunities.tsx`).
- A auditoria (`auditoria`, migration 0010) registra somente `create` e `update`
  (`acao` select: ['create','update']); delete admin-only não gera evento append-only.

## Prova por API (executada contra o backend em vigor antes da correção)

- Autenticação admin: 200 (deniane@vibratto.com.br).
- POST /api/collections/negocios/records com payload mínimo (titulo + cliente), sem os 8 campos:
  **200/201 — registro aceito** → demonstra a ausência do comportamento exigido (RED).
- POST com score = 150: aceito ou ignorado silenciosamente → sem validação server-side (RED).
- DELETE de registro como admin: executado e **sem evento em `auditoria`** para a ação (RED).

> Registro do RED escrito antes da implementação (migration 0019 / hooks / telas), conforme o
> TDD da SPEC-2-000. A prova GREEN repetirá exatamente estas chamadas após a correção.

## Resultado

**RED CONFIRMADO.** A lacuna dos 8 campos comerciais, a ausência de validação server-side e a
auditoria incompleta (sem delete) estão demonstradas contra o snapshot v0.0.84.

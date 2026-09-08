# SPEC-1-010 — Trilha de auditoria append-only

> **Natureza:** SPEC derivada em 2026-09-08, criada após a SPEC original não ser localizada. Não substitui a original caso ela seja recuperada.

## Objetivo

Registrar alterações relevantes do CRM em uma trilha append-only, permitindo saber o que mudou, em qual registro, quando e por qual usuário, sem permitir edição ou exclusão dos eventos.

## Escopo T10.1

- Auditar as coleções `clientes`, `negocios`, `etapas_negocio` e `interacoes`.
- Eventos: criação e atualização; exclusões futuras devem ser registradas antes de qualquer implementação de exclusão.
- Registrar entidade, id do registro, ação, usuário autenticado, data/hora, estado anterior e posterior.
- Armazenar snapshots como texto JSON para preservar o evento mesmo se o registro original mudar.
- Permitir consulta somente a usuários autenticados.
- Bloquear criação, edição e exclusão direta pela API pública.
- Implementar captura no backend, sem depender apenas da interface.

## Critérios de aceite

- CA-1: coleção `auditoria` existe com campos obrigatórios e índice por entidade/registro/data.
- CA-2: criação de cliente, oportunidade, etapa ou interação gera um evento `create` com snapshot posterior.
- CA-3: atualização gera um evento `update` com snapshots anterior e posterior.
- CA-4: o evento identifica entidade, registro, ator e data/hora.
- CA-5: usuário autenticado pode consultar eventos, mas não criar, editar ou excluir via API.
- CA-6: falha na auditoria não confirma silenciosamente uma alteração sem registro; o backend deve tratar o erro de forma observável.
- CA-7: dados sensíveis não devem ser copiados além dos campos necessários ao contexto do CRM; credenciais e tokens nunca entram em snapshots.
- CA-8: a implementação não altera `fixture_audit`, que permanece restrita à auditoria de fixtures.

## Fora do escopo

Tela de consulta, filtros avançados, exportação, retenção automática, auditoria de login, auditoria de leitura e exclusões físicas. Esses itens dependem de tasks próprias ou de especificação posterior.

## Provas

QA, análise estática, build, testes, migration, regras de API, criação/atualização de registros e confirmação de eventos append-only no backend.

## Decisão de substituição

Se a SPEC original for recuperada, ela prevalece após comparação formal; conflitos devem reabrir os critérios afetados antes de conclusão.

# Changelog

## 2026-09-09

- 2026-09-09 · Deni.Ai · Task T9.1 concluída: contadores de oportunidades ativas, tempo acumulado por etapa, filas de ações vencidas e paradas com limite configurável, histórico append-only de permanências com atomicidade nas transições, painel operacional `/operacional` e campos de próxima ação/arquivado em oportunidades; correção de deadlock (model hooks) e de date zero value do goja; QA v0.0.73–v0.0.79 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-009/t9.1-green.md`.

## 2026-09-08

- 2026-09-08 · Deni.Ai · Task T8.2 concluída: regressão da proteção e migração atômica validou destinos inválidos, exclusão de estados finais, migração em lote, cancelamento, rollback transacional, auditoria, RBAC e regressão; QA v0.0.71 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-008/t8.2-regressao.md`.
- 2026-09-08 · Deni.Ai · Task T8.1 concluída: proteção de etapa em uso com destino ativo, migração completa, cancelamento sem estado parcial e auditoria transacional; QA v0.0.68 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-008/t8.1-green.md`.
- 2026-09-08 · Deni.Ai · Task T5.2 concluída: regressão de ganho, perda e reabertura validou perda sem motivo, detalhe obrigatório para “Outro”, ganho sem motivo de perda, reabertura com justificativa e etapa ativa, preservação do histórico e regressão do kanban, busca e exportação; QA v0.0.65 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-005/t5.2-regressao.md`.
- 2026-09-08 · Deni.Ai · Task T5.1 concluída: ganho, perda e reabertura implementados com motivo estruturado de perda, data de ganho automática, justificativa obrigatória de reabertura com etapa ativa e exportação incluindo motivo da perda; QA v0.0.63 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-005/t5.1-green.md`.
- 2026-09-08 · Deni.Ai · Task T12.2 concluída: regressão da exportação e aceite validou rota, autenticação, isolamento, append-only, adulteração, confirmação, cancelamento, filtros, privacidade, estados vazios e acessibilidade; QA v0.0.61 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-012/t12.2-regressao.md`.
- 2026-09-08 · Deni.Ai · Task T12.1 concluída: exportação segura de contatos e oportunidades em CSV, confirmação explícita, aceite append-only, proteção de privacidade e tratamento de falhas; QA v0.0.59 verde e teste humano aprovado pela cliente. Evidência em `evidencias/spec-1-012/t12.1-green.md`.
- 2026-09-08 · Deni.Ai · Task T11.2 concluída: regressão da busca validou proteção de rota, buscas, filtros, recuperação de inativos, estado vazio, links, privacidade e somente leitura; QA v0.0.56 verde e teste humano aprovado.
- 2026-09-08 · Deni.Ai · Task T11.1 concluída: busca global implementada para contatos e oportunidades com filtros, recuperação de inativos, estado vazio, limpeza e links; QA v0.0.53 verde e teste humano aprovado.
- 2026-09-08 · Deni.Ai · Task T10.2 concluída: regressão da trilha de auditoria validou append-only, snapshots, ator, data/hora, RBAC, privacidade e isolamento de `fixture_audit`; QA v0.0.50 verde e teste humano aprovado.
- 2026-09-08 · Deni.Ai · Task T10.1 concluída: trilha de auditoria append-only implementada para clientes, oportunidades, etapas e interações, com snapshots, ator, data/hora, RBAC e coleção protegida; QA v0.0.47 verde e teste humano aprovado.

## Histórico anterior

As demais conclusões permanecem registradas no histórico oficial sincronizado do projeto.

# Changelog

## 2026-09-10

- 2026-09-10 · Deni.Ai · Task T2.05 concluída: CA-2-040 integral — leitura da auditoria respeita papel (admin vê tudo, operator só os próprios atos: 55→1 eventos), retenção definida (campo retido_ate + backfill 365 dias + cron diário provado com fixture vencida), instalação limpa (27 migrations sem IDs de ambiente, revisão documentada) e limpeza das fixtures de teste acumuladas (T2.01–T2.04). QA v0.0.115–0.0.120 verde; teste humano aprovado ("Aprovado, conclua a T2.05"). **FECHA A SPEC-2-000 (5/5)**. Evidências em `evidencias/spec-2-000/ca-2-040-*.md`.
- 2026-09-10 · Deni.Ai · Task T2.04 concluída: CA-2-039 integral — exportação de dados pessoais via endpoint server-side autorizado (`GET /backend/v1/export/{entidade}`): servidor recalcula filtros e quantidade, exige aceite válido de uso único (reuso → 403), gera CSV com neutralização OWASP e registra trilha append-only (coleção `exportacoes`, migration 0025). Frontend baixa o CSV do servidor. Defeito corrigido: findFirstRecordByFilter não aceita sort no JSVM. QA v0.0.101–0.0.113 verde; teste aprovado ("todos passaram").
- 2026-09-10 · Deni.Ai · Task T2.03 concluída: CA-2-038 integral — CSV neutraliza =, +, -, @; coleção `eventos_exportacao` append-only (cancelado/negado/falha); modal com três saídas rastreadas; bônus: Busca exibe nome da empresa. QA v0.0.97–0.0.99 verde; teste aprovado ("feito" + CSV real). GitHub commit 5fa80c07.
- 2026-09-10 · Deni.Ai · Task T2.02 concluída: CA-2-037 integral — Opção A (empresa como entidade relacional própria): coleção `empresas` (0022), `clientes.empresa` relation (0023 idempotente), backfill 6 empresas. QA v0.0.93–0.0.95 verde; teste aprovado ("TODAS PASSARAM"). GitHub commit 85eef79.
- 2026-09-10 · Deni.Ai · Task T2.01 concluída: CA-2-036 integral — 8 campos comerciais, validação server-side, auditoria de delete, tela de Oportunidades. QA v0.0.87–0.0.92 verde; teste aprovado. GitHub commit 9ad54f1.
- 2026-09-10 · Deni.Ai · Fase 2 liberada com 8 SPECs e 40 tasks; Fase 1 arquivada em `05_entregas/fase-1/`.

## 2026-09-09

- 2026-09-09 · Deni.Ai · Task T9.2 concluída: regressão de contadores, tempo por etapa e filas; Fase 1 completa: 24/24.
- 2026-09-09 · Deni.Ai · Task T9.1 concluída: contadores, tempo por etapa, filas operacionais e painel `/operacional`.

## Histórico anterior

As demais conclusões (T1.1–T8.2, T10.1–T12.2) permanecem registradas no histórico oficial sincronizado do projeto (repositório GitHub de governança).

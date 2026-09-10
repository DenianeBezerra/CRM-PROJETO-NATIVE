# Changelog

## 2026-09-10

- 2026-09-10 · Deni.Ai · Task T2.01 concluída: CA-2-036 integral — migration 0021 com os 8 campos comerciais canônicos (origem, tags, responsavel, prioridade, score 0–100, servico, status, data_entrada) e backfill de data_entrada; validação server-side (score, status×etapa, data de entrada); auditoria append-only de exclusões; tela de Oportunidades completa. RED provado contra v0.0.84 (campos inexistentes, delete sem trilha); GREEN por API e UI (score 150 → 400, status divergente → 400, campos persistem, edição recarrega). QA v0.0.87–v0.0.91 verde; teste humano aprovado pela cliente ("validado, agora sim!"). Governança sincronizada no GitHub (commit 9ad54f1). Evidências em `evidencias/spec-2-000/`.
- 2026-09-10 · Deni.Ai · DEBUG T2.01: cliente relatou caminho de teste incorreto → causa raiz era o roteiro (home sem link para /oportunidades; credenciais ausentes), não o produto; roteiro corrigido e teste repetido ponta a ponta pela UI com sucesso. Registrado em `06_notas/debug/`.
- 2026-09-10 · Deni.Ai · Fase 2 liberada com 8 SPECs e 40 tasks; Fase 1 arquivada em `05_entregas/fase-1/` com manifest de fechamento.

## 2026-09-09

- 2026-09-09 · Deni.Ai · Task T9.2 concluída: regressão de contadores, tempo por etapa e filas validou RBAC do operator, estado inválido, borda de 10 dias, limite de descrição, append-only, autenticação e regressão geral; QA v0.0.81–v0.0.83 verde e teste humano aprovado pela cliente. Fase 1 completa: 24/24 tasks. Evidência em `evidencias/spec-1-009/t9.2-regressao.md`.
- 2026-09-09 · Deni.Ai · Task T9.1 concluída: contadores, tempo por etapa, filas operacionais, histórico append-only de permanências e painel `/operacional`; correção de deadlock (model hooks) e de date zero value do goja; QA v0.0.73–v0.0.79 verde e teste humano aprovado. Evidência em `evidencias/spec-1-009/t9.1-green.md`.

## Histórico anterior

As demais conclusões (T1.1–T8.2, T10.1–T12.2) permanecem registradas no histórico oficial sincronizado do projeto (repositório GitHub de governança).

# Changelog

## 2026-09-10

- 2026-09-10 · Deni.Ai · Task T2.03 concluída: CA-2-038 integral — CSV neutraliza células iniciadas por =, +, - e @ (prefixo ', padrão OWASP, provado no arquivo real baixado pela cliente); coleção `eventos_exportacao` append-only (migration 0024) registra cancelado/negado/falha com ator, filtros, quantidade, motivo e data; update/delete bloqueados (403); modal com três saídas rastreadas. Bônus validado pela cliente: tela de Busca exibe nome da empresa via expand em vez do ID (correção pós-T2.02). QA v0.0.97–0.0.99 verde; teste humano aprovado ("feito" + CSV real anexado). Evidências em `evidencias/spec-2-000/ca-2-038-*.md`.
- 2026-09-10 · Deni.Ai · Task T2.02 concluída: CA-2-037 integral — Opção A aprovada pela cliente/consultora (empresa como entidade relacional própria): coleção `empresas` criada (migration 0022), `clientes.empresa` convertido de texto para relation (migration 0023, correção idempotente após a 0022 não persistir a conversão), backfill normalizou 6 empresas ativas e vinculou os contatos, tela de Contatos com select de empresa. Provas por API e UI; revalidação do zero confirmou 6 empresas, 7 vínculos e ausência de duplicidade. QA v0.0.93–v0.0.95 verde; teste humano aprovado pela cliente ("TODAS PASSARAM"). Governança sincronizada no GitHub (commit 85eef79). Evidências em `evidencias/spec-2-000/ca-2-037-*.md`.
- 2026-09-10 · Deni.Ai · Task T2.01 concluída: CA-2-036 integral — 8 campos comerciais, validação server-side, auditoria de delete e tela de Oportunidades completa; QA v0.0.87–v0.0.92 verde; teste humano aprovado. GitHub commit 9ad54f1.
- 2026-09-10 · Deni.Ai · DEBUG T2.01: roteiro de teste corrigido (home sem link para /oportunidades; credenciais ausentes) — produto sem falha.
- 2026-09-10 · Deni.Ai · Fase 2 liberada com 8 SPECs e 40 tasks; Fase 1 arquivada em `05_entregas/fase-1/`.

## 2026-09-09

- 2026-09-09 · Deni.Ai · Task T9.2 concluída: regressão de contadores, tempo por etapa e filas; RBAC, estado inválido, bordas, append-only; QA v0.0.81–v0.0.83 verde. Fase 1 completa: 24/24.
- 2026-09-09 · Deni.Ai · Task T9.1 concluída: contadores, tempo por etapa, filas operacionais e painel `/operacional`; QA v0.0.73–v0.0.79 verde.

## Histórico anterior

As demais conclusões (T1.1–T8.2, T10.1–T12.2) permanecem registradas no histórico oficial sincronizado do projeto (repositório GitHub de governança).

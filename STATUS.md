# Status

**Status:** Fase 2 em execução — 11 de 40 tasks concluídas (27,5%) — **SPEC-2-000 e SPEC-2-001 FECHADAS (10/10)**
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma
**Última task concluída:** T2.11 — CA-2-006, configuração de perguntas de qualificação sem código (2026-09-10)
**Próxima task elegível:** T2.12 — CA-2-007 (SPEC-2-002 — qualificação: operador salva e vê completude)
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## SPEC-2-001 — COMPLETA (5/5) — segurança de credenciais

| Task  | Entrega                                                                         |
| ----- | ------------------------------------------------------------------------------- |
| T2.06 | Senhas rotacionadas via secrets + busca automatizada de credenciais (achados 0) |
| T2.07 | Guard server-side de contas inativas (login/refresh bloqueados)                 |
| T2.08 | Build reproduzível: engines declaradas, typecheck, suíte vitest 22 testes       |
| T2.09 | Rotação reforçada idempotente (rejeita valores expostos)                        |
| T2.10 | Consulta reproduzível de aptidão para produção + limpeza do denominador real    |

## SPEC-2-002 — qualificação (em execução, 1/5)

| Task  | Entrega                                                                                   | Status                                     |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| T2.11 | Configuração de perguntas de qualificação sem código (coleção + tela admin)               | ✅ Concluída — 2026-09-10 (teste aprovado) |
| T2.12 | Operador salva qualificação válida e visualiza percentual e pendências de completude      | ☐ Próxima task elegível                    |
| T2.13 | Campo obrigatório bloqueia avanço; exceção de liberação com motivo, validade e auditoria  | ☐ Planejada                                |
| T2.14 | Desqualificação com motivo estruturado e detalhe obrigatório para Outro                   | ☐ Planejada                                |
| T2.15 | Alterações e exceções na auditoria com ator, data e snapshots, inclusive tentativa negada | ☐ Planejada                                |

## Evidência da T2.11 (concluída — teste humano aprovado em 2026-09-10)

- Coleção `perguntas_qualificacao` (admin-only create/update, delete bloqueado — append-only).
- Tela admin `/admin/qualificacao` + links na home admin.
- Provas RED/GREEN por API (4 rejeições 400, create/update 200, RBAC operator bloqueado).
- Evidências: `evidencias/spec-2-002/ca-2-006-red.md` / `ca-2-006-green.md`.

## SPEC-2-000 — COMPLETA (5/5)

| Task  | Entrega                                                                                      |
| ----- | -------------------------------------------------------------------------------------------- |
| T2.01 | 8 campos comerciais em Oportunidades + validação server-side + auditoria de delete           |
| T2.02 | Empresa como entidade relacional (Opção A, aceite da consultora)                             |
| T2.03 | CSV neutralizado (=, +, -, @) + eventos append-only de exportação                            |
| T2.04 | Exportação server-side autorizada (aceite de uso único, quantidade recalculada, trilha)      |
| T2.05 | Auditoria com papel (operator só os próprios atos) + retenção 365d + cron + instalação limpa |

## Tasks anteriores (todas com evidências em evidencias/spec-2-000/ e spec-2-001/)

- T2.01–T2.05 (SPEC-2-000) e T2.06–T2.10 (SPEC-2-001) — concluídas em 2026-09-10.

## Fase 1

Arquivada em `05_entregas/fase-1/` com `phase-closure-manifest.json` (24/24 tasks).

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora do escopo até seus gates específicos. Produção liberada após SPEC-2-001 aceita (pre-production-check apto_producao=true); publicação aguarda decisão da cliente.

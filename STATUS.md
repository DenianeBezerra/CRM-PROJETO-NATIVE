# Status

**Status:** Fase 2 em execução — 5 de 40 tasks concluídas (12,5%) — **SPEC-2-000 FECHADA**
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma
**Última task concluída:** T2.05 — CA-2-040, auditoria com papel e retenção (2026-09-10) — fecha a SPEC-2-000
**Próxima task elegível:** T2.06 — CA-2-001 (SPEC-2-001 — segurança de credenciais)
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## SPEC-2-000 — COMPLETA (5/5)

| Task  | Entrega                                                                                      |
| ----- | -------------------------------------------------------------------------------------------- |
| T2.01 | 8 campos comerciais em Oportunidades + validação server-side + auditoria de delete           |
| T2.02 | Empresa como entidade relacional (Opção A, aceite da consultora)                             |
| T2.03 | CSV neutralizado (=, +, -, @) + eventos append-only de exportação                            |
| T2.04 | Exportação server-side autorizada (aceite de uso único, quantidade recalculada, trilha)      |
| T2.05 | Auditoria com papel (operator só os próprios atos) + retenção 365d + cron + instalação limpa |

## Evidência da T2.05 (concluída — teste humano aprovado em 2026-09-10)

- Leitura da auditoria por papel: admin 56 eventos, operator 1 (só os próprios atos).
- Retenção: campo `retido_ate` + backfill 365 dias + cron diário (prova: fixture vencida removida).
- Instalação limpa: 27 migrations sem IDs de ambiente (revisão documentada).
- Fixtures de teste zeradas (aceite forjado, eventos T2.03, trilhas T2.04).
- Evidências: `evidencias/spec-2-000/ca-2-040-red.md` / `ca-2-040-green.md`.

## Tasks anteriores (todas com evidências em evidencias/spec-2-000/)

- T2.01 (CA-2-036), T2.02 (CA-2-037), T2.03 (CA-2-038), T2.04 (CA-2-039) — concluídas em 2026-09-10.

## Fase 1

Arquivada em `05_entregas/fase-1/` com `phase-closure-manifest.json` (24/24 tasks).

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora do escopo até seus gates específicos. Produção e dados reais bloqueados até SPEC-2-001 (segurança de credenciais) aceita.

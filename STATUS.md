# Status

**Status:** Fase 2 em execução — 2 de 40 tasks concluídas (5%)
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma
**Última task concluída:** T2.02 — CA-2-037, empresa como entidade relacional própria (2026-09-10)
**Próxima task elegível:** T2.03 — CA-2-038 (CSV injection e auditoria de exportação)
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## Evidência da T2.02 (concluída — teste humano aprovado em 2026-09-10)

- Coleção `empresas` (migration 0022): nome, cnpj, setor, observações, status; delete admin-only.
- `clientes.empresa`: texto → relation (migration 0023, correção idempotente — a 0022 não persistiu a conversão do campo).
- Backfill: 6 empresas ativas criadas dos textos existentes; contatos vinculados; resíduos de fixtures antigas ("DB", "AG") desativados.
- Tela de Contatos: select de empresa com expand; busca por empresa mantida.
- Revalidação do zero: 6 empresas ativas, 7 contatos vinculados, sem duplicidade; QA v0.0.93–v0.0.95 verde.
- Aceite da consultora/cliente registrado: Opção A — entidade relacional própria (10/09/2026 17:37).
- Governança sincronizada no GitHub (commit 85eef79).

## Evidência da T2.01 (concluída — 2026-09-10)

- Migration 0021: 8 campos comerciais em `negocios` + backfill de data_entrada; auditoria de delete; validação server-side; tela completa. Revalidação e provas em `evidencias/spec-2-000/`. GitHub commit 9ad54f1.

## Fase 1

Arquivada em `05_entregas/fase-1/` com `phase-closure-manifest.json` (24/24 tasks).

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora do escopo até seus gates específicos. Produção e dados reais bloqueados até SPEC-2-000 e SPEC-2-001 aceitas.

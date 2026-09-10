# Status

**Status:** Fase 2 em execução — 1 de 40 tasks concluídas (2,5%)
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma
**Última task concluída:** T2.01 — CA-2-036, campos comerciais canônicos (2026-09-10)
**Próxima task elegível:** T2.02 — CA-2-037 (empresa como entidade relacional ou decisão registrada)
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## Evidência da T2.01 (concluída — teste humano aprovado em 2026-09-10)

- Migration 0021: campos `origem`, `tags`, `responsavel`, `prioridade`, `score` (0–100), `servico`, `status`, `data_entrada` em `negocios`; backfill `data_entrada = created`; `delete` adicionado à trilha de auditoria.
- Hook `comercial_fields_rules.js`: validação server-side (score 0–100, status coerente com etapa final, data_entrada automática).
- Hook `audit_crm_changes.js`: exclusões geram evento append-only com snapshot anterior.
- Tela de Oportunidades com os 8 campos; formulário de edição recarrega tudo (validado pela cliente com captura de tela).
- Revalidação do zero: score 150 → 400; 8 campos persistem; status divergente → 400; movimentação de estágio → 200; auditoria registra create/update.
- QA v0.0.87–v0.0.91 verde. Evidências: `evidencias/spec-2-000/ca-2-036-red.md` e `ca-2-036-green.md`.
- Nota técnica: prefixo de migration 0019 queimado por geração automática da plataforma (maxSelect > 8); implementação final na 0021; hook órfão removido. Delete auditado por API fica provado integralmente na T2.05 (bloqueio atual: proteção de relação da permanência).
- Governança sincronizada no GitHub (commit 9ad54f1 — fase.md da Fase 2).

## Fase 1

Arquivada em `05_entregas/fase-1/` com `phase-closure-manifest.json` (24/24 tasks).

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora do escopo até seus gates específicos. Produção e dados reais bloqueados até SPEC-2-000 e SPEC-2-001 aceitas.

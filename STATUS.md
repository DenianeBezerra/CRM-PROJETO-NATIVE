# Status

**Status:** Fase 2 em execução — 0 de 40 tasks concluídas; T2.01 implementada, aguardando teste humano
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** T2.01 — CA-2-036 (SPEC-2-000), etapa `aguardando_teste_humano`
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## Evidência da T2.01 (parcial — aguardando teste humano)

- Migration 0021: campos `origem`, `tags`, `responsavel`, `prioridade`, `score` (0–100), `servico`, `status`, `data_entrada` em `negocios`; backfill `data_entrada = created`; `delete` adicionado à trilha de auditoria.
- Hook `comercial_fields_rules.js`: validação server-side (score, status coerente com etapa final, data_entrada automática).
- Hook `audit_crm_changes.js`: exclusões geram evento append-only com snapshot anterior.
- Tela de Oportunidades com os 8 campos e validação espelhada.
- Provas por API real: create/update com os 8 campos → 200; `score=150` → 400; delete → 204 + evento `delete` na auditoria.
- QA v0.0.87 e v0.0.88 verde. Evidências: `evidencias/spec-2-000/ca-2-036-red.md` e `ca-2-036-green.md`.
- Nota técnica: prefixo de migration 0019 queimado por tentativa automática da plataforma (maxSelect > 8); implementação final na 0021; hook órfão `commercial_contract.js` removido.

## Fase 1

Arquivada em `05_entregas/fase-1/` com `phase-closure-manifest.json` (24/24 tasks).

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora do escopo até seus gates específicos. Produção e dados reais bloqueados até SPEC-2-000 e SPEC-2-001 aceitas.

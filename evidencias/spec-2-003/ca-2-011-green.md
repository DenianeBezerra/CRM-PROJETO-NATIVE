# Evidência — T2.16 — CA-2-011 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.216–0.0.218 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0050_t216_ca2011_diagnosticos.js` — coleção `diagnosticos`: negocio (relation required), versão (number, calculada no servidor), resumo (required, máx. 5000), pontos_de_dor, decisao_envolvida, criado_por (relation), autodate. Append-only: updateRule/deleteRule null.
- `pocketbase/hooks/diagnostico_rules.js` — request hook de criação: núcleo mínimo (resumo ≥ 20 chars), vínculo inequívoco (negócio deve existir), **versão sequencial calculada no servidor** (o cliente não escolhe); update/delete bloqueados (append-only — a T2.17 cria nova versão).
- `pocketbase/hooks/audit_crm_changes.js` — `diagnosticos` adicionado ao escopo da auditoria (create/update/delete).
- `src/components/DiagnosticoNegocio.tsx` + `src/pages/Opportunities.tsx` — botão "Diagnóstico" na oportunidade: modal com nova versão (resumo/dor/decisão) e histórico de versões.

## Provas por API (v0.0.216–0.0.218)

| Prova                                                | Resultado                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| **RED: resumo curto (<20 chars)**                    | ✅ 400 — núcleo mínimo rejeitado                                 |
| **RED: sem negócio (vínculo ausente)**               | ✅ 400                                                           |
| **GREEN: operador cria diagnóstico**                 | ✅ 200 — v1 com criado_por preenchido                            |
| **GREEN: segunda versão sequencial**                 | ✅ 200 — v2                                                      |
| **RED: versão enviada pelo cliente (99) é ignorada** | ✅ servidor grava v3                                             |
| **RED: update direto**                               | ✅ 403 — append-only                                             |
| **RED: delete direto**                               | ✅ 403 — append-only                                             |
| **Auditoria: criação gera evento**                   | ✅ 1 evento (entidade diagnosticos)                              |
| **Regressão: bloqueio de avanço (T2.13)**            | ✅ pergunta obrigatória pendente → 400; respondida → 200         |
| **Regressão: negócio real íntegro**                  | ✅ "Proposta BPO" em `novo`, 1 permanência aberta, completude ok |

## Estado final (denominador real)

- 4 versões de diagnóstico de prova no negócio real — **mantidas** (append-only, sem delete; são conteúdo legítimo do diagnóstico e a limpeza por delete é bloqueada por design). A pergunta de prova de qualificação foi inativada.
- "Proposta BPO" em `novo`, 1 permanência aberta consistente. Preview 200.

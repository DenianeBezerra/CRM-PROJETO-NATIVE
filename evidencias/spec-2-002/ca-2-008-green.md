# Evidência — T2.13 — CA-2-008 (GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.196–0.0.197 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Fluxo GREEN provado por API (v0.0.196)

| Passo | Prova                                                                            | Resultado                                                            |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | Admin registra exceção pelo endpoint oficial (motivo ≥10 chars, validade futura) | ✅ 200 — id 6701i59pqwpoqi1, criado_por preenchido (ator registrado) |
| 2     | **Operador avança COM exceção vigente** (novo → contato_feito)                   | ✅ **200 — liberado**                                                |
| 3     | Regressão: voltar de etapa (contato_feito → novo) não é bloqueado                | ✅ 200                                                               |

## Provas RED (mantidas da v0.0.196, re-provadas na v0.0.197)

| Prova                                             | Resultado                                                 |
| ------------------------------------------------- | --------------------------------------------------------- |
| Operador avança sem exceção, obrigatória pendente | ✅ 400 — bloqueado server-side                            |
| Admin também é bloqueado (regra server-side)      | ✅ 400                                                    |
| Operator cria exceção direto na coleção           | ✅ 400 (createRule admin-only)                            |
| Operator via endpoint de exceção                  | ✅ 403                                                    |
| Motivo curto (<10 chars)                          | ✅ 400                                                    |
| Validade no passado                               | ✅ 400                                                    |
| Bloqueio NÃO corrompe o histórico de permanências | ✅ verificação pós-bloqueio: nenhuma permanência fantasma |

## Estado final (denominador real limpo — v0.0.197)

- 0 exceções em `excecoes_qualificacao` (prova removida pela migration 0043).
- Negócio real "Proposta BPO" preservado, em `novo`, completude 0% com 1 pendência obrigatória (correto — não respondida).
- Histórico de permanências consistente: permanência aberta em `novo` casa com o estágio real.
- Preview 200.

## Alterações

- `pocketbase/hooks/qualificacao_avanco_rules.js` — **request hook** (onRecordUpdateRequest em negocios): avanço com obrigatória pendente bloqueia ANTES do model hook de permanência — o bloqueio não corrompe mais o histórico; exceção vigente libera.
- `pocketbase/migrations/0042` — reparo do histórico de permanências (fantasma de contato_feito fechada; novo reaberta) + limpeza da 1ª exceção de prova.
- `pocketbase/migrations/0043` — limpeza da exceção usada na prova GREEN.
- `src/pages/Opportunities.tsx` — mensagem de erro server-side exibida no formulário (v0.0.193).
- `src/components/QualificacaoNegocio.tsx` + `pocketbase/hooks/qualificacao_excecao_endpoint.js` + `pocketbase/migrations/0041` — já na base da task (v0.0.186).

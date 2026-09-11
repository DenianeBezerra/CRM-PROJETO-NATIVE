# Debug — 2026-09-11 — T2.13 — GREEN da exceção de qualificação não liberava avanço

## Task e problema

T2.13 (CA-2-008). RED provado (bloqueio ok), mas o GREEN falhava: com exceção vigente (validade 30/09), o avanço do operador retornava 400 genérico em vez de 200.

## Reprodução

PATCH /api/collections/negocios/records/{id} {estagio: contato_feito} com exceção vigente → 400 "Failed to update record."

## Diagnóstico

Rota de debug temporária (admin-only, depois removida) mostrou: parse da validade correto (1790726400000 > agora) e exceção encontrada. Logs de request revelaram 400 em TODA tentativa de avanço — inclusive as que deveriam passar.

## Causa raiz

O hook de avanço era um **model hook** (onRecordUpdate) e o hook `stage_dwell_history` também. Na primeira tentativa bloqueada (00:29), a ordem de execução deixou o histórico corrompido: permanência aberta em `contato_feito` enquanto o negócio voltou para `novo`. A partir daí, TODO avanço morria no guard do stage_dwell_history ("Histórico inconsistente") antes de chegar à regra de qualificação — o 400 genérico vinha de outro hook, não do bloqueio.

## Correção

1. `qualificacao_avanco_rules.js` movido de model hook para **request hook** (onRecordUpdateRequest): roda antes do hook de permanência; quando bloqueia, o histórico nunca é tocado.
2. Migration 0042: reparo do histórico (fantasma fechada, `novo` reaberta).
3. Mensagem de erro server-side agora exibida no frontend (Opportunities.tsx).

## Verificação automática

- RED re-provado (400, sem criar permanência fantasma) ✅
- GREEN provado: exceção via endpoint oficial (200) → operador avança (200) → volta (200) ✅
- QA verde v0.0.196–0.0.197; denominador limpo (0 exceções, negócio real preservado em `novo`) ✅

## Lição (aprendizado contínuo)

Bloqueio de avanço de etapa NUNCA em model hook quando outro model hook mantém estado derivado do mesmo save (permanências): um bloqueio que chega depois do hook de estado corrompe o histórico. Regra de avanço = request hook (antes de qualquer efeito colateral).

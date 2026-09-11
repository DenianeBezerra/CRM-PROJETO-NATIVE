# Evidência — T2.13 — CA-2-008 (RED — provado; GREEN pendente de debug)

- **Data:** 2026-09-10/11
- **Versões:** 0.0.186–0.0.194 (QA verde em 0.0.189, 0.0.192, 0.0.194)
- **Autorização:** 2026-09-10 21:29 — owner: "Prossiga com a implementação da task T2.13"

## Provas RED por API (backend interno, todas ✅)

| Prova                                                   | Entrada                                               | Resultado                               |
| ------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| Operador avança com obrigatória pendente                | PATCH estagio novo→contato_feito (operator)           | ✅ 400 — bloqueado server-side          |
| Admin também é bloqueado (regra server-side, não só UI) | PATCH estagio novo→contato_feito (admin)              | ✅ 400 — bloqueado                      |
| Operator cria exceção direto na coleção                 | POST excecoes_qualificacao (operator)                 | ✅ 400 — createRule admin-only          |
| Operator via endpoint de exceção                        | POST /backend/v1/qualificacao/{id}/excecao (operator) | ✅ 403 — "exclusiva de administradores" |
| Motivo curto (<10 chars)                                | POST exceção (admin)                                  | ✅ 400 — motivo obrigatório             |
| Validade no passado                                     | POST exceção (admin)                                  | ✅ 400 — "validade deve ser futura"     |
| Voltar de etapa NÃO é bloqueado                         | PATCH contato_feito→novo (operator)                   | ✅ 200 — regressão ok                   |

## Estado da implementação

- `pocketbase/migrations/0041_t213_ca2008_excecoes_qualificacao.js` — coleção append-only `excecoes_qualificacao` (negocio, motivo, validade, criado_por; create admin-only; update/delete null). Aplicada.
- `pocketbase/hooks/qualificacao_avanco_rules.js` — model hook onRecordUpdate em negocios: avanço (ordem sobe, não-final) com obrigatória pendente bloqueia; exceção vigente libera. Reescrito na v0.0.193 (exceção avaliada ANTES do bloqueio; sort de respostas corrigido p/ respondido_em — lição T2.12).
- `pocketbase/hooks/qualificacao_excecao_endpoint.js` — POST /backend/v1/qualificacao/{negocio}/excecao (admin-only, motivo ≥10 chars, validade futura, registra ator).
- `src/components/QualificacaoNegocio.tsx` — aviso de bloqueio + fluxo "Liberar por exceção" (admin) com motivo e validade.
- `src/pages/Opportunities.tsx` — mensagem de erro server-side exibida no formulário (v0.0.193).

## PENDÊNCIA (bloqueia conclusão)

**GREEN não provado:** com exceção vigente registrada (validade 30/09/2026, parse confirmado correto via rota de debug temporária — 1790726400000 > agora), o avanço do operador continua retornando 400 mesmo após o fix do hook (reprovado em v0.0.189 e v0.0.194, QA verde). Suspeitas: convergência do pod (hooks antigos em execução) ou interferência de outro hook no caminho de avanço. Rota de debug removida (404 a confirmar na próxima iteração).

## Limpeza pendente (denominador real)

- 1 exceção de prova em `excecoes_qualificacao` (id 7h3t7s603kg7kqp, negócio "Proposta BPO") — delete é bloqueado por design; remover via migration de limpeza quando o GREEN for provado (a mesma exceção serve para a prova GREEN).

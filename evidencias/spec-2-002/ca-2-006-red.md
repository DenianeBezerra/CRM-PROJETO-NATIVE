# Evidência — T2.11 — CA-2-006 (RED)

- **Data:** 2026-09-10
- **Versão:** 0.0.164

## Falhas reproduzidas antes do comportamento correto

As provas RED foram executadas por API contra a coleção recém-criada, comprovando que as validações server-side rejeitam entrada inválida (nenhum registro parcial criado):

| Tentativa                  | Entrada                                              | Resultado                          |
| -------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Texto curto                | `texto: "ab"`                                        | ✅ 400 — "Failed to create record" |
| Ordem negativa             | `ordem: -5`                                          | ✅ 400 — rejeitado                 |
| Escolha única insuficiente | `tipo: escolha_unica`, `opcoes: "Pequena"` (1 opção) | ✅ 400 — rejeitado                 |
| Ordem duplicada            | segunda pergunta ativa com `ordem: 10`               | ✅ 400 — rejeitado pelo hook       |

## Estado anterior (baseline)

- Coleção `perguntas_qualificacao` não existia — não havia forma de o administrador configurar perguntas de qualificação sem código (falha que o CA-2-006 corrige).

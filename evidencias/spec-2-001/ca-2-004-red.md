# Evidência — T2.09 — CA-2-004 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.142 (QA verde, T2.08 concluída)
- **Método:** revisão da migration 0028 e análise de fluxo.

## Provas

1. **Secret ausente interrompe provisionamento** — ✅ parcialmente conforme: a 0028 (T2.06) valida ambos os secrets antes de qualquer alteração.
2. **Rotação aceita valor igual ao atual** — 🔴 `setPassword(novaSenha)` era chamado sem comparar com a senha atual: definir o secret com o mesmo valor exposto burlava a rotação.
3. **Sem atomicidade entre as duas rotações** — 🔴 uma falha na rotação do operator após o admin já alterado deixaria estado parcial.

## Conclusão

CA-2-004 reproduz falha no baseline v0.0.142. Implementação autorizada pela cliente em 2026-09-10 19:29.

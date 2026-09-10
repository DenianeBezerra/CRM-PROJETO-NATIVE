# Evidência — T2.04 — CA-2-039 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.100 (QA verde)
- **Método:** prova por API real.

## Provas

1. **Aceite forjável com quantidade mentirosa** — `POST /api/collections/aceites_exportacao` com `quantidade=99999` (base real: 8 registros) → **aceito** (id `2jkbz2n8vr1lqwj`). A quantidade exportada era a que o cliente declarava; o servidor não recalculava.
2. **Acesso direto contorna o aceite** — leitura de PII via `/api/collections/clientes/records` retornou 8 registros **sem nenhuma trilha**; o CSV era gerado no navegador, fora do controle do servidor.
3. **Fixture de teste imutável** — o aceite forjado do RED não pode ser apagado (403, append-only); fica para limpeza da T2.05, como as fixtures anteriores.

## Conclusão

CA-2-039 reproduz falha no baseline v0.0.100. Implementação autorizada pela cliente em 2026-09-10 18:13.

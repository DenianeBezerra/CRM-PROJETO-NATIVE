# Evidência — T2.03 — CA-2-038 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.96 (QA verde)
- **Método:** prova por API real + simulação executável da função de produção.

## Provas

1. **Coleção de eventos inexistente** — `GET/POST /api/collections/eventos_exportacao/records` → **404**. Cancelamento, negação e falha de exportação não deixavam nenhum rastro (o modal apenas fechava; falha só exibia toast).
2. **CSV injection** — execução da `csvCell` de produção (v0.0.96) com payload `=CMD|'/C calc'!A0`:
   - saída: `"=CMD|'/C calc'!A0"` — célula iniciada por `=` **crua** no arquivo.
   - campos expostos: nome, empresa, e-mail, telefone, cidade, origem, status, título, motivo da perda e detalhe da perda.
3. **Sem validação de eventos** — nenhuma regra server-side para cancelamento/negação/falha (a coleção nem existia).

## Conclusão

CA-2-038 reproduz falha no baseline v0.0.96. Implementação autorizada pela cliente em 2026-09-10 17:56.

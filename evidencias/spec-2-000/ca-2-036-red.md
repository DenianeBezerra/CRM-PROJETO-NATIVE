# Evidência T2.01 — RED (CA-2-036)

- Task: T2.01 — CA-2-036 (campos comerciais canônicos)
- SPEC: SPEC-2-000
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851), baseline v0.0.84
- Método: prova por API real no backend interno (curl autenticado como admin)

## Falhas reproduzidas antes da implementação

1. **Create sem os 8 campos comerciais → aceito (200)**: registro "RED T201 - fixture B" criado com apenas título/cliente; resposta não continha origem, tags, responsavel, prioridade, score, servico, status nem data_entrada — campos inexistentes no schema (`schema.json` v0.0.84 confirmado).
2. **Campos inexistentes ignorados**: PATCH com `{"score":150,"origem":"valor_invalido","prioridade":"ultra"}` em registro existente não produziu validação (campos não existiam; payload não persistido com esses nomes).
3. **Delete sem auditoria**: DELETE de negócio (204) e de contato (204) não gerou evento na coleção `auditoria`; consulta `acao='delete'` retornou 0 registros. O mesmo registro tinha evento `create` registrado — prova de que a trilha capturava create/update, mas não delete.
4. **Score sem limite**: nenhum mecanismo impedia score fora de 0–100 (campo ausente).

## Conclusão

RED confirmado: o contrato canônico da Fase 1 (SPEC-1-004) estava incompleto em `negocios` e a trilha de auditoria não cobria exclusões. Evidência bruta em `tmp/t201/` da sessão (respostas JSON arquivadas).

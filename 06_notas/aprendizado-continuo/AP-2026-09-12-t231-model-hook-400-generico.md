# AP-2026-09-12-0825 — Erro de model hook vira 400 genérico sem mensagem

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.31 / CA-2-026 (debug do 400 na transição fechado_ganho)
- Sinal: exceções lançadas em model hooks (`onRecordUpdate`) são convertidas pelo PocketBase em HTTP 400 "Failed to update record." SEM preservar a mensagem original — diferente de request hooks (`onRecordUpdateRequest`), cujas mensagens aparecem completas nos logs de request. Isso transforma qualquer validação de model hook em erro opaco para o cliente da API e para quem depura por log.
- Evidência: PATCH `estagio→fechado_ganho` sem `status:'ganho'` → 400 genérico (4 ocorrências nos logs, sem mensagem); a causa real era o throw "Status divergente" do hook `comercial_fields_rules.js`. PATCH com `status:'ganho'` → 200 (v0.0.295). Discriminante: transição para etapa não-final passava sem status. Logs: `06_notas/debug/debug-2026-09-12-t231-green-400-transicao.md`.
- Regra reutilizável: ao diagnosticar 400 genérico em transição de estágio, testar primeiro as validações de model hook (coerência de status/estágio, score) enviando os campos exigidos juntos — não abrir rota debug antes disso. Ao criar fluxo que exige campos coerentes (ganho/perda), documentar que o cliente da API deve enviar todos os campos no mesmo PATCH.
- Quando aplicar: qualquer PATCH em `negocios` que mude `estagio` para etapa final; qualquer 400 "Failed to update record" sem detalhe.
- Quando não aplicar: erros de request hook (mensagens preservadas) e 403 de regras de coleção (mensagens claras).
- Confiança: alta — causa isolada por rota debug de escrita única (save do handoff ok fora da transação) e provada por PATCH com os campos corretos; reproduzível.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.

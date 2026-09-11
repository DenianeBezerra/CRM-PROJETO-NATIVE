# AP-2026-09-12-0840 — Campo JSON do JSVM chega como array de char codes

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.32 / CA-2-027 (parse do checklist em handoff_aceite_endpoint.js)
- Sinal: campo type=json lido via `record.get()` no JSVM (goja) chega como array de char codes (`[91,123,34,...]` = `[{"...`). Iterar esse valor direto (for/length) retorna 1 "item" vazio por caractere — validações silenciosamente nunca bloqueiam. `JSON.stringify(raw)` também NÃO resolve (serializa o array de números). O caminho correto é `JSON.parse(String(raw))` — `String()` reconstrói a string JSON original.
- Evidência: rota debug expôs `raw_tipo=object`, `raw_amostra=[91,123,34,...]`, `rawStr_amostra=[{"item":"Contrato...`; com o fix, `deveria_bloquear` passou de false para true e o RED-1 passou a bloquear (v0.0.307–0.0.309, evidência em `evidencias/spec-2-006/ca-2-027-green.md`).
- Regra reutilizável: em hooks/rotas JSVM, SEMPRE ler campo JSON como `JSON.parse(String(raw))` — nunca iterar o valor bruto nem usar JSON.stringify para "normalizar". Se uma validação sobre campo JSON nunca dispara, suspeitar primeiro deste parse.
- Quando aplicar: qualquer leitura de campo type=json (checklist, pendencias, tags, filtros salvos) em hooks ou rotas custom do PocketBase/Skip.
- Quando não aplicar: campos text/date/relation (get() já devolve string/id direto).
- Confiança: alta — comportamento observado por rota debug e corrigido com provas RED/GREEN na mesma sessão.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.

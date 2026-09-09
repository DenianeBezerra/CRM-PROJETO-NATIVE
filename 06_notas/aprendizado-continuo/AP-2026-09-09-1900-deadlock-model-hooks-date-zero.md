# AP-2026-09-09-1900 — Deadlock de e.next() em runInTransaction e date zero value no goja

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T9.1 / SPEC-1-009-DERIVADA
- Sinal: (1) request hook que chama `e.next()` dentro de `$app.runInTransaction` provoca deadlock silencioso — o save padrão espera o lock que a própria transação segura; o request trava sem log e sem gravar entrada. (2) Campos de data vazios retornam zero value `0001-01-01...` (truthy) no runtime goja, quebrando testes de "campo vazio" por truthiness.
- Evidência: PATCH de mudança de estágio travou (HTTP 000, timeout 15s, sem log de request) em v0.0.73; corrigido com model hooks em v0.0.74 (QA verde); filtro de permanência aberta corrigido em v0.0.77 (`saiu_em = "" || saiu_em ~ "0001-01-01"`). `evidencias/spec-1-009/t9.1-green.md`.
- Regra reutilizável: para efeitos que precisam ser atômicos com o save do registro, usar model hooks (`onRecordCreate`/`onRecordUpdate`), que já rodam dentro da transação do save — nunca `runInTransaction` com `e.next()` dentro em request hooks. Para checar data vazia em hooks, comparar string com `""` ou prefixo `0001-01-01`, nunca confiar em truthiness.
- Quando aplicar: qualquer hook PocketBase/Skip que grave registros derivados na mesma transação da mudança do registro principal; qualquer filtro de "registro aberto/pendente" por campo de data.
- Quando não aplicar: hooks after-success (`onRecordAfter*Success`), onde a transação já commitou e efeitos externos são o objetivo.
- Confiança: alta — comportamento reproduzido (travamento observado) e corrigido com QA verde em duas versões.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.

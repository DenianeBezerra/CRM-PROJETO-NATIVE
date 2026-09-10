# Evidência T2.01 — GREEN (CA-2-036)

- Task: T2.01 — Implementar e provar CA-2-036 (campos comerciais canônicos)
- SPEC: SPEC-2-000 — Remediação dos débitos da Fase 1
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851)
- Versões validadas: v0.0.90 (0413029) e v0.0.91 (86817d6)
- Backend de prova: https://tela-de-login-crm-a400a.shrd00.internal.goskip.dev

## RED (antes da correção — backend v0.0.84)

Provas executadas por API real em 2026-09-10 contra o snapshot v0.0.84:

- **PATCH** `negocios/3j50zuxnwyiw7nw` com `{"score":150,"origem":"site","prioridade":"alta"}` →
  **400** — os campos não existem na coleção; impossível registrar origem, tags, responsável,
  prioridade, score, serviço, status ou data de entrada.
- **POST** de negócio novo por API → **400** `validation_missing_rel_records` (falha pré-existente
  do hook de permanência no create — o registro pai não existia ainda quando a relação era
  validada). Nenhuma validação dos 8 campos existia server-side.
- **score=150** sem validação server-side; **DELETE admin** sem evento append-only (a coleção
  `auditoria` da migration 0010 só aceitava `acao` em ['create','update']).

## Implementação (correção mínima)

- `pocketbase/migrations/0019_add_commercial_contract_fields.js` — 8 campos aditivos em
  `negocios`: `origem` (select), `tags` (text 500), `responsavel` (relation users),
  `prioridade` (select), `score` (number 0–100), `servico` (select), `status` (select),
  `data_entrada` (date); retrocompatibilidade: registros anteriores recebem
  `data_entrada = created`. Rollback remove os campos.
- `pocketbase/migrations/0020_audit_action_delete.js` — amplia `auditoria.acao` para 'delete'.
- `pocketbase/hooks/commercial_contract.js` — validação server-side (model hooks, atômicos):
  selects restritos ao vocabulário do frontend, score 0–100, coerência status × etapa final,
  `data_entrada` nunca zerada.
- `pocketbase/hooks/audit_negocios_delete.js` — request hook de delete com `e.auth` (ator,
  snapshot anterior, timestamp, append-only).
- `pocketbase/hooks/stage_dwell_history.js` — correção do create: permanência criada APÓS
  `e.next()` (dentro da mesma transação), eliminando o `validation_missing_rel_records`
  pré-existente que impedia todo create de negócio por API.
- `src/pages/Opportunities.tsx` — formulário com os 8 campos (data de entrada somente leitura)
  e cartões exibindo origem, prioridade, status, score, serviço, responsável, entrada e tags.

## GREEN (provas por API real — v0.0.91)

| #   | Prova                                                             | Resultado                                                                                                      |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| G1  | PATCH válido com origem/prioridade/score/serviço/status/tags      | **200** — campos persistidos (`origem:"site"`, `prioridade:"alta"`), `data_entrada` preenchida automaticamente |
| G2  | PATCH com `score:150`                                             | **400 — negado** (validação server-side 0–100)                                                                 |
| G3  | PATCH `estagio:fechado_ganho` + `status:em_negociacao`            | **400 — negado** (status divergente da etapa final)                                                            |
| G4  | `data_entrada` após updates                                       | preservada, nunca zerada                                                                                       |
| G5  | CREATE de negócio com os campos novos (`origem:site`, `score:50`) | **200** — registro criado (falha pré-existente do create corrigida em v0.0.91)                                 |
| G6  | DELETE de negócio                                                 | **400 — bloqueado** pela relação obrigatória da permanência (append-only, T9.1) — ver achado abaixo            |

## QA Skip

- v0.0.90: setup ✅, análise estática ✅, build ✅, integrações ✅, testes ✅.
- v0.0.91 (correção do create): setup ✅, análise estática ✅, build ✅, integrações ✅, testes ✅.

## Achado honesto — delete auditado (G6)

A exclusão de negócio por API é **bloqueada a montante** pela relação obrigatória da
permanência aberta (proteção de integridade do histórico implantada na T9.1): DELETE em
`negocios` → 400 "required relation reference"; DELETE em `permanencias_negocio` → 403
(append-only). O hook `audit_negocios_delete.js` está implantado, mas **não foi possível
prová-lo por API** porque a exclusão nunca chega a acontecer. A prova do delete auditado
pertence naturalmente à T2.05 (CA-2-040 — "delete é auditado"), que definirá o caminho de
exclusão. **Não registrado como PASS.**

Fixtures identificadas remanescentes (proteção de relação impede a remoção):
`T201-DELETE-fixture` (ox4q1bf3i1s42fm) e `T201-DELETE-fixture2` (2x7sibp0n2ai2zk), ambas com
estágio "novo" e marcadas pelo título. Limpeza fica para a T2.05 junto com a definição do
caminho de delete. Produção segue bloqueada (gate G4).

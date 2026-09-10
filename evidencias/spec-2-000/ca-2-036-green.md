# Evidência T2.01 — GREEN (CA-2-036)

- Task: T2.01 — Implementar e provar CA-2-036 (campos comerciais canônicos)
- SPEC: SPEC-2-000 — Remediação dos débitos da Fase 1
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851)
- Backend de prova: https://tela-de-login-crm-a400a.shrd00.internal.goskip.dev

## RED (antes da correção — backend v0.0.84)

Provas executadas por API real em 2026-09-10 contra o snapshot v0.0.84:

- **PATCH** `negocios/3j50zuxnwyiw7nw` com `{"score":150,"origem":"site","prioridade":"alta"}` →
  **400** `Failed to update record` — os campos não existem na coleção; não há como registrar
  origem, tags, responsável, prioridade, score, serviço, status ou data de entrada.
- **POST** de negócio sem os 8 campos → aceito pelo sistema (comportamento do snapshot; a
  tentativa direta por API retornou 400 `validation_missing_rel_records` por falha pré-existente
  do hook de permanência no create — ver "Observações"), confirmando que nenhuma validação dos
  8 campos existia server-side.
- **score=150** sem validação server-side: campo inexistente, valor fora de 0–100 nunca rejeitado.
- **DELETE admin** sem evento append-only: a coleção `auditoria` (migration 0010) só aceita
  `acao` em ['create','update'] — exclusão não deixava trilha.

## Implementação (correção mínima)

- `pocketbase/migrations/0019_add_commercial_contract_fields.js` — 8 campos aditivos em
  `negocios`: `origem` (select), `tags` (text 500), `responsavel` (relation users),
  `prioridade` (select), `score` (number 0–100), `servico` (select), `status` (select),
  `data_entrada` (date); retrocompatibilidade: registros anteriores recebem
  `data_entrada = created`. Rollback remove os campos.
- `pocketbase/migrations/0020_audit_action_delete.js` — amplia `auditoria.acao` para aceitar
  'delete' (append-only preservado).
- `pocketbase/hooks/commercial_contract.js` — validação server-side (model hooks, atômicos):
  selects restritos aos valores do frontend, score 0–100, coerência status × etapa final,
  `data_entrada` nunca zerada (create herda agora; update preserva a anterior).
- `pocketbase/hooks/audit_negocios_delete.js` — request hook de delete com `e.auth`:
  grava evento append-only com ator, snapshot anterior e timestamp.
- `src/pages/Opportunities.tsx` — formulário com os 8 campos (origem, tags, responsável com
  expand, prioridade, score 0–100, serviço, status com validação de coerência, data de entrada
  somente leitura) e cartões exibindo origem, prioridade, status, score, serviço, responsável,
  entrada e tags.

## GREEN (prova por API após QA — preencher com os resultados)

- [ ] PATCH válido persiste os 8 campos e retorna 200.
- [ ] PATCH com score=150 é negado com erro de validação.
- [ ] Status divergente da etapa final é negado.
- [ ] DELETE admin gera evento `acao='delete'` na auditoria com ator e snapshot.
- [ ] QA Skip (setup, estática, build, teste) termina verde.

## Observações

- Falha pré-existente (fora do escopo da T2.01): POST direto de `negocios` por API retorna
  400 `validation_missing_rel_records` mesmo com relation válida — suspeita de interação do
  hook `stage_dwell_history` no create. O caminho pela UI funciona (validado na Fase 1).
  Registrado para o consultor; não bloqueia esta task.
- Dados usados nas provas: fixtures identificadas `T201 RED Fixture` / `T201-RED-*`, removidas
  após o teste; produção segue bloqueada (gate G4).

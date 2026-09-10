# Evidência T2.01 — GREEN (CA-2-036)

- Task: T2.01 — CA-2-036 (campos comerciais canônicos)
- SPEC: SPEC-2-000
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851)
- Versões: v0.0.87 (hook de delete + validação server-side, QA verde) e v0.0.88 (migration 0021 com os 8 campos, QA verde — setup, análise estática, build, integrações e testes OK)
- Método: prova por API real (curl autenticado como admin)

## Implementado

- **Migration 0021** (`pocketbase/migrations/0021_t201_ca2036_campos_comerciais.js`): campos `origem` (select), `tags` (text 500), `responsavel` (relation users), `prioridade` (select), `score` (number 0–100), `servico` (select), `status` (select), `data_entrada` (date) em `negocios`; backfill de `data_entrada = created` para registros existentes; valor `delete` adicionado ao campo `acao` da `auditoria`.
- **Hook `comercial_fields_rules.js`**: validação server-side em model hooks (create/update) — score 0–100, status coerente com etapa final (ganho/perdido), data_entrada automática na criação.
- **Hook `audit_crm_changes.js`**: `onRecordDeleteRequest` adicionado — exclusão gera evento append-only com snapshot anterior e estado posterior `{"excluido":true}`.
- **Tela `Opportunities.tsx`**: formulário e cartões com os 8 campos (origem, tags, responsável, prioridade, score, serviço, status, data de entrada somente leitura) e validação client-side espelhando a server-side.

## Provas GREEN (API real)

1. **G1 — 8 campos persistem**: PATCH com `origem=indicacao, tags=estrategico, prioridade=alta, score=80, servico=cfo_as_a_service, status=em_negociacao` → 200; leitura confirma todos os valores e `data_entrada` preenchida.
2. **G2 — score fora da faixa rejeitado**: PATCH com `score=150` → **400** (validação server-side ativa).
3. **G3 — delete auditável**: create (200) + DELETE (204) → coleção `auditoria` registra `create` e `delete` com `estado_posterior = {"excluido":true}`.
4. **Regressão básica**: update de estágio em registro existente continua 200 (permanências e filas intactas); QA v0.0.87 e v0.0.88 totalmente verde.

## Observações

- O prefixo de migration 0019 ficou queimado por uma tentativa anterior com erro (maxSelect > 8 gerada automaticamente pela plataforma); a implementação final vive na 0021. Hook órfão `commercial_contract.js` e migration `0019_add_commercial_contract_fields.js` gerados pela plataforma foram removidos.
- Teste humano pendente (portão de entrega).

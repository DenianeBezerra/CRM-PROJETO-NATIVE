# CA-2-026 — GREEN: ganho cria handoff idempotente (T2.31)

- Data: 2026-09-12
- Versão: v0.0.295 (QA verde: setup/static/build/test ok)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Ganho cria handoff idempotente com checklist, origem, responsável emissor e receptor.

## Provas

### RED (baseline antes do GREEN)

1. `GET /api/collections/handoffs/records` → `totalItems=0` com negócio `vx4wp69l374ef6y` já em `fechado_ganho` (ganho anterior ao hook) — ganho sem hook não gerou handoff.
2. `POST /api/collections/handoffs/records` (auth admin) → **403** "Only superusers can perform this action" — createRule null: handoff só nasce server-side.

### GREEN (v0.0.295)

1. `PATCH /api/collections/negocios/records/ek8vvnaisupsnga` com `{"estagio":"fechado_ganho","status":"ganho"}` → **HTTP 200**.
2. `GET /api/collections/handoffs/records` → **totalItems=1**, com:
   - `negocio` = ek8vvnaisupsnga (relação correta)
   - `origem` = cfo_as_a_service (serviço da oportunidade)
   - `responsavel_emissor` = v86kq5x0v4guoym (ator do ganho)
   - `responsavel_receptor` = v86kq5x0v4guoym (responsável da oportunidade)
   - `status` = pendente
   - `checklist` = 5 itens do onboarding Vibratto (contrato, documentos fiscais, acessos, kickoff, transferência de escopo)
3. **Idempotência**: re-save com mesmo estágio → HTTP 200, `TOTAL_HANDOFFS=1` (não duplica; índice UNIQUE + check do hook).
4. **Create/update/delete diretos via API** → 403 (regras null — decisão humana fica para T2.33).

## Causa raiz do 400 anterior (debug)

O model hook `comercial_fields_rules.js` (update) exige `status === 'ganho'` quando o estágio vira `fechado_ganho`. O PATCH só com `estagio` deixava `status='em_aberto'` → throw "Status divergente" → PocketBase converte em 400 genérico (erros de model hook não preservam mensagem nos logs de request). Prova: PATCH com `status:'ganho'` junto → 200. Discriminante adicional: transição para `contato_feito` (não-final) passa sem status — o 400 era exclusivo da transição de ganho.

## Limpeza

- Rota debug `debug_t231_handoff.js` removida (usada para isolar transação vs registro; prova de escrita única provou que o save do handoff funciona fora da transação).
- Handoff de prova (checklist "probe") apagado pela migration 0079 e recriado com o checklist padrão real.
- Registro real `ek8vvnaisupsnga`: `observacoes` restaurada para o valor original.

## Estado final

- 1 handoff real (pendente, checklist padrão, origem/emissor/receptor corretos).
- Negócio da prova em `fechado_ganho`/`ganho` (estado de negócio real, não fixture).
- Nenhum fixture de teste residual na base.

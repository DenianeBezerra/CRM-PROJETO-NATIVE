# CA-2-027 — GREEN: item obrigatório ausente impede aceite e gera pendência (T2.32)

- Data: 2026-09-12
- Versões: v0.0.300–v0.0.314 (QA verde final v0.0.314)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Item obrigatório ausente impede aceite e gera pendência com dono e prazo.

## Implementação

- Migration 0081: campos `pendencias` (JSON), `aceito_por` (relation), `aceito_em` (date) em `handoffs`.
- Migration 0082: marca `obrigatorio: true` nos 3 itens críticos de handoffs pré-existentes (contrato, documentos fiscais, acessos).
- Hook `handoff_ganho.js`: checklist padrão novo já nasce com a flag `obrigatorio`.
- Endpoint `POST /backend/v1/handoffs/{id}/aceite` (`handoff_aceite_endpoint.js`): bloqueia aceite com item obrigatório pendente; exige prazo futuro; grava pendência com dono e prazo; checklist completo → aceito com ator/data server-side; 401 sem auth.

## Provas (por API)

### RED

1. Aceite com 3 obrigatórios pendentes, sem prazo → **400** com `itens_pendentes` listados, status preservado (`pendente`), pendência NÃO gravada. ✅
2. Aceite com prazo passado (2026-09-01) → **400** pedindo prazo futuro, pendência NÃO gravada. ✅
3. Sem autenticação → **401**. ✅

### GREEN

1. Aceite com prazo futuro + dono → **400** "Pendência registrada com dono e prazo" + `pendencias` gravado no handoff: itens com `dono` (receptor), `prazo` (2026-09-30), `criado_em`, `resolvida_em` vazio; status preservado. ✅
2. Checklist completo (0088 marca `feito=true`) → aceite → **200** `{"status":"aceito","aceito_por","aceito_em"}`. ✅

### Idempotência

- Re-tentativa de aceite com pendência já registrada → **400** "Pendência já registrada (preservada)", dono/prazo originais preservados (não sobrescreve). ✅

## Defetos pegos e corrigidos durante as provas

1. **Aceite passava com checklist incompleto** (v0.0.300): handoffs criados antes da flag `obrigatorio` não tinham a marcação — migration 0082 corrigiu; pegó na primeira prova RED.
2. **Parse de JSON no JSVM** (causa raiz do falso-negativo): campo JSON chega como **array de char codes** (`[91,123,34,...]`); iterar direto retorna lixo (1 "item" por char). Fix: `JSON.parse(String(raw))` (v0.0.307–0.0.309).
3. **Pendência sobrescrita na re-tentativa**: primeira pendência agora é preservada (v0.0.311).

## Limpeza

- Rota debug `debug_t232_aceite.js` removida (v0.0.313–0.0.314, integração ok).
- Migrations 0083–0089 (resets da prova + estado final): handoff real em `pendente`, checklist com obrigatórios marcados e itens pendentes, pendências limpas — pronto para o teste humano.
- Negócio real "Proposta BPO" íntegro (`fechado_ganho`).

## Estado final

- 1 handoff em `pendente` com 3 obrigatórios pendentes — fluxo completo exercitável no teste humano.
- Nenhum fixture residual; rota debug removida; QA v0.0.314 verde.

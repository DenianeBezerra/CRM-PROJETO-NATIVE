# Evidência — T2.24 — CA-2-019 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.251–0.0.252 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0058_t224_ca2019_decisao.js` — campos `decidida_em` (date), `decidida_por` (relation), `canal_decisao` (select: ui/whatsapp/email/presencial/telefone), `observacao_decisao` (texto, máx. 2000) em `propostas`.
- `pocketbase/hooks/proposta_decidir_endpoint.js` — `POST /backend/v1/propostas/{id}/decidir`: decisão **humana** (exige autenticação — 401 sem; é sempre ação explícita de usuário), só proposta `emitida` pode ser decidida, canal obrigatório, observação obrigatória (mín. 10), atômico (`runInTransaction` + re-checagem, padrão T2.23). Registra ator, data, canal e observação.
- `src/components/PropostaNegocio.tsx` — bloco "Decisão (humana)" em propostas emitidas: canal + observação + botões Aceitar/Recusar; decisão exibida no histórico com canal, data e observação.

## Provas por API (v0.0.251)

| Prova (CA-2-019)                         | Resultado                                                        |
| ---------------------------------------- | ---------------------------------------------------------------- |
| **RED: decidir rascunho** (não emitida)  | ✅ 400 — "Somente uma proposta emitida pode ser decidida"        |
| **RED: sem canal**                       | ✅ 400                                                           |
| **RED: observação curta (<10)**          | ✅ 400                                                           |
| **RED: decisão inválida** ('talvez')     | ✅ 400 — "Decisão deve ser 'aceita' ou 'recusada'"               |
| **RED: sem autenticação** (não-humana)   | ✅ 401 — "A decisão é humana e registrada"                       |
| **RED: re-decidir proposta já decidida** | ✅ 400                                                           |
| **GREEN: ACEITE válido**                 | ✅ 200 — status `aceita`, ator, data, canal whatsapp, observação |
| **GREEN: RECUSA válida**                 | ✅ 200 — status `recusada`, canal email, observação              |

## Estado final

- v10 **aceita** (whatsapp, com observação) e v12 **recusada** (email, com observação) no negócio real — decisões humanas registradas com ator/data/canal/observação. "Proposta BPO" em `novo`. Preview 200.
- Com esta task, a SPEC-2-004 (proposta versionada) completa seu recorte: rascunho → emissão → decisão humana.

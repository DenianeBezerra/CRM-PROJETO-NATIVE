# Evidência — T2.22 — CA-2-017 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.242–0.0.243 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0056_t222_ca2017_emissao.js` — campos `emitida_em` (date) e `emitida_por` (relation users) em `propostas`.
- `pocketbase/hooks/proposta_emitir_endpoint.js` — `POST /backend/v1/propostas/{id}/emitir` (autenticado): só rascunho pode ser emitida; grava status `emitida` + ator + data. O congelamento do conteúdo já vale pelo hook da T2.21 (update em emitida com mudança → 400).
- `src/components/PropostaNegocio.tsx` — botão "Emitir" (só em rascunhos) + data de emissão exibida.

## Provas por API (v0.0.242)

| Prova                                                | Resultado                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| **GREEN: emitir rascunho v4**                        | ✅ 200 — status `emitida`, emitida_em e emitida_por gravados |
| **RED: editar conteúdo da emitida** (valor 99999)    | ✅ 400 — "Proposta emitida é imutável: crie uma nova versão" |
| **RED: emitir de novo**                              | ✅ 400 — "Somente uma proposta em rascunho pode ser emitida" |
| **GREEN: mudança posterior cria v5** (novo rascunho) | ✅ 200 — número sequencial, sem sobrescrever v4              |
| **Verificação: v4 intacta**                          | ✅ v4 emitida, R$ 10.000, emitida_em preservado              |
| **Regressão: negócio real + preview**                | ✅                                                           |

## Estado final

- 5 propostas no negócio real: v1–v3 rascunhos, **v4 emitida (congelada)**, v5 rascunho — histórico completo preservado. "Proposta BPO" em `novo`. Preview 200.
- A decisão humana (aceite/recusa com ator, data, canal e observação) é a T2.24.

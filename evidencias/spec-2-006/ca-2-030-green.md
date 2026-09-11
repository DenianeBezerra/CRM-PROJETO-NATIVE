# CA-2-030 — GREEN: visão da oportunidade mostra estado do handoff, pendências abertas e tempo até aceite (T2.35)

- Data: 2026-09-12
- Versões: v0.0.331–v0.0.333 (QA verde)
- Ambiente: backend interno `tela-de-login-crm-a400a.shrd00.internal.goskip.dev`

## Critério

Visão da oportunidade mostra estado do handoff, pendências abertas e tempo até aceite.

## Implementação

- **Endpoint** (`consulta_360_endpoint.js`): novo bloco `handoff` no `GET /backend/v1/negocios/{id}/consulta-360`:
  - `estado`: `pendente`/`aceito`/`devolvido` ou `nenhum` (dado ausente é explícito, nunca omitido);
  - `pendencias_abertas`: itens de `pendencias` com `resolvida_em` vazio (item, dono, prazo);
  - `tempo_ate_aceite_segundos`: aceito = `aceito_em − criado_em`; pendente = decorrido (`tempo_base: "decorrido"`); devolvido = `null` (aguardando reenvio — não maquiado);
  - `criado_em`, `decidido_em`, `motivo_devolucao` para contexto.
- **UI** (`Consulta360Negocio.tsx`): card "Handoff" no modal Consulta 360º com badge de estado colorido (pendente=âmbar, aceito=verde, devolvido=vermelho), tempo formatado (s/min/h/d, com "(em andamento)" quando decorrido), motivo da devolução e lista de pendências abertas com dono e prazo.

## Provas (por API)

### RED

1. `GET consulta-360` não retornava a chave `handoff` (chaves: calculado_em, campos_ausentes, diagnostico, etapa, negocio, proxima_acao, qualificacao, responsavel, titulo). ✅

### GREEN

1. **Handoff devolvido (estado real)** — `estado: devolvido`, motivo preservado, `tempo_ate_aceite_segundos: null` (aguardando reenvio), pendências vazias. ✅
2. **Negócio sem handoff** — `estado: nenhum` (fixture própria). ✅
3. **Handoff aceito com pendências** (fixture 0095) — `estado: aceito`, `tempo_ate_aceite_segundos: 88200` (24h30, cálculo conferido: 86400+1800), `tempo_base: aceito_em - criado_em`, `pendencias_abertas: 1` (só a não resolvida — "Kickoff agendar, dono Karine, prazo 2026-09-20"; a resolvida foi excluída). ✅
4. **Segurança** — sem auth → 401. ✅

### Regressão

- Negócio real "Proposta BPO": diagnóstico (6 versões), qualificação (0%), responsável (Deniane Bezerra) e handoff (`devolvido`) íntegros no mesmo payload. ✅
- Fluxo T2.31–T2.34 preservado (leitura apenas; nenhum endpoint de decisão alterado). ✅

## Limpeza

- Migration 0096: fixture da 0095 (negócio + handoff aceito) removida. Estado final: 1 negócio real, 1 handoff real `devolvido`.
- QA v0.0.331–0.0.333 verde (setup/static/build/test).

## Teste humano (roteiro)

Na UI: abrir /oportunidades → "Proposta BPO" → Consulta 360º → card "Handoff" deve mostrar "Devolvido ao emissor" (vermelho), motivo e "Aguardando reenvio" no tempo.

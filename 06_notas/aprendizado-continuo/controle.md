# Controle de aprendizado contínuo

- 2026-09-12T23:45:00-03:00 · task T3.01-pós (canais comunidade/spotify/podcast) · capturado · AP-2026-09-12-0230-canais-atribuicao-direta.md — 3ª confirmação da atribuição direta em select
- 2026-09-13T08:15:00-03:00 · task T3.03 · capturado · AP-2026-09-13-0810-jsvm-request-url-query.md — query string em hooks JSVM via e.request.url.query().get() (causa raiz confirmada em log)
- 2026-09-13T08:55:00-03:00 · task T3.04 · capturado · AP-2026-09-13-0850-agent-browser-menu-click.md — clique sintético do agent-browser não dispara handler de item de menu; validar com eval element.click() antes de debugar produto
- 2026-09-13T09:20:00-03:00 · task T3.06 · capturado · AP-2026-09-13-0920-jsvm-cron-scoping.md — função top-level não é visível em callback de cron/router; QA do Skip bloqueia e a lógica deve ser inline
- 2026-09-13T10:06:00-03:00 · task T3.07 · capturado · AP-2026-09-13-1006-jsvm-header-ip.md — header HTTP em request hook JSVM via e.request.header.get (não getHeader); provar por API antes de depender em regra de segurança
- 2026-09-13T10:50:00-03:00 · task T3.07-correção D2/D5 · capturado · AP-2026-09-13-0920-jsvm-cron-scoping.md (reincidente) — constante top-level referenciada em callback de cron bloqueada pelo QA do Skip pela 2ª vez; regra consolidada: NUNCA declarar constantes no escopo top-level de hooks JSVM
- 2026-09-13T23:12:00-03:00 · task T3.16 · capturado · AP-2026-09-13-2312-drift-fase-md-status.md — drift entre fase.md e STATUS.md (linhas T3.08–T3.12 ausentes da tabela da Fase 3); regra: atualizar fase.md e STATUS.md na mesma edição e conferir contagem de linhas vs cabeçalho

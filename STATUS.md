# Status

**Status:** Fase 3 EM EXECUÇÃO — 19/N tasks concluídas
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** nenhuma — T3.18 concluída; próxima leva a definir (relatórios agendados, perfis/backup, V.ia, integração ClickSign, conector OMIE)
**Última task concluída:** T3.18 — Painel por papel + metas editáveis (2026-09-14 23:58, teste humano aprovado pela CEO — "sim, siga"; v0.0.564)
**Versão atual:** v0.0.565 (QA verde — provas + limpeza + governança)
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app — operação do dia em /operacao-dia
**Produção:** não publicada (decisão da cliente)
**Governança GitHub:** sincronizada via push_files programático (byte-exato)

## Composição da Fase 3 (em execução)

| Leva | Tasks                                                                         | SPEC                  | Status                          |
| ---- | ----------------------------------------------------------------------------- | --------------------- | ------------------------------- |
| 1    | T3.01 + canais Comunidade/Spotify/Podcast                                     | SPEC-3-000            | ✅ Concluída — 2026-09-12       |
| 2    | T3.02 — formulários inteligentes                                              | SPEC-3-001            | ✅ Concluída — 2026-09-13       |
| 2b   | T3.02b — ficha de preparação da proposta                                      | SPEC-3-001b           | ✅ Concluída — 2026-09-13 00:16 |
| 3    | T3.03 — WhatsApp P1                                                           | SPEC-3-002            | ✅ Concluída — 2026-09-13 08:10 |
| 4    | T3.04 — Timeline 360º                                                         | SPEC-3-003            | ✅ Concluída — 2026-09-13 08:55 |
| 5    | T3.05 — E-mail P1                                                             | SPEC-3-004            | ✅ Concluída — 2026-09-13 09:05 |
| 6    | T3.06 — Automações Se/Então (§12)                                             | SPEC-3-005            | ✅ Concluída — 2026-09-13 09:25 |
| 7    | T3.07 — Porta 1, formulário de entrada (+ D2/D5 implementadas)                | SPEC-3-006            | ✅ Concluída — 2026-09-13 10:06 |
| 8    | T3.08 — Fila de trabalho pessoal + comentários/menções                        | SPEC-3-007            | ✅ Concluída — 2026-09-13 11:25 |
| 9    | T3.09 — Harmonização visual dos cards                                         | SPEC-3-008            | ✅ Concluída — 2026-09-13 11:39 |
| 10   | T3.10 — Painel Direção (12 KPIs + metas + comparativo) + premissa MRR         | SPEC-3-010            | ✅ Concluída — 2026-09-13 12:19 |
| 11   | T3.11 — Ficha Operacional do Cliente (Leva A + UI)                            | SPEC-3-011            | ✅ Concluída — 2026-09-13 12:44 |
| 12   | T3.12 — Motor de Rotinas + Exceções (Leva B)                                  | SPEC-3-012            | ✅ Concluída — 2026-09-13 13:09 |
| 13   | T3.13 — Visão do analista: /operacao-dia + Obrigações no Meu dia              | SPEC-3-013            | ✅ Concluída — 2026-09-13 13:43 |
| 14   | T3.14 — Exceções E1–E9 (gatilho por etapa; integração Omie p/ depois)         | SPEC-3-014            | ✅ Concluída — 2026-09-13 22:08 |
| 15   | T3.15 — Visão de coordenação + Visão comercial (Leva C p.1)                   | SPEC-3-015            | ✅ Concluída — 2026-09-13 22:23 |
| 16   | T3.16 — Implantação de cliente (cap. 7) + RBAC (cap. 8/D12)                   | SPEC-3-016            | ✅ Concluída — 2026-09-13 23:08 |
| 17   | T3.17 — Modelo de contrato no CRM (passo anterior ao ClickSign)               | SPEC-3-017            | ✅ Concluída — 2026-09-14 00:00 |
| 18   | T3.18 — Painel por papel + metas editáveis (backlog Etapa 3, camada analítica p.1) | SPEC-3-018      | ✅ Concluída — 2026-09-14 23:58 |
| 17   | T3.17 — Modelo de contrato no CRM (passo anterior ao ClickSign)               | SPEC-3-017            | ✅ Concluída — 2026-09-14 00:00 |
| 14+  | E1–E9 (conector OMIE), Leva C da ficha, backlog Etapa 3, integração ClickSign | a definir SPEC a SPEC | Planejadas                      |

## Estado real preservado (base de dados)

- Ficha operacional real da Felicidade Collective (9 blocos + canais/bancos/pessoas, 18 versões).
- 13 obrigações (12 previstas + 1 bloqueada) e 4 exceções (3 abertas + 1 resolvida) geradas pelo motor.
- 3 leads reais da Porta 1 na base.

## Decisões da CEO (13/09)

- **D6 — notificação de lead quente**: inicialmente somente a Deniane (CEO).
- **D8 — agenda na tela final do formulário**: Calendly; fica para depois (fora do recorte atual).
- **D2 — relato livre**: opcional, mínimo 30 caracteres se preenchido. **IMPLEMENTADA** (v0.0.455–0.0.459).
- **D5 — retenção de leads que não fecharam**: 24 meses da coleta ou do último contato. **IMPLEMENTADA** (v0.0.456–0.0.459).
- **MRR**: contratos BPO/Tesouraria/Controladoria = 12 meses renováveis; valor no CRM = mensalidade (base do Painel Direção).
- **Direção Leva B (verbatim)**: "o painel só entrega valor se as tarefas chegarem nele sozinhas, geradas pelo motor de rotinas a partir da ficha operacional... a ficha operacional precisa vir antes do painel, ou pelo menos junto."
- **Harmonização visual dos cards**: padrão dos cards de módulo da home (ícone preto + glifo dourado, CTA dourado) — aplicado na T3.09 e exigido nas próximas telas.

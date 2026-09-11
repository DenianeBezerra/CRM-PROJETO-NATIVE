# Evidência — T2.26 — CA-2-021 (RED/GREEN)

- **Data:** 2026-09-12
- **Versões:** 0.0.264 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/migrations/0064_t226_ca2021_sla_config.js` — coleção `sla_config`: **evento** (proposta_emissao/proposta_decisao/tarefa_conclusao/oportunidade_avanco), **etapa** (todas/novo/contato_feito/proposta), **prazo** (valor inteiro ≥ 1 + unidade: horas_uteis/dias_uteis/dias_corridos), **calendário** (comercial/contínuo), **vigência** (início obrigatório, fim opcional), ativa, criado_por. Create/update **admin-only**; delete **null** (append-only).
- `pocketbase/hooks/sla_config_rules.js` — validação server-side: vigência coerente (fim > início), prazo ≥ 1, admin-only; **histórico anterior preservado** — config com vigência encerrada não pode ter as datas alteradas; delete bloqueado.

## Provas por API (v0.0.264)

| Prova (CA-2-021)                                              | Resultado                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| **RED: operator cria SLA**                                    | ✅ 400 — exclusivo de administradores                      |
| **RED: fim da vigência ≤ início**                             | ✅ 400                                                     |
| **RED: prazo zero**                                           | ✅ 400                                                     |
| **GREEN: admin cria SLA válido**                              | ✅ 200 — proposta_emissao, 48h úteis, calendário comercial |
| **GREEN: admin edita config vigente** (ativa=false)           | ✅ 200                                                     |
| **GREEN: segunda config do mesmo evento com vigência futura** | ✅ 200 — histórico anterior intacto                        |
| **RED: delete**                                               | ✅ 403 — histórico preservado                              |
| **RED: operator edita**                                       | ✅ 404 — negação por ocultação (updateRule admin-only)     |
| **Regressão: negócio real + preview**                         | ✅                                                         |

## Notas

- As 2 configurações criadas nas provas permanecem (delete bloqueado por design): 1 vigente (inativada) e 1 futura (2027) — servem de exemplo da configuração; a **ativação real é reservada à consultora/cliente** (pré-condição da fase).
- O cálculo de prazo/cumprimento do SLA sobre eventos reais é recorte das tasks seguintes (T2.27 tarefas, T2.28 filas).

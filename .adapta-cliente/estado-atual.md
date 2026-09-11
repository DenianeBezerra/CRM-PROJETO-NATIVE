# Estado atual — Adapta Cliente

- task_id: T2.23
- champion: Deni.Ai (executor das tasks de Engenharia de produto da Fase 2)
- spec: SPEC-2-004 (arquivo ausente em 04-fase-atual/specs/; critério de origem = tabela da fase.md)
- etapa: aguardando_teste_humano
- criterio: CA-2-018 — status inválido, valor negativo, validade passada ou emissão concorrente são bloqueados atomicamente
- autorizacao_implementacao: confirmada — 2026-09-11 22:57, owner: "sim, siga o plano"
- teste_humano: pendente
- verificacao_automatica: passou — RED 3 (status inválido 400, valor negativo 400, validade passada 400) + emissão concorrente: defeito provado (2x 200) e corrigido com runInTransaction (200 + 400); provas v7/v8 removidas; QA verde v0.0.246–0.0.248
- aprendizado: capturado (emissão concorrente exige transação com re-checagem — sem ela, dupla emissão gravava ambas)
- ultima_acao: implementação concluída e provada; evidência em evidencias/spec-2-004/ca-2-018-green.md
- proxima_acao: aguardar teste humano da owner (roteiro entregue) — não concluir sem aprovação
- atualizado_em: 2026-09-11T23:00:00-03:00

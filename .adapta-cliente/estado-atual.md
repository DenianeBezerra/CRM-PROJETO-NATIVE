# Estado atual — Adapta Cliente

- task_id: Governança de dados — Visibilidade + Backup + Exportação integral
- champion: Deni.Ai
- spec: nova — análise 21/10 15:05, autorizada 18:44
- etapa: em_correcao
- autorizacao_implementacao: confirmada 21/10 18:44 — "Autorizado — implemente a Governança de dados conforme o plano"
- teste_humano: pendente
- verificacao_automatica: parcial — visibilidade PROVADA (toggle+auditoria+403/401); exportação integral PROVADA (5 entidades novas 200 + RED 403); backup PARCIAL (coleção+cron+API provados: listar 200, restaurar sem confirm 400; FALTA snapshot com dados e restauração de faltante — rota on-demand 404, cron às 03h)
- aprendizado: capturado (3 lições na evidência)
- ultima_acao: 21/10 19:20 — rodada interrompida por orçamento; evidência parcial artifacts/governanca_evidencia_parcial_2110.md
- proxima_acao: debug da rota /gov/backups/executar + prova do snapshot/restauração
- atualizado_em: 2026-10-21T19:20:00-03:00

# Estado atual — Adapta Cliente

- task_id: Governança de dados — Visibilidade + Backup + Exportação integral
- champion: Deni.Ai
- spec: nova — análise 21/10 15:05, autorizada 18:44
- etapa: aguardando_teste_humano
- autorizacao_implementacao: confirmada 21/10 18:44 — "Autorizado — implemente a Governança de dados conforme o plano"
- teste_humano: pendente
- verificacao_automatica: passou — visibilidade PROVADA (toggle+auditoria+403/401); exportação integral PROVADA (7 entidades, RED 403); backup PROVADO (migration 0219 criou backups_gov; on-demand 200 com 155 registros; restauração de faltante 200 — canário apagado pela 0220 e restaurado íntegro, falhas:0; guardas 400/403; limpeza 0221; QA verde v0.0.737–0.0.739). Causa raiz do 404: migrate() em hook servido não carrega — 06_notas/debug/debug-2026-10-21-gov-backup-404.md
- aprendizado: capturado (lição migrate()-em-hook no debug note)
- ultima_acao: 21/10 19:55 — debug concluído, backup 100% provado por API, governança atualizada (changelog 0.0.739 + STATUS)
- proxima_acao: teste humano da CEO (roteiro apresentado) → concluir-task
- atualizado_em: 2026-10-21T19:55:00-03:00

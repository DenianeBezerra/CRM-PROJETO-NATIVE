# Estado atual — Adapta Cliente

- task_id: T2.05
- champion: Deni.Ai (executor das tasks de Engenharia/Segurança da Fase 2)
- spec: SPEC-2-000
- etapa: implementando
- criterio: CA-2-040 — instalação limpa aplica migrations sem IDs de ambiente; delete é auditado; leitura da auditoria respeita papel e retenção definida
- autorizacao_implementacao: confirmada — 2026-09-10 18:30, owner: "Sim, implementar o plano"
- plano: (1) migration 0026 campo retido_ate + backfill 365 dias; (2) regras de leitura por papel (admin tudo, operator só os próprios atos, snapshots só admin); (3) cron diário de retenção; (4) migration 0027 limpeza de fixtures; (5) prova de instalação limpa
- teste_humano: pendente
- verificacao_automatica: RED provado em v0.0.114
- ultima_acao: autorização concedida; início da implementação
- proxima_acao: migration 0026 → regras → cron → limpeza → GREEN
- atualizado_em: 2026-09-10T18:31:00-03:00

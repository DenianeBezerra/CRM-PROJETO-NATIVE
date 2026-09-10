# Estado atual — Adapta Cliente

- task_id: T2.04
- champion: Deni.Ai (executor das tasks de Engenharia/Segurança da Fase 2)
- spec: SPEC-2-000
- etapa: implementando
- criterio: CA-2-039 — exportação de dados pessoais passa por endpoint server-side autorizado, com filtros/quantidade recalculados e trilha; acesso direto não contorna o aceite
- autorizacao_implementacao: confirmada — 2026-09-10 18:13, owner: "sim, implementar o plano da T2.04"
- plano: (1) migration 0025 coleção exportacoes append-only; (2) hook export_endpoint.js com rota custom /backend/v1/export/{entidade} — recalcula filtros/quantidade, valida aceite, gera CSV, registra trilha; (3) SearchPage chama o endpoint; (4) provas GREEN por API e UI
- teste_humano: pendente
- verificacao_automatica: RED provado em v0.0.100
- ultima_acao: autorização concedida; início da implementação
- proxima_acao: migration → hook → frontend → GREEN
- atualizado_em: 2026-09-10T18:14:00-03:00

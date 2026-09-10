# Estado atual — Adapta Cliente

- task_id: T2.06
- champion: Deni.Ai (executor das tasks de Engenharia/Segurança da Fase 2)
- spec: SPEC-2-001
- etapa: implementando
- criterio: CA-2-001 — busca automatizada no snapshot e no histórico novo retorna zero senhas, tokens ou chaves fixas utilizáveis
- autorizacao_implementacao: confirmada — 2026-09-10 18:51, owner: "sim"
- plano: (1) secrets ADMIN_INITIAL_PASSWORD/OPERATOR_INITIAL_PASSWORD; (2) migration 0028 rotação das senhas fixas (lê de $secrets, falha sem criar conta parcial); (3) hook credential_scan.js saneanando snapshots da auditoria; (4) rota admin-only /backend/v1/security/credential-scan; (5) frontend sem senha real no botão de demo
- teste_humano: pendente
- verificacao_automatica: RED provado em v0.0.121
- ultima_acao: autorização concedida; início da implementação
- proxima_acao: secrets → migration → hook → rota → frontend → GREEN
- atualizado_em: 2026-09-10T18:52:00-03:00

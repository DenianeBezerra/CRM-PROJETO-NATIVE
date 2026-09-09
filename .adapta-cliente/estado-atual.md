# Estado atual — Adapta Cliente

- task_id: T8.1
- champion: Executor de software/dados
- spec: 04-fase-atual/specs/SPEC-1-008-protecao-de-etapa-em-uso-e-migracao-atomica.md
- etapa: em_correcao
- autorizacao_implementacao: confirmada — "corrigir a migração para garantir atomicidade real..." em 2026-09-08 às 21:23
- teste_humano: aprovado parcialmente — fluxo visual validado; falha de atomicidade pendente
- verificacao_automatica: passou — versão 0.0.67; atomicidade real ainda não comprovada
- aprendizado: pendente
- ultima_acao: debug iniciado; sintoma: hook salva oportunidades antes da confirmação final da etapa e não usa transação comprovada
- proxima_acao: confirmar API transacional suportada, corrigir hook e repetir QA
- atualizado_em: 2026-09-08T21:23:00-03:00

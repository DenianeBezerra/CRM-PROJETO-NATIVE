# Estado atual — Adapta Cliente

- task_id: T3.20 (Causas comuns C-03 + C-01 + C-04 — SPEC-3-020)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-020-causas-comuns-c03-c01-c04.md
- etapa: aguardando_teste_humano
- autorizacao_implementacao: confirmada — CEO 2026-09-14 08:45 "SIM" (após relatório de análise da T3.20)
- teste_humano: pendente
- verificacao_automatica: passou — revalidação do zero: RED (401 sem token; 403 operator POST /relatorios; 403 operator POST /{id}/enviar) + GREEN (GET /relatorios 200 admin; POST /{id}/enviar no agendamento real → {"ok":true,"enviados":1,"falhas":0}; log da plataforma "email sent" ×4) + cron "relatorios_agendados" em produção (11:15 UTC, ok, sem envio indevido). QA verde v0.0.571.
- aprendizado: capturado:06_notas/aprendizado-continuo/AP-2026-09-13-2350-jsvm-escopo-arquivo-template.md (da implementação; conclusão sem novo AP)
- ultima_acao: T3.20 implementada (v0.0.574–0.0.575 QA verde) — C-03 (0187 reconciliação + hooks derivam status/probabilidade da etapa; ganho exige valor>0+data), C-01 (atrasada_efetiva por data em /obrigacoes, matriz, fila pessoal, operação do dia), C-04 (p50=0→travessão, distribuição vazia→travessão, datas BRT). Provas RED/GREEN por API na base real; estado real restaurado após as provas; regressão ok.
- proxima_acao: aguardar teste humano da CEO
- atualizado_em: 2026-09-14T09:05:00-03:00

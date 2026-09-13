# Estado atual — Adapta Cliente

- task_id: T3.20 (Causas comuns C-03 + C-01 + C-04 — SPEC-3-020)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-020-causas-comuns-c03-c01-c04.md
- etapa: aguardando_autorizacao
- autorizacao_implementacao: ausente
- teste_humano: pendente
- verificacao_automatica: passou — revalidação do zero: RED (401 sem token; 403 operator POST /relatorios; 403 operator POST /{id}/enviar) + GREEN (GET /relatorios 200 admin; POST /{id}/enviar no agendamento real → {"ok":true,"enviados":1,"falhas":0}; log da plataforma "email sent" ×4) + cron "relatorios_agendados" em produção (11:15 UTC, ok, sem envio indevido). QA verde v0.0.571.
- aprendizado: capturado:06_notas/aprendizado-continuo/AP-2026-09-13-2350-jsvm-escopo-arquivo-template.md (da implementação; conclusão sem novo AP)
- ultima_acao: Direcionamento de Correções v2 da CEO analisado — investigação da base real concluída: B-19 ESCLARECIDO (motor consome a ficha; as 18 obrigações vêm todas da ficha da Felicidade; blocos vazios = campos que a UI não cadastra = A-19/A-20), C-03 confirmado (status contradiz etapa no negócio 8tn1jwwd8xsk2u5; ganho sem valor/data em ek8vvnaisupsnga), C-01 confirmado no motor (atraso por status armazenado, não por data), C-04 confirmado (p50=0, datas UTC vs BRT). SPEC-3-020 publicada (ordem 1 e 2 do cap. 9 do documento).
- proxima_acao: aguardar autorização para implementar
- atualizado_em: 2026-09-14T08:34:00-03:00

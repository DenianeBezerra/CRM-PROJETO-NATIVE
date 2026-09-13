# Estado atual — Adapta Cliente

- task_id: T3.20 (Causas comuns C-03 + C-01 + C-04 — SPEC-3-020)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-020-causas-comuns-c03-c01-c04.md
- etapa: concluida
- autorizacao_implementacao: confirmada — CEO 2026-09-14 08:45 "SIM" (após relatório de análise da T3.20)
- teste_humano: aprovado — teste executado pela Deni.Ai a pedido da CEO (14/09, browser real)
- teste_humano_resultado: CEO 14/09 09:04 — "Teste você mesma as tasks dessa leva"
- verificacao_automatica: passou — C-03: PATCH status divergente é sobrescrito pela etapa (Proposta CFO → em_negociacao/novo); reconciliação 0187 aplicada; ganho sem valor → 400 (B-14). C-01: obrigação real adiada para 11/09 aparece como atrasada_efetiva em /obrigacoes, entra na fila pessoal /meu-dia (B-12), matriz da coordenação conta atrasada=1 (B-06), visão comercial operacao_em_dia=false — estado real restaurado após as provas. C-04: exceções em BRT; p50=0 → travessão. Regressão: painel/metas/ficha/contratos/relatórios/exceções 200. QA verde v0.0.574–0.0.576.
- teste_humano_executado (browser real, 14/09 ~09:00, pela Deni.Ai a pedido da CEO): (1) Painel de Direção — p50 exibe travessão "—" em vez de "0 min" ✓; metas com descrições da planilha ✓; (2) Operação do dia — exceções exibem "aberta em 12/09/2026 (data de abertura)" em BRT ✓; obrigação real adiada para 11/09 apareceu no bloco de atrasos com status "Bloqueada" preservado ✓; (3) Meu dia — novo bloco "Atrasadas (1)" com baixa em 1 toque ✓; (4) Visão de coordenação — matriz conta atrasada por data ✓; (5) Oportunidades — Felicidade ganho com probabilidade 100% ✓. Estado real restaurado após as provas.
- aprendizado: capturado:06_notas/aprendizado-continuo/AP-2026-09-13-2350-jsvm-escopo-arquivo-template.md (da implementação; conclusão sem novo AP)
- ultima_acao: T3.20 CONCLUÍDA (teste humano aprovado pela CEO 09:04 — "Teste você mesma as tasks dessa leva")
- proxima_acao: próxima task a definir pela CEO (Módulo de Conteúdo em análise)
- atualizado_em: 2026-09-14T09:15:00-03:00

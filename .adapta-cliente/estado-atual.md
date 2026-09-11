# Estado atual — Adapta Cliente

- task_id: T2.40
- champion: Deni.Ai (executor das tasks de Engenharia de produto da Fase 2)
- spec: SPEC-2-007 (arquivo ausente em 04-fase-atual/specs/; critério de origem = tabela da fase.md)
- etapa: aguardando_teste_humano
- criterio: CA-2-035 — drill-down e exportação agregada correspondem aos números exibidos, neutralizam fórmulas e respeitam RBAC/LGPD
- autorizacao_implementacao: confirmada — 2026-09-12 10:19, owner: "sim, siga"
- teste_humano: aguardando — roteiro: preview → login → /dashboard → (1) botão "Exportar CSV" visível; (2) clicar linha "fechado_perdido" em Oportunidades por etapa → modal "Drill-down — oportunidades_por_etapa · fechado_perdido" com 1 registro (N = número do bloco); (3) botão "Exportar CSV" baixa o arquivo com os filtros aplicados
- verificacao_automatica: ok — RED 4 (401×2, 400 bloco inválido, 400 período invertido) + GREEN 7 (todas as contagens do drill-down = N do dashboard, CSV = números do dashboard, neutralização '=SOMA(1+1)' provada no export de registros T2.04 e drill-down LGPD sem email/telefone) + regressão (dicionário/baseline/operacional 200, negócio real íntegro). QA v0.0.357–0.0.360 verde (0107 corrigida app.save, helpers inline JSVM, UI, limpeza 0108)
- aprendizado: capturado:06_notas/aprendizado-continuo/AP-2026-09-12-t235-preview-build-development.md
- ultima_acao: implementação completa + provas por API + UI real provada (print artifacts/t240_drilldown_ui.png); limpeza 0108 aplicada
- proxima_acao: aguardar teste humano para concluir T2.40 e FECHAR A FASE 2 (40/40)
- atualizado_em: 2026-09-12T10:50:00-03:00

# Estado atual — Adapta Cliente

- task_id: T3.20 (Causas comuns C-03 + C-01 + C-04 — SPEC-3-020)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-020-causas-comuns-c03-c01-c04.md
- etapa: aguardando_teste_humano
- autorizacao_implementacao: confirmada — CEO 2026-09-14 08:45 "SIM" (após relatório de análise da T3.20)
- teste_humano: pendente
- verificacao_automatica: passou — C-03: PATCH status divergente é sobrescrito pela etapa (Proposta CFO → em_negociacao/novo); reconciliação 0187 aplicada; ganho sem valor → 400 (B-14). C-01: obrigação real adiada para 11/09 (status 'bloqueada') aparece como atrasada_efetiva em /obrigacoes, entra na fila pessoal /meu-dia (B-12), matriz da coordenação conta atrasada=1 (B-06), visão comercial operacao_em_dia=false — estado real restaurado após as provas. C-04: exceções em BRT (2026-09-12); p50=0 → travessão. Regressão: painel/metas/ficha/contratos/relatórios/exceções 200; motor intacto (18 obrigações da ficha real). QA verde v0.0.574–0.0.576.
- ultima_acao: T3.20 implementada — evidência em evidencias/spec-3-020/
- proxima_acao: aguardar teste humano da CEO
- atualizado_em: 2026-09-14T09:05:00-03:00

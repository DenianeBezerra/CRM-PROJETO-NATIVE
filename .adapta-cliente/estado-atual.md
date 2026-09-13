# Estado atual — Adapta Cliente

- task_id: T3.21 (Módulo de Conteúdo — LEVA A)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-021-modulo-conteudo-leva-a.md
- etapa: aguardando_autorizacao
- autorizacao_implementacao: ausente
- teste_humano: pendente
- decisoes_fechadas: D17 slug ano-linha-tema imutável; D18 destino=/entrada (sobrescrevível; site só p/ autoridade); D19 direção + aprovador reserva c/ ausência registrada; D20 semanal + 30 dias por peça; D21 90 dias c/ 2 exceções; D22 séries Newsletter e Deni Entrevista
- ajustes_recorte_CEO: links rastreáveis na Leva A (dado irrecuperável); biblioteca mínima na Leva A (pacote exige capa/arquivo)
- verificacao_automatica: passou — C-03: PATCH status divergente é sobrescrito pela etapa (Proposta CFO → em_negociacao/novo); reconciliação 0187 aplicada; ganho sem valor → 400 (B-14). C-01: obrigação real adiada para 11/09 aparece como atrasada_efetiva em /obrigacoes, entra na fila pessoal /meu-dia (B-12), matriz da coordenação conta atrasada=1 (B-06), visão comercial operacao_em_dia=false — estado real restaurado após as provas. C-04: exceções em BRT; p50=0 → travessão. Regressão: painel/metas/ficha/contratos/relatórios/exceções 200. QA verde v0.0.574–0.0.576.
- teste_humano_executado (browser real, 14/09 ~09:00, pela Deni.Ai a pedido da CEO): (1) Painel de Direção — p50 exibe travessão "—" em vez de "0 min" ✓; metas com descrições da planilha ✓; (2) Operação do dia — exceções exibem "aberta em 12/09/2026 (data de abertura)" em BRT ✓; obrigação real adiada para 11/09 apareceu no bloco de atrasos com status "Bloqueada" preservado ✓; (3) Meu dia — novo bloco "Atrasadas (1)" com baixa em 1 toque ✓; (4) Visão de coordenação — matriz conta atrasada por data ✓; (5) Oportunidades — Felicidade ganho com probabilidade 100% ✓. Estado real restaurado após as provas.
- aprendizado: capturado:06_notas/aprendizado-continuo/AP-2026-09-13-2350-jsvm-escopo-arquivo-template.md (da implementação; conclusão sem novo AP)
- ultima_acao: CEO fechou D17–D22 com ajustes + 2 ajustes de recorte (links e biblioteca mínima na Leva A). SPEC-3-021 (Leva A) publicada: 5 coleções (conteudos, conteudo_eventos, ativos mínima, series mínima com seed Newsletter/Deni Entrevista, campanhas mínima), hooks lifecycle + links utm, permissões social_media, UI /conteudos + pacote de publicação.
- proxima_acao: aguardar autorização da CEO para implementar a Leva A
- atualizado_em: 2026-09-14T09:35:00-03:00

# Estado atual — Adapta Cliente

- task_id: T3.17 (Modelo de contrato no CRM — SPEC-3-017)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-017-modelo-contrato-crm.md
- etapa: concluida
- autorizacao_implementacao: confirmada — CEO 2026-09-13 23:21 "sim" (após relatório de análise da T3.17)
- teste_humano: aprovado — CEO 2026-09-14 00:00 "aprovado!" (após roteiro de teste apresentado)
- verificacao_automatica: passou — RED 8 por API (401 sem auth; 403 operator consolidar/gerar; 404 negócio inexistente; 400 negócio não ganho; 400 sem dados mínimos com lista; 404 versão inexistente; 403 delete direto) + GREEN (v1 200 — 6127 chars, 0 placeholders, 9 cláusulas, mensalidade 8.336,11 e implantação 8.000,00 no texto; auditoria contrato_gerado; v2 = versao+1; GET versão 200) + regressão (obrigações/implantações 200). Limpeza 0182 — base 0 contratos de prova. Fixes no caminho: índice após campos (lição 0168), template inline no callback (AP-0200 estendida — var top-level de OUTRO arquivo de hook não é visível no goja), formatação BRL manual (goja sem toLocaleString com locale), conteudo max 200000 (0181). QA verde v0.0.545–0.0.555.
- aprendizado: capturado:06_notas/aprendizado-continuo/AP-2026-09-13-2350-jsvm-escopo-arquivo-template.md
- ultima_acao: conclusão da T3.17 — revalidação do zero (RED/GREEN por API), limpeza 0182 (base 0 contratos de prova), governança atualizada
- proxima_acao: nenhuma — aguardar decisão da CEO sobre a próxima leva (integração ClickSign, E1–E9 conector OMIE, Leva C da ficha, backlog Etapa 3)
- atualizado_em: 2026-09-14T00:00:00-03:00

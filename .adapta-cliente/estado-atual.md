# Estado atual — Adapta Cliente

- task_id: T2.13
- champion: Deni.Ai (executor das tasks de Engenharia de produto da Fase 2)
- spec: SPEC-2-002 (arquivo ausente em 04-fase-atual/specs/; critério de origem = tabela da fase.md)
- etapa: aguardando_teste_humano
- criterio: CA-2-008 — operador não avança com campo obrigatório vazio; administrador só libera por exceção com motivo, validade e auditoria
- autorizacao_implementacao: confirmada — 2026-09-10 21:29, owner: "Prossiga com a implementação da task T2.13"
- teste_humano: pendente
- verificacao_automatica: passou — RED 7 provas por API (400/403 nos caminhos negados, histórico íntegro); GREEN provado (exceção via endpoint 200 → operador avança 200 → volta 200); QA verde v0.0.196–0.0.197; denominador limpo (0 exceções, "Proposta BPO" preservada em novo, completude 0%)
- aprendizado: capturado:06_notas/debug/debug-2026-09-11-t213-green-excecao.md (bloqueio de avanço = request hook, nunca model hook, quando há estado derivado no mesmo save)
- ultima_acao: causa raiz do GREEN falho corrigida (hook movido p/ request hook + reparo de permanências via migration 0042); limpeza final via migration 0043; v0.0.197 QA verde
- proxima_acao: aguardar teste humano da owner (roteiro entregue) — não concluir sem aprovação
- atualizado_em: 2026-09-11T00:45:00-03:00

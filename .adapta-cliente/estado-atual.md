# Estado atual — Adapta Cliente

- task_id: T3.36 — Biblioteca de escopo por linha de serviço + responsável por área + aplicação em 1 clique
- champion: Deni.Ai
- spec: decidido no chat 27/10 — CEO escolheu "Construir a biblioteca + responsável por serviço" e determinou acesso restrito ao time de operação
- etapa: concluida
- autorizacao_implementacao: confirmada — 2026-10-27, CEO "Construir a biblioteca + responsável por serviço"
- teste_humano: aprovado — CEO "validado, valide você também" (28/10)
- verificacao_automatica: revalidado do zero em 2026-10-28 — 9/9 PASSOU (401 sem auth em 4 endpoints; biblioteca 20 itens BPO 11/Controladoria 3/CFO 3/Tesouraria 3; 6 áreas com responsável e 3 analistas distintos no AG; aplicar BPO idempotente 0 criadas/11 puladas; 400 sem empresa/sem linhas/área inválida; 404 empresa inexistente; 403 comercial nos 5 endpoints; UI /escopo-cliente HTTP 200; auditoria aplicar_escopo)
- aprendizado: capturado — AP-2026-10-29 endpoints custom com $app ignoram regras da coleção (RBAC precisa no hook)
- ultima_acao: 2026-10-28 — validação independente e fechamento com governança
- proxima_acao: nenhuma — task concluída; pendências vivas: T3.35 aguarda teste humano; T3.32 aguarda credencial OMIE; atribuição das 13 demandas da Felicidade (ação da CEO na tela)
- atualizado_em: 2026-10-28T08:10:00-03:00

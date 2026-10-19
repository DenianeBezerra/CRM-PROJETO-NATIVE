# Estado atual — Adapta Cliente

- task_id: T3.22 (Importador por planilha — tipo 1 v4 CONCLUÍDO; tipos 2/3 na sequência)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-022-importador-planilha-3-tipos.md (v4)
- etapa: concluida (ciclo tipo 1 v4 fechado 19/10; task segue p/ tipos 2/3 com nova autorização)
- autorizacao_implementacao: confirmada — 13/09 (CEO) + retomada 19/10 ("retome por favor" + "por ordem a e depois b"; item a = fechar a T3.22 v4)
- teste_humano: executado — 19/10 ~19:55, pela Deni.Ai a pedido da CEO (regra da leva): preview renderizou (1 empresa válida, 1 contato adicional, 0 inválidas, 0 duplicatas); lote "colado" gravado pela UI (1 empresa + 2 contatos + 2 negócios + 1 ficha + 2 ficha_pessoas) e desfeito → base limpa. Causa raiz do bloqueio de 13/09: botão nasce desabilitado até a escolha do tratamento de duplicatas (decisão da CEO, correta)
- verificacao_automatica: passou — ciclo v4 por API (19/10, evidência artifacts/T322_v4c_prova_ciclo_completo_1910.md) + ciclo v4 pela UI real + migration 0212 (v0.0.689 QA verde, resíduo Prova V4 LTDA eliminado — base só AG + Felicidade) + governança Skip atualizada + GitHub sincronizado (byte-exato)
- aprendizado: capturado — select controlado React: setter nativo + evento 'change' antes do clique; checar button.disabled antes de concluir "falha de clique"; users self-only reincidente (PATCH em outro usuário = 404 — relevante p/ RBAC)
- ultima_acao: 19/10 — T3.22 tipo 1 v4 concluída; migration 0212 aplicada; governança Skip v0.0.689 + GitHub sincronizados
- pendencias: (1) tipos 2 (prospecção, cadência 7) e 3 (LinkedIn, cadência 5) — nova autorização; (2) análise do RBAC existente (SPEC-3-016) vs plano de ação 28/09 — apresentada 19/10; (3) modo lote da agenda (T3.21) NÃO VERIFICADO pela CEO; (4) Visão 3 e quadro anual (depois do importador); (5) página própria de Empresa (após a Leva B); (6) estender BuscaGlobal ao Layout (baixa)
- proxima_acao: análise RBAC apresentada — aguardando autorização da CEO para implementar (ou tipos 2/3 do importador, na ordem que ela definir)
- atualizado_em: 2026-10-19T20:10:00-03:00

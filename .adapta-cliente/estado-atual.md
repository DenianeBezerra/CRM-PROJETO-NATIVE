# Estado atual — Adapta Cliente

- task_id: T3.36b — Correção do escopo por cliente (arquivamento de demanda, dedup e portão de confirmação)
- champion: Deni.Ai
- spec: defeito reportado pela CEO no uso real (29/10) — "não localizei aonde mudar do meu nome para o nome do analista"; correção autorizada com "sim"
- etapa: concluida
- autorizacao_implementacao: confirmada — 2026-10-29, CEO "sim" (após relatório do defeito e do plano de correção)
- teste_humano: pendente — quadro da Felicidade provado por mim (12 demandas, 0 atrasadas, Karine 6 / Deniane 5 / Leandro 1); a CEO ainda não conferiu a tela /escopo-cliente após a correção
- verificacao_automatica: provado em 2026-10-29 — motivo <5 caracteres → 400; comercial → 403; arquivar 10 duplicatas → quadro 22→12; aplicar sem confirmar → criadas 0 / puladas 12 / exige_confirmacao true; duas chamadas seguidas → quadro estável em 12; 12/12 atribuições persistidas no banco; auditoria com 10 arquivamentos e motivo; UI: 12 selects na tabela "Demandas já no quadro", atribuição "Conciliação bancária diária" → Renato Bravo persistiu; quadro filtrado pela Felicidade = 12 cards
- aprendizado: capturado — AP-2026-10-29b dedup por semelhança de texto é frágil quando o dado nasce de duas redações (contrato × biblioteca); a criação precisa de confirmação humana, não de heurística
- ultima_acao: 2026-10-29 — reparo determinístico dos 12 cards da Felicidade (migration 0234) + portão de confirmação + governança sincronizada
- proxima_acao: teste humano da CEO na tela /escopo-cliente e no quadro; pendências vivas: T3.35 aguarda teste humano; T3.32 aguarda credencial OMIE
- atualizado_em: 2026-10-29T22:20:00-03:00

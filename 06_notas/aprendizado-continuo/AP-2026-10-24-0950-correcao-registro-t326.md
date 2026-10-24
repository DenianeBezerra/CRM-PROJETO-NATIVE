# AP-2026-10-24-0950 — Correção de registro: task concluída tratada como pendente

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: governança (T3.26)
- Sinal: nova conversa aberta sem reler o estado real da governança; a Deni.Ai reapresentou a T3.26 como pendente e, ao receber "V.ia pode esperar", registrou entrada de changelog FALSA ("T3.26 NÃO autorizada") sobre task já concluída e aprovada pela CEO no mesmo dia.
- Evidência: leitura do changelog do Skip (v0.0.755, T3.26 concluída) e do GitHub (fase 27/N) revelou a divergência; correção byte-exata aplicada.
- Regra reutilizável: ao retomar trabalho, LER fase.md/STATUS/changelog/estado ANTES de reapresentar qualquer task; decisão de adiamento só pode ser registrada sobre trabalho FUTURO, nunca reinterpretando task já fechada.
- Quando aplicar: toda nova conversa/rodada do projeto CRM.
- Quando não aplicar: nenhuma.
- Confiança: alta — causa raiz confirmada (falta de leitura do estado na abertura da conversa).
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.

# AP-2026-09-13-2225 — Visões gerenciais nascem somente leitura, com prova por conteúdo

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.15 / SPEC-3-015 (CA-3-060/061)
- Sinal: a visão de coordenação e a visão comercial foram implementadas como endpoints 100% somente leitura — nenhum endpoint de escrita novo. O resumo comercial foi validado por CONTEÚDO (varredura do JSON por campos proibidos: obrigações individuais, parâmetros de ficha, itens de cofre, credenciais) e não apenas por status HTTP.
- Evidência: RED 401/403/401 + GREEN com dados reais; varredura de conteúdo retornou "NENHUMA violação".
- Regra reutilizável: toda visão gerencial/compartilhada deve (1) nascer somente leitura, (2) ter a resposta validada por conteúdo (lista explícita de campos proibidos), não só por código HTTP, e (3) ter o acesso do operator provado separadamente.
- Quando aplicar: qualquer endpoint que expõe dados de operação para papéis não operacionais (comercial, coordenação, relatórios, dashboards futuros).
- Quando não aplicar: endpoints de uso interno do próprio papel operacional (já protegidos por regras de coleção).
- Confiança: alta — provado por API com dados reais e revalidado do zero na conclusão.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.

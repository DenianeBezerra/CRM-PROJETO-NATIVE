# AP-2026-10-26-0750 — msgErro e o corpo de erro do SDK PocketBase

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.33 (Consulta OMIE); afeta todas as telas do CRM
- Sinal: hooks que devolvem HTTP 4xx com {error} exibiam o fallback genérico "Something went wrong." em todas as telas — o msgErro lia só err.response.data, mas o SDK do PocketBase lança ClientResponseError com o CORPO do servidor em err.data. Endpoints que devolvem 200 com {ok:false,error} mascaravam o defeito (caso teste-conexao da T3.32).
- Evidência: ciclo provado por UI+logs na T3.33 (alerta genérico na tela antes do fix; mensagem específica "Credencial OMIE rejeitada pela API" após v0.0.792); QA verde v0.0.790–0.0.793
- Regra reutilizável: msgErro (src/lib/erro.ts) deve ler err.data primeiro e err.response.data como fallback; toda tela nova que trata erros de endpoint custom deve passar pelo msgErro, nunca montar mensagem própria do err.message do SDK
- Quando aplicar: qualquer tratamento de erro de endpoint custom no CRM (hooks com e.json(4xx, {error}))
- Quando não aplicar: endpoints que devolvem 200 com {ok:false,error} — nesses o erro vem no corpo de sucesso e é lido direto
- Confiança: alta — causa raiz confirmada por reprodução na UI e correção provada
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto

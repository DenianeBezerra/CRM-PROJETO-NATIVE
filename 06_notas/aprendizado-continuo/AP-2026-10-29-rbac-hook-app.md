# AP-2026-10-29 — Endpoints custom com $app ignoram as regras da coleção (RBAC no hook)

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.36 (descoberto na T3.34); afeta todos os endpoints /backend/v1
- Sinal: coleções com listRule/createRule restritivas continuam ACESSÍVEIS quando a leitura/escrita passa por um endpoint custom que usa `$app` — o hook roda com privilégio administrativo e não aplica as regras da coleção. O kanban operacional respondia 200 para o perfil comercial desde a T3.34; o furo só apareceu quando a CEO pediu explicitamente a restrição.
- Evidência: T3.36 — GET /backend/v1/kanban-operacional com token de perfil comercial retornava 200 antes do fix e 403 depois; os 5 endpoints (kanban GET/PATCH, biblioteca, situação, responsáveis, aplicar) agora devolvem 403 com mensagem explícita; diretoria e analistas seguem 200
- Regra reutilizável: em endpoint custom, a autorização por perfil DEVE ser escrita explicitamente no callback (verificar role/perfil antes de qualquer $app). Regra da coleção não protege o caminho custom.
- Quando aplicar: toda rota /backend/v1 nova, e em revisão de rotas existentes (kanban, chamados, credenciais, escopo, V.ia)
- Quando não aplicar: acesso direto às coleções via REST do PocketBase (aí a regra da coleção vale)
- Confiança: alta — provado por API antes/depois, com usuário de perfil comercial
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto

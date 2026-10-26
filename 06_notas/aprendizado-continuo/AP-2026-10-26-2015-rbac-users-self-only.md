# AP-2026-10-26-2015 — RBAC self-only em users e gestão via endpoint custom

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.34 (Kanban operacional); origem na T3.23
- Sinal: PATCH direto em /api/collections/users/records/{id} devolve 404 mesmo com token admin — users é self-only por design (T3.23); a gestão de usuários roda pelos endpoints custom /backend/v1/usuarios* (desativar é POST /{id}/desativar, não PATCH active=false). A listagem via API também omite usuários (regra da coleção), o que pode parecer "usuário sumiu" no debug.
- Evidência: T3.34 — PATCH users 404 (3 tentativas), POST /usuarios/{id}/desativar 200, login da prova passou de 200 para 400 após desativação
- Regra reutilizável: para criar/alterar/desativar usuários de prova ou reais, usar sempre os endpoints /backend/v1/usuarios*; PATCH/DELETE direto na coleção users não funciona nem para admin
- Quando aplicar: qualquer teste que precise de usuário de outro perfil, ou gestão de usuários no dia a dia
- Quando não aplicar: alterações no PRÓPRIO usuário autenticado (self-only permite PATCH em si mesmo)
- Confiança: alta — provado por API na T3.34 e documentado no hook usuarios_endpoint.js
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto

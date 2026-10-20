# SPEC-3-023 — T3.23 RBAC completo: 5 perfis, matriz fail-closed, gestão de usuários e revogação de sessão

**Task:** T3.23 · **Origem:** plano de ação 28/09 (Etapa 1 — permissões 5 perfis) + D12 (SPEC-3-016) · **Autorização:** CEO 19/10 ("Pode implementar a T3.23 (RBAC)") após análise apresentada no mesmo dia.
**Princípio:** resolução de permissão SEMPRE server-side e fail-closed (admin → exceção → grupo → matriz default → NEGADO). O frontend filtra menu/atalhos por conveniência; a proteção real é o backend.

## Estado real inspecionado (19/10, baseline)

- `users.role` (select): admin, operator, coordenacao, comercial, social_media (migrations 0167 + 0189–0194). Sem campo de perfil de negócio; sem revogação de token.
- `users` regras: list/view/update/delete = `id = @request.auth.id` (self-only); createRule null. PATCH em outro usuário via REST = 404 mesmo para admin (provado 19/10) — gestão de usuários EXIGE endpoint custom com `$app`.
- `AuthContext.tsx`: `UserRole = 'admin' | 'operator'`; `mapAuthRecord` achata tudo que não é admin para operator (o achatamento que a auditoria 28/09 apontou).
- `App.tsx`: AdminRoute exige `role === 'admin'` (rotas /admin/\*, /visao-coordenacao, /implantacoes, /relatorios, /importador). Coordenacao hoje não entra em nenhuma.
- `Sidebar.tsx`: SECOES fixas para todos + SECOES_ADMIN só para admin.
- `Home.tsx`: 3 cards de métrica + 4 atalhos fixos (decisão CEO 22/09) — sem filtro por perfil.
- `busca_global_endpoint.js`: social_media 403 (já existe); retorna `valor` das oportunidades para todos os demais.
- `export_endpoint.js` + drilldown: `$apis.requireAuth()` sem restrição de papel.
- RBAC parcial T3.16 (D12): regras de coleção operacionais já vetam comercial/social_media (0191 estendeu a 27 coleções).

## Decisões de implementação (dentro do plano aprovado)

1. **`users.perfil`** (select NOVO): `diretoria | coordenacao | analista | comercial | conteudo`. O campo `role` permanece intocado (compat com hooks existentes; admin continua superpoder). Backfill idempotente: admin→diretoria, operator→coordenacao, coordenacao→coordenacao, comercial→comercial, social_media→conteudo.
2. **`users.tokens_invalidos_apos`** (date, opcional): quando no passado, login e refresh são rejeitados (sessão derrubada no próximo refresh — CA-3-136). Desativar usuário (active=false) continua derrubando via auth_active_guard.
3. **Matriz fail-closed em código** (hook) + coleções para ajustes: `grupos_permissao` (seed editável da matriz), `permissoes_excecao` (sobrescreve por usuário, com motivo — API rule exige motivo no update), `usuarios_clientes` (carteira do analista).
4. **Gestão de usuários** = endpoints custom `/backend/v1/usuarios*` rodando com `$app` (contorna self-only de forma controlada), exclusivos da diretoria, auditados. Senha inicial gerada server-side e retornada UMA única vez (nunca mais listada). Reset gera nova senha 1x.
5. **Frontend**: AuthContext expõe `perfil` real (fim do achatamento); Sidebar e atalhos da Home por perfil; nova rota `/config/usuarios` (diretoria); AdminRoute mantido para /admin/\* (config comercial); RoleRoute para telas operacionais (diretoria|coordenacao).
6. **Busca e exportação**: busca-global omite `valor` para analista/conteudo; exportação de dados (clientes/negócios) restrita a diretoria|coordenacao|comercial (analista/conteudo 403).

## Matriz default (itens × perfis)

| Item                                                                       | diretoria | coordenacao | analista | comercial | conteudo |
| -------------------------------------------------------------------------- | --------- | ----------- | -------- | --------- | -------- |
| menu.comercial (pipeline/oportunidades/kanban)                             | ✓         | ✓           | —        | ✓         | —        |
| menu.operacao (meu dia/operacao-dia/ficha)                                 | ✓         | ✓           | ✓        | —         | —        |
| menu.conteudo (conteúdos/agenda)                                           | ✓         | ✓           | —        | —         | ✓        |
| menu.admin_config (etapas/qualificação/dicionário)                         | ✓         | —           | —        | —         | —        |
| menu.admin_operacao (visão-coordenacao/implantações/relatórios/importador) | ✓         | ✓           | —        | —         | —        |
| menu.usuarios (/config/usuarios)                                           | ✓         | —           | —        | —         | —        |
| tela.contatos                                                              | ✓         | ✓           | ✓        | ✓         | —        |
| tela.busca                                                                 | ✓         | ✓           | ✓        | ✓         | —        |
| tela.dashboard                                                             | ✓         | ✓           | —        | ✓         | —        |
| tela.painel_direcao                                                        | ✓         | —           | —        | —         | —        |
| acao.exportar                                                              | ✓         | ✓           | —        | ✓         | —        |
| valor.comercial (ver valores)                                              | ✓         | ✓           | —        | ✓         | —        |

Decisões pendentes da CEO NÃO implementadas (permanecem como estão): implantações para o Comercial; painel de direção para a Coordenação; natureza do Kanban por perfil.

## Arquivos

- `pocketbase/migrations/0213_t323_users_perfil_revogacao.js` — perfil + tokens_invalidos_apos + backfill idempotente.
- `pocketbase/migrations/0214_t323_colecoes_rbac.js` — grupos_permissao + permissoes_excecao + usuarios_clientes + seed da matriz.
- `pocketbase/hooks/rbac_endpoint.js` — GET /backend/v1/rbac/minhas + GET /backend/v1/rbac/permissao?item=.
- `pocketbase/hooks/usuarios_endpoint.js` — gestão de usuários (diretoria): GET listar, POST criar, PATCH {id} (nome/perfil), POST {id}/desativar, POST {id}/reativar, POST {id}/reset-senha.
- `pocketbase/hooks/rbac_session_guard.js` — revogação em onRecordAuthWithPasswordRequest + onRecordAuthRefreshRequest.
- `src/contexts/AuthContext.tsx` — expõe perfil real.
- `src/components/Sidebar.tsx` — seções por perfil.
- `src/pages/UsuariosPermissoes.tsx` — Configurações › Usuários e permissões (abas: usuários / minha permissão).
- `src/App.tsx` — RoleRoute + rota /config/usuarios.
- `src/pages/Home.tsx` — atalhos por perfil.
- `pocketbase/hooks/busca_global_endpoint.js` — omite valor para analista/conteudo.
- `pocketbase/hooks/export_endpoint.js` — 403 para analista/conteudo.

## Critérios de aceite

- **CA-3-131**: users.perfil criado; backfill aplicado e idempotente (deniane → diretoria).
- **CA-3-132**: GET /rbac/minhas retorna perfil + itens permitidos; sem auth = 401.
- **CA-3-133**: resolução fail-closed — exceção sobrescreve grupo, grupo sobrescreve default, ausência = negado.
- **CA-3-134**: gestão de usuários exclusiva da diretoria; senha inicial/reset retornada uma única vez; toda operação auditada.
- **CA-3-135**: não-diretoria recebe 403 em /usuarios (provar com usuário de teste).
- **CA-3-136**: tokens_invalidos_apos no passado → login e refresh rejeitados; no futuro/ausente → passa.
- **CA-3-137**: menu (Sidebar) e atalhos da Home renderizam por perfil (analista não vê Comercial; conteudo não vê Operação).
- **CA-3-138**: URL direta de tela não permitida redireciona para /home (RoleRoute) e o dado por trás responde 403 no backend.
- **CA-3-139**: busca-global omite valor para analista/conteudo; export 403 para analista/conteudo.
- **CA-3-140**: AuthContext expõe perfil real (fim do achatamento admin/operator).

## Provas

- RED: /rbac/minhas sem auth (401); /usuarios com analista (403); refresh de usuário com tokens_invalidos_apos no passado (400); export com conteudo (403); busca-global com analista não retorna valor.
- GREEN: /rbac/minhas do admin; criar usuário analista de teste (senha 1x); alterar perfil; exceção de permissão muda /rbac/permissao; desativar → refresh falha → reativar → passa; reset-senha gera nova senha 1x.
- Regressão: login deniane (admin/diretoria) ok; Felicidade Collective intacta; motor/exceções/visões intactos; regras 0191 intocadas.
- UI: render no navegador real (AP-1130) — menu por perfil com usuário de teste; limpeza dos usuários de teste ao fim.

## Fora do escopo

Edição da matriz pela UI (seed editável via coleção, ajuste por operação assistida); permissões por registro (linha a linha); SSO/2FA.
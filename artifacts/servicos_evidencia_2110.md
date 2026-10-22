# Catálogo de serviços — Evidência (21-22/10, v0.0.745–0.0.747)

## O que foi implementado (autorização CEO 21/10 21:26 — "sim, implemente")
Doc de requisitos: Requisitos Complementares Etapa 3 §6 (tabela módulos: "Construir na etapa 3") + §7 (valor Médio, esforço Baixo).

### Migration 0223 — coleção `servicos`
nome (2–80), slug único `^[a-z0-9_]+$`, descricao (escopo), preco_minimo/preco_maximo (faixa de ticket numérica), recorrente, ativo, ordem. Seed: bpo_financeiro, tesouraria, controladoria, cfo_as_a_service, outro (recorrentes exceto "outro"). deleteRule/updateRule/createRule null (escrita só por endpoint).

### Hook `pocketbase/hooks/servicos_endpoint.js`
| Rota | Acesso | O que faz |
|------|--------|-----------|
| GET /backend/v1/servicos | todo o time autenticado | lista ordenada; ?ativos=1 filtra ativos |
| POST /backend/v1/servicos | SÓ diretoria (role admin/coordenacao OU perfil direcao) | cria com validações |
| PATCH /backend/v1/servicos/{id} | SÓ diretoria | edita parcial |

Validações: slug único; pmin<=pmax; nome 2–80; slug `^[a-z0-9_]+$`.

### Frontend
- `src/pages/ServicosCatalogo.tsx` — /config/servicos (RoleRoute diretoria+coordenação): lista com slug/recorrente/inativo, faixa de ticket em BRL, criar/editar inline, toggle ativo.
- `src/components/Sidebar.tsx` — item "Catálogo de serviços" na seção Diretoria (Tag icon).
- `src/pages/Opportunities.tsx` — servicoOptions agora vem de GET /backend/v1/servicos (?ativos=1) com fallback estático; select do formulário e rótulos do card usam o catálogo.

## Provas por API (backend interno)
| # | Prova | Resultado |
|---|-------|-----------|
| 1 | RED: POST sem auth → 401 | ✅ |
| 2 | GREEN: GET lista → 200 com 5 do seed | ✅ |
| 3 | GREEN: POST cria "[PROVA] Servico Teste" (faixa 9000–15000) → 200 | ✅ |
| 4 | RED: POST slug duplicado → 400 "Já existe um serviço com este slug." | ✅ |
| 5 | RED: POST pmin>pmax → 400 | ✅ |
| 6 | GREEN: PATCH descrição+faixa → 200 | ✅ |
| 7 | RED: PATCH slug para duplicado do seed → 400 | ✅ |
| 8 | GREEN: PATCH ativo:false → 200; GET ?ativos=1 não traz inativo | ✅ |
| 9 | RBAC: usuário comercial de prova (endpoint da casa) — GET 200 (leitura liberada), POST 403, PATCH 403 | ✅ |
| 10 | Limpeza (padrão 0135): serviço de prova inativo+renomeado "[PROVA] REMOVIDA"; comercial de prova desativado+renomeado | ✅ |
| 11 | QA verde v0.0.746 e v0.0.747 | ✅ |

## Fixes no caminho
- **v0.0.745 falhou** (lint+build): generic TSX `}[]>` quebrava o parser → `}[] >`.
- **v0.0.745→0.0.747**: hook com helpers top-level (`var isDirecao = ...`) NÃO carregou — 404 "File not found" nas 3 rotas com sintaxe válida. Reescrito com TODA a lógica inline nos callbacks (padrão AP-2026-09-12-0200) → carregou. Lição reforçada: no runtime goja do Skip, helpers top-level em hooks podem não ficar visíveis; inline no callback é o padrão seguro.

## Pré-teste UI (Deni.Ai, 22/10 ~00:40)
Página /config/servicos renderiza: 5 serviços do seed com toggles ON, faixa "---" (sem faixa definida), fixture "[PROVA] REMOVIDA" inativa com faixa R$ 10.000–20.000. Botão "Novo serviço" presente. Screenshot: artifacts/3a381833-883e-4faf-8a11-0a0789d9d96c.png

## Restrições e segurança
- Escrita (POST/PATCH) só diretoria — provado com comercial real (403).
- Faixa de ticket é orientação INTERNA de proposta — página marcada "Uso interno".
- Nenhum dado pessoal no catálogo.

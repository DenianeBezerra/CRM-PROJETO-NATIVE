# SPEC-3-024 — T3.24 Catálogo de serviços

**Origem:** Requisitos Complementares da Etapa 3, §6 (construir na etapa 3) e §7 (valor médio, esforço baixo).
**Status:** CONCLUÍDA — 2026-10-21, v0.0.748.
**Objetivo:** padronizar as cinco linhas de solução e manter as opções ativas de serviço alinhadas entre o catálogo e Oportunidades.

## Escopo e critérios de aceite

- **CA-3-141 — Persistência:** coleção `servicos` com nome, slug, descrição/escopo, faixa de preço, recorrência, ativo e ordem; seed das cinco linhas atuais.
- **CA-3-142 — Leitura:** endpoint autenticado, ordenado e com `?ativos=1`; chamada sem autenticação retorna 401.
- **CA-3-143 — Escrita segura:** POST/PATCH somente diretoria; slug único, nome entre 2–80 caracteres e preço mínimo menor ou igual ao máximo; escrita não autorizada retorna 403.
- **CA-3-144 — Gestão visual:** `/config/servicos` renderiza o catálogo, permite gestão prevista e identifica a faixa como uso interno.
- **CA-3-145 — Integração comercial:** Oportunidades utiliza as opções ativas do catálogo e mantém fallback estático para indisponibilidade da consulta.

## Evidências

- `artifacts/servicos_evidencia_2110.md`: provas RED/GREEN de API, RBAC e QA v0.0.745–v0.0.747.
- Migration `0223_servicos_catalogo`: aplicada; coleção `servicos` e campos/regras inspecionados no Skip.
- Revalidação integrada no preview v0.0.748: `/config/servicos` mostrou BPO Financeiro, Tesouraria, Controladoria, CFO as a Service e Outro ativos; `[PROVA] REMOVIDA` inativa; Oportunidades → Nova oportunidade mostrou as mesmas cinco opções; formulário cancelado sem salvar.
- **Resultado:** todos os critérios observáveis passaram; nenhuma alteração de produção foi feita.

## Fora do escopo

Definir preços sem decisão da diretoria, alterar contratos, publicar produção, propostas, faturamento e cobrança.

# SPEC-1-006 — Seed e editor administrativo de etapas

> **Natureza:** SPEC derivada em 2026-09-08, autorizada pela cliente após a SPEC original não ser localizada no repositório, histórico pesquisável ou migrações. Esta definição não se apresenta como a SPEC original. Deve ser substituída ou complementada se a original for recuperada.

## Objetivo

Permitir que a administradora configure as etapas comerciais usadas pelas oportunidades, preservando os negócios existentes e impedindo alterações destrutivas em etapas que já estejam em uso.

## Escopo da T6.1

- Criar seed inicial das etapas já usadas pela coleção `negocios`:
  - `novo`
  - `contato_feito`
  - `proposta`
  - `fechado_ganho`
  - `fechado_perdido`
- Criar coleção de configuração de etapas, com nome visível, chave técnica, ordem, status ativo/inativo e indicação de sistema.
- Criar editor administrativo protegido por RBAC.
- Permitir à administradora criar, editar nome/ordem/status e reordenar etapas.
- Permitir ao operador visualizar etapas, sem criar, editar, inativar ou excluir.
- Impedir exclusão física de etapas; usar inativação reversível.
- Impedir inativação de etapa que esteja vinculada a alguma oportunidade sem migração explícita.
- Preservar os registros existentes de `negocios` durante seed e edição.
- Manter compatibilidade com a tela de oportunidades.

## Critérios de aceite

- CA-1: seed idempotente cria as cinco etapas iniciais sem duplicação.
- CA-2: administradora acessa o editor por rota protegida; usuário sem sessão é redirecionado e operador não pode administrar.
- CA-3: administradora consegue criar uma etapa adicional com nome, chave e ordem válidos.
- CA-4: administradora consegue editar nome e ordem de etapa sem alterar negócios existentes.
- CA-5: administradora consegue inativar uma etapa sem uso; a ação é reversível.
- CA-6: etapa em uso não pode ser excluída nem inativada silenciosamente; o sistema informa a necessidade de migração explícita.
- CA-7: chaves técnicas são únicas, estáveis e não aceitam vazios, duplicidades ou caracteres inválidos.
- CA-8: operador visualiza o pipeline, mas não vê ações administrativas nem consegue executar mutações via API.
- CA-9: oportunidades existentes continuam vinculadas e listáveis após seed, edição, ordenação ou inativação permitida.
- CA-10: falha de validação não grava alteração parcial.

## Modelo mínimo sugerido

Coleção `etapas_negocio`:

- `chave`: texto obrigatório, único e imutável após criação;
- `nome`: texto obrigatório;
- `ordem`: número inteiro não negativo;
- `ativa`: booleano;
- `sistema`: booleano;
- `created`, `updated`: autodate.

Regras de API:

- list/view: usuários autenticados;
- create/update/delete: somente admin; exclusão física bloqueada por regra e fluxo de aplicação.

## Fora do escopo

Kanban, movimentação de oportunidades, ganho/perda avançado, auditoria append-only, métricas de tempo, exportação e automações. Esses itens permanecem nas SPECs próprias.

## TDD e provas

- Baseline: coleção `negocios`, estágios atuais e oportunidades existentes.
- Automatizado: migrations idempotentes, índices únicos, regras de API, build, lint, testes e regressão da tela de oportunidades.
- Humano: login admin, seed sem duplicação, criação/edição/ordenação, inativação reversível, proteção de etapa em uso, bloqueio do operador e preservação dos negócios.

## Decisão de substituição

Se a SPEC original for recuperada, comparar esta definição com ela antes de qualquer nova task. Em caso de conflito, a SPEC original prevalece e os critérios implementados devem ser reavaliados.

# SPEC-1-011 — Busca, filtros e recuperação operacional

> **Natureza:** SPEC derivada em 2026-09-08, criada após a SPEC original não ser localizada. Não substitui a original caso ela seja recuperada.

## Objetivo

Permitir localizar rapidamente contatos e oportunidades e recuperar registros arquivados ou filtrados, sem alterar dados e respeitando autenticação e privacidade.

## Escopo T11.1

- Rota protegida `/busca`.
- Busca global em `clientes` e `negocios`.
- Busca textual por nome, empresa, e-mail, telefone, título e contato relacionado.
- Filtros por entidade, status do contato e estágio da oportunidade.
- Resultados separados por entidade, com identificação do registro e acesso à tela correspondente.
- Inclusão de registros inativos/arquivados quando o filtro solicitar recuperação.
- Estado vazio claro quando não houver resultados.
- Limpeza dos filtros e retorno ao conjunto inicial.
- Consulta somente leitura; nenhuma alteração ou exclusão na tela de busca.

## Critérios de aceite

- CA-1: usuário autenticado acessa `/busca`; sem sessão retorna ao login.
- CA-2: busca por nome, empresa, e-mail ou telefone encontra contatos correspondentes.
- CA-3: busca por título ou contato encontra oportunidades correspondentes.
- CA-4: filtro por entidade separa contatos e oportunidades corretamente.
- CA-5: filtro por status recupera contatos ativos, prospects e inativos.
- CA-6: filtro por estágio recupera oportunidades no estágio selecionado.
- CA-7: combinação de busca e filtros retorna somente registros compatíveis.
- CA-8: limpar filtros restaura a consulta inicial sem duplicar ou perder resultados.
- CA-9: nenhum resultado exibe mensagem clara, sem erro técnico exposto.
- CA-10: resultados não permitem mutações e não exibem senha, token ou dado sensível desnecessário.
- CA-11: links dos resultados levam à tela correta de contatos ou oportunidades.

## Segurança e LGPD

- Todas as consultas exigem sessão autenticada.
- A tela não consulta a coleção `auditoria` nem expõe snapshots.
- Exibir somente campos comerciais necessários à identificação e recuperação operacional.
- Não registrar credenciais, tokens ou dados fora do escopo do CRM.

## Fora do escopo

Busca na trilha de auditoria, exportação, busca semântica, ranking por relevância, importação, edição em massa e filtros avançados de métricas.

## Provas

QA, análise estática, build, testes, rota protegida, buscas por entidade, filtros individuais e combinados, recuperação de inativos, estado vazio, limpeza, links e regressão de contatos/oportunidades/kanban.

## Decisão de substituição

Se a SPEC original for recuperada, ela prevalece após comparação formal; conflitos devem reabrir os critérios afetados antes da conclusão.

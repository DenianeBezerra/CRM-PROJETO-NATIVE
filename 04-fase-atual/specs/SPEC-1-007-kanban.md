# SPEC-1-007 — Kanban e movimentação acessível

> **Natureza:** SPEC derivada em 2026-09-08, criada após a SPEC original não ser localizada. Não substitui a original caso ela seja recuperada.

## Objetivo

Exibir oportunidades em colunas por etapa configurada e permitir a movimentação acessível entre etapas, preservando os dados comerciais e respeitando as permissões existentes.

## Escopo T7.1

- Rota protegida `/kanban`.
- Colunas derivadas das etapas ativas em `etapas_negocio`, ordenadas por `ordem`.
- Oportunidades carregadas da coleção `negocios`.
- Movimentação por controle acessível de seleção, sem depender apenas de arrastar e soltar.
- Atualização persistida do campo `estagio`.
- Operador e administradora podem movimentar oportunidades; exclusão permanece fora do escopo.
- Busca simples por título ou contato.
- Tratamento de erro sem perda silenciosa.

## Critérios de aceite

- CA-1: usuário autenticado acessa `/kanban`; sem sessão retorna ao login.
- CA-2: colunas usam etapas ativas e respeitam a ordem configurada.
- CA-3: oportunidades aparecem na coluna correspondente ao estágio atual.
- CA-4: movimentação por seletor/controle acessível altera e persiste o estágio.
- CA-5: oportunidade mantém título, contato, valor, probabilidade, data e observações após movimentação.
- CA-6: etapa inativa não aparece como destino para nova movimentação, mas oportunidades existentes nela continuam visíveis.
- CA-7: falha de atualização informa erro e preserva o estágio conhecido, sem confirmar alteração falsa.
- CA-8: rota e dados permanecem protegidos por autenticação.

## Fora do escopo

Drag-and-drop obrigatório, histórico/auditoria de movimentação, métricas de tempo, filas, ganho/perda avançado e exportação.

## Provas

QA, análise estática, build, testes, rota protegida, colunas ordenadas, movimentação via controle acessível, persistência, preservação dos dados e regressão de contatos/oportunidades.

# SPEC-3-021-B — Leva B: Módulo de Conteúdo — Agenda Editorial (3 visões)

Autoria: Deni.Ai (champion) · Origem: direcionamento da CEO 13/09/2026
Status: publicada, aguardando autorização de implementação

## Contexto

A lista plana atual serviu para validar o ciclo de vida (Leva A), mas não é a
entrega útil do módulo. A agenda editorial precisa de três visões sobre a mesma
base, entregues como PACOTE ÚNICO na Leva B. Princípio comum: as três leem a
mesma base, sem duplicação de dados — recortes distintos do mesmo conjunto, no
modelo do módulo de operação (coordenação, operação do dia e fila pessoal
observam as mesmas obrigações sob ângulos diferentes). Navegação entre elas em
um toque, sem menu intermediário.

## Visão 1 — Quadro Ano

Finalidade: planejamento e reunião mensal de conteúdo.

- Seletor de ano com navegação entre anos anteriores e futuros; ano corrente como padrão.
- Doze blocos, um por mês: quantidade planejada, publicada e atrasada (em relação à data prevista) + séries presentes no mês.
- Distinção visual: meses encerrados, mês corrente e meses futuros.
- Filtros por canal, série, campanha, linha de solução e responsável — aplicáveis a todo o quadro.
- Clique no mês abre o calendário correspondente (Visão 2).

## Visão 2 — Calendário mensal e semanal

Finalidade: operação diária.

- Requisitos já enviados permanecem válidos.
- Clique em uma data abre o painel do dia com todas as peças previstas.
- Cada peça do painel exibe: título, canal, formato, etapa atual, acesso ao pacote de publicação, link rastreável com cópia e endereço da publicação quando houver.

## Visão 3 — Busca e histórico

Finalidade: consulta. Substitui a lista plana atual.

- Abre preparada para busca, não para rolagem.
- Busca por tema, título e conteúdo do roteiro.
- Filtros combináveis: canal, formato, série, campanha, linha de solução, etapa, responsável e período.
- Ordenação: data prevista, data efetiva e desempenho.
- Alcança todo o histórico, sem limite de período.

## Ordem de construção (definida pela CEO)

1. Calendário mensal com painel do dia (uso diário).
2. Busca e histórico (impede a perda de histórico).
3. Quadro anual (ganha valor com volume acumulado).

## Pré-requisito cumprido

A validação ponta a ponta do módulo foi concluída em 13/09: peça real
"Split payment no Simples: o que muda em 2026" criada pelo fluxo completo
(ideia → pauta → roteiro → produção → edição → pronto p/ publicar → agendado →
publicado), com campanha D17 automática (2026-cfo-split-payment), capa e
arquivo final reais, links rastreáveis por canal e url de publicação
registrada. As quatro frentes (pacote, biblioteca mínima, links, transições)
funcionam ponta a ponta.

## Decisões abertas (a fechar antes da implementação)

- D23: desempenho (Visão 3) na Leva B ou com a medição D20 (30 dias pós-publicação)? Sugestão: ordenação por desempenho entra quando houver dado; até lá, ordena por data.
- D24: o painel do dia (Visão 2) substitui a lista plana da tela /conteudos ou convive com ela até o quadro anual existir? Sugestão: substitui — a lista plana deixa de existir na Leva B.

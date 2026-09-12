# SPEC-3-013 — T3.13 Visão do analista: /operacao-dia + Obrigações no Meu dia (Leva B — UI)

**Origem:** SPEC-3-012 §5 e §6 (cap. 6.1 do documento da CEO) — pendência explícita registrada na conclusão da T3.12.
**Princípio inegociável (CEO, mantido):** as tarefas chegam prontas no painel, geradas pelo motor de rotinas a partir da ficha operacional. Nesta tela NINGUÉM cria obrigação — só baixa, bloqueia e executa.

## Recorte

1. **Página `/operacao-dia`** (nova rota protegida, card na home):
   - Fonte única: `GET /backend/v1/obrigacoes?dia=HOJE` (endpoint existente da T3.12, sem alteração de contrato) + `GET /backend/v1/excecoes` para o bloco de exceções abertas.
   - **Bloco de destaque no topo**: atrasos (status `atrasada`) + exceções abertas — acima das obrigações do dia, conforme cap. 6.1.
   - **Agrupamento por cliente**, ordenado por prazo dentro de cada grupo.
   - **Baixa em 1 toque** na lista (`POST /backend/v1/obrigacoes/{id}/baixa`, resultado opcional) + baixa em lote por cliente (`/baixa-lote`).
   - **Bloquear** com motivo obrigatório (`POST /{id}/bloquear`) — modal com campo de motivo.
   - **Procedimento vigente acessível dentro da obrigação**: link para a ficha operacional do cliente (`/ficha-operacional?empresa={id}`), sem duplicar conteúdo.
   - Filtro "minhas" (`?meus=1`) para o analista ver só o dele; admin vê tudo.
   - Visual: padrão harmonizado (ícone preto + glifo dourado, título bold, descrição cinza, CTA dourado, fundo bege claro — referência T3.09).
2. **Seção "Obrigações operacionais" no `/meu-dia`** (T3.08):
   - Mesma fonte de dados (`/obrigacoes?dia=HOJE&meus=1`), sem duplicar tela: card resumido com as obrigações do dia atribuídas ao usuário logado + baixa em 1 toque.
   - Atrasos do próprio usuário em destaque.
   - Link "Ver operação do dia →" para `/operacao-dia`.

## Fora do recorte

- Visão de coordenação (cap. 6.2) e comercial (cap. 6.3) — Leva C.
- E1–E9 automáticas (dependem do conector OMIE).
- Cadastro/edição de obrigações (nunca existe — CA-3-042).
- Notificações push/WhatsApp de atraso (leva futura).

## Critérios de aceite

- CA-3-043: `/operacao-dia` exibe obrigações do dia agrupadas por cliente, ordenadas por prazo, com atrasos e exceções abertas em bloco destacado no topo.
- CA-3-044: baixa em 1 toque na lista funciona e reflete imediatamente (reload da fonte); bloqueio exige motivo.
- CA-3-045: procedimento vigente acessível a partir da obrigação (link para a ficha).
- CA-3-046: `/meu-dia` mostra seção "Obrigações operacionais" com as obrigações do próprio usuário (meus=1), sem criar nova fonte de dados.
- CA-3-047: nenhuma rota/UI permite criar obrigação manualmente (regressão CA-3-042).

## Provas

- RED/GREEN por API: 401 sem auth nas rotas de baixa/bloqueio (regressão); 400 em baixa de bloqueada sem resolver; baixa 200 + reload reflete.
- Browser real: página agrupada por cliente, bloco de atrasos no topo, baixa 1 toque, link da ficha, seção no Meu dia.
- Regressão: motor T3.12 intacto (dedup, cron), Meu dia T3.08 intacto (tarefas/ações/menções).

## Pré-condições

- T3.12 concluída (motor + endpoints) — ✅ 2026-09-13 13:09.
- Estado real preservado: 13 obrigações + 4 exceções da Felicidade Collective servem de caso real.

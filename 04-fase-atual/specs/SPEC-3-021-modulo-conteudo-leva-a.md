# SPEC-3-021 — T3.21 Módulo de Conteúdo — LEVA A (objeto conteúdo + ciclo de vida + pacote + links + biblioteca mínima)

**Origem:** especificação da CEO "Módulo de Conteúdo do CRM Vibratto" v1.0 (uploads/c30cda5b, 14 capítulos) + decisões D17–D22 da CEO (14/09, com ajustes) + ajustes de recorte da CEO (links na Leva A; biblioteca mínima na Leva A).
**Princípio da spec (cap. 1):** o CRM é onde se decide e onde fica registrado; a ferramenta de publicação é onde se executa. Nenhuma das duas refaz o trabalho da outra. Sem publicação automática, sem coleta automática de métricas, sem gestão de anúncios.

## Decisões fechadas (D17–D22, verbatim da CEO)

- **D17 (slug de campanha):** minúsculas, sem acento, com hífen. Convenção obrigatória: **ano, linha de solução e tema**, nessa ordem — ex.: `2026-cfo-split-payment`. O identificador é **imutável após o primeiro uso**, ainda que o nome da campanha mude, para não quebrar a atribuição do que já foi publicado.
- **D18 (página de destino):** destino padrão dos links = **página do formulário de entrada** (`/entrada`), não o site institucional — o objetivo do link é gerar lead, e o lead nasce no formulário. Sobrescrevível por conteúdo quando houver página específica. Site institucional apenas quando o objetivo da peça for **autoridade**.
- **D19 (aprovadores):** aprovação restrita à direção, **com aprovador reserva nomeado**, acionável somente em período de ausência registrada — mesma lógica de titular/reserva da ficha operacional.
- **D20 (desempenho):** registro semanal; a medição de cada peça continua por até **30 dias após a publicação**, com múltiplos registros por conteúdo (peças de fôlego longo). [Registro de desempenho em si = Leva C; a regra fica registrada.]
- **D21 (retenção de vídeo bruto):** padrão **90 dias**; exceções por marcação individual: (a) destinado a reaproveitamento futuro; (b) contém depoimento/imagem de cliente — mantido enquanto durar a autorização de uso. [Política aplicada na Leva C, biblioteca completa.]
- **D22 (séries da migração):** **Newsletter** e **Deni Entrevista** — nome próprio, periodicidade e continuidade. O restante do quadro atual são **formatos, não séries** — entra como conteúdo avulso. Migração não bloqueada.

## Ajustes de recorte da CEO (14/09)

1. **Geração de links rastreáveis passa da Leva C para a Leva A** — é o único dado do módulo que não pode ser recuperado depois: conteúdo publicado sem link nunca será atribuído. O painel de atribuição permanece na Leva C (relatório se constrói a qualquer tempo), mas o dado nasce desde a primeira publicação.
2. **Biblioteca entra em versão mínima na Leva A** — o pacote de publicação exige arquivo final e capa (relações com ativos). Sem carregar, listar e vincular, a Leva A não fecha sozinha. Controle de versão, validade e direito de uso permanecem na Leva C.

## Recorte da Leva A

### Coleções (migrations a partir de 0188)

1. **conteudos** — objeto central (cap. 3.1): titulo_interno, formato (post_estatico|carrossel|reel|video_longo|artigo|newsletter|story|live), canais_destino (múltipla: instagram|linkedin|tiktok|youtube|newsletter|site), serie (rel), campanha (rel), tema, linha_solucao (bpo_financeiro|tesouraria|controladoria|cfo_as_a_service|consultoria|institucional), objetivo (autoridade|geracao_lead|engajamento|venda_direta|institucional), gancho, roteiro, legenda, capa (rel ativos), arquivo_final (rel ativos), responsavel_producao (rel users), aprovador (rel users), aprovador_reserva (rel users), data_prevista, data_efetiva, status (10 etapas do cap. 3.2), destino_link (url, default = página do formulário de entrada), links_rastreaveis (JSON — um por canal), url_publicacao (JSON — endereço por canal), observacoes, arquivado. Append-only no espírito: delete bloqueado (histórico permanece — cap. 3.2 "Arquivado").
2. **conteudo_eventos** — linha do tempo (cap. 3.2): conteudo, etapa_de, etapa_para, motivo (obrigatório no retrocesso), autor, criado_em. Append-only.
3. **ativos** (versão mínima) — nome, tipo (foto_profissional|arte|video_bruto|video_final|logotipo|apresentacao|documento_institucional|depoimento|capa), arquivo (anexo), vigente (bool), tags. Versão/vigência/direito de uso → Leva C.
4. **series** (mínima) — nome, descricao, periodicidade (semanal|quinzenal|mensal|sob_demanda), canais (múltipla), responsavel (rel), status (ativa|pausada|encerrada). Seed da migração: Newsletter + Deni Entrevista (D22). Geração automática de edições → Leva B.
5. **campanhas** (mínima) — nome, identificador (slug D17: ano-linha-tema, minúsculas, sem acento, hífen; **imutável após o primeiro uso**), tipo (organica|paga|mista), objetivo, linha_solucao, periodo_inicio, periodo_fim, status (planejada|em_andamento|encerrada). canais_pagos/investimentos → Leva B.

### Hooks

- **conteudos_lifecycle.js** — POST /conteudos (criar na etapa ideia), GET /conteudos (lista com filtros: etapa, canal, série, campanha, responsável; flag atrasada por data_prevista), GET /conteudos/{id} (detalhe + eventos + pacote), PATCH /conteudos/{id} (campos editoriais; status NÃO muda por PATCH direto), **POST /conteudos/{id}/etapa** (avanço/retrocesso com as regras do cap. 3.2):
  - → pronto_para_publicar: exige pacote completo (arquivo_final, capa, legenda, links gerados para todos os canais_destino, data_prevista) — bloqueia com lista do que falta;
  - aprovação → pronto_para_publicar: só o **aprovador** (ou aprovador_reserva com ausência registrada do titular — D19);
  - → publicado: exige url_publicacao em ≥ 1 canal; grava data_efetiva automaticamente;
  - retrocesso: exige motivo (≥ 10 chars); registra autor e data no evento;
  - toda transição grava evento em conteudo_eventos + auditoria.
- **conteudo_links.js** — POST /conteudos/{id}/links (gera 1 link por canal_destino): `{destino}?utm_source={canal}&utm_medium={organico|pago}&utm_campaign={identificador da campanha | slug do conteúdo}` no padrão do formulário de entrada (cap. 7.1). Destino = destino_link do conteúdo (D18). **Link já gerado e utilizado não pode ser alterado** — regeneração só adiciona canal novo. Social media não constrói link manualmente.
- **Permissões (cap. 11, recorte A):** admin = total; operator/time interno = criação e edição até a etapa aprovação; papel **social_media** (novo) = leitura + pacote de publicação + registro de url_publicacao — SEM acesso a clientes, propostas nem operação (as rotas existentes desses módulos passam a rejeitar o papel). Aprovador reserva: campo aprovador_reserva + flag ausência registrada no conteúdo (D19).

### UI

- **/conteudos** — lista com filtros (etapa, canal, série, campanha, responsável), badge de atrasado (data_prevista < hoje && não publicado), visão agrupada por etapa (cap. 10, recorte A) + card na home.
- **/conteudos/{id}** — formulário em blocos (pauta: tema/ângulo/gancho; produção: roteiro/legenda; publicação: canais, data_prevista, destino_link) + linha do tempo (eventos) + botões de etapa contextual + seção **Pacote de publicação** (cap. 6): download do arquivo final e da capa, cópia da legenda em 1 toque, cópia individual de cada link rastreável, canais e data previstas, série/campanha, observações, campo de retorno url_publicacao por canal — tela única, funcional em celular.

## Fora do recorte (levas seguintes)

- **Leva B:** séries completas (geração automática de edições na etapa ideia com data calculada), campanhas completas (canais pagos, investimento previsto/realado), calendário mensal/semanal.
- **Leva C:** biblioteca completa (versão, vigência, direito de uso, autorização, alerta de vencimento, uso_externo), registro de desempenho (cap. 8, semanal + 30 dias por peça — D20), painel de atribuição (leads/propostas/ganhos/receita por conteúdo — cap. 7.2), retenção de brutos (D21), visão histórica por tema, migração em 5 fases (cap. 12).

## Critérios de aceite (Leva A)

- CA-3-095: conteúdo percorre as 10 etapas com registro de autor e data em cada transição (conteudo_eventos).
- CA-3-096: avanço para pronto_para_publicar bloqueado com lista dos itens faltantes do pacote.
- CA-3-097: só o aprovador (ou reserva com ausência registrada) move aprovação → pronto_para_publicar; outros papéis → 403.
- CA-3-098: publicado exige url_publicacao em ≥ 1 canal e grava data_efetiva.
- CA-3-099: retrocesso exige motivo e registra autor/data.
- CA-3-100: link rastreável gerado por canal no padrão utm do formulário de entrada; imutável após o primeiro uso; destino = /entrada por padrão (D18).
- CA-3-101: pacote de publicação em tela única com cópia em 1 toque e download dos arquivos.
- CA-3-102: papel social_media acessa pacote/desempenho e NÃO acessa clientes, propostas nem operação.
- CA-3-103: biblioteca mínima permite carregar, listar e vincular capa/arquivo_final ao conteúdo.
- CA-3-104: identificador de campanha segue a convenção ano-linha-tema e é imutável após o primeiro uso (D17).

## Provas (TDD)

- RED: avanço para pronto_para_publicar sem pacote → 400 com lista; aceite por não-aprovador → 403; publicado sem url → 400; retrocesso sem motivo → 400; PATCH direto em status → rejeitado; social_media em rota de clientes → 403; alteração de link já utilizado → 400.
- GREEN: ciclo completo ideia→publicado com eventos; links gerados por canal com utm corretos; pacote completo avança; url_publicacao grava data_efetiva; biblioteca mínima vincula ativos.
- Regressão: pipeline comercial, operação do dia, ficha operacional, motor de rotinas, painel de direção — todos 200 e inalterados.

## Decisões já fechadas nesta SPEC

D17, D18, D19, D20, D21, D22 — verbatim da CEO (14/09). Nenhuma decisão pendente bloqueia a Leva A.

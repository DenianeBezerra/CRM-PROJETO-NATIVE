# SPEC-3-016 — T3.16 Implantação de cliente (cap. 7) + RBAC parcial (cap. 8, D12)

**Origem:** documento da CEO "Ficha Operacional do Cliente — Especificação Dev" (cap. 7 e 8), direção da CEO de 13/09 ("sim, prossiga" após T3.15 concluída).
**Princípio:** implantação é projeto com início e fim (quadro de etapas), distinta das rotinas contínuas. A conclusão é CONDICIONADA — nada de cliente ativo sem ficha preenchida, itens de cofre registrados e procedimento validado. Nenhuma credencial em nenhuma tabela (regra ouro T3.11).

## O que existe hoje (estado real inspecionado)

- `empresas`: status select `ativa|inativa|prospect` — SEM status de implantação. A transição automática do cap. 7 precisa de um estado "em_implantacao".
- `fichas_operacionais`: `status_operacional` (ativo|suspenso|encerrado), campos de completude espalhados (9 blocos), listas em ficha_canais/ficha_bancos/ficha_pessoas, `item_cofre_sistema` + `item_cofre` nos bancos.
- Papéis users: `admin|operator` apenas (D12 pendente).
- Motor T3.12 gera obrigações só para fichas com `status_operacional = ativo` — a transição automática deve respeitar isso.
- Bug latente T3.15 (corrigir nesta task): hook `visao_coordenacao.js` lê `cfg.get('valor')` mas o campo real de `configuracoes_operacionais` é `valor_numero` — o fallback 30 funciona por acaso; correção para `valor_numero`.

## Recorte desta task

1. **Migration 0166**:
   - `empresas.status`: adicionar valor `em_implantacao` (select inplace — AP-0200: `field.values = [...]`).
   - Nova coleção `implantacoes` (append-only no ciclo; delete bloqueado): `empresa` (relation, unique), `modelo` (select: padrao), `status` (select: em_andamento|concluida|cancelada), `responsavel` (relation users), `data_inicio`, `data_conclusao`, `created/updated`.
   - Nova coleção `implantacao_etapas`: `implantacao` (relation), `ordem` (number), `titulo` (text), `descricao` (text), `responsavel` (relation users), `prazo` (date), `status` (select: pendente|em_andamento|concluida|nao_aplicavel), `evidencia` (text), `concluida_em` (date).
   - Seed do **modelo padrão de implantação** (7 etapas, ordem fixa): 1 Coleta de documentos e acessos (identificadores de cofre) · 2 Cadastro no sistema do cliente (Omie/Nibo) · 3 Preenchimento completo da ficha operacional · 4 Validação do procedimento gerado com o cliente · 5 Configuração dos canais e bancos na ficha · 6 Primeiro ciclo em paralelo (shadow) · 7 Go-live e transição para ativo.
   - `auditoria.acao`: adicionar `implantacao_criada`, `etapa_concluida`, `implantacao_concluida`, `transicao_ativo`.
2. **Hook `implantacao.js`**:
   - `POST /backend/v1/implantacoes` (admin): instancia o modelo padrão (cria `implantacoes` + 7 `implantacao_etapas`), marca empresa `em_implantacao`, auditado. Empresa já em implantação → 400.
   - `POST /backend/v1/implantacoes/{id}/etapas/{etapaId}/concluir` (auth): conclui etapa com evidência opcional; auditado.
   - `POST /backend/v1/implantacoes/{id}/concluir` (admin): **conclusão condicionada** — valida: ficha da empresa existe e tem campos essenciais preenchidos (responsavel_principal, servicos_contratados, sistema, periodicidade/dia_emissao conforme serviços), pelo menos 1 item de cofre registrado (ficha_bancos.item_cofre ou fichas_operacionais.item_cofre_sistema), todas as etapas concluídas ou nao_aplicavel. Falha → 400 com lista do que falta. Sucesso → `implantacoes.status=concluida`, `ficha.status_operacional=ativo`, `empresa.status=ativa`, motor gera rotinas no próximo ciclo, auditado (`transicao_ativo`).
   - `GET /backend/v1/implantacoes` (auth): lista com etapas e % completo.
   - `GET /backend/v1/implantacoes/{id}` (auth): detalhe com etapas.
3. **Fix T3.15**: `visao_coordenacao.js` passa a ler `valor_numero`.
4. **RBAC parcial (D12 — decisão da CEO registrada na SPEC: papéis entram AGORA)**:
   - Migration 0167: `users.role` adiciona `coordenacao` e `comercial`.
   - Regras de coleção: `fichas_operacionais`/`obrigacoes`/`excecoes`/`implantacoes` — `comercial` = somente leitura do resumo (via endpoint, sem acesso direto às coleções: listRule/viewRule exigem role admin|operator|coordenacao); `coordenacao` = leitura/escrita como admin nas coleções operacionais (regra `@request.auth.role != 'comercial'`).
   - Endpoints existentes: `/visao/coordenacao` passa a aceitar `admin|coordenacao`; `/visao/comercial` continua auth (agora incluindo `comercial`).
   - UI: card "Visão de coordenação" visível também para `coordenacao`; AdminRoute das telas operacionais ajustado para `admin|coordenacao`.
5. **UI `/implantacoes`** (admin|coordenacao): lista de implantações com % completo + botão "Nova implantação" (escolhe empresa prospect/inativa sem ficha) + detalhe com quadro de etapas (concluir etapa com evidência) + botão "Concluir implantação" que mostra o checklist de condições e o que falta. Card na home (admin|coordenacao). Visual harmonizado T3.09.

## Fora do recorte

- Criação de usuários pelo CRM (gestão de contas fica no PocketBase admin).
- Notificações de etapa; calendário de feriados municipais (decisão pendente cap. 11).
- Integração com cofre de senhas (só identificadores — cap. 9).

## Critérios de aceite

- CA-3-062: POST /implantacoes instancia modelo padrão com 7 etapas e marca empresa em_implantacao (auditado).
- CA-3-063: empresa já em implantação não aceita segunda implantação (400).
- CA-3-064: etapa conclui com evidência e fica auditada.
- CA-3-065: conclusão da implantação é bloqueada com lista clara quando ficha incompleta, sem item de cofre ou etapas pendentes.
- CA-3-066: conclusão bem-sucedida → ficha ativa + empresa ativa + auditoria transicao_ativo; motor passa a gerar rotinas (ficha ativa).
- CA-3-067: papel comercial não lista fichas/obrigações/exceções/implantações direto (regra de coleção) e operator/coordenacao mantêm acesso.
- CA-3-068: /visao/coordenacao aceita admin e coordenacao; comercial 403.
- CA-3-069: config da ficha desatualizada lê valor_numero (fix T3.15).

## Provas

- RED: 401 sem auth; 403 operator em POST /implantacoes; 403 comercial em /visao/coordenacao; 400 segunda implantação; 400 conclusão com etapas pendentes; 400 conclusão sem item de cofre; comercial bloqueado na listagem direta de fichas (regra).
- GREEN: implantação criada com 7 etapas (empresa de teste); etapa concluída 200; checklist de conclusão lista pendências reais; conclusão completa → ficha ativa + empresa ativa + auditoria; /visao/coordenacao 200 com coordenacao.
- Regressão: motor T3.12, exceções T3.14, visões T3.15, ficha Felicidade (ativa) intactos; ficha real não é afetada.

## Decisões da CEO registradas

- **D12 (decidida — "sim, prossiga" com a análise que propôs papéis agora):** papéis `coordenacao` e `comercial` entram nesta task.
- D13: N dias ficha desatualizada = 30 (config editável).
- D14: resumo comercial visível a operator (mantido).
